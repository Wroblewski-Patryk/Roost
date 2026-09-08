import { Prisma } from "@prisma/client";

type Predicate = Record<string, any>;
const models = new Map(Prisma.dmmf.datamodel.models.map(model => [model.name, model]));
const delegates = new Map([...models.values()].map(model => [model.name[0]!.toLowerCase() + model.name.slice(1), model]));

// Capture the context loader's read scope, including empty collections and
// nested relations. No source bodies, credentials or SQL strings are persisted.
// Unknown query shapes fail acceptance closed until the watch compiler supports them.
export function watchReadySources(db: Prisma.TransactionClient) {
  const watches = new Map<string, Map<string, Predicate>>();
  function predicate(modelName: string, where: Record<string, any> = {}): Predicate {
    const model = models.get(modelName)!;
    const clauses: Predicate[] = [];
    for (const [key, value] of Object.entries(where)) {
      if (value === undefined) continue;
      if (["AND", "OR", "NOT"].includes(key)) {
        clauses.push({ op: key.toLowerCase(), args: (Array.isArray(value) ? value : [value]).map(item => predicate(modelName, item)) });
        continue;
      }
      const field = model.fields.find(item => item.name === key);
      if (!field) throw new Error("ready_source_query_unsupported");
      if (field.kind === "object") {
        // The task loader uses this redundant tenant guard with an explicit
        // feature ID set. Retain that bounded ID set; never broaden to all rows.
        if (modelName === "ApplicationFeature" && key === "application" && Object.keys(value).join() === "workspaceId" && Array.isArray(where.id?.in)) continue;
        throw new Error("ready_source_query_unsupported");
      }
      const column = field.dbName ?? field.name;
      const scalar = (input: any): Predicate => {
        if (input === null || typeof input !== "object") return { op: "eq", column, value: input };
        return { op: "and", args: Object.entries(input).map(([op, operand]) => {
          if (op === "equals") return { op: "eq", column, value: operand };
          if (op === "in" && Array.isArray(operand)) return { op: "in", column, values: operand };
          if (op === "not") return { op: "not", args: [scalar(operand)] };
          throw new Error("ready_source_query_unsupported");
        }) };
      };
      clauses.push(scalar(value));
    }
    return { op: "and", args: clauses };
  }
  function capture(modelName: string, args: any, result: any) {
    const model = models.get(modelName)!;
    const table = model.dbName ?? model.name;
    const filter = predicate(modelName, args.where);
    if (!watches.has(table)) watches.set(table, new Map());
    watches.get(table)!.set(JSON.stringify(filter), filter);
    for (const row of Array.isArray(result) ? result : result ? [result] : []) {
      for (const [name, selection] of Object.entries(args.include ?? args.select ?? {})) {
        const field = model.fields.find(item => item.name === name && item.kind === "object");
        if (!field || !selection) continue;
        const target = models.get(field.type)!;
        let from = field.relationFromFields ?? [], to = field.relationToFields ?? [];
        if (!from.length) {
          const inverse = target.fields.find(item => item.kind === "object" && item.relationName === field.relationName && item.relationFromFields?.length);
          if (!inverse) throw new Error("ready_source_relation_unsupported");
          from = inverse.relationToFields!; to = inverse.relationFromFields!;
        }
        if (from.some(key => row[key] === undefined)) throw new Error("ready_source_relation_key_missing");
        if (from.some(key => row[key] === null)) continue;
        const childArgs = selection === true ? {} : selection as any;
        capture(field.type, { ...childArgs, where: { AND: [childArgs.where ?? {}, Object.fromEntries(from.map((key, index) => [to[index]!, row[key]]))] } }, row[name]);
      }
    }
  }
  const client = new Proxy(db, { get(target, name: string) {
    const delegate = delegates.get(name);
    const value = Reflect.get(target, name);
    if (!delegate) throw new Error("ready_source_operation_unsupported");
    return new Proxy(value, { get(model, operation: string) {
      if (!["findFirst", "findUnique", "findMany"].includes(operation)) throw new Error("ready_source_operation_unsupported");
      return async (args: any = {}) => {
        const result = await model[operation](args);
        capture(delegate.name, args, result);
        return result;
      };
    } });
  } }) as Prisma.TransactionClient;
  return { db: client, async persist(taskId: string, risk = false) {
    const installed = await db.$queryRaw<Array<{ table_name: string }>>`SELECT c.relname AS table_name FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid WHERE t.tgname IN ('ready_source_changed', 'ready_source_fence') AND t.tgenabled = 'O' GROUP BY c.relname HAVING count(DISTINCT t.tgname) = 2`;
    const protectedTables = new Set(installed.map(row => row.table_name));
    if ([...watches.keys()].some(table => !protectedTables.has(table))) throw new Error("ready_source_trigger_missing");
    if (risk) await db.$executeRaw`DELETE FROM task_risk_source_watches WHERE task_id = ${taskId}::uuid`;
    else await db.$executeRaw`DELETE FROM task_ready_source_watches WHERE task_id = ${taskId}::uuid`;
    for (const [table, predicates] of watches) {
      const filter = JSON.stringify({ op: "or", args: [...predicates.values()] });
      if (risk) await db.$executeRaw`INSERT INTO task_risk_source_watches (task_id, source_table, predicate) VALUES (${taskId}::uuid, ${table}, ${filter}::jsonb)`;
      else await db.$executeRaw`INSERT INTO task_ready_source_watches (task_id, source_table, predicate) VALUES (${taskId}::uuid, ${table}, ${filter}::jsonb)`;
    }
  } };
}

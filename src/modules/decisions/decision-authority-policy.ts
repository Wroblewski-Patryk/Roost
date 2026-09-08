import type { DecisionAuthorityDeclaration, MandateBody } from "./decision-authority-contract";
import { canonicalDepartmentKeys } from "../../operating-model/department-registry";

/** A projection of canonical workforce + department ownership, never a second hierarchy. */
export type AuthorityWorker = {
  id: string; workspaceId: string; principal: { kind: "user" | "agent"; id: string } | null;
  active: boolean; managerIds: string[]; departmentKeys: string[];
  hierarchyLevel: string | null; revision: string;
};
export type AuthorityMandate = MandateBody & { id: string; workforceId?: string; version: number; workspaceId: string; issuer: { kind: "user"; id: string }; revision: string };
export type AuthorityFailure = { status: "blocked"; reason: string; missingId?: string; path: string[] };
const fail = (reason: string, path: string[] = [], missingId?: string): AuthorityFailure => ({ status: "blocked", reason, path, ...(missingId ? { missingId } : {}) });
const samePrincipal = (a: { kind: string; id: string } | null, b: { kind: string; id: string }) => a?.kind === b.kind && a.id === b.id;

/** Up to the common supervisor, or across the two explicitly typed peer directors. */
export function hierarchyPath(workspaceId: string, workers: AuthorityWorker[], from: string, to: string, ownerUserId?: string) {
  const index = new Map(workers.map(worker => [worker.id, worker]));
  const ownerWatches: string[] = [];
  if (index.size !== workers.length || workers.length > 2000) return fail("hierarchy_ambiguous");
  function lineage(start: string): AuthorityWorker[] | AuthorityFailure {
    const path: AuthorityWorker[] = [];
    let next: string | undefined = start;
    while (next) {
      if (path.some(worker => worker.id === next)) return fail("hierarchy_cycle", path.map(worker => worker.id), next);
      if (path.length >= 100) return fail("hierarchy_too_large", path.map(worker => worker.id));
      const worker = index.get(next);
      if (!worker || worker.workspaceId !== workspaceId || !worker.active || !worker.principal) return fail("hierarchy_missing_principal", path.map(worker => worker.id), next);
      if (workers.filter(other => other.workspaceId === workspaceId && other.active && samePrincipal(other.principal,worker.principal!)).length !== 1) return fail("hierarchy_ambiguous",path.map(worker=>worker.id),next);
      if (worker.departmentKeys.length !== 1 || worker.departmentKeys[0] === "00-ogolny" || !canonicalDepartmentKeys.some(key => key === worker.departmentKeys[0])) return fail("hierarchy_department_ambiguous", path.map(worker => worker.id), next);
      if (worker.managerIds.length > 1) return fail("hierarchy_manager_ambiguous", path.map(worker => worker.id), next);
      if (worker.hierarchyLevel === "department_director") {
        const peers = workers.filter(other => other.workspaceId === workspaceId && other.active && other.hierarchyLevel === "department_director" && other.departmentKeys.includes(worker.departmentKeys[0]!));
        if (peers.length !== 1) return fail("hierarchy_director_ambiguous", path.map(worker => worker.id), next);
        // No director derives a superior from a CEO title or an arbitrary reporting edge.
        if (worker.managerIds.length) {
          const supervisor = index.get(worker.managerIds[0]!);
          if (!ownerUserId || !supervisor?.active || supervisor.workspaceId !== workspaceId || supervisor.principal?.kind !== "user" || supervisor.principal.id !== ownerUserId || supervisor.managerIds.length) return fail("hierarchy_director_not_peer", path.map(worker => worker.id), next);
          ownerWatches.push(supervisor.id);
        }
        path.push(worker); return path;
      }
      path.push(worker);
      next = worker.managerIds[0];
      if (!next) return fail("hierarchy_missing_supervisor", path.map(worker => worker.id), worker.id);
      const manager = index.get(next);
      if (manager && (manager.departmentKeys.length !== 1 || manager.departmentKeys[0] !== worker.departmentKeys[0])) return fail("hierarchy_department_bypass", path.map(worker => worker.id), next);
    }
    return path;
  }
  const left = lineage(from), right = lineage(to);
  if (!Array.isArray(left)) return left;
  if (!Array.isArray(right)) return right;
  const common = left.findIndex(worker => right.some(other => other.id === worker.id));
  const watchIds = [...new Set([...left, ...right].map(worker => worker.id).concat(ownerWatches))].sort();
  let route: AuthorityWorker[];
  if (common >= 0) {
    const rightCommon = right.findIndex(worker => worker.id === left[common]!.id);
    route = [...left.slice(0, common + 1), ...right.slice(0, rightCommon).reverse()];
  } else {
    const leftDirector = left.at(-1)!, rightDirector = right.at(-1)!;
    if (leftDirector.hierarchyLevel !== "department_director" || rightDirector.hierarchyLevel !== "department_director" || leftDirector.departmentKeys[0] === rightDirector.departmentKeys[0]) return fail("hierarchy_missing_common_level");
    route = [...left, ...right.reverse()];
  }
  return { status: "valid" as const, path: route.map(worker => worker.id), watchIds, principals: route.map(worker => worker.principal!), revisions: route.map(worker => ({ id: worker.id, revision: worker.revision })) };
}

export function resolveDecisionAuthority(input: {
  workspaceId: string; ownerUserId: string; declaration: DecisionAuthorityDeclaration;
  workers: AuthorityWorker[]; mandates: AuthorityMandate[]; operation: string;
  risk: "low" | "medium" | "high" | "critical" | null; now: number;
}) {
  const { declaration, workspaceId, ownerUserId, risk } = input;
  if (!risk) return fail("authority_risk_missing");
  if (declaration.domain !== "ordinary_domain" || risk === "critical") return {
    status: "owner_reserved" as const, reason: risk === "critical" ? "critical_risk" : declaration.domain,
    principal: { kind: "user" as const, id: ownerUserId }, path: [], mandate: null
  };
  if (!declaration.requesterId || !declaration.recipientId) return fail("hierarchy_missing_principal");
  const route = hierarchyPath(workspaceId, input.workers, declaration.requesterId, declaration.recipientId, ownerUserId);
  if (route.status === "blocked") return route;
  const exact = (entity: { type: string; id: string }, other: { type: string; id: string }) => entity.type === other.type && entity.id === other.id;
  const levels = ["low", "medium", "high", "critical"];
  // The route is ordered from the requester to the destination. First eligible principal wins.
  for (const workerId of route.path) {
    const worker = input.workers.find(item => item.id === workerId)!;
    const matches = input.mandates.filter(mandate => mandate.workspaceId === workspaceId && samePrincipal(worker.principal, mandate.holder)
      && !samePrincipal(mandate.holder, mandate.issuer) && mandate.issuer.id === ownerUserId
      && mandate.status === "active" && Date.parse(mandate.startsAt) <= input.now && (!mandate.endsAt || Date.parse(mandate.endsAt) > input.now)
      && mandate.departmentKey === declaration.departmentKey && worker.departmentKeys[0] === declaration.departmentKey
      && mandate.decisionDomains.includes("ordinary_domain") && mandate.operations.includes(input.operation as MandateBody["operations"][number])
      && levels.indexOf(mandate.maxRisk) >= levels.indexOf(risk)
      && declaration.entities.every(entity => mandate.entities.some(allowed => exact(entity, allowed)) && !mandate.exclusions.some(excluded => exact(entity, excluded))));
    if (matches.length > 1) return fail("authority_mandate_ambiguous", route.path, workerId);
    if (matches[0]) return { status: "delegated" as const, reason: "exact_mandate", principal: worker.principal!, path: route.path,
      watchIds: route.watchIds, principals: route.principals, hierarchyRevisions: route.revisions, mandate: matches[0], scopeProof: { entities: declaration.entities, departmentKey: declaration.departmentKey, operation: input.operation, risk } };
  }
  return { ...fail("authority_mandate_missing", route.path), escalation: { kind: "user" as const, id: ownerUserId, action: "propose_mandate" as const } };
}

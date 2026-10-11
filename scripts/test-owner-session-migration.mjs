import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { cp, mkdir, mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { config as loadDotenv } from "dotenv";

const root = process.cwd();
const database = "companycore_test_g10_upgrade";
const migration = "20261011030000_owner_session_and_action_proof";
const local = {};
loadDotenv({ path: path.join(root, ".env"), processEnv: local, quiet: true });
const password = process.env.SERVICE_PASSWORD_POSTGRES ?? local.SERVICE_PASSWORD_POSTGRES ?? "companycore";
const port = process.env.ROOST_POSTGRES_PORT ?? local.ROOST_POSTGRES_PORT ?? "55432";
const databaseUrl = `postgresql://companycore:${encodeURIComponent(password)}@127.0.0.1:${port}/${database}?schema=public`;
const prismaCli = path.join(root, "node_modules", "prisma", "build", "index.js");
let temporary = null;
let created = false;

function run(command, args, env = process.env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: root, env, windowsHide: true });
    let stdout = "", stderr = "";
    child.stdout.on("data", chunk => { stdout += chunk; });
    child.stderr.on("data", chunk => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", code => code === 0 ? resolve(stdout.trim()) : reject(new Error(`${command} failed with exit ${code}: ${stderr.replaceAll(password, "[redacted]").slice(-500)}`)));
  });
}
const docker = (...args) => run("docker", ["compose", "exec", "-T", "postgres", ...args]);
const sql = text => docker("psql", "-U", "companycore", "-d", database, "-At", "-v", "ON_ERROR_STOP=1", "-c", text);

try {
  const running = await run("docker", ["compose", "ps", "--status", "running", "--services", "postgres"]);
  if (running !== "postgres") throw new Error("The local PostgreSQL container must already be running.");
  const existing = await docker("psql", "-U", "companycore", "-d", "postgres", "-Atc", `SELECT count(*) FROM pg_database WHERE datname='${database}'`);
  if (existing !== "0") throw new Error("The disposable G10 migration database already exists; refusing to reuse it.");
  await docker("createdb", "-U", "companycore", "-O", "companycore", database);
  created = true;

  temporary = await mkdtemp(path.join(tmpdir(), "roost-g10-migrations-"));
  const source = path.join(root, "prisma", "migrations");
  const target = path.join(temporary, "migrations");
  await mkdir(target);
  await cp(path.join(root, "prisma", "schema.prisma"), path.join(temporary, "schema.prisma"));
  for (const entry of await readdir(source, { withFileTypes: true })) {
    if (entry.name === migration) continue;
    await cp(path.join(source, entry.name), path.join(target, entry.name), { recursive: entry.isDirectory() });
  }
  const env = { ...process.env, DATABASE_URL: databaseUrl, NODE_ENV: "test", COMPANYCORE_SKIP_DOTENV: "1" };
  await run(process.execPath, [prismaCli, "migrate", "deploy", "--schema", path.join(temporary, "schema.prisma")], env);
  const userId = randomUUID();
  await sql(`INSERT INTO users(id,email,password_hash,created_at,updated_at) VALUES ('${userId}'::uuid,'g10-upgrade@example.test','synthetic-fixture',now(),now())`);
  const before = await sql("SELECT count(*) FROM information_schema.columns WHERE table_name='users' AND column_name='auth_version'");
  if (before !== "0") throw new Error("Before-state already has G10 auth_version.");
  await run(process.execPath, [prismaCli, "migrate", "deploy", "--schema", path.join(root, "prisma", "schema.prisma")], env);
  const after = await sql(`SELECT auth_version FROM users WHERE id='${userId}'::uuid`);
  const tables = await sql("SELECT count(*) FROM information_schema.tables WHERE table_name IN ('auth_session_revocations','owner_action_proofs')");
  const recorded = await sql(`SELECT count(*) FROM _prisma_migrations WHERE migration_name='${migration}' AND finished_at IS NOT NULL`);
  if (after !== "0" || tables !== "2" || recorded !== "1") throw new Error("Existing user or new auth tables failed migration read-back.");
  process.stdout.write("G10 additive upgrade passed: synthetic existing user retained, auth_version=0, two auth tables and migration receipt present.\n");
} finally {
  if (created) await docker("dropdb", "-U", "companycore", "--if-exists", database);
  if (temporary) {
    const resolved = path.resolve(temporary), base = path.resolve(tmpdir()) + path.sep;
    if (!resolved.startsWith(base) || path.basename(resolved).indexOf("roost-g10-migrations-") !== 0)
      throw new Error("Refusing to remove an unexpected migration temporary path.");
    await rm(resolved, { recursive: true, force: true });
  }
}

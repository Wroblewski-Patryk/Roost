import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";

const dbName = `companycore_g16b_test_${randomBytes(4).toString("hex")}`;
assert.match(dbName, /^companycore_g16b_test_[0-9a-f]{8}$/);

function docker(args, input) {
  const result = spawnSync("docker", ["compose", "exec", "-T", "postgres", ...args], {
    cwd: process.cwd(), encoding: "utf8", input, windowsHide: true, timeout: 30000
  });
  if (result.status !== 0) throw new Error((result.stderr || result.stdout || "docker command failed").trim());
  return result.stdout.trim();
}
function sql(statement) {
  return docker(["psql", "-U", "companycore", "-d", dbName, "-v", "ON_ERROR_STOP=1", "-At"], statement);
}

let created = false;
try {
  docker(["createdb", "-U", "companycore", dbName]);
  created = true;
  sql(`
    CREATE TABLE workspace_departments (
      id uuid PRIMARY KEY, workspace_id uuid NOT NULL, key text NOT NULL,
      name text NOT NULL, description text, icon text NOT NULL, position integer NOT NULL,
      is_system boolean NOT NULL, status text NOT NULL, linked_views jsonb NOT NULL,
      metadata jsonb NOT NULL, created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL
    );
    CREATE TABLE organizational_department_relations (id uuid PRIMARY KEY, department_id uuid NOT NULL);
    CREATE TABLE department_view_definitions (id uuid PRIMARY KEY, canonical_department_id uuid NOT NULL);
    CREATE TABLE department_view_availability (id uuid PRIMARY KEY, department_id uuid NOT NULL, view_id uuid NOT NULL, enabled boolean NOT NULL);
    CREATE TABLE external_container_mappings (id uuid PRIMARY KEY, area_id uuid, raw jsonb NOT NULL);
    INSERT INTO workspace_departments
      SELECT ('00000000-0000-4000-8000-' || lpad(i::text,12,'0'))::uuid,
        '00000000-0000-4000-8000-999999999999'::uuid,
        lpad(i::text,2,'0') || '-synthetic', 'Synthetic ' || i, NULL, 'ph-buildings',
        i, true, 'active', '["shared.view"]'::jsonb, '{}'::jsonb, now(), now()
      FROM generate_series(0,12) i;
    INSERT INTO organizational_department_relations
      SELECT ('10000000-0000-4000-8000-' || lpad(i::text,12,'0'))::uuid,
        ('00000000-0000-4000-8000-' || lpad((i % 13)::text,12,'0'))::uuid
      FROM generate_series(0,2798) i;
    INSERT INTO department_view_definitions
      SELECT ('20000000-0000-4000-8000-' || lpad(i::text,12,'0'))::uuid,
        ('00000000-0000-4000-8000-' || lpad((i % 13)::text,12,'0'))::uuid
      FROM generate_series(0,50) i;
    INSERT INTO department_view_availability
      SELECT ('30000000-0000-4000-8000-' || lpad(i::text,12,'0'))::uuid,
        ('00000000-0000-4000-8000-' || lpad((i % 13)::text,12,'0'))::uuid,
        ('20000000-0000-4000-8000-' || lpad((i % 51)::text,12,'0'))::uuid,
        i % 3 <> 0
      FROM generate_series(0,183) i;
    INSERT INTO external_container_mappings
      SELECT ('40000000-0000-4000-8000-' || lpad(i::text,12,'0'))::uuid,
        ('50000000-0000-4000-8000-' || lpad((i % 13)::text,12,'0'))::uuid,
        jsonb_build_object('manualDepartmentKey', lpad((i % 13)::text,2,'0') || '-synthetic')
      FROM generate_series(0,25) i;
  `);
  const fingerprint = `SELECT
    (SELECT count(*) FROM workspace_departments),
    (SELECT count(*) FROM organizational_department_relations),
    (SELECT count(*) FROM department_view_definitions),
    (SELECT count(*) FROM department_view_availability),
    (SELECT count(*) FROM external_container_mappings),
    (SELECT md5(string_agg(id::text || key || linked_views::text, ',' ORDER BY id)) FROM workspace_departments),
    (SELECT md5(string_agg(id::text || enabled::text, ',' ORDER BY id)) FROM department_view_availability)`;
  const before = sql(fingerprint);
  assert.match(before, /^13\|2799\|51\|184\|26\|[0-9a-f]{32}\|[0-9a-f]{32}$/);
  const migration = readFileSync("prisma/migrations/20261011220000_g16b_department_composition/migration.sql", "utf8");
  assert.doesNotMatch(migration, /\b(DROP|TRUNCATE|DELETE|UPDATE)\b/i);
  sql(migration);
  assert.equal(sql(fingerprint), before);
  assert.equal(sql("SELECT count(*) FROM workspace_departments WHERE composition_version = 1"), "13");
  console.log("G16b populated predecessor migration: 13 departments, 2799 relations, 51 views, 184 availability rows and 26 provider mappings preserved; version 1 added to all departments.");
} finally {
  if (created) docker(["dropdb", "-U", "companycore", "--if-exists", dbName]);
}

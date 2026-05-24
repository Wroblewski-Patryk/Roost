import { spawn } from "node:child_process";

const containerName = process.env.COMPANYCORE_TEST_DB_CONTAINER || "companycore-test-postgres";
const port = process.env.COMPANYCORE_TEST_DB_PORT || "55432";
const databaseUrl = process.env.DATABASE_URL || `postgresql://companycore:companycore@127.0.0.1:${port}/companycore_test?schema=public`;
const keepDb = process.env.COMPANYCORE_TEST_DB_KEEP === "1";

function assertSafeTestDatabaseUrl(url) {
  if (process.env.COMPANYCORE_ALLOW_DESTRUCTIVE_TEST_DB === "1") {
    return;
  }

  const parsed = new URL(url);
  const safeHosts = new Set(["127.0.0.1", "localhost", "::1"]);
  const databaseName = parsed.pathname.replace(/^\/+/, "");
  if (!safeHosts.has(parsed.hostname) || !/^companycore(_|-)?test/i.test(databaseName)) {
    throw new Error(
      "Refusing to run destructive API tests against DATABASE_URL. Use a local database named companycore_test or set COMPANYCORE_ALLOW_DESTRUCTIVE_TEST_DB=1 for an explicit override."
    );
  }
}

function run(command, args, options = {}) {
  return new Promise((resolve) => {
    let settled = false;
    const child = spawn(command, args, {
      cwd: process.cwd(),
      env: { ...process.env, ...options.env },
      shell: process.platform === "win32",
      stdio: options.capture ? ["ignore", "pipe", "pipe"] : "inherit"
    });
    let stdout = "";
    let stderr = "";
    if (options.capture) {
      child.stdout.on("data", (chunk) => {
        stdout += chunk.toString();
      });
      child.stderr.on("data", (chunk) => {
        stderr += chunk.toString();
      });
    }
    const timeout = options.timeoutMs
      ? setTimeout(() => {
        if (settled) {
          return;
        }
        settled = true;
        child.kill();
        resolve({ code: 124, stdout, stderr: `${stderr}\n${command} timed out after ${options.timeoutMs}ms`.trim() });
      }, options.timeoutMs)
      : null;

    child.on("close", (code) => {
      if (settled) {
        return;
      }
      settled = true;
      if (timeout) {
        clearTimeout(timeout);
      }
      resolve({ code, stdout, stderr });
    });
    child.on("error", (error) => {
      if (settled) {
        return;
      }
      settled = true;
      if (timeout) {
        clearTimeout(timeout);
      }
      resolve({ code: 1, stdout, stderr: String(error) });
    });
  });
}

async function ensureDocker() {
  const result = await run("docker", ["info", "--format", "{{.ServerVersion}}"], { capture: true, timeoutMs: 20000 });
  if (result.code !== 0) {
    throw new Error(`Docker is not available for local API tests.\n${result.stderr || result.stdout}`.trim());
  }
}

async function containerExists() {
  const result = await run("docker", ["ps", "-a", "--filter", `name=^/${containerName}$`, "--format", "{{.Names}}"], { capture: true, timeoutMs: 20000 });
  return result.stdout.trim() === containerName;
}

async function containerRunning() {
  const result = await run("docker", ["ps", "--filter", `name=^/${containerName}$`, "--format", "{{.Names}}"], { capture: true, timeoutMs: 20000 });
  return result.stdout.trim() === containerName;
}

async function startDatabase() {
  await ensureDocker();
  if (!await containerExists()) {
    const created = await run("docker", [
      "run",
      "-d",
      "--name", containerName,
      "-e", "POSTGRES_DB=companycore_test",
      "-e", "POSTGRES_USER=companycore",
      "-e", "POSTGRES_PASSWORD=companycore",
      "-p", `${port}:5432`,
      "postgres:16-alpine"
    ], { timeoutMs: 60000 });
    if (created.code !== 0) {
      throw new Error("Could not create local PostgreSQL test container.");
    }
  } else if (!await containerRunning()) {
    const started = await run("docker", ["start", containerName], { timeoutMs: 30000 });
    if (started.code !== 0) {
      throw new Error("Could not start local PostgreSQL test container.");
    }
  }

  for (let attempt = 0; attempt < 40; attempt += 1) {
    const ready = await run("docker", ["exec", containerName, "pg_isready", "-U", "companycore", "-d", "companycore_test"], { capture: true, timeoutMs: 10000 });
    if (ready.code === 0) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error("PostgreSQL test container did not become ready in time.");
}

async function cleanupDatabase() {
  if (process.env.DATABASE_URL || keepDb) {
    return;
  }
  await run("docker", ["rm", "-f", containerName], { capture: true, timeoutMs: 30000 });
}

try {
  assertSafeTestDatabaseUrl(databaseUrl);
  if (!process.env.DATABASE_URL) {
    await startDatabase();
  }
  const result = await run("npm", ["run", "test:api"], {
    env: { DATABASE_URL: databaseUrl, NODE_ENV: "test" }
  });
  await cleanupDatabase();
  process.exit(result.code ?? 1);
} catch (error) {
  await cleanupDatabase();
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

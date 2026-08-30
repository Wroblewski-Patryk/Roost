import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { config as loadDotenv } from "dotenv";

const composeEnvironment = {};
loadDotenv({ path: resolve(process.cwd(), ".env"), processEnv: composeEnvironment, quiet: true });
const port = process.env.ROOST_POSTGRES_PORT || process.env.COMPANYCORE_TEST_DB_PORT || composeEnvironment.ROOST_POSTGRES_PORT || "55432";
const postgresPassword = process.env.SERVICE_PASSWORD_POSTGRES || composeEnvironment.SERVICE_PASSWORD_POSTGRES || "companycore";
const databaseUrl = process.env.DATABASE_URL || `postgresql://companycore:${encodeURIComponent(postgresPassword)}@127.0.0.1:${port}/companycore_test?schema=public`;
const dockerDesktopPath = process.env.COMPANYCORE_DOCKER_DESKTOP_PATH || "C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe";
const allowDockerDesktopLaunch = process.env.COMPANYCORE_TEST_DB_START_DOCKER_DESKTOP !== "0";
const isolatedDotenvPath = resolve(process.cwd(), ".env.test-isolated-does-not-exist");

if (existsSync(isolatedDotenvPath)) {
  throw new Error(`Refusing to use reserved test environment path: ${isolatedDotenvPath}`);
}

const testEnvironment = {
  DATABASE_URL: databaseUrl,
  NODE_ENV: "test",
  COMPANYCORE_SKIP_DOTENV: "1",
  DOTENV_CONFIG_PATH: isolatedDotenvPath,
  DOTENV_CONFIG_QUIET: "true"
};
const isolatedApplicationVariables = [
  "API_KEY_HASH_SECRET",
  "AUTH_TOKEN_SECRET",
  "COMPANYCORE_ALLOWED_ORIGINS",
  "COMPANYCORE_API_HOSTS",
  "COMPANYCORE_BUILD_COMMIT",
  "COMPANYCORE_BUILD_IMAGE",
  "COOLIFY_CONTAINER_NAME",
  "COOLIFY_GIT_COMMIT_SHA",
  "COOLIFY_IMAGE",
  "GOOGLE_OAUTH_CLIENT_ID",
  "GOOGLE_OAUTH_CLIENT_SECRET",
  "INTEGRATION_SECRET_KEY",
  "SOURCE_COMMIT",
  "GIT_COMMIT",
  "COMMIT_SHA"
];
const testProcessEnvironment = {};
for (const name of ["APPDATA", "ComSpec", "LOCALAPPDATA", "PATH", "Path", "PATHEXT", "SYSTEMROOT", "SystemRoot", "TEMP", "TMP"]) {
  if (process.env[name] !== undefined) {
    testProcessEnvironment[name] = process.env[name];
  }
}
Object.assign(testProcessEnvironment, testEnvironment);

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
    const childEnvironment = options.replaceEnv
      ? { ...options.env }
      : { ...process.env, ...options.env };
    for (const name of options.unsetEnv || []) {
      delete childEnvironment[name];
    }
    if (options.assertIsolatedTestEnvironment) {
      const unexpectedVariables = isolatedApplicationVariables.filter((name) => childEnvironment[name] !== undefined);
      if (childEnvironment.NODE_ENV !== "test" || childEnvironment.COMPANYCORE_SKIP_DOTENV !== "1" || unexpectedVariables.length > 0) {
        throw new Error(`Local API test environment is not isolated (${unexpectedVariables.join(", ") || "invalid test flags"}).`);
      }
    }
    const child = spawn(command, args, {
      cwd: process.cwd(),
      env: childEnvironment,
      detached: options.detached === true,
      shell: options.shell ?? process.platform === "win32",
      stdio: options.waitForExit === false ? "ignore" : options.capture ? ["ignore", "pipe", "pipe"] : "inherit",
      windowsHide: true
    });
    if (options.waitForExit === false) {
      child.unref();
      resolve({ code: 0, stdout: "", stderr: "" });
      return;
    }
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
  if (result.code === 0) {
    return;
  }

  const firstError = result.stderr || result.stdout;
  if (process.platform === "win32" && allowDockerDesktopLaunch && existsSync(dockerDesktopPath)) {
    const launched = await run(dockerDesktopPath, [], { detached: true, shell: false, waitForExit: false });
    if (launched.code !== 0 && launched.code !== null) {
      throw new Error(`Docker is not available for local API tests, and Docker Desktop could not be launched.\n${launched.stderr || launched.stdout || firstError}`.trim());
    }

    for (let attempt = 0; attempt < 90; attempt += 1) {
      const ready = await run("docker", ["info", "--format", "{{.ServerVersion}}"], { capture: true, timeoutMs: 10000 });
      if (ready.code === 0) {
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  throw new Error(`Docker is not available for local API tests.\n${firstError}`.trim());
}

async function containerRunning() {
  const result = await run("docker", ["compose", "ps", "--status", "running", "--services", "postgres"], { capture: true, timeoutMs: 20000 });
  return result.stdout.trim() === "postgres";
}

async function startDatabase() {
  await ensureDocker();
  const started = await run("docker", ["compose", "up", "-d", "postgres"], { capture: true, timeoutMs: 60000 });
  if (started.code !== 0) {
    throw new Error(`Could not start the Roost PostgreSQL service.\n${started.stderr || started.stdout}`.trim());
  }

  for (let attempt = 0; attempt < 40; attempt += 1) {
    const ready = await run("docker", ["compose", "exec", "-T", "postgres", "pg_isready", "-U", "companycore", "-d", "companycore"], { capture: true, timeoutMs: 10000 });
    if (ready.code === 0) {
      const dropped = await run("docker", ["compose", "exec", "-T", "postgres", "dropdb", "-U", "companycore", "--if-exists", "companycore_test"], { capture: true, timeoutMs: 30000 });
      if (dropped.code !== 0) {
        throw new Error(`Could not reset the Roost test database.\n${dropped.stderr || dropped.stdout}`.trim());
      }
      const created = await run("docker", ["compose", "exec", "-T", "postgres", "createdb", "-U", "companycore", "companycore_test"], { capture: true, timeoutMs: 30000 });
      if (created.code !== 0) {
        throw new Error(`Could not create the Roost test database.\n${created.stderr || created.stdout}`.trim());
      }
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error("PostgreSQL test container did not become ready in time.");
}

async function cleanupDatabase(wasRunning) {
  if (!process.env.DATABASE_URL) {
    await run("docker", ["compose", "exec", "-T", "postgres", "dropdb", "-U", "companycore", "--if-exists", "companycore_test"], { capture: true, timeoutMs: 30000 });
  }
  if (!wasRunning) {
    await run("docker", ["compose", "stop", "postgres"], { capture: true, timeoutMs: 30000 });
  }
}

let wasRunning = false;
try {
  assertSafeTestDatabaseUrl(databaseUrl);
  if (!process.env.DATABASE_URL) {
    await ensureDocker();
    wasRunning = await containerRunning();
    await startDatabase();
  }
  const buildResult = await run("npm", ["run", "build"], {
    env: testEnvironment
  });
  if ((buildResult.code ?? 1) !== 0) {
    await cleanupDatabase(wasRunning);
    process.exit(buildResult.code ?? 1);
  }
  const migrateResult = await run("npm", ["run", "prisma:migrate:deploy"], {
    env: testEnvironment
  });
  if ((migrateResult.code ?? 1) !== 0) {
    await cleanupDatabase(wasRunning);
    process.exit(migrateResult.code ?? 1);
  }
  const seedResult = await run("npm", ["run", "seed"], {
    env: testEnvironment
  });
  if ((seedResult.code ?? 1) !== 0) {
    await cleanupDatabase(wasRunning);
    process.exit(seedResult.code ?? 1);
  }
  const result = await run("node", ["--test", "dist/tests/api.test.js"], {
    env: testProcessEnvironment,
    replaceEnv: true,
    unsetEnv: isolatedApplicationVariables,
    assertIsolatedTestEnvironment: true,
    shell: false
  });
  await cleanupDatabase(wasRunning);
  process.exit(result.code ?? 1);
} catch (error) {
  await cleanupDatabase(wasRunning);
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

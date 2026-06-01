const baseUrl = process.env.COMPANYCORE_BASE_URL ?? "https://api.roost.luckysparrow.ch";
const apiKey = process.env.COMPANYCORE_API_KEY;

if (!apiKey) {
  console.error("COMPANYCORE_API_KEY is required for protected Google Drive smoke.");
  process.exit(1);
}

async function request(path, init = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": apiKey,
      ...(init.headers ?? {})
    }
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new Error(`${init.method ?? "GET"} ${path} failed with ${response.status}: ${JSON.stringify(body)}`);
  }
  return body;
}

const connection = await request("/v1/connection");
const capabilities = new Set(connection.data.capabilities);
const requiredCapabilities = [
  "integration-settings:google-drive:read",
  "integration-settings:google-drive:write",
  "integration-settings:google-drive:import",
  "integration-settings:google-drive:changes:reconcile",
  "google-drive:files:read",
  "google-drive:files:write",
  "google-drive:docs:write",
  "google-drive:sheets:write"
];

for (const capability of requiredCapabilities) {
  if (!capabilities.has(capability)) {
    throw new Error(`Missing Google Drive capability in connection manifest: ${capability}`);
  }
}

const files = await request("/v1/google-drive/files");

console.log(JSON.stringify({
  status: "ok",
  workspaceId: connection.data.workspace.id,
  googleDriveConfigured: connection.data.integrations.googleDrive.configured,
  googleDriveActive: connection.data.integrations.googleDrive.active,
  importedFileCount: files.data.length
}));

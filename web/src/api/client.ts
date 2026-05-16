import { clearOwnerToken, ownerToken } from "./auth-token";

const authErrorCodes = new Set([
  "invalid_token",
  "invalid_auth_token",
  "missing_api_key",
  "invalid_api_key"
]);

export class AppApiError extends Error {
  code: string;
  status: number;
  requestId?: string;
  rawMessage?: string;

  constructor({
    code,
    status,
    requestId,
    rawMessage
  }: {
    code: string;
    status: number;
    requestId?: string;
    rawMessage?: string;
  }) {
    super(code);
    this.name = "AppApiError";
    this.code = code;
    this.status = status;
    this.requestId = requestId;
    this.rawMessage = rawMessage;
  }
}

function codeFromStatus(status: number) {
  if (status === 403) {
    return "forbidden";
  }
  if (status >= 500) {
    return "server_error";
  }
  return "request_failed";
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = ownerToken();
  const headers = new Headers(options.headers);
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(path, { ...options, headers });
  } catch (error) {
    throw new AppApiError({
      code: "network_error",
      status: 0,
      rawMessage: error instanceof Error ? error.message : undefined
    });
  }

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errorCode = typeof body?.error === "string" ? body.error : codeFromStatus(response.status);
    if (authErrorCodes.has(errorCode)) {
      clearOwnerToken();
    }
    throw new AppApiError({
      code: errorCode,
      status: response.status,
      requestId: typeof body?.requestId === "string" ? body.requestId : undefined,
      rawMessage: typeof body?.message === "string" ? body.message : undefined
    });
  }

  return body as T;
}

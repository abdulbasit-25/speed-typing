export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...init,
    credentials: "same-origin",
    cache: "no-store",
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });

  if (response.status === 204) {
    return undefined as T;
  }
  const contentType = response.headers.get("content-type") ?? "";
  const payload: unknown = contentType.includes("application/json") ? await response.json() : await response.text();
  if (!response.ok) {
    const error = isRecord(payload) && isRecord(payload.error) ? payload.error : null;
    const message = error && typeof error.message === "string" ? error.message : `Request failed (${response.status}).`;
    const code = error && typeof error.code === "string" ? error.code : "request_failed";
    throw new ApiError(message, response.status, code);
  }
  return payload as T;
}

export function jsonBody(value: unknown): string {
  return JSON.stringify(value);
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

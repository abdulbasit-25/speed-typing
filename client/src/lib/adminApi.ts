import { apiRequest, ApiError } from "./api.js";

let csrfRefresh: Promise<string> | null = null;

export async function adminRequest<T>(
  path: string,
  init: RequestInit,
  csrfToken: string,
  onCsrfToken: (token: string) => void,
): Promise<T> {
  const headers = new Headers(init.headers);
  const method = (init.method ?? "GET").toUpperCase();
  const mutating = method !== "GET" && method !== "HEAD" && method !== "OPTIONS";
  if (mutating) headers.set("X-CSRF-Token", csrfToken);

  try {
    return await apiRequest<T>(path, { ...init, headers });
  } catch (cause) {
    if (!(cause instanceof ApiError && cause.code === "csrf_failed" && mutating)) throw cause;

    const freshToken = await refreshCsrfToken();
    onCsrfToken(freshToken);
    headers.set("X-CSRF-Token", freshToken);
    return apiRequest<T>(path, { ...init, headers });
  }
}

export async function adminFetch(
  path: string,
  init: RequestInit,
  csrfToken: string,
  onCsrfToken: (token: string) => void,
): Promise<Response> {
  const headers = new Headers(init.headers);
  const method = (init.method ?? "GET").toUpperCase();
  const mutating = method !== "GET" && method !== "HEAD" && method !== "OPTIONS";
  if (mutating) headers.set("X-CSRF-Token", csrfToken);

  const request = () => fetch(`/api${path}`, {
    ...init,
    headers,
    credentials: "same-origin",
    cache: "no-store",
  });

  const response = await request();
  if (!mutating || response.status !== 403 || !(await isCsrfFailure(response.clone()))) return response;

  const freshToken = await refreshCsrfToken();
  onCsrfToken(freshToken);
  headers.set("X-CSRF-Token", freshToken);
  return request();
}

async function refreshCsrfToken(): Promise<string> {
  if (!csrfRefresh) {
    csrfRefresh = apiRequest<{ csrfToken: string }>("/admin/csrf", { method: "POST" })
      .then(({ csrfToken }) => csrfToken)
      .finally(() => { csrfRefresh = null; });
  }
  return csrfRefresh;
}

async function isCsrfFailure(response: Response): Promise<boolean> {
  try {
    const payload: unknown = await response.json();
    if (typeof payload !== "object" || payload === null || !("error" in payload)) return false;
    const error = payload.error;
    return typeof error === "object" && error !== null && "code" in error && error.code === "csrf_failed";
  } catch {
    return false;
  }
}

import assert from "node:assert/strict";
import test from "node:test";
import { adminRequest } from "../client/src/lib/adminApi.js";

test("admin requests refresh a stale CSRF token once and retry", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ url: string; headers: Headers }> = [];
  let mutationCount = 0;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const headers = new Headers(init?.headers);
    calls.push({ url, headers });

    if (url === "/api/admin/csrf") {
      return Response.json({ csrfToken: "fresh-token-abcdefghijklmnopqrstuvwxyz" });
    }
    mutationCount += 1;
    if (mutationCount === 1) {
      return Response.json(
        { error: { code: "csrf_failed", message: "Expired token." } },
        { status: 403 },
      );
    }
    return Response.json({ saved: true });
  }) as typeof fetch;

  try {
    let updatedToken = "";
    const result = await adminRequest<{ saved: boolean }>(
      "/admin/competition",
      { method: "PATCH", body: JSON.stringify({ projectorTopN: 5 }) },
      "stale-token",
      (token) => { updatedToken = token; },
    );

    assert.deepEqual(result, { saved: true });
    assert.equal(updatedToken, "fresh-token-abcdefghijklmnopqrstuvwxyz");
    assert.equal(mutationCount, 2);
    assert.equal(calls[0].headers.get("X-CSRF-Token"), "stale-token");
    assert.equal(calls[1].url, "/api/admin/csrf");
    assert.equal(calls[2].headers.get("X-CSRF-Token"), updatedToken);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

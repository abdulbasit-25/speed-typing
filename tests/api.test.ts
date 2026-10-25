import assert from "node:assert/strict";
import test from "node:test";
import { IncomingMessage, ServerResponse } from "node:http";
import { Socket } from "node:net";
import app from "../server/app.js";
import { isSameOriginRequest } from "../server/utils/requestOrigin.js";

interface ApiBody {
  status?: string;
  service?: string;
  timestamp?: string;
  database?: { connection?: string };
  error?: { code?: string };
}

test("health endpoint is served without requiring a MongoDB connection", async () => {
  const response = await dispatch("GET", "/api/health");
  assert.equal(response.status, 200);
  assert.equal(response.body.status, "ok");
  assert.equal(response.body.service, "tech-vanguard-speed-typing");
  assert.equal(response.body.database?.connection, "not_connected");
  assert.ok(Number.isFinite(Date.parse(response.body.timestamp ?? "")));
});

test("admin API rejects unauthenticated requests", async () => {
  const response = await dispatch("GET", "/api/admin/competition");
  assert.equal(response.status, 401);
  assert.equal(response.body.error?.code, "unauthorized");
});

test("passage deletion requires administrator authentication", async () => {
  const response = await dispatch("DELETE", "/api/admin/passages/507f1f77bcf86cd799439011");
  assert.equal(response.status, 401);
  assert.equal(response.body.error?.code, "unauthorized");
});

test("same-origin validation accepts the Vite forwarded host", () => {
  assert.equal(isSameOriginRequest(makeOriginRequest({
    origin: "http://localhost:5173",
    host: "localhost:3001",
    forwardedHost: "localhost:5173",
  })), true);
});

test("same-origin validation rejects missing or mismatched origins", () => {
  assert.equal(isSameOriginRequest(makeOriginRequest({
    host: "localhost:3001",
    forwardedHost: "localhost:5173",
  })), false);
  assert.equal(isSameOriginRequest(makeOriginRequest({
    origin: "https://attacker.example",
    host: "localhost:3001",
    forwardedHost: "localhost:5173",
  })), false);
});

function makeOriginRequest(headers: { origin?: string; host: string; forwardedHost?: string }) {
  const values: Record<string, string | undefined> = {
    origin: headers.origin,
    host: headers.host,
    "x-forwarded-host": headers.forwardedHost,
  };
  return {
    protocol: "http",
    get: (name: string) => values[name.toLowerCase()],
  } as const;
}

async function dispatch(method: string, url: string): Promise<{ status: number; body: ApiBody }> {
  return new Promise((resolve, reject) => {
    const socket = new Socket();
    Object.defineProperty(socket, "remoteAddress", { value: "127.0.0.1" });
    const request = new IncomingMessage(socket);
    request.method = method;
    request.url = url;
    request.headers = { host: "localhost" };
    const response = new ServerResponse(request);
    let responseText = "";
    response.end = ((chunk?: string | Uint8Array) => {
      if (chunk !== undefined) responseText += typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf8");
      try {
        resolve({ status: response.statusCode, body: JSON.parse(responseText) as ApiBody });
      } catch (error) {
        reject(error);
      }
      return response;
    }) as typeof response.end;
    app(request, response);
  });
}

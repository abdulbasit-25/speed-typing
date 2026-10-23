import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type { Request } from "express";
import { AppError } from "./AppError.js";

export function createParticipantKey(): string {
  return randomBytes(32).toString("base64url");
}

export function hashSecret(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function secretsMatch(left: string, rightHash: string): boolean {
  const candidate = Buffer.from(hashSecret(left), "hex");
  const expected = Buffer.from(rightHash, "hex");
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

export function getCookie(request: Request, name: string): string | undefined {
  const cookieHeader = request.headers.cookie;
  if (!cookieHeader) {
    return undefined;
  }

  for (const part of cookieHeader.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0 || part.slice(0, separator).trim() !== name) {
      continue;
    }
    try {
      return decodeURIComponent(part.slice(separator + 1).trim());
    } catch {
      throw new AppError(400, "invalid_cookie", "A request cookie is malformed.");
    }
  }

  return undefined;
}

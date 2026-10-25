import type { RequestHandler } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";
import { Admin } from "../models/Admin.js";
import { connectToDatabase } from "../config/database.js";
import { getSessionSecret, isProduction } from "../config/env.js";
import { AppError } from "../utils/AppError.js";
import { getCookie } from "../utils/security.js";
import { isSameOriginRequest } from "../utils/requestOrigin.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const sessionCookieName = "tv_admin_session";
export const csrfCookieName = "tv_admin_csrf";

export function setCsrfCookie(response: import("express").Response, csrf: string): void {
  response.cookie(csrfCookieName, csrf, {
    secure: isProduction(),
    sameSite: "strict",
    path: "/",
    httpOnly: false,
    maxAge: 8 * 60 * 60 * 1000,
  });
}

export const requireAdmin: RequestHandler = asyncHandler(async (request, _response, next) => {
  const session = getCookie(request, sessionCookieName);
  if (!session) {
    throw new AppError(401, "unauthorized", "Administrator sign-in is required.");
  }

  let payload: string | JwtPayload;
  try {
    payload = jwt.verify(session, getSessionSecret(), {
      issuer: "tech-vanguard-speed-typing",
      audience: "tech-vanguard-admin",
    });
  } catch {
    throw new AppError(401, "unauthorized", "Administrator session is invalid or expired.");
  }

  if (typeof payload === "string" || typeof payload.sub !== "string") {
    throw new AppError(401, "unauthorized", "Administrator session is invalid.");
  }

  await connectToDatabase();
  const admin = await Admin.exists({ _id: payload.sub, active: true });
  if (!admin) {
    throw new AppError(401, "unauthorized", "Administrator session is no longer active.");
  }

  request.adminId = payload.sub;
  next();
});

export const requireCsrf: RequestHandler = (request, _response, next) => {
  const cookieToken = getCookie(request, csrfCookieName);
  const headerToken = request.get("x-csrf-token");
  if (!cookieToken || !headerToken || cookieToken.length < 32 || cookieToken !== headerToken) {
    next(new AppError(403, "csrf_failed", "The request could not be verified. Refresh the page and try again."));
    return;
  }

  const origin = request.get("origin");
  if (origin && !isSameOriginRequest(request)) {
    next(new AppError(403, "origin_mismatch", "Requests must come from this application."));
    return;
  }
  next();
};

export function setAdminCookies(response: import("express").Response, session: string, csrf: string): void {
  const common = {
    secure: isProduction(),
    sameSite: "strict" as const,
    path: "/",
  };
  response.cookie(sessionCookieName, session, {
    ...common,
    httpOnly: true,
    maxAge: 8 * 60 * 60 * 1000,
  });
  setCsrfCookie(response, csrf);
}

export function clearAdminCookies(response: import("express").Response): void {
  const common = { secure: isProduction(), sameSite: "strict" as const, path: "/" };
  response.clearCookie(sessionCookieName, { ...common, httpOnly: true });
  response.clearCookie(csrfCookieName, { ...common, httpOnly: false });
}

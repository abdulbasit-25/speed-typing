import type { RequestHandler } from "express";
import { connectToDatabase } from "../config/database.js";
import { RateLimitBucket } from "../models/RateLimitBucket.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { AppError } from "../utils/AppError.js";
import { hashSecret } from "../utils/security.js";
import { isDuplicateKeyError } from "../services/competition.js";

export function persistentRateLimit(scope: string, limit: number, windowMilliseconds: number): RequestHandler {
  return asyncHandler(async (request, response, next) => {
    await connectToDatabase();
    const now = Date.now();
    const windowStart = new Date(Math.floor(now / windowMilliseconds) * windowMilliseconds);
    const expiresAt = new Date(windowStart.getTime() + windowMilliseconds * 2);
    const address = request.ip || request.socket.remoteAddress || "unknown";
    const key = hashSecret(`${scope}:${address}`);
    let bucket;
    try {
      bucket = await RateLimitBucket.findOneAndUpdate(
        { key, windowStart },
        { $inc: { hits: 1 }, $setOnInsert: { expiresAt } },
        { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
      );
    } catch (error) {
      if (!isDuplicateKeyError(error)) throw error;
      bucket = await RateLimitBucket.findOneAndUpdate(
        { key, windowStart },
        { $inc: { hits: 1 } },
        { returnDocument: "after" },
      );
    }

    if (!bucket) {
      throw new AppError(503, "rate_limit_unavailable", "Request protection is temporarily unavailable.");
    }
    const remaining = Math.max(0, limit - bucket.hits);
    const resetSeconds = Math.ceil((windowStart.getTime() + windowMilliseconds - now) / 1000);
    response.setHeader("RateLimit-Limit", String(limit));
    response.setHeader("RateLimit-Remaining", String(remaining));
    response.setHeader("RateLimit-Reset", String(resetSeconds));
    if (bucket.hits > limit) {
      response.setHeader("Retry-After", String(resetSeconds));
      throw new AppError(429, "rate_limit_exceeded", "Too many requests. Wait briefly and try again.");
    }
    next();
  });
}

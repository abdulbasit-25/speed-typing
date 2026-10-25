import "dotenv/config";
import { z } from "zod";
import { AppError } from "../utils/AppError.js";

const mongoUriSchema = z.string().trim().min(1, "Set MONGODB_URI (or the legacy MONGO_URI) in your environment.");
const sessionSecretSchema = z
  .string()
  .min(32, "SESSION_SECRET must contain at least 32 characters");

export function getMongoUri(): string {
  const configuredUri = process.env.MONGODB_URI?.trim() || process.env.MONGO_URI?.trim();
  const result = mongoUriSchema.safeParse(configuredUri);
  if (!result.success) {
    throw new AppError(503, "server_configuration", result.error.issues[0]?.message ?? "MONGODB_URI is required");
  }
  return result.data;
}

export function getSessionSecret(): string {
  const result = sessionSecretSchema.safeParse(process.env.SESSION_SECRET);
  if (!result.success) {
    throw new AppError(503, "server_configuration", result.error.issues[0]?.message ?? "SESSION_SECRET is invalid");
  }
  return result.data;
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

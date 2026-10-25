import mongoose from "mongoose";
import { getMongoUri } from "./env.js";
import { Admin } from "../models/Admin.js";
import { AdminAuditLog } from "../models/AdminAuditLog.js";
import { Competition } from "../models/Competition.js";
import { Participant } from "../models/Participant.js";
import { RateLimitBucket } from "../models/RateLimitBucket.js";
import { TypingAttempt } from "../models/TypingAttempt.js";
import { TypingPassage } from "../models/TypingPassage.js";

export const databaseName = "speed-typing";

type DatabaseCache = {
  connection?: Promise<typeof mongoose>;
};

const globalCache = globalThis as typeof globalThis & { __speedTypingMongo?: DatabaseCache };
const cache = (globalCache.__speedTypingMongo ??= {});

export async function connectToDatabase(): Promise<typeof mongoose> {
  if (cache.connection) {
    return cache.connection;
  }
  if (mongoose.connection.readyState === 1) return mongoose;

  cache.connection = mongoose.connect(getMongoUri(), {
    dbName: databaseName,
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 8000,
    bufferCommands: false,
  }).then(async (connection) => {
    await Promise.all([
      Admin.init(),
      AdminAuditLog.init(),
      Competition.init(),
      Participant.init(),
      RateLimitBucket.init(),
      TypingAttempt.init(),
      TypingPassage.init(),
    ]);
    return connection;
  }).catch((error: unknown) => {
    cache.connection = undefined;
    throw error;
  });
  return cache.connection;
}

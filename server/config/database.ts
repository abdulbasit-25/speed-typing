import mongoose from "mongoose";
import { getMongoUri } from "./env.js";
import { Admin } from "../models/Admin.js";
import { AdminAuditLog } from "../models/AdminAuditLog.js";
import { Competition } from "../models/Competition.js";
import { Participant } from "../models/Participant.js";
import { TypingAttempt } from "../models/TypingAttempt.js";
import { TypingPassage } from "../models/TypingPassage.js";

type DatabaseCache = {
  connection?: Promise<typeof mongoose>;
};

const globalCache = globalThis as typeof globalThis & { __speedTypingMongo?: DatabaseCache };
const cache = (globalCache.__speedTypingMongo ??= {});

export async function connectToDatabase(): Promise<typeof mongoose> {
  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }
  if (!cache.connection) {
    cache.connection = mongoose.connect(getMongoUri(), {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 8000,
      bufferCommands: false,
    }).then(async (connection) => {
      await Promise.all([
        Admin.init(),
        AdminAuditLog.init(),
        Competition.init(),
        Participant.init(),
        TypingAttempt.init(),
        TypingPassage.init(),
      ]);
      return connection;
    }).catch((error: unknown) => {
      cache.connection = undefined;
      throw error;
    });
  }
  return cache.connection;
}

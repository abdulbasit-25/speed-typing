import assert from "node:assert/strict";
import test from "node:test";
import { getMongoUri } from "../server/config/env.js";

test("uses the canonical MongoDB URI when configured", () => {
  const previousMongoDbUri = process.env.MONGODB_URI;
  const previousMongoUri = process.env.MONGO_URI;
  try {
    process.env.MONGODB_URI = "mongodb+srv://primary.example.test/app";
    process.env.MONGO_URI = "mongodb://legacy.example.test/app";
    assert.equal(getMongoUri(), "mongodb+srv://primary.example.test/app");
  } finally {
    restoreEnvironmentValue("MONGODB_URI", previousMongoDbUri);
    restoreEnvironmentValue("MONGO_URI", previousMongoUri);
  }
});

test("accepts the existing MONGO_URI environment variable as a fallback", () => {
  const previousMongoDbUri = process.env.MONGODB_URI;
  const previousMongoUri = process.env.MONGO_URI;
  try {
    delete process.env.MONGODB_URI;
    process.env.MONGO_URI = "mongodb+srv://existing.example.test/app";
    assert.equal(getMongoUri(), "mongodb+srv://existing.example.test/app");
  } finally {
    restoreEnvironmentValue("MONGODB_URI", previousMongoDbUri);
    restoreEnvironmentValue("MONGO_URI", previousMongoUri);
  }
});

function restoreEnvironmentValue(name: string, value: string | undefined): void {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

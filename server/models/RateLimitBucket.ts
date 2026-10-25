import mongoose from "mongoose";
const { Schema } = mongoose;

const rateLimitBucketSchema = new Schema(
  {
    key: { type: String, required: true },
    windowStart: { type: Date, required: true },
    hits: { type: Number, required: true, min: 0, default: 0 },
    expiresAt: { type: Date, required: true },
  },
  { versionKey: false },
);

rateLimitBucketSchema.index({ key: 1, windowStart: 1 }, { unique: true });
rateLimitBucketSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RateLimitBucket = mongoose.models.RateLimitBucket ?? mongoose.model("RateLimitBucket", rateLimitBucketSchema);

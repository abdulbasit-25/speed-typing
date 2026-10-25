import mongoose from "mongoose";
const { Schema } = mongoose;

const adminSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ["admin"], required: true, default: "admin" },
    active: { type: Boolean, required: true, default: true },
    lastLoginAt: { type: Date },
  },
  { timestamps: true, versionKey: false },
);

export const Admin = mongoose.models.Admin ?? mongoose.model("Admin", adminSchema);

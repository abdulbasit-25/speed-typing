import { Schema, model, models } from "mongoose";

const adminAuditLogSchema = new Schema(
  {
    adminId: { type: Schema.Types.ObjectId, ref: "Admin", required: true, index: true },
    competitionId: { type: Schema.Types.ObjectId, ref: "Competition" },
    action: { type: String, required: true, maxlength: 100 },
    reason: { type: String, maxlength: 500 },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true, versionKey: false },
);

adminAuditLogSchema.index({ competitionId: 1, createdAt: -1 });

export const AdminAuditLog = models.AdminAuditLog ?? model("AdminAuditLog", adminAuditLogSchema);

import { Schema, model, models } from "mongoose";

const participantSchema = new Schema(
  {
    competitionId: { type: Schema.Types.ObjectId, ref: "Competition", required: true, index: true },
    username: { type: String, required: true, trim: true, minlength: 3, maxlength: 20 },
    usernameNormalized: { type: String, required: true, lowercase: true, trim: true },
    displayName: { type: String, trim: true, maxlength: 40 },
    participantKeyHash: { type: String, required: true, select: false },
    attemptsStarted: { type: Number, required: true, min: 0, default: 0 },
    status: { type: String, enum: ["active", "blocked"], required: true, default: "active" },
  },
  { timestamps: true, versionKey: false },
);

participantSchema.index({ competitionId: 1, usernameNormalized: 1 }, { unique: true });

export const Participant = models.Participant ?? model("Participant", participantSchema);

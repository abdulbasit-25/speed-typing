import { Schema, model, models } from "mongoose";

const typingPassageSchema = new Schema(
  {
    competitionId: { type: Schema.Types.ObjectId, ref: "Competition", required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 100 },
    text: { type: String, required: true, minlength: 300, maxlength: 5000 },
    difficulty: { type: String, enum: ["beginner", "intermediate", "advanced"], required: true, default: "intermediate" },
    active: { type: Boolean, required: true, default: true },
  },
  { timestamps: true, versionKey: false },
);

typingPassageSchema.index({ competitionId: 1, active: 1 });
typingPassageSchema.index({ competitionId: 1, title: 1 }, { unique: true });

export const TypingPassage = models.TypingPassage ?? model("TypingPassage", typingPassageSchema);

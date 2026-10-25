import mongoose from "mongoose";
const { Schema } = mongoose;

const typingAttemptSchema = new Schema(
  {
    attemptId: { type: String, required: true, unique: true, immutable: true },
    competitionId: { type: Schema.Types.ObjectId, ref: "Competition", required: true },
    participantId: { type: Schema.Types.ObjectId, ref: "Participant", required: true },
    passageId: { type: Schema.Types.ObjectId, ref: "TypingPassage", required: true },
    startedAt: { type: Date, required: true, immutable: true },
    expiresAt: { type: Date, required: true, immutable: true },
    durationSeconds: { type: Number, required: true, min: 15, max: 300, immutable: true },
    scoringMetric: { type: String, enum: ["netWpm", "grossWpm"], required: true, immutable: true },
    passageTitle: { type: String, required: true, maxlength: 100, immutable: true },
    passageText: { type: String, required: true, minlength: 300, maxlength: 5000, immutable: true, select: false },
    status: { type: String, enum: ["started", "submitted", "invalidated", "expired"], required: true, default: "started" },
    submittedAt: { type: Date },
    elapsedSeconds: { type: Number, min: 0 },
    typedCharacters: { type: Number, min: 0 },
    correctCharacters: { type: Number, min: 0 },
    incorrectCharacters: { type: Number, min: 0 },
    errorCount: { type: Number, min: 0 },
    grossWpm: { type: Number, min: 0 },
    netWpm: { type: Number, min: 0 },
    accuracy: { type: Number, min: 0, max: 100 },
    finalScore: { type: Number, min: 0 },
    submissionHash: { type: String, select: false },
    invalidReason: { type: String, maxlength: 500 },
    invalidatedBy: { type: Schema.Types.ObjectId, ref: "Admin" },
  },
  { timestamps: true, versionKey: false },
);

typingAttemptSchema.index({ competitionId: 1, status: 1, finalScore: -1, accuracy: -1, errorCount: 1, submittedAt: 1 });
typingAttemptSchema.index({ competitionId: 1, participantId: 1, status: 1, finalScore: -1, accuracy: -1, errorCount: 1, submittedAt: 1 });
typingAttemptSchema.index({ participantId: 1, createdAt: -1 });
typingAttemptSchema.index({ status: 1, expiresAt: 1 });
typingAttemptSchema.index({ participantId: 1 }, { unique: true, partialFilterExpression: { status: "started" } });

export const TypingAttempt = mongoose.models.TypingAttempt ?? mongoose.model("TypingAttempt", typingAttemptSchema);

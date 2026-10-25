import mongoose from "mongoose";

export const competitionStatuses = ["upcoming", "registration_open", "live", "paused", "completed"] as const;
export type CompetitionStatus = (typeof competitionStatuses)[number];
const { Schema } = mongoose;

const competitionSchema = new Schema(
  {
    isCurrent: { type: Boolean, required: true, default: true },
    name: { type: String, required: true, trim: true, maxlength: 120, default: "RapidStrike Championship" },
    institution: { type: String, required: true, trim: true, maxlength: 120, default: "Air University, Islamabad" },
    status: { type: String, enum: competitionStatuses, required: true, default: "upcoming" },
    durationSeconds: { type: Number, min: 15, max: 300, required: true, default: 60 },
    maxAttempts: { type: Number, min: 1, max: 5, required: true, default: 1 },
    scoringMetric: { type: String, enum: ["netWpm", "grossWpm"], required: true, default: "netWpm" },
    displayNamesEnabled: { type: Boolean, required: true, default: false },
    accessCodeEnabled: { type: Boolean, required: true, default: false },
    accessCodeHash: { type: String, select: false },
    projectorTopN: { type: Number, min: 3, max: 20, required: true, default: 10 },
    hideSecondaryStats: { type: Boolean, required: true, default: false },
    registrationOpenedAt: { type: Date },
    startedAt: { type: Date },
    endedAt: { type: Date },
    archivedAt: { type: Date },
  },
  { timestamps: true, optimisticConcurrency: true },
);

competitionSchema.index({ isCurrent: 1 }, { unique: true, partialFilterExpression: { isCurrent: true } });

export type CompetitionDocument = ReturnType<typeof Competition["hydrate"]>;
export const Competition = mongoose.models.Competition ?? mongoose.model("Competition", competitionSchema);

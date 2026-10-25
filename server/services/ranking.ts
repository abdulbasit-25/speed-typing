import mongoose, { type PipelineStage } from "mongoose";
import { Participant } from "../models/Participant.js";
import { TypingAttempt } from "../models/TypingAttempt.js";

export interface BestAttemptRecord {
  attemptId: string;
  username: string;
  displayName: string | null;
  finalScore: number;
  grossWpm: number;
  netWpm: number;
  accuracy: number;
  errorCount: number;
  elapsedSeconds: number;
  submittedAt: Date;
}

export async function getBestAttempts(
  competitionId: mongoose.Types.ObjectId,
  limit?: number,
): Promise<BestAttemptRecord[]> {
  const pipeline: PipelineStage[] = [
    { $match: { competitionId, status: "submitted" } },
    { $sort: { participantId: 1, finalScore: -1, accuracy: -1, errorCount: 1, submittedAt: 1 } },
    {
      $group: {
        _id: "$participantId",
        attemptId: { $first: "$attemptId" },
        finalScore: { $first: "$finalScore" },
        grossWpm: { $first: "$grossWpm" },
        netWpm: { $first: "$netWpm" },
        accuracy: { $first: "$accuracy" },
        errorCount: { $first: "$errorCount" },
        elapsedSeconds: { $first: "$elapsedSeconds" },
        submittedAt: { $first: "$submittedAt" },
      },
    },
    { $sort: { finalScore: -1, accuracy: -1, errorCount: 1, submittedAt: 1, _id: 1 } },
  ];
  if (limit !== undefined) pipeline.push({ $limit: limit });
  pipeline.push(
    {
      $lookup: {
        from: Participant.collection.name,
        localField: "_id",
        foreignField: "_id",
        as: "participant",
      },
    },
    { $unwind: { path: "$participant", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 0,
        attemptId: 1,
        username: { $ifNull: ["$participant.username", "Unknown participant"] },
        displayName: { $ifNull: ["$participant.displayName", null] },
        finalScore: 1,
        grossWpm: 1,
        netWpm: 1,
        accuracy: 1,
        errorCount: 1,
        elapsedSeconds: 1,
        submittedAt: 1,
      },
    },
  );
  return TypingAttempt.aggregate<BestAttemptRecord>(pipeline);
}

export async function getParticipantRank(
  competitionId: mongoose.Types.ObjectId,
  participantId: mongoose.Types.ObjectId,
): Promise<number | null> {
  const best = await TypingAttempt.findOne({
    competitionId,
    participantId,
    status: "submitted",
  })
    .select("finalScore accuracy errorCount submittedAt")
    .sort({ finalScore: -1, accuracy: -1, errorCount: 1, submittedAt: 1 })
    .lean();
  if (!best?.submittedAt) return null;

  const better = await TypingAttempt.aggregate<{ count: number }>([
    { $match: { competitionId, status: "submitted" } },
    { $sort: { participantId: 1, finalScore: -1, accuracy: -1, errorCount: 1, submittedAt: 1 } },
    {
      $group: {
        _id: "$participantId",
        finalScore: { $first: "$finalScore" },
        accuracy: { $first: "$accuracy" },
        errorCount: { $first: "$errorCount" },
        submittedAt: { $first: "$submittedAt" },
      },
    },
    {
      $match: {
        $or: [
          { finalScore: { $gt: best.finalScore } },
          { finalScore: best.finalScore, accuracy: { $gt: best.accuracy } },
          { finalScore: best.finalScore, accuracy: best.accuracy, errorCount: { $lt: best.errorCount } },
          { finalScore: best.finalScore, accuracy: best.accuracy, errorCount: best.errorCount, submittedAt: { $lt: best.submittedAt } },
          { finalScore: best.finalScore, accuracy: best.accuracy, errorCount: best.errorCount, submittedAt: best.submittedAt, _id: { $lt: participantId } },
        ],
      },
    },
    { $count: "count" },
  ]);
  return (better[0]?.count ?? 0) + 1;
}

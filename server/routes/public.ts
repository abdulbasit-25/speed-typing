import { randomUUID } from "node:crypto";
import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { connectToDatabase } from "../config/database.js";
import { Competition } from "../models/Competition.js";
import { Participant } from "../models/Participant.js";
import { TypingAttempt } from "../models/TypingAttempt.js";
import { TypingPassage } from "../models/TypingPassage.js";
import { getCurrentCompetition, isDuplicateKeyError } from "../services/competition.js";
import { calculateScore, normalizeUsername } from "../services/scoring.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { AppError } from "../utils/AppError.js";
import { createParticipantKey, hashSecret, secretsMatch } from "../utils/security.js";

const router = Router();
const registerLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 12, standardHeaders: "draft-8", legacyHeaders: false });
const startLimiter = rateLimit({ windowMs: 60 * 1000, limit: 20, standardHeaders: "draft-8", legacyHeaders: false });
const submitLimiter = rateLimit({ windowMs: 60 * 1000, limit: 30, standardHeaders: "draft-8", legacyHeaders: false });

const usernameSchema = z.string().trim().min(3).max(20).regex(/^[A-Za-z0-9_]+$/, "Use 3–20 letters, numbers, or underscores.");
const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, "A valid participant ID is required.");
const participantKeySchema = z.string().min(40).max(60);
const registrationSchema = z.object({
  username: usernameSchema,
  displayName: z.string().trim().max(40).optional(),
  accessCode: z.string().max(64).optional(),
}).strict();
const participantAuthSchema = z.object({
  participantId: objectIdSchema,
  participantKey: participantKeySchema,
}).strict();
const submitSchema = participantAuthSchema.extend({
  text: z.string().max(5000),
}).strict();

router.get("/competition", asyncHandler(async (_request, response) => {
  await connectToDatabase();
  const competition = await getCurrentCompetition();
  response.json({
    competition: {
      id: competition.id,
      name: competition.name,
      institution: competition.institution,
      status: competition.status,
      durationSeconds: competition.durationSeconds,
      maxAttempts: competition.maxAttempts,
      displayNamesEnabled: competition.displayNamesEnabled,
      accessCodeEnabled: competition.accessCodeEnabled,
      projectorTopN: competition.projectorTopN,
      hideSecondaryStats: competition.hideSecondaryStats,
      startedAt: competition.startedAt?.toISOString() ?? null,
      endedAt: competition.endedAt?.toISOString() ?? null,
    },
  });
}));

router.post("/participants/register", registerLimiter, asyncHandler(async (request, response) => {
  const body = registrationSchema.parse(request.body);
  await connectToDatabase();
  const competition = await getCurrentCompetition();
  if (competition.status !== "registration_open") {
    throw new AppError(409, "registration_closed", "Registration is not currently open.");
  }
  if (body.displayName && !competition.displayNamesEnabled) {
    throw new AppError(400, "display_name_disabled", "Display names are not enabled for this competition.");
  }
  if (competition.accessCodeEnabled) {
    const code = body.accessCode?.trim();
    const codeHash = await Competition.findById(competition._id).select("+accessCodeHash").then((record) => record?.accessCodeHash);
    if (!code || !codeHash || !(await bcrypt.compare(code, codeHash))) {
      throw new AppError(403, "invalid_access_code", "The competition access code is incorrect.");
    }
  }

  const { username, normalized } = normalizeUsername(body.username);
  const participantKey = createParticipantKey();
  try {
    const participant = await Participant.create({
      competitionId: competition._id,
      username,
      usernameNormalized: normalized,
      displayName: body.displayName?.trim() || undefined,
      participantKeyHash: hashSecret(participantKey),
    });
    response.status(201).json({
      participant: { id: participant.id, username: participant.username, displayName: participant.displayName ?? null },
      participantKey,
      maxAttempts: competition.maxAttempts,
    });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw new AppError(409, "username_taken", "That username is already registered.");
    }
    throw error;
  }
}));

router.post("/attempts/current", asyncHandler(async (request, response) => {
  const body = participantAuthSchema.parse(request.body);
  if (!mongoose.Types.ObjectId.isValid(body.participantId)) {
    throw new AppError(400, "invalid_participant", "The participant ID is invalid.");
  }
  await connectToDatabase();
  const participant = await Participant.findById(body.participantId).select("+participantKeyHash");
  if (!participant || !secretsMatch(body.participantKey, participant.participantKeyHash)) {
    throw new AppError(403, "participant_auth_failed", "This participant session is invalid.");
  }
  const active = await TypingAttempt.findOne({
    competitionId: participant.competitionId,
    participantId: participant._id,
    status: "started",
  }).sort({ startedAt: -1 });
  if (active) {
    const passage = await TypingPassage.findById(active.passageId).select("title text");
    if (!passage) {
      throw new AppError(503, "passage_unavailable", "The assigned typing passage is unavailable.");
    }
    response.json({
      attempt: {
        id: active.attemptId,
        startedAt: active.startedAt.toISOString(),
        expiresAt: active.expiresAt.toISOString(),
        durationSeconds: active.durationSeconds,
        passage: { title: passage.title, text: passage.text },
      },
    });
    return;
  }

  const latest = await TypingAttempt.findOne({
    competitionId: participant.competitionId,
    participantId: participant._id,
    status: "submitted",
  }).sort({ submittedAt: -1 });
  if (!latest) {
    response.json({ attempt: null, result: null });
    return;
  }
  const rank = await TypingAttempt.countDocuments({
    competitionId: participant.competitionId,
    status: "submitted",
    $or: [
      { finalScore: { $gt: latest.finalScore } },
      { finalScore: latest.finalScore, accuracy: { $gt: latest.accuracy } },
      { finalScore: latest.finalScore, accuracy: latest.accuracy, errorCount: { $lt: latest.errorCount } },
      { finalScore: latest.finalScore, accuracy: latest.accuracy, errorCount: latest.errorCount, submittedAt: { $lt: latest.submittedAt } },
    ],
  }) + 1;
  response.json({
    attempt: null,
    result: { ...resultResponse(latest), rank },
  });
}));

router.post("/attempts/start", startLimiter, asyncHandler(async (request, response) => {
  const body = participantAuthSchema.parse(request.body);
  if (!mongoose.Types.ObjectId.isValid(body.participantId)) {
    throw new AppError(400, "invalid_participant", "The participant ID is invalid.");
  }

  await connectToDatabase();
  const competition = await getCurrentCompetition();
  if (competition.status !== "live") {
    throw new AppError(409, "competition_not_live", "The competition is not accepting attempts.");
  }

  const participant = await Participant.findOne({
    _id: body.participantId,
    competitionId: competition._id,
    status: "active",
  }).select("+participantKeyHash");
  if (!participant || !secretsMatch(body.participantKey, participant.participantKeyHash)) {
    throw new AppError(403, "participant_auth_failed", "This participant session is invalid.");
  }

  const now = new Date();
  const activeAttempt = await TypingAttempt.exists({
    participantId: participant._id,
    status: "started",
    expiresAt: { $gt: now },
  });
  if (activeAttempt) {
    throw new AppError(409, "attempt_in_progress", "An attempt is already in progress.");
  }

  const passage = await TypingPassage.findOne({ competitionId: competition._id, active: true }).sort({ createdAt: 1 });
  if (!passage) {
    throw new AppError(503, "passage_unavailable", "No approved typing passage is available.");
  }

  const reservation = await Participant.findOneAndUpdate(
    { _id: participant._id, status: "active", attemptsStarted: { $lt: competition.maxAttempts } },
    { $inc: { attemptsStarted: 1 } },
    { new: true },
  );
  if (!reservation) {
    throw new AppError(409, "attempt_limit_reached", "The allowed number of attempts has been used.");
  }

  const attemptId = randomUUID();
  const expiresAt = new Date(now.getTime() + competition.durationSeconds * 1000);
  try {
    await TypingAttempt.create({
      attemptId,
      competitionId: competition._id,
      participantId: participant._id,
      passageId: passage._id,
      startedAt: now,
      expiresAt,
      durationSeconds: competition.durationSeconds,
      scoringMetric: competition.scoringMetric,
    });
  } catch (error) {
    await Participant.updateOne({ _id: participant._id }, { $inc: { attemptsStarted: -1 } });
    throw error;
  }

  response.status(201).json({
    attempt: {
      id: attemptId,
      startedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      durationSeconds: competition.durationSeconds,
      passage: { title: passage.title, text: passage.text },
    },
  });
}));

router.post("/attempts/:attemptId/submit", submitLimiter, asyncHandler(async (request, response) => {
  const attemptId = z.string().uuid().parse(request.params.attemptId);
  const body = submitSchema.parse(request.body);
  if (!mongoose.Types.ObjectId.isValid(body.participantId)) {
    throw new AppError(400, "invalid_participant", "The participant ID is invalid.");
  }
  await connectToDatabase();

  const participant = await Participant.findById(body.participantId).select("+participantKeyHash");
  if (!participant || !secretsMatch(body.participantKey, participant.participantKeyHash)) {
    throw new AppError(403, "participant_auth_failed", "This participant session is invalid.");
  }

  const attempt = await TypingAttempt.findOne({ attemptId, participantId: participant._id }).select("+submissionHash");
  if (!attempt) {
    throw new AppError(404, "attempt_not_found", "The attempt was not found.");
  }

  const submissionHash = hashSecret(body.text);
  if (attempt.status === "submitted") {
    if (attempt.submissionHash !== submissionHash) {
      throw new AppError(409, "already_submitted", "This attempt has already been submitted.");
    }
    response.json({ result: resultResponse(attempt), accepted: true, idempotent: true });
    return;
  }
  if (attempt.status !== "started") {
    throw new AppError(409, "attempt_not_submittable", "This attempt cannot be submitted.");
  }

  const passage = await TypingPassage.findById(attempt.passageId).select("text");
  if (!passage) {
    throw new AppError(503, "passage_unavailable", "The assigned typing passage is unavailable.");
  }

  const now = new Date();
  const elapsedMilliseconds = Math.max(0, now.getTime() - attempt.startedAt.getTime());
  const completedPassage = Array.from(body.text).length >= Array.from(passage.text).length;
  if (!completedPassage && elapsedMilliseconds < attempt.durationSeconds * 1000 - 1000) {
    throw new AppError(409, "attempt_not_finished", "The typing timer is still running.");
  }

  const elapsedSeconds = Math.max(1, Math.min(attempt.durationSeconds, Math.floor(elapsedMilliseconds / 1000)));
  const score = calculateScore(passage.text, body.text, elapsedSeconds);
  const update = await TypingAttempt.updateOne(
    { _id: attempt._id, status: "started" },
    {
      $set: {
        status: "submitted",
        submittedAt: now,
        elapsedSeconds,
        ...score,
        submissionHash,
      },
    },
  );

  if (update.modifiedCount === 0) {
    const existing = await TypingAttempt.findById(attempt._id).select("+submissionHash");
    if (existing?.status === "submitted" && existing.submissionHash === submissionHash) {
      response.json({ result: resultResponse(existing), accepted: true, idempotent: true });
      return;
    }
    throw new AppError(409, "attempt_not_submittable", "This attempt was already processed.");
  }

  const acceptedAttempt = await TypingAttempt.findById(attempt._id);
  if (!acceptedAttempt) {
    throw new AppError(500, "result_unavailable", "The accepted result could not be loaded.");
  }
  const rank = await TypingAttempt.countDocuments({
    competitionId: attempt.competitionId,
    status: "submitted",
    $or: [
      { finalScore: { $gt: acceptedAttempt.finalScore } },
      { finalScore: acceptedAttempt.finalScore, accuracy: { $gt: acceptedAttempt.accuracy } },
      { finalScore: acceptedAttempt.finalScore, accuracy: acceptedAttempt.accuracy, errorCount: { $lt: acceptedAttempt.errorCount } },
      {
        finalScore: acceptedAttempt.finalScore,
        accuracy: acceptedAttempt.accuracy,
        errorCount: acceptedAttempt.errorCount,
        submittedAt: { $lt: acceptedAttempt.submittedAt },
      },
    ],
  }) + 1;

  response.status(201).json({ result: { ...resultResponse(acceptedAttempt), rank }, accepted: true, idempotent: false });
}));

const leaderboardQuery = z.object({ limit: z.coerce.number().int().min(1).max(100).default(20) });

router.get("/leaderboard", asyncHandler(async (request, response) => {
  const { limit } = leaderboardQuery.parse(request.query);
  await connectToDatabase();
  const competition = await getCurrentCompetition();
  const attempts = await TypingAttempt.find({ competitionId: competition._id, status: "submitted" })
    .sort({ finalScore: -1, accuracy: -1, errorCount: 1, submittedAt: 1 })
    .limit(limit)
    .populate({ path: "participantId", select: "username displayName" })
    .lean();
  const participantCount = await Participant.countDocuments({ competitionId: competition._id, status: "active" });
  const submittedCount = await TypingAttempt.countDocuments({ competitionId: competition._id, status: "submitted" });

  response.json({
    competition: {
      name: competition.name,
      institution: competition.institution,
      status: competition.status,
      durationSeconds: competition.durationSeconds,
      projectorTopN: competition.projectorTopN,
      hideSecondaryStats: competition.hideSecondaryStats,
    },
    participantCount,
    submittedCount,
    updatedAt: new Date().toISOString(),
    results: attempts.map((attempt, index) => {
      const participant = attempt.participantId as unknown as { username: string; displayName?: string } | null;
      return {
        rank: index + 1,
        username: participant?.username ?? "Participant",
        displayName: participant?.displayName ?? null,
        grossWpm: attempt.grossWpm ?? 0,
        netWpm: attempt.netWpm ?? 0,
        accuracy: attempt.accuracy ?? 0,
        errorCount: attempt.errorCount ?? 0,
        elapsedSeconds: attempt.elapsedSeconds ?? 0,
        submittedAt: attempt.submittedAt?.toISOString() ?? null,
      };
    }),
  });
}));

router.get("/leaderboard/summary", asyncHandler(async (_request, response) => {
  await connectToDatabase();
  const competition = await getCurrentCompetition();
  const participantCount = await Participant.countDocuments({ competitionId: competition._id, status: "active" });
  const submittedCount = await TypingAttempt.countDocuments({ competitionId: competition._id, status: "submitted" });
  response.json({ status: competition.status, participantCount, submittedCount, updatedAt: new Date().toISOString() });
}));

function resultResponse(attempt: {
  attemptId: string;
  elapsedSeconds?: number;
  typedCharacters?: number;
  correctCharacters?: number;
  incorrectCharacters?: number;
  errorCount?: number;
  grossWpm?: number;
  netWpm?: number;
  accuracy?: number;
  finalScore?: number;
  submittedAt?: Date;
}) {
  return {
    attemptId: attempt.attemptId,
    elapsedSeconds: attempt.elapsedSeconds ?? 0,
    typedCharacters: attempt.typedCharacters ?? 0,
    correctCharacters: attempt.correctCharacters ?? 0,
    incorrectCharacters: attempt.incorrectCharacters ?? 0,
    errorCount: attempt.errorCount ?? 0,
    grossWpm: attempt.grossWpm ?? 0,
    netWpm: attempt.netWpm ?? 0,
    accuracy: attempt.accuracy ?? 0,
    finalScore: attempt.finalScore ?? 0,
    submittedAt: attempt.submittedAt?.toISOString() ?? null,
  };
}

export default router;

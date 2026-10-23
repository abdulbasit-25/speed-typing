import { randomBytes } from "node:crypto";
import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { z } from "zod";
import { connectToDatabase } from "../config/database.js";
import { getSessionSecret, isProduction } from "../config/env.js";
import { Admin } from "../models/Admin.js";
import { AdminAuditLog } from "../models/AdminAuditLog.js";
import { Competition } from "../models/Competition.js";
import { Participant } from "../models/Participant.js";
import { TypingAttempt } from "../models/TypingAttempt.js";
import { TypingPassage } from "../models/TypingPassage.js";
import { getCurrentCompetition } from "../services/competition.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { AppError } from "../utils/AppError.js";
import { clearAdminCookies, csrfCookieName, requireAdmin, requireCsrf, setAdminCookies } from "../middleware/auth.js";
import { getCookie } from "../utils/security.js";

const router = Router();
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 8, standardHeaders: "draft-8", legacyHeaders: false });
const adminListQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().trim().max(80).optional(),
  status: z.string().trim().max(30).optional(),
});
const loginSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(200),
}).strict();
const settingsSchema = z.object({
  durationSeconds: z.number().int().min(15).max(300).optional(),
  maxAttempts: z.number().int().min(1).max(5).optional(),
  displayNamesEnabled: z.boolean().optional(),
  accessCodeEnabled: z.boolean().optional(),
  accessCode: z.string().trim().min(4).max(64).nullable().optional(),
  projectorTopN: z.number().int().min(3).max(20).optional(),
  hideSecondaryStats: z.boolean().optional(),
}).strict().refine((value) => Object.keys(value).length > 0, "At least one setting must be provided.");

router.post("/login", loginLimiter, requireSameOrigin, asyncHandler(async (request, response) => {
  const body = loginSchema.parse(request.body);
  await connectToDatabase();
  const admin = await Admin.findOne({ email: body.email.toLowerCase(), active: true }).select("+passwordHash");
  const passwordMatches = admin ? await bcrypt.compare(body.password, admin.passwordHash) : false;
  if (!admin || !passwordMatches) {
    throw new AppError(401, "invalid_credentials", "The email or password is incorrect.");
  }

  const csrfToken = randomBytes(32).toString("base64url");
  const session = jwt.sign({}, getSessionSecret(), {
    subject: admin.id,
    expiresIn: "8h",
    issuer: "tech-vanguard-speed-typing",
    audience: "tech-vanguard-admin",
  });
  admin.lastLoginAt = new Date();
  await admin.save();
  setAdminCookies(response, session, csrfToken);
  response.json({ admin: { id: admin.id, email: admin.email, role: admin.role }, csrfToken });
}));

router.post("/logout", requireAdmin, requireCsrf, (_request, response) => {
  clearAdminCookies(response);
  response.status(204).end();
});

router.get("/me", requireAdmin, asyncHandler(async (request, response) => {
  await connectToDatabase();
  const admin = await Admin.findOne({ _id: request.adminId, active: true }).select("email role");
  if (!admin) {
    throw new AppError(401, "unauthorized", "Administrator account is not active.");
  }
  response.json({
    admin: { id: admin.id, email: admin.email, role: admin.role },
    csrfToken: getCookie(request, csrfCookieName) ?? null,
  });
}));

router.get("/competition", requireAdmin, asyncHandler(async (_request, response) => {
  await connectToDatabase();
  const competition = await getCurrentCompetition();
  response.json({ competition: competition.toJSON() });
}));

router.patch("/competition", requireAdmin, requireCsrf, asyncHandler(async (request, response) => {
  const changes = settingsSchema.parse(request.body);
  await connectToDatabase();
  const competition = await getCurrentCompetition();
  await rejectActiveAttempts(competition.id);

  const update: Record<string, unknown> = { ...changes };
  delete update.accessCode;
  if (changes.accessCode === null) {
    update.accessCodeHash = undefined;
  } else if (changes.accessCode !== undefined) {
    update.accessCodeHash = await bcrypt.hash(changes.accessCode, 12);
  }
  if (changes.accessCodeEnabled === true && changes.accessCode === undefined && !competition.accessCodeEnabled) {
    throw new AppError(400, "access_code_required", "Set an access code before enabling access-code protection.");
  }
  if (changes.accessCodeEnabled === false) {
    update.accessCodeHash = undefined;
  }

  Object.assign(competition, update);
  if (competition.accessCodeEnabled && !("accessCodeHash" in update) && !(await hasAccessCode(competition.id))) {
    throw new AppError(400, "access_code_required", "An access code must be set while access-code protection is enabled.");
  }
  await competition.save();
  await writeAudit(request.adminId!, competition.id, "competition.settings_updated", undefined, Object.keys(changes));
  response.json({ competition: publicCompetition(competition) });
}));

router.post("/competition/registration/open", requireAdmin, requireCsrf, asyncHandler(async (request, response) => {
  const competition = await transition(request.adminId!, "competition.registration_opened", ["upcoming"], "registration_open", {
    registrationOpenedAt: new Date(),
  });
  response.json({ competition: publicCompetition(competition) });
}));

router.post("/competition/registration/close", requireAdmin, requireCsrf, asyncHandler(async (request, response) => {
  const competition = await transition(request.adminId!, "competition.registration_closed", ["registration_open"], "upcoming");
  response.json({ competition: publicCompetition(competition) });
}));

router.post("/competition/start", requireAdmin, requireCsrf, asyncHandler(async (request, response) => {
  const competition = await transition(request.adminId!, "competition.started", ["registration_open"], "live", { startedAt: new Date() });
  response.json({ competition: publicCompetition(competition) });
}));

router.post("/competition/pause", requireAdmin, requireCsrf, asyncHandler(async (request, response) => {
  await connectToDatabase();
  const current = await getCurrentCompetition();
  await rejectActiveAttempts(current.id);
  const competition = await transition(request.adminId!, "competition.paused", ["live"], "paused");
  response.json({ competition: publicCompetition(competition) });
}));

router.post("/competition/resume", requireAdmin, requireCsrf, asyncHandler(async (request, response) => {
  const competition = await transition(request.adminId!, "competition.resumed", ["paused"], "live");
  response.json({ competition: publicCompetition(competition) });
}));

router.post("/competition/end", requireAdmin, requireCsrf, asyncHandler(async (request, response) => {
  await connectToDatabase();
  const current = await getCurrentCompetition();
  await rejectActiveAttempts(current.id);
  const competition = await transition(request.adminId!, "competition.completed", ["live", "paused"], "completed", { endedAt: new Date() });
  response.json({ competition: publicCompetition(competition) });
}));

router.post("/competition/reset", requireAdmin, requireCsrf, asyncHandler(async (request, response) => {
  const body = z.object({
    confirm: z.literal(true),
    reason: z.string().trim().min(8).max(500),
  }).strict().parse(request.body);
  await connectToDatabase();
  const current = await getCurrentCompetition();
  await rejectActiveAttempts(current.id);

  const session = await mongoose.startSession();
  let nextCompetition: typeof current | undefined;
  try {
    await session.withTransaction(async () => {
      current.isCurrent = false;
      current.status = "completed";
      current.archivedAt = new Date();
      current.endedAt ??= new Date();
      await current.save({ session });
      const [created] = await Competition.create([{
        isCurrent: true,
        name: current.name,
        institution: current.institution,
        durationSeconds: current.durationSeconds,
        maxAttempts: current.maxAttempts,
        scoringMetric: current.scoringMetric,
        displayNamesEnabled: current.displayNamesEnabled,
        accessCodeEnabled: false,
        projectorTopN: current.projectorTopN,
        hideSecondaryStats: current.hideSecondaryStats,
        status: "upcoming",
      }], { session });
      nextCompetition = created;
      await AdminAuditLog.create([{
        adminId: request.adminId,
        competitionId: current._id,
        action: "competition.archived_and_reset",
        reason: body.reason,
        metadata: { nextCompetitionId: created.id },
      }], { session });
    });
  } finally {
    await session.endSession();
  }

  if (!nextCompetition) {
    throw new AppError(500, "competition_reset_failed", "A new competition could not be created.");
  }
  response.status(201).json({ competition: publicCompetition(nextCompetition), archivedCompetitionId: current.id });
}));

router.get("/participants", requireAdmin, asyncHandler(async (request, response) => {
  const { page, limit, search } = adminListQuery.parse(request.query);
  await connectToDatabase();
  const competition = await getCurrentCompetition();
  const query: Record<string, unknown> = { competitionId: competition._id };
  if (search) {
    const escaped = escapeRegex(search);
    query.$or = [{ username: new RegExp(escaped, "i") }, { displayName: new RegExp(escaped, "i") }];
  }
  const [participants, total] = await Promise.all([
    Participant.find(query).select("username displayName status attemptsStarted createdAt").sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Participant.countDocuments(query),
  ]);
  response.json({
    page, limit, total,
    participants: participants.map((participant) => ({
      id: participant._id.toString(),
      username: participant.username,
      displayName: participant.displayName ?? null,
      status: participant.status,
      attemptsStarted: participant.attemptsStarted,
      registeredAt: participant.createdAt.toISOString(),
    })),
  });
}));

router.get("/attempts", requireAdmin, asyncHandler(async (request, response) => {
  const { page, limit, search, status } = adminListQuery.parse(request.query);
  await connectToDatabase();
  const competition = await getCurrentCompetition();
  const query: Record<string, unknown> = { competitionId: competition._id };
  if (status && ["started", "submitted", "invalidated"].includes(status)) {
    query.status = status;
  }
  let participantIds: unknown[] | undefined;
  if (search) {
    const matching = await Participant.find({ competitionId: competition._id, username: new RegExp(escapeRegex(search), "i") }).select("_id").lean();
    participantIds = matching.map((participant) => participant._id);
    query.participantId = { $in: participantIds };
  }
  const [attempts, total] = await Promise.all([
    TypingAttempt.find(query).populate({ path: "participantId", select: "username displayName" }).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    TypingAttempt.countDocuments(query),
  ]);
  response.json({
    page, limit, total,
    attempts: attempts.map((attempt) => {
      const participant = attempt.participantId as unknown as { _id: mongoose.Types.ObjectId; username: string; displayName?: string } | null;
      return {
        id: attempt.attemptId,
        participant: participant ? { id: participant._id.toString(), username: participant.username, displayName: participant.displayName ?? null } : null,
        status: attempt.status,
        grossWpm: attempt.grossWpm ?? null,
        netWpm: attempt.netWpm ?? null,
        accuracy: attempt.accuracy ?? null,
        errorCount: attempt.errorCount ?? null,
        elapsedSeconds: attempt.elapsedSeconds ?? null,
        startedAt: attempt.startedAt.toISOString(),
        submittedAt: attempt.submittedAt?.toISOString() ?? null,
        invalidReason: attempt.invalidReason ?? null,
      };
    }),
  });
}));

router.patch("/attempts/:attemptId/invalidate", requireAdmin, requireCsrf, asyncHandler(async (request, response) => {
  const attemptId = z.string().uuid().parse(request.params.attemptId);
  const { reason } = z.object({ reason: z.string().trim().min(8).max(500) }).strict().parse(request.body);
  await connectToDatabase();
  const competition = await getCurrentCompetition();
  const attempt = await TypingAttempt.findOneAndUpdate(
    { attemptId, competitionId: competition._id, status: "submitted" },
    { $set: { status: "invalidated", invalidReason: reason, invalidatedBy: request.adminId } },
    { new: true },
  );
  if (!attempt) {
    throw new AppError(404, "submitted_attempt_not_found", "A submitted attempt with this ID was not found.");
  }
  await writeAudit(request.adminId!, competition.id, "attempt.invalidated", reason, { attemptId });
  response.json({ attempt: { id: attempt.attemptId, status: attempt.status, invalidReason: attempt.invalidReason } });
}));

router.get("/passages", requireAdmin, asyncHandler(async (_request, response) => {
  await connectToDatabase();
  const competition = await getCurrentCompetition();
  const passages = await TypingPassage.find({ competitionId: competition._id }).select("title text difficulty active createdAt").sort({ createdAt: 1 }).lean();
  response.json({ passages: passages.map((passage) => ({ id: passage._id.toString(), ...passage })) });
}));

router.post("/passages", requireAdmin, requireCsrf, asyncHandler(async (request, response) => {
  const body = passageSchema.parse(request.body);
  await connectToDatabase();
  const competition = await getCurrentCompetition();
  await rejectActiveAttempts(competition.id);
  const passage = await TypingPassage.create({ ...body, competitionId: competition._id });
  await writeAudit(request.adminId!, competition.id, "passage.created", undefined, { passageId: passage.id });
  response.status(201).json({ passage: { id: passage.id, title: passage.title, text: passage.text, difficulty: passage.difficulty, active: passage.active } });
}));

router.patch("/passages/:passageId", requireAdmin, requireCsrf, asyncHandler(async (request, response) => {
  const passageId = z.string().regex(/^[a-f\d]{24}$/i).parse(request.params.passageId);
  const body = passageSchema.partial().strict().refine((value) => Object.keys(value).length > 0).parse(request.body);
  await connectToDatabase();
  const competition = await getCurrentCompetition();
  await rejectActiveAttempts(competition.id);
  const passage = await TypingPassage.findOneAndUpdate(
    { _id: passageId, competitionId: competition._id },
    { $set: body },
    { new: true, runValidators: true },
  );
  if (!passage) {
    throw new AppError(404, "passage_not_found", "The passage was not found.");
  }
  await writeAudit(request.adminId!, competition.id, "passage.updated", undefined, { passageId });
  response.json({ passage: { id: passage.id, title: passage.title, text: passage.text, difficulty: passage.difficulty, active: passage.active } });
}));

router.get("/audit-logs", requireAdmin, asyncHandler(async (request, response) => {
  const { page, limit } = adminListQuery.parse(request.query);
  await connectToDatabase();
  const competition = await getCurrentCompetition();
  const [logs, total] = await Promise.all([
    AdminAuditLog.find({ competitionId: competition._id }).populate({ path: "adminId", select: "email" }).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    AdminAuditLog.countDocuments({ competitionId: competition._id }),
  ]);
  response.json({
    page, limit, total,
    logs: logs.map((log) => {
      const admin = log.adminId as unknown as { email: string } | null;
      return { id: log._id.toString(), adminEmail: admin?.email ?? "Unknown", action: log.action, reason: log.reason ?? null, metadata: log.metadata, createdAt: log.createdAt.toISOString() };
    }),
  });
}));

router.get("/results/export", requireAdmin, asyncHandler(async (_request, response) => {
  await connectToDatabase();
  const competition = await getCurrentCompetition();
  const attempts = await TypingAttempt.find({ competitionId: competition._id, status: "submitted" })
    .populate({ path: "participantId", select: "username displayName" })
    .sort({ finalScore: -1, accuracy: -1, errorCount: 1, submittedAt: 1 })
    .lean();
  const rows = [
    ["rank", "username", "display_name", "net_wpm", "gross_wpm", "accuracy", "errors", "elapsed_seconds", "submitted_at"],
    ...attempts.map((attempt, index) => {
      const participant = attempt.participantId as unknown as { username: string; displayName?: string } | null;
      return [index + 1, participant?.username ?? "", participant?.displayName ?? "", attempt.netWpm ?? 0, attempt.grossWpm ?? 0, attempt.accuracy ?? 0, attempt.errorCount ?? 0, attempt.elapsedSeconds ?? 0, attempt.submittedAt?.toISOString() ?? ""];
    }),
  ];
  response.type("text/csv").attachment("tech-vanguard-results.csv").send(rows.map((row) => row.map(csvCell).join(",")).join("\r\n"));
}));

const passageSchema = z.object({
  title: z.string().trim().min(3).max(100),
  text: z.string().trim().min(300).max(5000),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]).default("intermediate"),
  active: z.boolean().default(true),
});

async function transition(
  adminId: string,
  action: string,
  allowed: string[],
  target: string,
  extra: Record<string, unknown> = {},
) {
  await connectToDatabase();
  const competition = await getCurrentCompetition();
  if (!allowed.includes(competition.status)) {
    throw new AppError(409, "invalid_competition_transition", `Cannot change competition from ${competition.status} to ${target}.`);
  }
  competition.status = target as typeof competition.status;
  Object.assign(competition, extra);
  await competition.save();
  await writeAudit(adminId, competition.id, action);
  return competition;
}

async function rejectActiveAttempts(competitionId: string): Promise<void> {
  const active = await TypingAttempt.exists({
    competitionId,
    status: "started",
    expiresAt: { $gt: new Date() },
  });
  if (active) {
    throw new AppError(409, "active_attempts", "Wait for active typing attempts to finish before changing competition settings.");
  }
}

async function writeAudit(adminId: string, competitionId: string, action: string, reason?: string, metadata?: unknown): Promise<void> {
  await AdminAuditLog.create({
    adminId,
    competitionId,
    action,
    reason,
    metadata: metadata ?? {},
  });
}

async function hasAccessCode(competitionId: string): Promise<boolean> {
  const competition = await Competition.findById(competitionId).select("+accessCodeHash");
  return Boolean(competition?.accessCodeHash);
}

function publicCompetition(competition: InstanceType<typeof Competition>) {
  return {
    id: competition.id,
    name: competition.name,
    institution: competition.institution,
    status: competition.status,
    durationSeconds: competition.durationSeconds,
    maxAttempts: competition.maxAttempts,
    scoringMetric: competition.scoringMetric,
    displayNamesEnabled: competition.displayNamesEnabled,
    accessCodeEnabled: competition.accessCodeEnabled,
    projectorTopN: competition.projectorTopN,
    hideSecondaryStats: competition.hideSecondaryStats,
    registrationOpenedAt: competition.registrationOpenedAt?.toISOString() ?? null,
    startedAt: competition.startedAt?.toISOString() ?? null,
    endedAt: competition.endedAt?.toISOString() ?? null,
    archivedAt: competition.archivedAt?.toISOString() ?? null,
  };
}

function requireSameOrigin(request: import("express").Request, _response: import("express").Response, next: import("express").NextFunction): void {
  const origin = request.get("origin");
  try {
    if (!origin || new URL(origin).host !== request.get("host")) {
      next(new AppError(403, "origin_mismatch", "Sign-in requests must come from this application."));
      return;
    }
  } catch {
    next(new AppError(403, "origin_mismatch", "The request origin is invalid."));
    return;
  }
  next();
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function csvCell(value: unknown): string {
  const escaped = String(value).replaceAll('"', '""');
  return `"${escaped}"`;
}

export default router;

import express, { type ErrorRequestHandler } from "express";
import { rateLimit } from "express-rate-limit";
import mongoose from "mongoose";
import adminRouter from "./routes/admin.js";
import publicRouter from "./routes/public.js";
import { AppError } from "./utils/AppError.js";

const app = express();
const globalApiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 180,
  standardHeaders: "draft-8",
  legacyHeaders: false,
});

app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use((_request, response, next) => {
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("X-Frame-Options", "DENY");
  response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  response.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  next();
});
app.use("/api", globalApiLimiter);
app.use(express.json({ limit: "16kb", strict: true }));

app.get("/api/health", (_request, response) => {
  response.json({
    status: "ok",
    service: "tech-vanguard-speed-typing",
    database: {
      configured: Boolean(process.env.MONGODB_URI),
      connection: mongoose.connection.readyState === 1 ? "connected" : "not_connected",
    },
    timestamp: new Date().toISOString(),
  });
});

app.use("/api", publicRouter);
app.use("/api/admin", adminRouter);

app.use("/api", (_request, _response, next) => {
  next(new AppError(404, "not_found", "The requested API endpoint does not exist."));
});

app.use(((error: unknown, _request, response, _next) => {
  if (error instanceof AppError) {
    response.status(error.statusCode).json({ error: { code: error.code, message: error.message } });
    return;
  }
  if (error instanceof SyntaxError && "body" in error) {
    response.status(400).json({ error: { code: "invalid_json", message: "The request body must contain valid JSON." } });
    return;
  }
  if (error instanceof mongoose.Error.ValidationError) {
    response.status(400).json({ error: { code: "validation_failed", message: "The request contains invalid data." } });
    return;
  }
  if (error instanceof mongoose.Error.CastError) {
    response.status(400).json({ error: { code: "invalid_identifier", message: "A supplied identifier is invalid." } });
    return;
  }
  if (isDuplicateKeyError(error)) {
    response.status(409).json({ error: { code: "duplicate_record", message: "A record with these details already exists." } });
    return;
  }
  if (error instanceof Error && error.name === "ZodError") {
    const issues = "issues" in error && Array.isArray(error.issues)
      ? error.issues.map((issue: { path?: unknown[]; message?: string }) => ({ field: issue.path?.join(".") ?? "", message: issue.message ?? "Invalid value" }))
      : [];
    response.status(400).json({ error: { code: "validation_failed", message: "Check the submitted information.", details: issues } });
    return;
  }

  console.error("Unhandled API error", error instanceof Error ? error.name : "UnknownError");
  response.status(500).json({ error: { code: "internal_error", message: "An unexpected server error occurred." } });
}) satisfies ErrorRequestHandler);

function isDuplicateKeyError(error: unknown): error is { code: number } {
  return typeof error === "object" && error !== null && "code" in error && error.code === 11000;
}

export default app;
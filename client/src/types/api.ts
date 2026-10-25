export type CompetitionStatus = "upcoming" | "registration_open" | "live" | "paused" | "completed";

export interface Competition {
  id: string;
  name: string;
  institution: string;
  status: CompetitionStatus;
  durationSeconds: number;
  maxAttempts: number;
  scoringMetric: "netWpm" | "grossWpm";
  displayNamesEnabled: boolean;
  accessCodeEnabled: boolean;
  projectorTopN: number;
  hideSecondaryStats: boolean;
  startedAt?: string | null;
  endedAt?: string | null;
}

export interface LeaderboardRow {
  rank: number;
  username: string;
  displayName: string | null;
  grossWpm: number;
  netWpm: number;
  accuracy: number;
  errorCount: number;
  elapsedSeconds: number;
  submittedAt: string | null;
}

export interface LeaderboardResponse {
  competition: Pick<Competition, "name" | "institution" | "status" | "durationSeconds" | "scoringMetric" | "projectorTopN" | "hideSecondaryStats">;
  participantCount: number;
  submittedCount: number;
  updatedAt: string;
  results: LeaderboardRow[];
}

export interface TypingAttempt {
  id: string;
  startedAt: string;
  expiresAt: string;
  durationSeconds: number;
  passage: { title: string; text: string };
}

export interface TypingResult {
  attemptId: string;
  scoringMetric: "netWpm" | "grossWpm";
  elapsedSeconds: number;
  typedCharacters: number;
  correctCharacters: number;
  incorrectCharacters: number;
  errorCount: number;
  grossWpm: number;
  netWpm: number;
  accuracy: number;
  finalScore: number;
  submittedAt: string | null;
  rank?: number;
}

export interface ParticipantSession {
  id: string;
  username: string;
  displayName: string | null;
  participantKey: string;
}

export interface ParticipantRecord {
  id: string;
  username: string;
  displayName: string | null;
  status: string;
  attemptsStarted: number;
  registeredAt: string;
}

export interface AttemptRecord {
  id: string;
  participant: { id: string; username: string; displayName: string | null } | null;
  status: "started" | "submitted" | "invalidated" | "expired";
  grossWpm: number | null;
  netWpm: number | null;
  accuracy: number | null;
  errorCount: number | null;
  elapsedSeconds: number | null;
  startedAt: string;
  submittedAt: string | null;
  invalidReason: string | null;
}

export interface TypingPassageRecord {
  id: string;
  title: string;
  text: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  active: boolean;
  createdAt?: string;
}

export interface AdminAuditRecord {
  id: string;
  adminEmail: string;
  competitionName: string;
  action: string;
  reason: string | null;
  metadata: unknown;
  createdAt: string;
}

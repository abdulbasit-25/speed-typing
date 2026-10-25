import { ArrowDownToLine, ArrowRight, CircleAlert, ClipboardList, LogOut, Plus, RefreshCw, Settings2, ShieldCheck, Users } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { StatusPill } from "../components/StatusPill.js";
import { ApiError, apiRequest, jsonBody } from "../lib/api.js";
import { adminFetch, adminRequest } from "../lib/adminApi.js";
import type { AdminAuditRecord, AttemptRecord, Competition, ParticipantRecord, TypingPassageRecord } from "../types/api.js";

interface AdminIdentity { id: string; email: string; role: string }
type AdminSettings = Competition & { registrationRulesEditable: boolean };
interface PageRecords<T> { participants?: T[]; attempts?: T[]; total: number }

export function AdminPage() {
  const [admin, setAdmin] = useState<AdminIdentity | null>(null);
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const updateCsrfToken = useCallback((token: string | null) => setCsrfToken(token), []);

  const loadIdentity = useCallback(async () => {
    try {
      const response = await apiRequest<{ admin: AdminIdentity; csrfToken: string | null }>("/admin/me");
      setAdmin(response.admin);
      updateCsrfToken(response.csrfToken);
    } catch (cause) {
      if (!(cause instanceof ApiError && cause.status === 401)) {
        setError(cause instanceof Error ? cause.message : "Administrator status could not be checked.");
      }
    } finally {
      setChecking(false);
    }
  }, [updateCsrfToken]);

  useEffect(() => { void loadIdentity(); }, [loadIdentity]);

  async function login(email: string, password: string) {
    setError(null);
    const response = await apiRequest<{ admin: AdminIdentity; csrfToken: string }>("/admin/login", {
      method: "POST",
      body: jsonBody({ email, password }),
    });
    setAdmin(response.admin);
    updateCsrfToken(response.csrfToken);
  }

  async function logout() {
    try {
      await adminRequest("/admin/logout", { method: "POST" }, csrfToken ?? "", updateCsrfToken);
      setAdmin(null);
      updateCsrfToken(null);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Sign out could not be completed.");
    }
  }

  if (checking) return <main className="content-width page-content"><div className="state-panel"><span className="loading-mark" />Checking organizer session…</div></main>;
  if (!admin) return <main className="content-width page-content admin-login-page">
    <div className="page-kicker"><span className="eyebrow">RAPIDSTRIKE CONTROL / RESTRICTED</span><ShieldCheck size={17} /></div>
    <h1 className="page-title">RapidStrike<br />Control<span className="title-period">.</span></h1>
    <p className="page-intro">Sign in to manage the competition. Organizer access is verified on the server.</p>
    {error && <p className="inline-alert" role="alert"><CircleAlert size={16} />{error}</p>}
    <LoginForm onLogin={login} onError={setError} />
  </main>;

  return <AdminDashboard admin={admin} csrfToken={csrfToken ?? ""} onCsrfToken={updateCsrfToken} onLogout={() => void logout()} onError={setError} globalError={error} />;
}

function LoginForm({ onLogin, onError }: { onLogin: (email: string, password: string) => Promise<void>; onError: (message: string | null) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    onError(null);
    try { await onLogin(email, password); }
    catch (cause) { onError(cause instanceof Error ? cause.message : "Sign-in failed."); }
    finally { setBusy(false); }
  }
  return <form className="admin-login-form" onSubmit={(event) => void submit(event)}>
    <label className="field-label" htmlFor="admin-email">Organizer email</label><input id="admin-email" className="text-input" type="email" autoComplete="username" maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} required />
    <label className="field-label" htmlFor="admin-password">Password</label><input id="admin-password" className="text-input" type="password" autoComplete="current-password" maxLength={72} value={password} onChange={(event) => setPassword(event.target.value)} required />
    <button className="button button-dark" disabled={busy}>{busy ? "Verifying…" : "Sign in"}<ArrowRight size={16} /></button>
    <p className="form-note"><ShieldCheck size={15} />Secure, HTTP-only administrator session</p>
  </form>;
}

function AdminDashboard({ admin, csrfToken, onCsrfToken, onLogout, onError, globalError }: {
  admin: AdminIdentity;
  csrfToken: string;
  onCsrfToken: (token: string) => void;
  onLogout: () => void;
  onError: (message: string | null) => void;
  globalError: string | null;
}) {
  const [competition, setCompetition] = useState<AdminSettings | null>(null);
  const [participants, setParticipants] = useState<ParticipantRecord[]>([]);
  const [attempts, setAttempts] = useState<AttemptRecord[]>([]);
  const [passages, setPassages] = useState<TypingPassageRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AdminAuditRecord[]>([]);
  const [query, setQuery] = useState("");
  const [searchText, setSearchText] = useState("");
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const authorizedRequest = useCallback(<T,>(path: string, init: RequestInit = {}) =>
    adminRequest<T>(path, init, csrfToken, onCsrfToken), [csrfToken, onCsrfToken]);

  const refresh = useCallback(async () => {
    const suffix = query.trim() ? `&search=${encodeURIComponent(query.trim())}` : "";
    const [competitionData, participantData, attemptData, passageData, auditData] = await Promise.all([
      authorizedRequest<{ competition: AdminSettings }>("/admin/competition"),
      authorizedRequest<{ participants: ParticipantRecord[]; total: number }>(`/admin/participants?page=1&limit=50${suffix}`),
      authorizedRequest<{ attempts: AttemptRecord[]; total: number }>(`/admin/attempts?page=1&limit=50${suffix}`),
      authorizedRequest<{ passages: TypingPassageRecord[] }>("/admin/passages"),
      authorizedRequest<{ logs: AdminAuditRecord[] }>("/admin/audit-logs?page=1&limit=25"),
    ]);
    setCompetition(competitionData.competition);
    setParticipants(participantData.participants);
    setAttempts(attemptData.attempts);
    setPassages(passageData.passages);
    setAuditLogs(auditData.logs);
  }, [authorizedRequest, query]);

  useEffect(() => {
    let active = true;
    void refresh().catch((cause: unknown) => {
      if (active) setLocalError(cause instanceof Error ? cause.message : "Organizer data could not be loaded.");
    });
    return () => { active = false; };
  }, [refresh]);

  useEffect(() => {
    const timer = setTimeout(() => setQuery(searchText), 250);
    return () => clearTimeout(timer);
  }, [searchText]);

  async function mutate(path: string, method = "POST", body?: unknown) {
    setBusy(true);
    setLocalError(null);
    onError(null);
    try {
      await authorizedRequest(path, { method, ...(body === undefined ? {} : { body: jsonBody(body) }) });
      await refresh();
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "The organizer action failed.";
      setLocalError(message);
      onError(message);
    } finally { setBusy(false); }
  }

  async function saveSettings(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!competition) return;
    const form = new FormData(event.currentTarget);
    const accessCode = String(form.get("accessCode") ?? "").trim();
    const body: Record<string, unknown> = {
      projectorTopN: Number(form.get("projectorTopN")),
      hideSecondaryStats: form.get("hideSecondaryStats") === "on",
    };
    if (registrationRulesEditable) {
      Object.assign(body, {
        durationSeconds: Number(form.get("durationSeconds")),
        maxAttempts: Number(form.get("maxAttempts")),
        scoringMetric: String(form.get("scoringMetric")),
        displayNamesEnabled: form.get("displayNamesEnabled") === "on",
        accessCodeEnabled: form.get("accessCodeEnabled") === "on",
        ...(accessCode ? { accessCode } : {}),
      });
    }
    await mutate("/admin/competition", "PATCH", body);
  }

  const registrationRulesEditable = competition?.registrationRulesEditable ?? false;

  async function invalidate(attemptId: string) {
    const reason = window.prompt("Reason for invalidating this result (at least 8 characters):");
    if (reason === null) return;
    await mutate(`/admin/attempts/${encodeURIComponent(attemptId)}/invalidate`, "PATCH", { reason });
  }

  async function resetCompetition() {
    if (!window.confirm("Archive this competition and start a new empty round? Existing participant and result records will be preserved.")) return;
    const reason = window.prompt("Enter the reason for archiving this round:");
    if (!reason) return;
    await mutate("/admin/competition/reset", "POST", { confirm: true, reason });
  }

  async function exportResults() {
    setLocalError(null);
    try {
      const response = await adminFetch("/admin/results/export", { method: "GET" }, csrfToken, onCsrfToken);
      if (!response.ok) throw new Error("Could not export the current results.");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "rapidstrike-results.csv";
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (cause) {
      setLocalError(cause instanceof Error ? cause.message : "CSV export failed.");
    }
  }

  async function addPassage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await mutate("/admin/passages", "POST", {
      title: String(form.get("title")),
      text: String(form.get("text")),
      difficulty: String(form.get("difficulty")),
      active: true,
    });
    event.currentTarget.reset();
  }

  return <main className="admin-dashboard content-width">
    <div className="admin-topline"><div><p className="eyebrow">RAPIDSTRIKE CONTROL / ORGANIZER CONSOLE</p><h1>RapidStrike Control<span className="title-period">.</span></h1></div><div className="admin-identity"><span>{admin.email}</span><button className="icon-action" onClick={onLogout} title="Sign out"><LogOut size={17} /></button></div></div>
    {(localError || globalError) && <p className="inline-alert" role="alert"><CircleAlert size={17} />{localError || globalError}</p>}
    {!competition ? <div className="state-panel"><span className="loading-mark" />Loading competition data…</div> : <>
      <section className="admin-section admin-state-section">
        <div className="admin-section-title"><div><span className="eyebrow">01 / COMPETITION</span><h2>Round status</h2></div><button className="icon-action" onClick={() => void refresh()} aria-label="Refresh organizer data"><RefreshCw size={16} /></button></div>
        <div className="admin-status-line"><StatusPill status={competition.status} /><span>{competition.durationSeconds}s · {competition.maxAttempts} official {competition.maxAttempts === 1 ? "attempt" : "attempts"}</span></div>
        <div className="admin-controls">
          {competition.status === "upcoming" && <ActionButton label="Open registration" onClick={() => void mutate("/admin/competition/registration/open")} busy={busy} />}
          {competition.status === "registration_open" && <>
            <ActionButton label="Start competition" onClick={() => void mutate("/admin/competition/start")} busy={busy} primary />
            <ActionButton label="Close registration" onClick={() => void mutate("/admin/competition/registration/close")} busy={busy} />
          </>}
          {competition.status === "live" && <ActionButton label="Pause round" onClick={() => void mutate("/admin/competition/pause")} busy={busy} />}
          {competition.status === "paused" && <ActionButton label="Resume round" onClick={() => void mutate("/admin/competition/resume")} busy={busy} primary />}
          {(competition.status === "live" || competition.status === "paused") && <ActionButton label="End competition" onClick={() => window.confirm("End the current round?") && void mutate("/admin/competition/end")} busy={busy} danger />}
          <button className="button button-outline" onClick={() => void exportResults()}><ArrowDownToLine size={15} />Export CSV</button>
          <button className="button button-outline button-danger-outline" onClick={() => void resetCompetition()} disabled={busy}>Archive &amp; reset</button>
        </div>
      </section>

      <section className="admin-section">
        <div className="admin-section-title"><div><span className="eyebrow">02 / CONFIGURATION</span><h2>Competition rules</h2></div><Settings2 size={18} /></div>
        <form className="admin-settings-form" key={`${competition.id}-${competition.status}-${competition.durationSeconds}-${competition.maxAttempts}-${competition.scoringMetric}-${competition.projectorTopN}-${competition.hideSecondaryStats}-${competition.displayNamesEnabled}-${competition.accessCodeEnabled}`} onSubmit={(event) => void saveSettings(event)}>
          <label className="field-label">Duration <span>seconds · 15–300</span><input className="text-input" name="durationSeconds" type="number" min="15" max="300" defaultValue={competition.durationSeconds} disabled={!registrationRulesEditable} required /></label>
          <label className="field-label">Attempts per participant <span>1–5</span><input className="text-input" name="maxAttempts" type="number" min="1" max="5" defaultValue={competition.maxAttempts} disabled={!registrationRulesEditable} required /></label>
          <label className="field-label">Projector rows <span>3–20</span><input className="text-input" name="projectorTopN" type="number" min="3" max="20" defaultValue={competition.projectorTopN} required /></label>
          <label className="field-label">Access code <span>Leave blank to keep the current code</span><input className="text-input" name="accessCode" type="password" minLength={4} maxLength={64} autoComplete="new-password" disabled={!registrationRulesEditable} /></label>
          <label className="field-label">Ranking score <span>Locked after the first attempt starts</span><select className="text-input" name="scoringMetric" defaultValue={competition.scoringMetric} disabled={!registrationRulesEditable}><option value="netWpm">Net WPM</option><option value="grossWpm">Gross WPM</option></select></label>
          <div className="toggle-list">
            <Toggle name="displayNamesEnabled" label="Allow optional display names" checked={competition.displayNamesEnabled} disabled={!registrationRulesEditable} />
            <Toggle name="accessCodeEnabled" label="Require an access code" checked={competition.accessCodeEnabled} disabled={!registrationRulesEditable} />
            <Toggle name="hideSecondaryStats" label="Hide secondary leaderboard stats" checked={competition.hideSecondaryStats} />
          </div>
          <p className="settings-note">{registrationRulesEditable
            ? competition.status === "registration_open"
              ? "Registration is open. You can still update these rules until the first attempt starts; changes apply to participants who start after saving."
              : "Competition rules can be changed until the first attempt starts, including while registration is open. Projector preferences remain adjustable throughout the round."
            : "Competition rules are locked because the round has started or an attempt is already recorded. Projector preferences remain adjustable. All metrics are calculated by the server."}</p>
          <button className="button button-dark" disabled={busy}>Save rules <ArrowRight size={15} /></button>
        </form>
      </section>

      <section className="admin-section">
        <div className="admin-section-title"><div><span className="eyebrow">03 / PARTICIPANTS</span><h2>Registered field</h2></div><Users size={18} /></div>
        <div className="admin-list-tools"><label className="search-control"><span className="sr-only">Search participants</span><input className="text-input" placeholder="Search usernames" value={searchText} onChange={(event) => setSearchText(event.target.value)} /></label><span>{participants.length} shown</span></div>
        <div className="admin-list">
          {participants.length === 0 ? <p className="admin-empty">No participants match this search.</p> : participants.map((participant) => <div className="admin-list-row" key={participant.id}><span className="admin-row-index">{participant.username}</span><span>{participant.displayName || "—"}</span><span>{participant.attemptsStarted} attempts</span><span className={`record-status record-${participant.status}`}>{participant.status}</span></div>)}
        </div>
      </section>

      <section className="admin-section">
        <div className="admin-section-title"><div><span className="eyebrow">04 / ATTEMPTS</span><h2>Result review</h2></div><ClipboardList size={18} /></div>
        <div className="admin-list">
          {attempts.length === 0 ? <p className="admin-empty">No attempts recorded in this round.</p> : attempts.map((attempt) => <div className="admin-attempt-row" key={attempt.id}>
            <div><strong>{attempt.participant?.displayName || attempt.participant?.username || "Unknown participant"}</strong><span>{attempt.startedAt ? new Date(attempt.startedAt).toLocaleString() : ""}</span></div>
            <span>{attempt.netWpm === null ? "—" : `${attempt.netWpm.toFixed(1)} net WPM`}</span><span>{attempt.accuracy === null ? "—" : `${attempt.accuracy.toFixed(1)}%`}</span>
            <span className={`record-status record-${attempt.status}`}>{attempt.status}</span>
            {attempt.status === "submitted" && <button className="text-action" onClick={() => void invalidate(attempt.id)}>Invalidate</button>}
            {attempt.invalidReason && <span className="invalid-reason">Reason: {attempt.invalidReason}</span>}
          </div>)}
        </div>
      </section>

      <section className="admin-section">
        <div className="admin-section-title"><div><span className="eyebrow">05 / PASSAGES</span><h2>Approved text</h2></div><KeyboardIcon /></div>
        <div className="passage-list">{passages.map((passage) => <div className="passage-admin-row" key={passage.id}><div><strong>{passage.title}</strong><span>{passage.difficulty} · {passage.active ? "active" : "inactive"} · {passage.text.length} characters</span></div><button className="text-action" disabled={busy} onClick={() => void mutate(`/admin/passages/${passage.id}`, "PATCH", { active: !passage.active })}>{passage.active ? "Deactivate" : "Activate"}</button></div>)}</div>
        <form className="passage-form" onSubmit={(event) => void addPassage(event)}>
          <label className="field-label">Passage title<input className="text-input" name="title" minLength={3} maxLength={100} required /></label>
          <label className="field-label">Difficulty<select className="text-input" name="difficulty"><option value="intermediate">Intermediate</option><option value="beginner">Beginner</option><option value="advanced">Advanced</option></select></label>
          <label className="field-label passage-text-field">Original passage text <span>300–5,000 characters</span><textarea className="text-input passage-textarea" name="text" minLength={300} maxLength={5000} required /></label>
          <button className="button button-dark" disabled={busy}><Plus size={15} />Add approved passage</button>
        </form>
      </section>

      <section className="admin-section">
        <div className="admin-section-title"><div><span className="eyebrow">06 / AUDIT</span><h2>Organizer activity</h2></div><ShieldCheck size={18} /></div>
        <div className="admin-list">
          {auditLogs.length === 0 ? <p className="admin-empty">No organizer actions have been recorded.</p> : auditLogs.map((log) => <div className="admin-attempt-row" key={log.id}>
            <div><strong>{log.action.replaceAll(".", " ")}</strong><span>{log.competitionName} · {log.adminEmail} · {new Date(log.createdAt).toLocaleString()}</span></div>
            {log.reason && <span>Reason: {log.reason}</span>}
          </div>)}
        </div>
      </section>
    </>}
    <p className="admin-security-note"><ShieldCheck size={16} />Every control is enforced by administrator-only API routes. Important changes are audit logged.</p>
  </main>;
}

function ActionButton({ label, onClick, busy, primary = false, danger = false }: { label: string; onClick: () => void; busy: boolean; primary?: boolean; danger?: boolean }) {
  return <button className={`button ${primary ? "button-red" : danger ? "button-danger-outline" : "button-outline"}`} onClick={onClick} disabled={busy}>{label}</button>;
}

function Toggle({ name, label, checked, disabled = false }: { name: string; label: string; checked: boolean; disabled?: boolean }) {
  return <label className="toggle-control"><input type="checkbox" name={name} defaultChecked={checked} disabled={disabled} /><span className="toggle-track" /><span>{label}</span></label>;
}

function KeyboardIcon() {
  return <span className="admin-heading-mark">T</span>;
}

import { ArrowLeft, ArrowRight, Check, CircleAlert, Clock3, Keyboard, RotateCcw, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { StatusPill } from "../components/StatusPill.js";
import { ApiError, apiRequest, jsonBody } from "../lib/api.js";
import type { Competition, ParticipantSession, TypingAttempt, TypingResult } from "../types/api.js";

const participantStorageKey = "tv-participant-session";
const attemptTextStorageKey = "tv-attempt-text:";

type CurrentAttemptResponse = { attempt: TypingAttempt | null; result: TypingResult | null };

export function CompetePage() {
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [session, setSession] = useState<ParticipantSession | null>(readParticipantSession);
  const [attempt, setAttempt] = useState<TypingAttempt | null>(null);
  const [result, setResult] = useState<TypingResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resumeChecked, setResumeChecked] = useState(false);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const load = async () => {
      try {
        const response = await apiRequest<{ competition: Competition }>("/competition");
        if (active) {
          setCompetition(response.competition);
          setError(null);
        }
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "Competition status is unavailable.");
      } finally {
        if (active) setLoading(false);
      }
      if (active) timer = setTimeout(load, 5000);
    };
    void load();
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (!session || resumeChecked) return;
    let active = true;
    void apiRequest<CurrentAttemptResponse>("/attempts/current", {
      method: "POST",
      body: jsonBody({ participantId: session.id, participantKey: session.participantKey }),
    }).then((current) => {
      if (!active) return;
      if (current.attempt) {
        setAttempt(current.attempt);
      } else if (current.result) {
        setResult(current.result);
      }
    }).catch((cause: unknown) => {
      if (!active) return;
      setError(cause instanceof Error ? cause.message : "Your saved competition session could not be restored.");
      if (cause instanceof ApiError && cause.status === 403) {
        sessionStorage.removeItem(participantStorageKey);
        setSession(null);
      }
    }).finally(() => {
      if (active) setResumeChecked(true);
    });
    return () => { active = false; };
  }, [session, resumeChecked]);

  const onRegistered = useCallback((participant: ParticipantSession) => {
    sessionStorage.setItem(participantStorageKey, JSON.stringify(participant));
    setSession(participant);
    setError(null);
    setResumeChecked(true);
  }, []);

  const onAttemptStarted = useCallback((nextAttempt: TypingAttempt) => {
    setAttempt(nextAttempt);
    setResult(null);
    setError(null);
    sessionStorage.setItem(`${attemptTextStorageKey}${nextAttempt.id}`, "");
  }, []);

  const onSubmitted = useCallback((nextResult: TypingResult) => {
    if (attempt) sessionStorage.removeItem(`${attemptTextStorageKey}${attempt.id}`);
    setAttempt(null);
    setResult(nextResult);
    setError(null);
  }, [attempt]);

  const resetResult = () => {
    setResult(null);
    setError(null);
  };

  return (
    <main className="content-width page-content compete-page">
      <div className="page-kicker"><span className="eyebrow">PARTICIPANT ENTRY / 02</span>{competition && <StatusPill status={competition.status} />}</div>
      <div className="page-title-row compete-title-row">
        <div><h1 className="page-title">Take your<br className="mobile-break" /> place<span className="title-period">.</span></h1><p className="page-intro">A calm mind. A clear passage. Your best work, one character at a time.</p></div>
      </div>
      {error && <div className="inline-alert" role="alert"><CircleAlert size={17} />{error}</div>}
      {loading || (session && !resumeChecked) ? <div className="state-panel"><span className="loading-mark" />Checking competition status…</div> :
        result ? <ResultPanel result={result} onAgain={resetResult} /> :
        attempt && session ? <ActiveAttempt attempt={attempt} session={session} onSubmit={onSubmitted} onError={setError} /> :
        session && competition ? <ReadyPanel competition={competition} session={session} onStart={onAttemptStarted} onError={setError} /> :
        <RegistrationPanel competition={competition} onRegistered={onRegistered} onError={setError} />}
      <div className="compete-footnote"><ShieldCheck size={16} /><span>Timing and scoring are calculated by the competition server. A browser-based test cannot be made perfectly cheat-proof.</span></div>
    </main>
  );
}

function RegistrationPanel({ competition, onRegistered, onError }: {
  competition: Competition | null;
  onRegistered: (session: ParticipantSession) => void;
  onError: (message: string | null) => void;
}) {
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [busy, setBusy] = useState(false);

  async function register(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    onError(null);
    try {
      const response = await apiRequest<{
        participant: { id: string; username: string; displayName: string | null };
        participantKey: string;
      }>("/participants/register", {
        method: "POST",
        body: jsonBody({
          username,
          ...(competition?.displayNamesEnabled && displayName.trim() ? { displayName } : {}),
          ...(competition?.accessCodeEnabled ? { accessCode } : {}),
        }),
      });
      onRegistered({ ...response.participant, participantKey: response.participantKey });
    } catch (cause) {
      onError(cause instanceof Error ? cause.message : "Registration could not be completed.");
    } finally {
      setBusy(false);
    }
  }

  if (competition?.status !== "registration_open") {
    return <div className="registration-closed state-panel">
      <span className="eyebrow">REGISTRATION {competition?.status === "live" ? "CLOSED" : "NOT OPEN"}</span>
      <h2>{competition?.status === "live" ? "This round is underway." : competition?.status === "completed" ? "This round has concluded." : "The next round is being prepared."}</h2>
      <p>{competition?.status === "paused" ? "The competition is paused. New registrations are not being accepted." : "Registration will be available when organizers open the competition."}</p>
      <Link to="/leaderboard" className="text-link">View the leaderboard <ArrowRight size={15} /></Link>
    </div>;
  }

  return <form className="entry-form" onSubmit={(event) => void register(event)}>
    <div className="entry-form-copy"><span className="eyebrow">YOUR ENTRY</span><h2>Claim a username.</h2><p>Your username appears on the public leaderboard. No account or personal details are required.</p></div>
    <div className="entry-fields">
      <label className="field-label" htmlFor="username">Username <span>3–20 letters, numbers, or underscores</span></label>
      <input id="username" className="text-input" value={username} onChange={(event) => setUsername(event.target.value)} minLength={3} maxLength={20} pattern="[A-Za-z0-9_]+" autoComplete="username" required placeholder="e.g. clear_typist" />
      {competition.displayNamesEnabled && <>
        <label className="field-label" htmlFor="display-name">Display name <span>Optional · up to 40 characters</span></label>
        <input id="display-name" className="text-input" value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={40} autoComplete="nickname" placeholder="How should we address you?" />
      </>}
      {competition.accessCodeEnabled && <>
        <label className="field-label" htmlFor="access-code">Competition access code</label>
        <input id="access-code" className="text-input" value={accessCode} onChange={(event) => setAccessCode(event.target.value)} maxLength={64} required type="password" autoComplete="off" />
      </>}
      <button className="button button-dark entry-submit" disabled={busy || username.trim().length < 3}>{busy ? "Registering…" : "Register and continue"} <ArrowRight size={16} /></button>
      <p className="form-note"><ShieldCheck size={15} />One official attempt · your result is scored on the server</p>
    </div>
  </form>;
}

function ReadyPanel({ competition, session, onStart, onError }: {
  competition: Competition;
  session: ParticipantSession;
  onStart: (attempt: TypingAttempt) => void;
  onError: (message: string | null) => void;
}) {
  const [busy, setBusy] = useState(false);
  const mayStart = competition.status === "live";

  async function start() {
    setBusy(true);
    onError(null);
    try {
      const response = await apiRequest<{ attempt: TypingAttempt }>("/attempts/start", {
        method: "POST",
        body: jsonBody({ participantId: session.id, participantKey: session.participantKey }),
      });
      onStart(response.attempt);
    } catch (cause) {
      onError(cause instanceof Error ? cause.message : "The attempt could not be started.");
    } finally {
      setBusy(false);
    }
  }

  return <section className="ready-panel">
    <div className="ready-copy"><span className="eyebrow">YOU’RE IN</span><h2>Welcome,<br /><em>{session.displayName || session.username}.</em></h2><p>Take a moment to get comfortable. When you press start, the server begins your {competition.durationSeconds}-second round.</p></div>
    <div className="ready-instructions">
      <div className="instruction-row"><span>01</span><p>Type the passage as accurately as you can. Keep your eyes on the line.</p></div>
      <div className="instruction-row"><span>02</span><p>Only the server can calculate and accept your final result.</p></div>
      <div className="instruction-row"><span>03</span><p>Do not refresh while typing. Your active attempt is restored if you return to this tab.</p></div>
      <div className="ready-bottom"><div className="ready-duration"><Clock3 size={17} /><strong>{competition.durationSeconds}</strong><span>SECONDS</span></div><button className="button button-red" onClick={() => void start()} disabled={!mayStart || busy}>{busy ? "Starting…" : mayStart ? "Start my test" : competition.status === "registration_open" ? "Waiting for the start" : `Competition ${competition.status}`}<ArrowRight size={16} /></button></div>
      {!mayStart && <p className="waiting-note">Your registration is saved. This page checks the competition status automatically.</p>}
    </div>
  </section>;
}

function ActiveAttempt({ attempt, session, onSubmit, onError }: {
  attempt: TypingAttempt;
  session: ParticipantSession;
  onSubmit: (result: TypingResult) => void;
  onError: (message: string | null) => void;
}) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const submittedRef = useRef(false);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [typed, setTyped] = useState(() => sessionStorage.getItem(`${attemptTextStorageKey}${attempt.id}`) ?? "");
  const [remaining, setRemaining] = useState(() => Math.max(0, Date.parse(attempt.expiresAt) - Date.now()));
  const [busy, setBusy] = useState(false);
  const [expired, setExpired] = useState(false);
  const autoFailedRef = useRef(false);

  const submit = useCallback(async (manual = false) => {
    if (submittedRef.current) return;
    if (manual) autoFailedRef.current = false;
    submittedRef.current = true;
    setBusy(true);
    onError(null);
    try {
      const response = await apiRequest<{ result: TypingResult }>("/attempts/" + encodeURIComponent(attempt.id) + "/submit", {
        method: "POST",
        body: jsonBody({ participantId: session.id, participantKey: session.participantKey, text: typed }),
      });
      onSubmit(response.result);
    } catch (cause) {
      if (cause instanceof ApiError && cause.code === "attempt_not_finished") {
        retryTimerRef.current = setTimeout(() => {
          submittedRef.current = false;
          void submit();
        }, 900);
      } else {
        submittedRef.current = false;
        autoFailedRef.current = true;
        onError(cause instanceof Error ? cause.message : "The result could not be submitted. Retry without closing this page.");
      }
    } finally {
      setBusy(false);
    }
  }, [attempt.id, onError, onSubmit, session.id, session.participantKey, typed]);

  useEffect(() => {
    inputRef.current?.focus();
    const timer = setInterval(() => {
      const next = Date.parse(attempt.expiresAt) - Date.now();
      setRemaining(Math.max(0, next));
      if (next <= 0) {
        setExpired(true);
        if (!submittedRef.current && !autoFailedRef.current) void submit();
      }
    }, 200);
    return () => {
      clearInterval(timer);
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
  }, [attempt.expiresAt, submit]);

  const passageCharacters = Array.from(attempt.passage.text);
  const typedCharacters = Array.from(typed);
  const elapsed = Math.max(1, attempt.durationSeconds - remaining / 1000);
  const correct = typedCharacters.reduce((sum, char, index) => sum + (passageCharacters[index] === char ? 1 : 0), 0);
  const accuracy = typedCharacters.length ? (correct / typedCharacters.length) * 100 : 0;
  const estimatedWpm = typedCharacters.length / 5 / (elapsed / 60);

  function changeText(value: string) {
    const bounded = Array.from(value).slice(0, passageCharacters.length + 20).join("");
    setTyped(bounded);
    sessionStorage.setItem(`${attemptTextStorageKey}${attempt.id}`, bounded);
  }

  return <section className="typing-workspace">
    <div className="typing-topline"><span className="eyebrow">OFFICIAL ATTEMPT / {session.username}</span><span className={`typing-time${remaining < 10_000 ? " time-urgent" : ""}`} aria-live="off">{Math.ceil(remaining / 1000).toString().padStart(2, "0")}<small>SEC</small></span></div>
    <div className="typing-metrics">
      <div><span>EST. GROSS WPM</span><strong>{estimatedWpm.toFixed(0)}</strong></div>
      <div><span>EST. ACCURACY</span><strong>{accuracy.toFixed(0)}<small>%</small></strong></div>
      <div><span>ERRORS</span><strong>{typedCharacters.length - correct}</strong></div>
      <div className="typing-progress"><span>TIME REMAINING</span><div className="progress-track"><i style={{ width: `${Math.max(0, (remaining / (attempt.durationSeconds * 1000)) * 100)}%` }} /></div></div>
    </div>
    <div className="typing-passage-heading"><span className="eyebrow">{attempt.passage.title}</span><span>Click the passage to focus · paste disabled</span></div>
    <div className="typing-canvas" onClick={() => inputRef.current?.focus()}>
      <p className="passage-render" aria-hidden="true">{passageCharacters.map((character, index) => {
        const typedChar = typedCharacters[index];
        const state = typedChar === undefined ? "untyped" : typedChar === character ? "char-correct" : "char-incorrect";
        return <span key={index} className={state}>{character}</span>;
      })}</p>
      <textarea
        ref={inputRef}
        className="typing-capture"
        aria-label="Type the reference passage here"
        value={typed}
        onChange={(event) => changeText(event.target.value)}
        onPaste={(event) => event.preventDefault()}
        onDrop={(event) => event.preventDefault()}
        onContextMenu={(event) => event.preventDefault()}
        disabled={expired || busy}
        autoCapitalize="off"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        inputMode="text"
      />
    </div>
    <div className="typing-bottom"><span>{expired ? "Time is up. Sending your result…" : "Your score is validated against this passage on the server."}</span><button className="button button-red" onClick={() => void submit(true)} disabled={busy}>{busy ? "Submitting…" : expired ? "Retry submission" : "Finish attempt"} <ArrowRight size={16} /></button></div>
  </section>;
}

function ResultPanel({ result, onAgain }: { result: TypingResult; onAgain: () => void }) {
  return <section className="result-panel">
    <div className="result-heading"><span className="success-icon"><Check size={22} /></span><span className="eyebrow">RESULT ACCEPTED BY SERVER</span><h2>Well typed.</h2><p>Your submission is official. Your leaderboard rank reflects your best valid result in this round.</p></div>
    <div className="result-score"><strong>{result.finalScore.toFixed(1)}</strong><span>{result.scoringMetric === "netWpm" ? "NET" : "GROSS"} WORDS<br />PER MINUTE</span></div>
    <div className="result-grid">
      <div><span>GROSS WPM</span><strong>{result.grossWpm.toFixed(1)}</strong></div>
      <div><span>ACCURACY</span><strong>{result.accuracy.toFixed(1)}%</strong></div>
      <div><span>CORRECT</span><strong>{result.correctCharacters}</strong></div>
      <div><span>INCORRECT</span><strong>{result.incorrectCharacters}</strong></div>
      <div><span>ELAPSED</span><strong>{result.elapsedSeconds}<small> sec</small></strong></div>
      <div><span>YOUR RANK</span><strong>{result.rank ? `#${result.rank}` : "—"}</strong></div>
    </div>
    <div className="result-actions"><Link to="/leaderboard" className="button button-dark">See the leaderboard <ArrowRight size={16} /></Link><button className="button button-text" onClick={onAgain}><RotateCcw size={15} />Return to ready screen</button></div>
  </section>;
}

function readParticipantSession(): ParticipantSession | null {
  const saved = sessionStorage.getItem(participantStorageKey);
  if (!saved) return null;
  try {
    const value: unknown = JSON.parse(saved);
    if (
      typeof value === "object" && value !== null &&
      "id" in value && typeof value.id === "string" &&
      "username" in value && typeof value.username === "string" &&
      "participantKey" in value && typeof value.participantKey === "string"
    ) {
      return value as ParticipantSession;
    }
  } catch (error) {
    console.warn("Could not restore the participant session", error instanceof Error ? error.name : "UnknownError");
  }
  sessionStorage.removeItem(participantStorageKey);
  return null;
}

import { ArrowDownRight, ArrowRight, ArrowUpRight, Clock3, Keyboard, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { LeaderboardTable } from "../components/LeaderboardTable.js";
import { StatusPill } from "../components/StatusPill.js";
import { useLeaderboard } from "../hooks/useLeaderboard.js";
import { apiRequest } from "../lib/api.js";
import type { Competition } from "../types/api.js";

export function HomePage() {
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [competitionError, setCompetitionError] = useState<string | null>(null);
  const { data, connection, lastUpdated } = useLeaderboard(5);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const load = async () => {
      try {
        const result = await apiRequest<{ competition: Competition }>("/competition");
        if (active) {
          setCompetition(result.competition);
          setCompetitionError(null);
        }
      } catch (error) {
        if (active) setCompetitionError(error instanceof Error ? error.message : "Competition status is unavailable.");
      }
      if (active) timer = setTimeout(load, 10_000);
    };
    void load();
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, []);

  return (
    <main>
      <section className="hero content-width">
        <div className="hero-main">
          <div className="eyebrow"><span className="eyebrow-rule" /> RAPIDSTRIKE CHAMPIONSHIP <span className="eyebrow-year">AIR UNIVERSITY · ISLAMABAD</span></div>
          <h1>Precision<br />under <em>pressure.</em></h1>
          <p className="hero-description">A test of focus, rhythm, and accuracy. Take your place at the keys and see how far a clear mind can go.</p>
          <div className="hero-actions">
            <Link to="/compete" className="button button-dark">Enter competition <ArrowRight size={17} /></Link>
            <Link to="/leaderboard" className="button button-text">View rankings <ArrowDownRight size={17} /></Link>
          </div>
          <div className="hero-meta">
            <div className="meta-item"><Clock3 size={16} /><span><strong>{competition ? `${competition.durationSeconds} seconds` : "—"}</strong><small>One focused round</small></span></div>
            <div className="meta-item"><Keyboard size={16} /><span><strong>{competition ? `${competition.maxAttempts} ${competition.maxAttempts === 1 ? "attempt" : "attempts"}` : "—"}</strong><small>Server-verified score</small></span></div>
          </div>
        </div>
        <div className="hero-side">
          <div className="hero-stamp"><span>AU</span><small>AIR<br />UNIVERSITY</small></div>
          <div className="hero-side-caption">
            <p className="eyebrow">THE CHALLENGE</p>
            <p>Clear thinking<br />has a cadence.</p>
            <span>01 / COMPETE WITH INTENTION</span>
          </div>
          <div className="hero-index" aria-hidden="true">01</div>
        </div>
      </section>

      <section className="status-strip">
        <div className="content-width status-strip-inner">
          <div className="status-intro"><span className="eyebrow">CURRENT ROUND</span>{competition ? <StatusPill status={competition.status} /> : <span className="status-unknown">{competitionError ? "Status unavailable" : "Checking status…"}</span>}</div>
          <p>{competition?.status === "live" ? "The clock is running. Find your focus." : competition?.status === "registration_open" ? "Registration is open. Secure your username." : competition?.status === "completed" ? "This round has concluded." : competition?.status === "paused" ? "The competition is temporarily paused." : "The next round is being prepared."}</p>
          <Link to="/display" className="strip-link">Projector display <ArrowUpRight size={15} /></Link>
        </div>
      </section>

      <section className="leader-preview content-width">
        <div className="section-heading">
          <div><p className="eyebrow">THE FIELD <span className="eyebrow-rule" /></p><h2>On the board.</h2></div>
          <div className="section-heading-side">
            <span className={`connection-indicator connection-${connection}`}><i />{connection === "connected" ? "Polling active" : connection === "loading" ? "Connecting" : "Reconnecting"}</span>
            {lastUpdated && <span className="updated-note">Updated {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>}
          </div>
        </div>
        <LeaderboardTable rows={data?.results ?? []} hideSecondaryStats={data?.competition.hideSecondaryStats} primaryMetric={data?.competition.scoringMetric} emptyMessage={connection === "connected" ? "No scores yet. The first result will appear here." : "Live results are not available yet."} />
        <div className="preview-bottom">
          <span>{data ? `${data.submittedCount} ${data.submittedCount === 1 ? "result" : "results"} recorded` : "Results load from the competition server"}</span>
          <Link to="/leaderboard" className="text-link">Full leaderboard <ArrowRight size={15} /></Link>
        </div>
      </section>

      <section className="principles content-width">
        <div className="principles-lead"><p className="eyebrow">BUILT FOR THE MOMENT</p><h2>Fast is good.<br /><em>Accurate is better.</em></h2></div>
        <div className="principle"><span>01</span><ShieldCheck size={20} /><h3>Fair by design</h3><p>Your timer and final score are calculated on the server, not the browser.</p></div>
        <div className="principle"><span>02</span><Clock3 size={20} /><h3>One clear round</h3><p>Read the instructions first. Your time starts only when the attempt begins.</p></div>
      </section>
    </main>
  );
}

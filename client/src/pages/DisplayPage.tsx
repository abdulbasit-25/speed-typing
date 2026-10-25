import { Maximize2, Minimize2, Radio } from "lucide-react";
import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { LeaderboardTable } from "../components/LeaderboardTable.js";
import { StatusPill } from "../components/StatusPill.js";
import { useLeaderboard } from "../hooks/useLeaderboard.js";

export function DisplayPage() {
  const { data, connection, lastUpdated, error, refresh } = useLeaderboard(20);
  const [fullscreen, setFullscreen] = useState(false);
  const topN = Math.min(20, Math.max(3, data?.competition.projectorTopN ?? 10));
  const rows = data?.results.slice(0, topN) ?? [];
  const rowCapacity = Math.max(rows.length, 10);
  const displaySizing = {
    "--projector-row-height": `clamp(32px, calc((100vh - 390px) / ${rowCapacity}), 62px)`,
  } as CSSProperties;

  useEffect(() => {
    const update = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", update);
    return () => document.removeEventListener("fullscreenchange", update);
  }, []);

  async function toggleFullscreen() {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }
    await document.documentElement.requestFullscreen();
  }

  return (
    <main className="display-screen">
      <header className="display-header">
        <div className="display-brand"><span className="display-mark">RS//</span><span><strong>RAPIDSTRIKE</strong><small>AIR UNIVERSITY · ISLAMABAD</small></span></div>
        <div className="display-event"><span className="eyebrow">THE COMPETITION</span><h1>RapidStrike Championship</h1>{data && <StatusPill status={data.competition.status} />}</div>
        <div className="display-tools">
          <span className={`display-live display-${connection}`}><Radio size={15} />{connection === "connected" ? "Connected" : connection === "loading" ? "Connecting" : "Reconnecting"}</span>
          <button className="display-tool-button" onClick={refresh} aria-label="Refresh display"><span>↻</span></button>
          <button className="display-tool-button" onClick={() => void toggleFullscreen()} aria-label={fullscreen ? "Exit full screen" : "Enter full screen"}>{fullscreen ? <Minimize2 size={17} /> : <Maximize2 size={17} />}</button>
        </div>
      </header>
      <section className="display-main" style={displaySizing}>
        <div className="display-titlebar">
          <div><p className="eyebrow">OFFICIAL RANKINGS</p><h2>On the board<span>.</span></h2></div>
          <div className="display-count"><strong>{data?.participantCount ?? "—"}</strong><span>REGISTERED<br />PARTICIPANTS</span></div>
        </div>
        <div className="display-rule"><span /><span /><span /></div>
        {error && <p className="display-error">{error}</p>}
        <LeaderboardTable rows={rows} hideSecondaryStats={data?.competition.hideSecondaryStats} primaryMetric={data?.competition.scoringMetric} projector emptyMessage={connection === "connected" ? "Results will appear here when the first round is complete." : "Waiting for an update from the competition server."} />
      </section>
      <footer className="display-footer"><span>RAPIDSTRIKE <i>/</i> AIR UNIVERSITY, ISLAMABAD</span><span>{lastUpdated ? `LAST UPDATE ${lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}` : "WAITING FOR FIRST UPDATE"}</span></footer>
    </main>
  );
}

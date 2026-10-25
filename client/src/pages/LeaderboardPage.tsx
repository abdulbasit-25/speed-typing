import { RefreshCw } from "lucide-react";
import { useState } from "react";
import { LeaderboardTable } from "../components/LeaderboardTable.js";
import { StatusPill } from "../components/StatusPill.js";
import { useLeaderboard } from "../hooks/useLeaderboard.js";

export function LeaderboardPage() {
  const [limit, setLimit] = useState(20);
  const { data, connection, lastUpdated, error, refresh } = useLeaderboard(limit);

  return (
    <main className="content-width page-content">
      <div className="page-kicker"><span className="eyebrow">LIVE RESULTS / 01</span>{data && <StatusPill status={data.competition.status} />}</div>
      <div className="page-title-row">
        <div><h1 className="page-title">RapidStrike<br />Rankings<span className="title-period">.</span></h1><p className="page-intro">A live ranking of the official RapidStrike Championship results. Ordered by net WPM, accuracy, errors, then submission time.</p></div>
        <button className="button button-outline refresh-button" onClick={refresh}><RefreshCw size={15} />Refresh</button>
      </div>
      <div className="leaderboard-overview">
        <div className="overview-stat"><span>Registered</span><strong>{data?.participantCount ?? "—"}</strong></div>
        <div className="overview-stat"><span>Submissions</span><strong>{data?.submittedCount ?? "—"}</strong></div>
        <div className="overview-stat overview-status"><span>Connection</span><strong className={`connection-label connection-${connection}`}><i />{connection === "connected" ? "Connected" : connection === "loading" ? "Connecting" : "Reconnecting"}</strong></div>
        <div className="overview-stat overview-update"><span>Last update</span><strong>{lastUpdated ? lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "Waiting for data"}</strong></div>
        <label className="view-select">Show
          <select value={limit} onChange={(event) => setLimit(Number(event.target.value))}>
            <option value={10}>Top 10</option><option value={20}>Top 20</option><option value={100}>Full board</option>
          </select>
        </label>
      </div>
      {error && <p className="inline-alert" role="status">{data ? `Showing the last successful update. ${error}` : error}</p>}
      <LeaderboardTable rows={data?.results ?? []} hideSecondaryStats={data?.competition.hideSecondaryStats} primaryMetric={data?.competition.scoringMetric} emptyMessage={connection === "connected" ? "No official results have been submitted yet." : "Waiting for the competition server."} />
      <p className="page-footnote">Ranked by {data?.competition.scoringMetric === "grossWpm" ? "gross" : "net"} WPM, then accuracy, fewer errors, and earlier submission. Polling updates every 2.5 seconds while live.</p>
    </main>
  );
}

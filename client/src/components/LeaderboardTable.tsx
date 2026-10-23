import type { LeaderboardRow } from "../types/api.js";

interface LeaderboardTableProps {
  rows: LeaderboardRow[];
  hideSecondaryStats?: boolean;
  projector?: boolean;
  emptyMessage?: string;
}

export function LeaderboardTable({ rows, hideSecondaryStats = false, projector = false, emptyMessage = "The first result is waiting to be written." }: LeaderboardTableProps) {
  if (rows.length === 0) {
    return <div className={`empty-board${projector ? " empty-board-projector" : ""}`}><span className="empty-index">01—</span><p>{emptyMessage}</p></div>;
  }
  return (
    <div className={`leaderboard-wrap${projector ? " projector-table" : ""}`}>
      <table className="leaderboard-table">
        <thead>
          <tr>
            <th scope="col">Rank</th>
            <th scope="col">Participant</th>
            <th scope="col" className="numeric">Net WPM</th>
            {!hideSecondaryStats && <th scope="col" className="numeric">Accuracy</th>}
            {!hideSecondaryStats && <th scope="col" className="numeric">Errors</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.rank}-${row.username}`}>
              <td><span className={`rank-number rank-${row.rank}`}>{String(row.rank).padStart(2, "0")}</span></td>
              <td>
                <span className="participant-name">{row.displayName || row.username}</span>
                {row.displayName && <span className="participant-handle">@{row.username}</span>}
              </td>
              <td className="numeric score-number">{row.netWpm.toFixed(1)}<span className="unit"> wpm</span></td>
              {!hideSecondaryStats && <td className="numeric secondary-number">{row.accuracy.toFixed(1)}%</td>}
              {!hideSecondaryStats && <td className="numeric secondary-number">{row.errorCount}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

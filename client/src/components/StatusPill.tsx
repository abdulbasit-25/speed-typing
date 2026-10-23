import type { CompetitionStatus } from "../types/api.js";

const labels: Record<CompetitionStatus, string> = {
  upcoming: "Upcoming",
  registration_open: "Registration open",
  live: "Live competition",
  paused: "Paused",
  completed: "Completed",
};

export function StatusPill({ status }: { status: CompetitionStatus }) {
  return <span className={`status-pill status-${status}`}><span className="status-dot" />{labels[status]}</span>;
}

import { useCallback, useEffect, useRef, useState } from "react";
import { apiRequest } from "../lib/api.js";
import type { LeaderboardResponse } from "../types/api.js";

type ConnectionState = "loading" | "connected" | "reconnecting";

export function useLeaderboard(limit = 20) {
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [connection, setConnection] = useState<ConnectionState>("loading");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const backoffRef = useRef(0);
  const statusRef = useRef<string | undefined>(undefined);
  statusRef.current = data?.competition.status;
  const refresh = useCallback(() => setRefreshKey((key) => key + 1), []);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let controller: AbortController | undefined;
    const poll = async () => {
      controller = new AbortController();
      try {
        const result = await apiRequest<LeaderboardResponse>(`/leaderboard?limit=${limit}`, { signal: controller.signal });
        if (!active) return;
        setData(result);
        setConnection("connected");
        setLastUpdated(new Date());
        setError(null);
        backoffRef.current = 0;
      } catch (cause) {
        if (!active || (cause instanceof DOMException && cause.name === "AbortError")) return;
        setConnection("reconnecting");
        setError(cause instanceof Error ? cause.message : "The leaderboard could not be updated.");
        backoffRef.current = Math.min(backoffRef.current + 1, 5);
      }

      const activeCompetition = statusRef.current === "live";
      const normalDelay = document.hidden ? 15_000 : activeCompetition ? 2_500 : 10_000;
      const delay = backoffRef.current > 0 ? Math.min(30_000, normalDelay * 2 ** backoffRef.current) : normalDelay;
      timer = setTimeout(poll, delay);
    };

    void poll();
    return () => {
      active = false;
      controller?.abort();
      if (timer) clearTimeout(timer);
    };
  }, [limit, refreshKey]);

  return { data, connection, lastUpdated, error, refresh };
}

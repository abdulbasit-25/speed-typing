export function getHealthPayload(databaseConfigured: boolean, connectionState: number) {
  return {
    status: "ok" as const,
    service: "tech-vanguard-speed-typing",
    database: {
      configured: databaseConfigured,
      connection: connectionState === 1 ? "connected" : "not_connected",
    },
    timestamp: new Date().toISOString(),
  };
}

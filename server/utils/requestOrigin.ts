interface OriginRequest {
  protocol: string;
  get(name: string): string | undefined;
}

export function isSameOriginRequest(request: OriginRequest): boolean {
  const origin = request.get("origin");
  if (!origin) return false;

  try {
    const parsedOrigin = new URL(origin);
    const forwardedHost = request.get("x-forwarded-host");
    const host = forwardedHost?.trim() || request.get("host");
    if (!host || host.includes(",")) return false;

    const expectedOrigin = `${request.protocol}://${host}`;
    return parsedOrigin.origin === expectedOrigin &&
      parsedOrigin.pathname === "/" &&
      parsedOrigin.search === "" &&
      parsedOrigin.hash === "";
  } catch {
    return false;
  }
}

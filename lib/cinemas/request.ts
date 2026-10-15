export class ProviderRequestError extends Error {
  constructor() {
    super("Star Cineplex provider request failed.");
    this.name = "ProviderRequestError";
  }
}

type FetchLike = (input: string | URL, init?: RequestInit) => Promise<Response>;

/** Only the public Star Cineplex site and its public read API are allowed upstream hosts. */
export async function fetchProviderJson(
  urlValue: string,
  fetcher: FetchLike = fetch,
  timeoutMs = 8_000,
): Promise<unknown> {
  let url: URL;
  try {
    url = new URL(urlValue);
  } catch {
    throw new ProviderRequestError();
  }
  const allowedHost = url.hostname === "starcineplex.com" || url.hostname.endsWith(".starcineplex.com") || url.hostname === "api.kichole.com";
  if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443") || !allowedHost) {
    throw new ProviderRequestError();
  }

  try {
    let response = await fetcher(url, {
      credentials: "omit",
      headers: { Accept: "application/json" },
      redirect: "error",
      signal: AbortSignal.timeout(timeoutMs),
      cache: "no-store",
    });
    // One bounded retry for transient upstream failures. Honor Retry-After only
    // up to two seconds; there is no documented rate limit to rely on.
    if ([429, 502, 503, 504].includes(response.status)) {
      const retryAfter = Number(response.headers.get("retry-after"));
      const delayMs = Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(retryAfter * 1000, 2_000) : 250;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      response = await fetcher(url, {
        credentials: "omit",
        headers: { Accept: "application/json" },
        redirect: "error",
        signal: AbortSignal.timeout(timeoutMs),
        cache: "no-store",
      });
    }
    if (!response.ok) throw new ProviderRequestError();
    return await response.json() as unknown;
  } catch {
    throw new ProviderRequestError();
  }
}

export function safeProviderRequestError(_error: unknown): { state: "provider_error"; message: string } {
  return { state: "provider_error", message: "Star Cineplex schedule request failed." };
}

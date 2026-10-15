export class ProviderRequestError extends Error {
  constructor() {
    super("Star Cineplex provider request failed.");
    this.name = "ProviderRequestError";
  }
}

type FetchLike = (input: string | URL, init?: RequestInit) => Promise<Response>;

/** Use only for a provider URL whose feed and permitted access have been verified. */
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
  if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443") || !(url.hostname === "starcineplex.com" || url.hostname.endsWith(".starcineplex.com"))) {
    throw new ProviderRequestError();
  }

  try {
    const response = await fetcher(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(timeoutMs),
      cache: "no-store",
    });
    if (!response.ok) throw new ProviderRequestError();
    return await response.json() as unknown;
  } catch {
    throw new ProviderRequestError();
  }
}

export function safeProviderRequestError(_error: unknown): { state: "provider_error"; message: string } {
  return { state: "provider_error", message: "Star Cineplex schedule request failed." };
}

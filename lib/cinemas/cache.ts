type CacheEntry<T> = { value: T; expiresAt: number; staleUntil: number };

/** Bounded per-process cache with in-flight request coalescing. This is an optimization, not shared storage. */
export class BoundedAsyncCache<T> {
  private readonly entries = new Map<string, CacheEntry<T>>();
  private readonly inFlight = new Map<string, Promise<T>>();

  constructor(
    private readonly ttlMs = 12 * 60 * 1000,
    private readonly staleIfErrorMs = 30 * 60 * 1000,
    private readonly maxEntries = 100,
  ) {}

  delete(key: string): void {
    this.entries.delete(key);
  }

  async get(
    key: string,
    loader: () => Promise<T>,
    cacheWhen: (value: T) => boolean = () => true,
  ): Promise<{ value: T; stale: boolean }> {
    const now = Date.now();
    const cached = this.entries.get(key);
    if (cached && cached.expiresAt > now) {
      this.entries.delete(key);
      this.entries.set(key, cached);
      return { value: cached.value, stale: false };
    }

    const pending = this.inFlight.get(key);
    if (pending) {
      try {
        return { value: await pending, stale: false };
      } catch (error) {
        if (cached && cached.staleUntil > Date.now()) return { value: cached.value, stale: true };
        throw error;
      }
    }

    const request = loader();
    this.inFlight.set(key, request);
    try {
      const value = await request;
      if (cacheWhen(value)) {
        this.entries.delete(key);
        this.entries.set(key, { value, expiresAt: Date.now() + this.ttlMs, staleUntil: Date.now() + this.ttlMs + this.staleIfErrorMs });
        while (this.entries.size > this.maxEntries) {
          const oldest = this.entries.keys().next().value as string | undefined;
          if (oldest === undefined) break;
          this.entries.delete(oldest);
        }
      }
      return { value, stale: false };
    } catch (error) {
      if (cached && cached.staleUntil > Date.now()) return { value: cached.value, stale: true };
      throw error;
    } finally {
      this.inFlight.delete(key);
    }
  }
}

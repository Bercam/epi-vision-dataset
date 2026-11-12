export function createRateLimiter({ windowMs = 60_000, max = 30 } = {}) {
  const buckets = new Map();

  function check(key) {
    const now = Date.now();
    const bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return { allowed: true, remaining: max - 1, retryAfterSeconds: 0 };
    }
    if (bucket.count >= max) {
      return {
        allowed: false,
        remaining: 0,
        retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
      };
    }
    bucket.count += 1;
    return { allowed: true, remaining: max - bucket.count, retryAfterSeconds: 0 };
  }

  function cleanup() {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= now) {
        buckets.delete(key);
      }
    }
  }

  return { check, cleanup };
}

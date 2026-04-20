const buckets = {};

export function createRateLimiter(key, maxCalls, windowMs) {
  return function rateLimited(fn) {
    return function (...args) {
      const now = Date.now();
      if (!buckets[key]) buckets[key] = [];
      buckets[key] = buckets[key].filter(t => now - t < windowMs);

      if (buckets[key].length >= maxCalls) {
        return Promise.reject(new Error('عمليات كثيرة، انتظر قليلاً'));
      }
      buckets[key].push(now);
      return fn(...args);
    };
  };
}

export function checkRateLimit(key, maxCalls, windowMs) {
  const now = Date.now();
  if (!buckets[key]) buckets[key] = [];
  buckets[key] = buckets[key].filter(t => now - t < windowMs);

  if (buckets[key].length >= maxCalls) return false;
  buckets[key].push(now);
  return true;
}

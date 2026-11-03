/* ================================================================== LOADER */
/*
 * Guarded asynchronous loader shared by the cards that fetch data from Home Assistant (trend, timeline, mini-curves). One per data source:
 *  - never two runs at a time (`busy`);
 *  - a result stays valid for `ttl` ms for the same `key` (a different key loads at once, `force` always loads);
 *  - after a failure the same key is not retried before `retry` ms (HA calls `hass` several times per second: without this, an error
 *    would trigger a request on every call);
 *  - when a run ends, the owner card is re-rendered.
 * `data` is { key, value } after a success and { key, error: true, value: fallback() } after a failure.
 */
class SfLoader {
  constructor(owner, { ttl = 120000, retry = 60000 } = {}) { this.owner = owner; this.ttl = ttl; this.retry = retry; this.busy = false; this.reset(); }
  reset() { this.data = null; this.at = 0; this.failAt = 0; this.failKey = null; }
  // Returns true when a run completed (so that the owner can react, e.g. reload if its key changed meanwhile), false when it was skipped.
  async run(key, fn, { ttl, force, fallback } = {}) {
    if (this.busy) return false;
    const now = Date.now();
    if (!force && this.data && !this.data.error && this.data.key === key && now - this.at < (ttl ?? this.ttl)) return false;
    if (this.failAt && this.failKey === key && now - this.failAt < this.retry) return false;
    this.busy = true;
    try { this.data = { key, value: await fn() }; this.failAt = 0; }
    catch (e) { this.failAt = Date.now(); this.failKey = key; this.data = { key, error: true, value: fallback ? fallback() : undefined }; }
    this.at = Date.now(); this.busy = false;
    this.owner._lastHtml = null; this.owner._schedule();
    return true;
  }
}


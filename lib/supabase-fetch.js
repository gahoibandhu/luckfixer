// lib/supabase-fetch.js — request timeouts for Supabase clients on the server.
//
// Two facts that bit us:
//  1. supabase-js has NO request timeout of its own. If the database or the API gateway stalls, every `await supabase...` hangs until the
//     platform kills the function (usage guard, bot name, provider list, usage log, admin stats...).
//  2. postgrest-js silently RETRIES a failed GET up to 3 times (waits 1s, 2s, 4s) — but it only gives up immediately on an error named
//     "AbortError". A timeout raised inside the client's fetch with `AbortSignal.timeout()` is named "TimeoutError", so a stalled query
//     was retried (we measured it: a 1s timeout still re-sent the request with backoff, i.e. several times longer in total).
// So every timeout here aborts with a plain AbortController (-> "AbortError", no retry) and the callers, which already treat DB errors as
// non-fatal, move on quickly.

/** a signal that aborts with an AbortError after `ms` (use for supabase `.abortSignal(...)`) */
export function abortAfter(ms) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  t.unref?.();
  return c.signal;
}

/** fetch for `createClient(url, key, { global: { fetch } })` */
export function timeoutFetch(ms = 6000) {
  return (input, init = {}) => {
    const c = new AbortController();
    const t = setTimeout(() => c.abort(), ms);
    const onAbort = () => c.abort();
    if (init.signal) { if (init.signal.aborted) c.abort(); else init.signal.addEventListener('abort', onAbort, { once: true }); }
    return fetch(input, { ...init, signal: c.signal }).finally(() => { clearTimeout(t); init.signal?.removeEventListener?.('abort', onAbort); });
  };
}
export const DB_FETCH_OPTIONS = (ms) => ({ global: { fetch: timeoutFetch(ms) }, auth: { persistSession: false, autoRefreshToken: false } });

/**
 * sync.js — background push/pull between the local cache and Supabase.
 *
 * Writes never wait on the network: db.js applies them to localCache
 * immediately and calls enqueue() here, which appends to a persisted
 * "outbox" and tries to flush it. A flush walks the outbox in order and
 * stops at the first op that fails for network reasons (offline, DNS,
 * timeout) — that op and everything after it stays queued for the next
 * trigger. Ops that fail for a *non*-network reason (bad request, RLS
 * rejection, etc.) are logged and dropped rather than retried forever,
 * since there's no user-facing conflict-resolution UI to send them to.
 *
 * pullAll() re-hydrates the local cache from Supabase. Row Level Security
 * scopes every table to the signed-in user, so a plain `select('*')` is
 * enough — no need to know which tables are keyed by user_id vs. a parent
 * row (template_exercises, session_sets).
 */
import { supabase, isSupabaseConfigured } from './supabase.js';
import { readTable, writeTable } from './localCache.js';
import { TABLES } from './tables.js';
import { uid } from './localCache.js';

const OUTBOX_KEY = 'fitapp:outbox';
export const backend = isSupabaseConfigured ? 'supabase' : 'local';

function readOutbox() {
  try {
    return JSON.parse(localStorage.getItem(OUTBOX_KEY) ?? '[]');
  } catch {
    return [];
  }
}

function writeOutbox(ops) {
  localStorage.setItem(OUTBOX_KEY, JSON.stringify(ops));
  notify();
}

/* ---------------- status pub/sub ---------------- */

const listeners = new Set();
let syncing = false;
let lastError = null;

export function getSyncStatus() {
  return {
    backend,
    online: typeof navigator === 'undefined' ? true : navigator.onLine,
    pending: readOutbox().length,
    syncing,
    lastError,
  };
}

export function onSyncStatus(fn) {
  listeners.add(fn);
  fn(getSyncStatus());
  return () => listeners.delete(fn);
}

function notify() {
  const s = getSyncStatus();
  listeners.forEach((fn) => fn(s));
}

/* ---------------- outbox ---------------- */

export function enqueue(op) {
  if (backend !== 'supabase') return;
  const ops = readOutbox();
  ops.push({ ...op, _id: uid() });
  writeOutbox(ops);
  scheduleFlush();
}

function isNetworkError(err) {
  if (!navigator.onLine) return true;
  // supabase-js surfaces a fetch failure as a plain TypeError.
  return err instanceof TypeError || /fetch|network/i.test(err?.message ?? '');
}

async function applyRemote({ table, kind, payload }) {
  if (kind === 'insert') {
    const { error } = await supabase.from(table).insert(payload);
    if (error) throw error;
  } else if (kind === 'update') {
    const { error } = await supabase.from(table).update(payload.patch).eq('id', payload.id);
    if (error) throw error;
  } else if (kind === 'remove') {
    const { error } = await supabase.from(table).delete().eq('id', payload.id);
    if (error) throw error;
  } else if (kind === 'removeWhere') {
    let q = supabase.from(table).delete();
    for (const [col, val] of Object.entries(payload.eq)) q = q.eq(col, val);
    const { error } = await q;
    if (error) throw error;
  }
}

let flushPromise = null;

/** Push queued ops to Supabase; safe to call repeatedly, coalesces concurrent calls. */
export function scheduleFlush() {
  if (backend !== 'supabase' || typeof navigator !== 'undefined' && !navigator.onLine) {
    return flushPromise ?? Promise.resolve();
  }
  if (!flushPromise) {
    flushPromise = flush().finally(() => {
      flushPromise = null;
    });
  }
  return flushPromise;
}

async function flush() {
  syncing = true;
  notify();
  let ops = readOutbox();
  while (ops.length > 0) {
    const op = ops[0];
    try {
      await applyRemote(op);
      lastError = null;
      ops = ops.slice(1);
      writeOutbox(ops);
    } catch (err) {
      if (isNetworkError(err)) {
        lastError = null; // expected while offline, not a real error
        break;
      }
      console.error('Sync: dropping op after non-network failure', op, err);
      lastError = err.message ?? String(err);
      ops = ops.slice(1);
      writeOutbox(ops);
    }
  }
  syncing = false;
  notify();
}

/** Re-hydrate the local cache from Supabase. Flushes pending writes first so they aren't clobbered. */
export async function pullAll() {
  if (backend !== 'supabase' || !navigator.onLine) return;
  await scheduleFlush();
  for (const table of Object.values(TABLES)) {
    try {
      const { data, error } = await supabase.from(table).select('*');
      if (error) throw error;
      writeTable(table, data ?? []);
    } catch (err) {
      console.error(`Sync: pull failed for ${table}`, err);
    }
  }
  notify();
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    notify();
    scheduleFlush().then(pullAll);
  });
  window.addEventListener('offline', notify);
}

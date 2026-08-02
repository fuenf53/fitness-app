/**
 * localCache.js — the on-device mirror every read/write goes through.
 *
 * With Supabase configured this is not just an offline fallback: it's the
 * *primary* copy the UI reads from. sync.js pulls remote rows into it and
 * pushes local writes out to Supabase in the background — see sync.js.
 */
const NS = 'fitapp';

export const uid = () =>
  crypto.randomUUID?.() ?? `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const key = (table) => `${NS}:${table}`;

export function readTable(table) {
  try {
    return JSON.parse(localStorage.getItem(key(table)) ?? '[]');
  } catch {
    return [];
  }
}

export function writeTable(table, rows) {
  localStorage.setItem(key(table), JSON.stringify(rows));
  return rows;
}

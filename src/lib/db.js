/**
 * db.js — the single data access layer for the whole app.
 *
 * Every feature talks to this module, never to Supabase or localStorage
 * directly. Reads and writes always go through the local cache first, so
 * the app works fully offline. When Supabase is configured, writes are
 * additionally queued and pushed in the background by sync.js, and
 * sync.pullAll() refreshes the cache from Supabase when connectivity is
 * available (see store.jsx, which calls it on login/session-restore and on
 * regaining connectivity).
 */
import { readTable, writeTable, uid } from './localCache.js';
import { enqueue, backend } from './sync.js';
import { TABLES } from './tables.js';

export { backend, uid, TABLES };
export { onSyncStatus, getSyncStatus, pullAll } from './sync.js';

function selectFrom(rows, { eq = {}, inList = {}, order, ascending = true } = {}) {
  for (const [col, val] of Object.entries(eq)) {
    if (val !== undefined) rows = rows.filter((r) => r[col] === val);
  }
  for (const [col, vals] of Object.entries(inList)) {
    const set = new Set(vals);
    rows = rows.filter((r) => set.has(r[col]));
  }
  if (order) {
    rows = [...rows].sort((a, b) => {
      const x = a[order] ?? '';
      const y = b[order] ?? '';
      if (x === y) return 0;
      return (x > y ? 1 : -1) * (ascending ? 1 : -1);
    });
  }
  return rows;
}

export const db = {
  backend,

  async select(table, opts) {
    return selectFrom(readTable(table), opts);
  },

  async insert(table, row) {
    const record = { id: uid(), created_at: new Date().toISOString(), ...row };
    const rows = readTable(table);
    rows.push(record);
    writeTable(table, rows);
    enqueue({ table, kind: 'insert', payload: record });
    return record;
  },

  async update(table, id, patch) {
    const rows = readTable(table);
    const i = rows.findIndex((r) => r.id === id);
    if (i === -1) return null;
    rows[i] = { ...rows[i], ...patch };
    writeTable(table, rows);
    enqueue({ table, kind: 'update', payload: { id, patch } });
    return rows[i];
  },

  async remove(table, id) {
    writeTable(table, readTable(table).filter((r) => r.id !== id));
    enqueue({ table, kind: 'remove', payload: { id } });
  },

  async removeWhere(table, eq) {
    const rows = readTable(table).filter(
      (r) => !Object.entries(eq).every(([c, v]) => r[c] === v),
    );
    writeTable(table, rows);
    enqueue({ table, kind: 'removeWhere', payload: { eq } });
  },

  /**
   * Most recently logged weight per exercise, used to pre-fill the weight
   * placeholder during a session. Scans the user's recent completed sessions
   * newest-first and keeps the first hit for each exercise.
   */
  async lastWeights(userId, { limitSessions = 40 } = {}) {
    const sessions = selectFrom(readTable(TABLES.sessions), {
      eq: { user_id: userId }, order: 'started_at', ascending: false,
    }).filter((s) => s.completed_at).slice(0, limitSessions);

    if (sessions.length === 0) return {};

    const ids = sessions.map((s) => s.id);
    const rank = new Map(ids.map((id, i) => [id, i])); // 0 = most recent
    const sets = selectFrom(readTable(TABLES.sessionSets), { inList: { session_id: ids } });

    const out = {};
    for (const s of sets) {
      if (s.weight_kg == null) continue;
      const r = rank.get(s.session_id);
      if (r === undefined) continue;
      const prev = out[s.exercise_id];
      if (!prev || r < prev.rank || (r === prev.rank && s.weight_kg > prev.weight_kg)) {
        out[s.exercise_id] = { weight_kg: s.weight_kg, reps: s.reps_done, rank: r };
      }
    }
    return out;
  },

  /**
   * How often and how recently the user has logged each exercise, for the
   * "Most used" / "Last used" sorts in the exercise picker.
   * -> { [exercise_id]: { count, lastAt } }
   */
  async exerciseUsage(userId) {
    const sessions = selectFrom(readTable(TABLES.sessions), {
      eq: { user_id: userId }, order: 'started_at', ascending: false,
    }).filter((s) => s.completed_at);

    if (sessions.length === 0) return {};

    const startedAt = new Map(sessions.map((s) => [s.id, s.started_at]));
    const sets = selectFrom(readTable(TABLES.sessionSets), {
      inList: { session_id: [...startedAt.keys()] },
    });

    const out = {};
    for (const s of sets) {
      const at = startedAt.get(s.session_id);
      if (!at) continue;
      const cur = (out[s.exercise_id] ??= { count: 0, lastAt: null });
      cur.count += 1;
      if (!cur.lastAt || at > cur.lastAt) cur.lastAt = at;
    }
    return out;
  },

  /**
   * Every exercise the user has ever logged a set for, most-logged first —
   * the picklist for the Exercises progress tab.
   * -> [{ exercise_id, exercise_name, count, lastAt }]
   */
  async loggedExercises(userId) {
    const sessions = selectFrom(readTable(TABLES.sessions), {
      eq: { user_id: userId },
    }).filter((s) => s.completed_at);
    if (sessions.length === 0) return [];

    const startedAt = new Map(sessions.map((s) => [s.id, s.started_at]));
    const sets = selectFrom(readTable(TABLES.sessionSets), {
      inList: { session_id: [...startedAt.keys()] },
    });

    const byExercise = new Map();
    for (const s of sets) {
      const at = startedAt.get(s.session_id);
      if (!at) continue;
      const cur = byExercise.get(s.exercise_id) ??
        { exercise_id: s.exercise_id, exercise_name: s.exercise_name, count: 0, lastAt: null };
      cur.count += 1;
      if (!cur.lastAt || at > cur.lastAt) cur.lastAt = at;
      byExercise.set(s.exercise_id, cur);
    }
    return [...byExercise.values()].sort((a, b) => b.count - a.count);
  },

  /**
   * One point per completed session that included this exercise: the
   * session's "top set" (heaviest weight, ties broken by reps — or, for a
   * bodyweight exercise with no weight ever logged, the highest rep count)
   * plus an Epley-formula estimated 1RM. Sorted oldest → newest for charting.
   * -> [{ date, weightKg, reps, estOneRM }]
   */
  async exerciseHistory(userId, exerciseId) {
    const sessions = selectFrom(readTable(TABLES.sessions), {
      eq: { user_id: userId },
    }).filter((s) => s.completed_at);
    if (sessions.length === 0) return [];

    const dateBySession = new Map(sessions.map((s) => [s.id, s.started_at]));
    const sets = selectFrom(readTable(TABLES.sessionSets), {
      inList: { session_id: [...dateBySession.keys()] },
    }).filter((s) => s.exercise_id === exerciseId);

    const bySession = new Map();
    for (const s of sets) {
      const list = bySession.get(s.session_id) ?? [];
      list.push(s);
      bySession.set(s.session_id, list);
    }

    const out = [];
    for (const [sessionId, list] of bySession) {
      const hasWeight = list.some((s) => s.weight_kg != null);
      const top = hasWeight
        ? list.reduce((a, b) => (
            (b.weight_kg ?? -1) > (a.weight_kg ?? -1) ||
            ((b.weight_kg ?? -1) === (a.weight_kg ?? -1) && b.reps_done > a.reps_done) ? b : a
          ))
        : list.reduce((a, b) => (b.reps_done > a.reps_done ? b : a));

      out.push({
        date: dateBySession.get(sessionId),
        weightKg: top.weight_kg ?? null,
        reps: top.reps_done,
        estOneRM: top.weight_kg != null ? top.weight_kg * (1 + top.reps_done / 30) : null,
      });
    }
    return out.sort((a, b) => a.date.localeCompare(b.date));
  },

  /** Full JSON dump of every table for the Settings → Export feature. */
  async exportAll(userId) {
    const tables = [
      'profiles', 'weight_logs', 'workout_templates', 'template_exercises',
      'workout_sessions', 'session_sets', 'scheduled_workouts', 'run_sessions',
      'custom_exercises',
    ];
    const out = { exported_at: new Date().toISOString(), backend, data: {} };
    for (const t of tables) {
      out.data[t] = selectFrom(readTable(t), t === 'profiles' ? {} : { eq: { user_id: userId } });
    }
    return out;
  },
};

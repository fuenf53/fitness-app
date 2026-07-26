/**
 * db.js — the single data access layer for the whole app.
 *
 * Every feature talks to this module, never to Supabase or localStorage
 * directly. Two backends implement the same interface:
 *
 *   • local   — localStorage, used when no Supabase keys are present.
 *   • remote  — Supabase Postgres (tables match supabase/schema.sql).
 *
 * Because the interface is identical, adding Supabase credentials later
 * switches the whole app over with no feature-file changes.
 */
import { supabase, isSupabaseConfigured } from './supabase.js';

const NS = 'fitapp';
export const backend = isSupabaseConfigured ? 'supabase' : 'local';

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

export const uid = () =>
  (crypto.randomUUID?.() ?? `id-${Date.now()}-${Math.random().toString(16).slice(2)}`);

const key = (table) => `${NS}:${table}`;

function readTable(table) {
  try {
    return JSON.parse(localStorage.getItem(key(table)) ?? '[]');
  } catch {
    return [];
  }
}

function writeTable(table, rows) {
  localStorage.setItem(key(table), JSON.stringify(rows));
  return rows;
}

/* ------------------------------------------------------------------ */
/* local backend                                                       */
/* ------------------------------------------------------------------ */

const local = {
  async select(table, { eq = {}, inList = {}, order, ascending = true } = {}) {
    let rows = readTable(table);
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
  },

  async insert(table, row) {
    const rows = readTable(table);
    const record = { id: uid(), created_at: new Date().toISOString(), ...row };
    rows.push(record);
    writeTable(table, rows);
    return record;
  },

  async update(table, id, patch) {
    const rows = readTable(table);
    const i = rows.findIndex((r) => r.id === id);
    if (i === -1) return null;
    rows[i] = { ...rows[i], ...patch };
    writeTable(table, rows);
    return rows[i];
  },

  async remove(table, id) {
    writeTable(table, readTable(table).filter((r) => r.id !== id));
  },

  async removeWhere(table, eq) {
    const rows = readTable(table).filter(
      (r) => !Object.entries(eq).every(([c, v]) => r[c] === v),
    );
    writeTable(table, rows);
  },
};

/* ------------------------------------------------------------------ */
/* supabase backend                                                    */
/* ------------------------------------------------------------------ */

/**
 * Supabase returns PGRST205 when a table is missing from the schema cache,
 * which in practice means supabase/schema.sql was never run. Say so plainly
 * instead of surfacing a PostgREST code.
 */
function explain(error) {
  if (error?.code === 'PGRST205') {
    return new Error(
      'Supabase is configured but the tables do not exist yet — run supabase/schema.sql in the SQL editor.',
    );
  }
  return error;
}

const remote = {
  async select(table, { eq = {}, inList = {}, order, ascending = true } = {}) {
    let q = supabase.from(table).select('*');
    for (const [col, val] of Object.entries(eq)) {
      if (val !== undefined) q = q.eq(col, val);
    }
    for (const [col, vals] of Object.entries(inList)) q = q.in(col, vals);
    if (order) q = q.order(order, { ascending });
    const { data, error } = await q;
    if (error) throw explain(error);
    return data ?? [];
  },

  async insert(table, row) {
    const { data, error } = await supabase.from(table).insert(row).select().single();
    if (error) throw explain(error);
    return data;
  },

  async update(table, id, patch) {
    const { data, error } = await supabase
      .from(table).update(patch).eq('id', id).select().single();
    if (error) throw explain(error);
    return data;
  },

  async remove(table, id) {
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) throw explain(error);
  },

  async removeWhere(table, eq) {
    let q = supabase.from(table).delete();
    for (const [col, val] of Object.entries(eq)) q = q.eq(col, val);
    const { error } = await q;
    if (error) throw explain(error);
  },
};

const impl = backend === 'supabase' ? remote : local;

/* ------------------------------------------------------------------ */
/* public API                                                          */
/* ------------------------------------------------------------------ */

export const db = {
  backend,
  select: impl.select,
  insert: impl.insert,
  update: impl.update,
  remove: impl.remove,
  removeWhere: impl.removeWhere,

  /**
   * Most recently logged weight per exercise, used to pre-fill the weight
   * placeholder during a session. Scans the user's recent completed sessions
   * newest-first and keeps the first hit for each exercise.
   */
  async lastWeights(userId, { limitSessions = 40 } = {}) {
    const sessions = (
      await impl.select(TABLES.sessions, {
        eq: { user_id: userId }, order: 'started_at', ascending: false,
      })
    ).filter((s) => s.completed_at).slice(0, limitSessions);

    if (sessions.length === 0) return {};

    const ids = sessions.map((s) => s.id);
    const rank = new Map(ids.map((id, i) => [id, i]));   // 0 = most recent
    const sets = await impl.select(TABLES.sessionSets, { inList: { session_id: ids } });

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
    const sessions = (
      await impl.select(TABLES.sessions, {
        eq: { user_id: userId }, order: 'started_at', ascending: false,
      })
    ).filter((s) => s.completed_at);

    if (sessions.length === 0) return {};

    const startedAt = new Map(sessions.map((s) => [s.id, s.started_at]));
    const sets = await impl.select(TABLES.sessionSets, {
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

  /** Full JSON dump of every table for the Settings → Export feature. */
  async exportAll(userId) {
    const tables = [
      'profiles', 'weight_logs', 'workout_templates', 'template_exercises',
      'workout_sessions', 'session_sets', 'scheduled_workouts', 'run_sessions',
      'custom_exercises',
    ];
    const out = { exported_at: new Date().toISOString(), backend, data: {} };
    for (const t of tables) {
      out.data[t] = await impl.select(t, t === 'profiles' ? {} : { user_id: userId });
    }
    return out;
  },
};

export const TABLES = {
  profiles: 'profiles',
  weightLogs: 'weight_logs',
  templates: 'workout_templates',
  templateExercises: 'template_exercises',
  sessions: 'workout_sessions',
  sessionSets: 'session_sets',
  scheduled: 'scheduled_workouts',
  runs: 'run_sessions',
  customExercises: 'custom_exercises',
};

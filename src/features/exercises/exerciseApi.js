/**
 * exerciseApi.js — exercise catalogue access.
 *
 * Three sources, merged behind one async interface:
 *   1. the bundled catalogue (exerciseData.js) — ~690 exercises,
 *   2. a self-hosted ExerciseDB, if VITE_EXERCISE_API is set,
 *   3. the user's own exercises, created in the app and passed in by the
 *      caller (they live in the `custom_exercises` table).
 *
 * ExRx.net is used as the classification reference and each bundled exercise
 * links to its muscle-group directory page; their database itself is
 * copyrighted and is not reproduced here.
 */
import { EXERCISES, BODY_PARTS, EQUIPMENT } from './exerciseData.js';

const REMOTE = import.meta.env.VITE_EXERCISE_API || null;

const normalise = (e) => ({
  id: String(e.id),
  name: e.name,
  bodyPart: e.bodyPart ?? e.body_part ?? 'other',
  target: e.target ?? '',
  equipment: e.equipment ?? 'other',
  mechanics: e.mechanics ?? null,
  force: e.force ?? null,
  gifUrl: e.gifUrl ?? null,
  exrxUrl: e.exrxUrl ?? null,
  popularity: e.popularity ?? 0,
  custom: Boolean(e.custom),
  instructions: Array.isArray(e.instructions)
    ? e.instructions
    : String(e.instructions ?? '').split('\n').filter(Boolean),
});

/** A `custom_exercises` row -> catalogue shape. */
export const fromCustomRow = (r) =>
  normalise({ ...r, bodyPart: r.body_part, custom: true });

let remoteCache = null;

async function loadRemote() {
  if (remoteCache) return remoteCache;
  const res = await fetch(`${REMOTE.replace(/\/$/, '')}/exercises?limit=2000`);
  if (!res.ok) throw new Error(`Exercise API ${res.status}`);
  remoteCache = (await res.json()).map(normalise);
  return remoteCache;
}

async function catalogue() {
  if (REMOTE) {
    try {
      return await loadRemote();
    } catch (err) {
      console.warn('Remote exercise API failed, using bundled catalogue', err);
    }
  }
  return EXERCISES.map(normalise);
}

export const SORTS = [
  { id: 'alpha', label: 'A–Z' },
  { id: 'used',  label: 'Most used' },
  { id: 'last',  label: 'Last used' },
];

/**
 * Search + filter + sort.
 *
 * `custom` is a list of the user's own exercise rows; `usage` is the map from
 * db.exerciseUsage() keyed by exercise id.
 *
 * With a search term the relevance ranking always wins — sorting a search
 * result set alphabetically would bury the obvious match.
 */
export async function searchExercises({
  query = '', bodyPart = 'all', equipment = 'all',
  custom = [], sort = 'alpha', usage = {},
} = {}) {
  const list = [...custom.map(fromCustomRow), ...(await catalogue())];
  const q = query.trim().toLowerCase();

  const matches = list.filter((e) => {
    if (bodyPart !== 'all' && e.bodyPart !== bodyPart) return false;
    if (equipment !== 'all' && e.equipment !== equipment) return false;
    if (!q) return true;
    return (
      e.name.toLowerCase().includes(q) ||
      e.target.toLowerCase().includes(q) ||
      e.bodyPart.toLowerCase().includes(q) ||
      e.equipment.toLowerCase().includes(q)
    );
  });

  const byName = (a, b) => a.name.localeCompare(b.name);

  if (q) {
    // Relevance: user's own first, then name-prefix, then name, then the rest.
    const score = (e) => {
      const n = e.name.toLowerCase();
      if (e.custom) return 0;
      if (n.startsWith(q)) return 1;
      if (n.includes(q)) return 2;
      return 3;
    };
    return matches.sort((a, b) => score(a) - score(b) || byName(a, b));
  }

  if (sort === 'used') {
    // Exercises the user actually logs, most first; then editorial popularity.
    return matches.sort((a, b) => {
      const ua = usage[a.id]?.count ?? 0;
      const ub = usage[b.id]?.count ?? 0;
      return ub - ua || b.popularity - a.popularity || byName(a, b);
    });
  }

  if (sort === 'last') {
    // Most recently logged first; anything never logged sinks to the bottom.
    return matches.sort((a, b) => {
      const la = usage[a.id]?.lastAt ?? '';
      const lb = usage[b.id]?.lastAt ?? '';
      if (la !== lb) return lb.localeCompare(la);
      return byName(a, b);
    });
  }

  return matches.sort(byName);
}

export async function getExercise(id, custom = []) {
  const list = [...custom.map(fromCustomRow), ...(await catalogue())];
  return list.find((e) => e.id === String(id)) ?? null;
}

/** Resolve many ids at once (used when rendering saved templates). */
export async function getExerciseMap(ids, custom = []) {
  const list = [...custom.map(fromCustomRow), ...(await catalogue())];
  const want = new Set(ids.map(String));
  return Object.fromEntries(list.filter((e) => want.has(e.id)).map((e) => [e.id, e]));
}

export const bodyParts = () => BODY_PARTS;
export const equipmentTypes = () => EQUIPMENT;
export const catalogueSize = () => EXERCISES.length;
export const source = REMOTE ? 'remote' : 'bundled';

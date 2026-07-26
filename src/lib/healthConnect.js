/**
 * healthConnect.js — Garmin → Google Health Connect → app.
 *
 * IMPORTANT, and different from the original plan: Health Connect has **no Web
 * API**. It is an Android-only SDK (`androidx.health.connect`), readable only
 * by an installed Android app — a browser tab, PWA included, cannot query it.
 *
 * So this module supports three paths, in order of preference:
 *
 *  1. NATIVE BRIDGE — if the PWA is wrapped (Capacitor / TWA / WebView) and the
 *     wrapper injects `window.HealthConnect`, we call it directly. That wrapper
 *     is the only piece that talks to the Android SDK. Interface expected:
 *       window.HealthConnect.requestPermissions(): Promise<boolean>
 *       window.HealthConnect.readExerciseSessions(startISO, endISO): Promise<Session[]>
 *
 *  2. FILE IMPORT — the user exports from Health Connect (Settings → Data and
 *     access → Export) or Garmin Connect and drops the JSON in. Works today,
 *     in any browser, with no wrapper. `parseRunExport` handles both shapes.
 *
 *  3. MANUAL ENTRY — always available, handled in RunSync.jsx.
 *
 * Garmin's own developer API stays out of scope: new applications are limited
 * to registered companies, so it is not an option for personal use.
 */

const bridge = () => (typeof window !== 'undefined' ? window.HealthConnect : undefined);

export const isNativeBridgeAvailable = () => typeof bridge()?.readExerciseSessions === 'function';

export async function requestPermissions() {
  const hc = bridge();
  if (!hc) throw new Error('Health Connect bridge unavailable');
  return hc.requestPermissions?.(['ExerciseSession', 'Distance', 'HeartRate', 'TotalCaloriesBurned']) ?? false;
}

/** Read run sessions from the native bridge. `since` is a Date. */
export async function readRuns(since = new Date(Date.now() - 90 * 86400000)) {
  const hc = bridge();
  if (!hc) throw new Error('Health Connect bridge unavailable');
  const raw = await hc.readExerciseSessions(since.toISOString(), new Date().toISOString());
  return (Array.isArray(raw) ? raw : []).map(fromHealthConnect).filter(Boolean);
}

/* ------------------------------------------------------------------ */
/* normalisers                                                         */
/* ------------------------------------------------------------------ */

const RUN_TYPES = new Set([
  'RUNNING', 'RUNNING_TREADMILL', 'running', 'treadmill_running', 'trail_running', 'run',
]);

const num = (v) => (typeof v === 'number' && isFinite(v) ? v : null);

/** Health Connect ExerciseSessionRecord → our run_sessions row. */
export function fromHealthConnect(r) {
  const type = r.exerciseType ?? r.activityType ?? 'RUNNING';
  if (!RUN_TYPES.has(type)) return null;

  const start = r.startTime ?? r.startTimeMillis;
  const end = r.endTime ?? r.endTimeMillis;
  const startedAt = start ? new Date(start).toISOString() : new Date().toISOString();
  const durationS =
    num(r.durationSeconds) ??
    (start && end ? Math.round((new Date(end) - new Date(start)) / 1000) : 0);

  const distanceKm =
    num(r.distanceKm) ??
    (num(r.distanceMeters) != null ? r.distanceMeters / 1000 : 0);

  return {
    source: 'health-connect',
    external_id: r.metadata?.id ?? r.id ?? null,
    title: r.title ?? 'Run',
    started_at: startedAt,
    distance_km: distanceKm,
    duration_s: durationS,
    avg_pace_s: distanceKm > 0 ? durationS / distanceKm : null,
    hr_avg: num(r.avgHeartRateBpm) ?? num(r.heartRate?.avg) ?? null,
    hr_max: num(r.maxHeartRateBpm) ?? num(r.heartRate?.max) ?? null,
    calories: num(r.totalCalories) ?? num(r.activeCalories) ?? null,
  };
}

/** Garmin Connect activity JSON → our run_sessions row. */
export function fromGarmin(a) {
  const type = a.activityType?.typeKey ?? a.activityType ?? '';
  if (!String(type).toLowerCase().includes('run')) return null;

  const durationS = Math.round(num(a.duration) ?? num(a.elapsedDuration) ?? 0);
  const distanceKm = (num(a.distance) ?? 0) / 1000;

  return {
    source: 'garmin',
    external_id: a.activityId != null ? String(a.activityId) : null,
    title: a.activityName ?? 'Run',
    started_at: new Date(a.startTimeLocal ?? a.startTimeGMT ?? Date.now()).toISOString(),
    distance_km: distanceKm,
    duration_s: durationS,
    avg_pace_s: distanceKm > 0 ? durationS / distanceKm : null,
    hr_avg: num(a.averageHR) ?? null,
    hr_max: num(a.maxHR) ?? null,
    calories: num(a.calories) ?? null,
  };
}

/**
 * Accepts a Health Connect export, a Garmin activity export, or an array of
 * either, and returns normalised run rows.
 */
export function parseRunExport(json) {
  const candidates = Array.isArray(json)
    ? json
    : json.exerciseSessions ?? json.records ?? json.activities ?? json.data ?? [];

  const rows = [];
  for (const item of candidates) {
    const parsed = fromHealthConnect(item) ?? fromGarmin(item);
    if (parsed) rows.push(parsed);
  }
  return rows;
}

/** Human-readable explanation of why direct sync may be unavailable. */
export function syncStatus() {
  if (isNativeBridgeAvailable()) {
    return { ok: true, mode: 'native', message: 'Health Connect bridge detected.' };
  }
  return {
    ok: false,
    mode: 'import',
    message:
      'Health Connect is an Android-only API and cannot be read from a browser. ' +
      'Import an export file or add runs manually.',
  };
}

/** Unit conversion + formatting helpers, shared by every feature. */

export const KG_PER_LB = 0.45359237;
export const KM_PER_MILE = 1.609344;

export const kgToDisplay = (kg, units) =>
  units === 'lb' ? kg / KG_PER_LB : kg;

export const displayToKg = (val, units) =>
  units === 'lb' ? val * KG_PER_LB : val;

export const kmToDisplay = (km, distUnits) =>
  distUnits === 'mi' ? km / KM_PER_MILE : km;

export const weightUnitLabel = (units) => (units === 'lb' ? 'lb' : 'kg');
export const distUnitLabel = (u) => (u === 'mi' ? 'mi' : 'km');

export const round1 = (n) => Math.round(n * 10) / 10;

/** 3725 -> "1:02:05", 605 -> "10:05" */
export function formatDuration(seconds) {
  const s = Math.max(0, Math.round(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}

/** Pace in seconds per unit distance -> "5:12 /km" */
export function formatPace(secondsPerUnit, unitLabel = 'km') {
  if (!isFinite(secondsPerUnit) || secondsPerUnit <= 0) return '—';
  const m = Math.floor(secondsPerUnit / 60);
  const s = Math.round(secondsPerUnit % 60);
  return `${m}:${String(s).padStart(2, '0')} /${unitLabel}`;
}

/** Local YYYY-MM-DD (never UTC — avoids the day-shifting bug). */
export function toISODate(date = new Date()) {
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fromISODate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export const isSameDay = (a, b) => toISODate(a) === toISODate(b);

export function formatDate(iso, opts = { month: 'short', day: 'numeric' }) {
  const d = typeof iso === 'string' && iso.length === 10 ? fromISODate(iso) : new Date(iso);
  return d.toLocaleDateString(undefined, opts);
}

export function relativeDay(iso) {
  const today = toISODate();
  const yesterday = toISODate(new Date(Date.now() - 86400000));
  const tomorrow = toISODate(new Date(Date.now() + 86400000));
  if (iso === today) return 'Today';
  if (iso === yesterday) return 'Yesterday';
  if (iso === tomorrow) return 'Tomorrow';
  return formatDate(iso, { weekday: 'short', month: 'short', day: 'numeric' });
}

/* ------------------------------------------------------------------ */
/* rep targets — a single number ("10") or a range ("10-12")           */
/* ------------------------------------------------------------------ */

/**
 * Parses a rep target into { min, max, label, amrap }, or null if unusable.
 *
 * Accepts numbers (legacy templates stored reps as an int) and strings:
 *   "10"      fixed target
 *   "10-12"   range, any common dash or "to"
 *   "12+"     open-ended target
 *   "-"       all-out set — as many reps as possible (also "max" / "amrap")
 */
export function parseReps(input) {
  if (input == null || input === '') return null;

  if (typeof input === 'number') {
    if (!isFinite(input) || input <= 0) return null;
    const n = Math.round(input);
    return { min: n, max: n, label: String(n), amrap: false };
  }

  const text = String(input).trim();

  // All-out set: no target, log whatever you actually got.
  if (/^(-+|–|—|max|amrap)$/i.test(text)) {
    return { min: null, max: null, label: 'max', amrap: true };
  }

  // "12+" — open-ended target
  const open = text.match(/^(\d+)\s*\+$/);
  if (open) {
    const n = Number(open[1]);
    return n > 0 ? { min: n, max: n, label: `${n}+`, amrap: false } : null;
  }

  const parts = text.split(/\s*[-–—to]+\s*/i).filter(Boolean);
  const nums = parts.map(Number).filter((n) => isFinite(n) && n > 0).map(Math.round);
  if (nums.length === 0) return null;

  if (nums.length === 1) {
    return { min: nums[0], max: nums[0], label: String(nums[0]), amrap: false };
  }

  const min = Math.min(nums[0], nums[1]);
  const max = Math.max(nums[0], nums[1]);
  return { min, max, label: min === max ? String(min) : `${min}-${max}`, amrap: false };
}

/** Normalised label for storage, or null when the input is unusable. */
export const repsLabel = (input) => parseReps(input)?.label ?? null;

export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

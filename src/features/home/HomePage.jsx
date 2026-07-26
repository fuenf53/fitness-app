/** Dashboard — today's plan, quick-start, and a week-at-a-glance summary. */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { db, TABLES } from '../../lib/db.js';
import { useApp } from '../../lib/store.jsx';
import {
  toISODate, relativeDay, formatDuration, kgToDisplay, kmToDisplay,
  weightUnitLabel, distUnitLabel, round1, WEEKDAYS,
} from '../../lib/format.js';
import { useTemplates, startSession } from '../workouts/WorkoutsPage.jsx';
import { Button, Card, Stat, Spinner, Badge, EmptyState } from '../../components/ui.jsx';
import { PlayIcon, FlameIcon, PlusIcon } from '../../components/Icons.jsx';
import './home.css';

const greeting = () => {
  const h = new Date().getHours();
  if (h < 5) return 'Still up';
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
};

/** Mon-first array of the current week's ISO dates. */
function currentWeek() {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return toISODate(d);
  });
}

export default function HomePage({ setActiveSession, onNavigate }) {
  const { profile, units, distUnits, toast } = useApp();
  const { templates, loading: tplLoading } = useTemplates(profile?.id);
  const [sessions, setSessions] = useState([]);
  const [scheduled, setScheduled] = useState([]);
  const [weights, setWeights] = useState([]);
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!profile?.id) return;
    try {
      const [ses, sch, w, r] = await Promise.all([
        db.select(TABLES.sessions, { eq: { user_id: profile.id } }),
        db.select(TABLES.scheduled, { eq: { user_id: profile.id } }),
        db.select(TABLES.weightLogs, { eq: { user_id: profile.id }, order: 'logged_at' }),
        db.select(TABLES.runs, { eq: { user_id: profile.id } }),
      ]);
      setSessions(ses.filter((s) => s.completed_at));
      setScheduled(sch);
      setWeights(w);
      setRuns(r);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [profile?.id]);

  useEffect(() => { reload(); }, [reload]);

  const week = useMemo(currentWeek, []);
  const today = toISODate();

  const todayPlan = scheduled.filter((s) => s.date === today);
  const doneToday = sessions.filter((s) => toISODate(s.started_at) === today);

  const weekStats = useMemo(() => {
    const inWeek = sessions.filter((s) => week.includes(toISODate(s.started_at)));
    const runsInWeek = runs.filter((r) => week.includes(toISODate(r.started_at)));
    return {
      workouts: inWeek.length,
      minutes: Math.round(inWeek.reduce((n, s) => n + (s.duration_s ?? 0), 0) / 60),
      volume: inWeek.reduce((n, s) => n + (s.total_volume_kg ?? 0), 0),
      runKm: runsInWeek.reduce((n, r) => n + (r.distance_km ?? 0), 0),
      days: new Set(inWeek.map((s) => toISODate(s.started_at))),
    };
  }, [sessions, runs, week]);

  const latestWeight = weights.length ? weights[weights.length - 1] : null;
  const recent = [...sessions]
    .sort((a, b) => b.started_at.localeCompare(a.started_at))
    .slice(0, 3);

  async function quickStart(t) {
    if (t.exercises.length === 0) return toast('Add exercises to this workout first', 'danger');
    const s = await startSession(profile.id, t);
    setActiveSession(s);
    onNavigate('workout');
  }

  const unit = weightUnitLabel(units);
  const du = distUnitLabel(distUnits);

  if (loading || tplLoading) return <div className="page"><Spinner /></div>;

  return (
    <div className="page">
      <div className="home-head">
        <p className="home-head__greet">{greeting()},</p>
        <h1 className="page-title">{profile?.username}</h1>
      </div>

      {/* ------------------------ today ------------------------ */}
      <Card glow={todayPlan.length > 0 || doneToday.length > 0} className="today-card">
        <div className="row-between">
          <p className="section-title" style={{ margin: 0 }}>Today</p>
          {doneToday.length > 0 && <Badge tone="success">Done ✓</Badge>}
        </div>

        {doneToday.length > 0 ? (
          <div className="stack-2" style={{ marginTop: 'var(--space-3)' }}>
            {doneToday.map((s) => (
              <div key={s.id} className="row-between">
                <span className="today-card__name truncate">{s.template_name}</span>
                <span className="muted" style={{ fontSize: 13 }}>
                  {formatDuration(s.duration_s ?? 0)} · {s.sets_done ?? 0} sets
                </span>
              </div>
            ))}
          </div>
        ) : todayPlan.length > 0 ? (
          <div className="stack-2" style={{ marginTop: 'var(--space-3)' }}>
            {todayPlan.map((p) => {
              const t = templates.find((x) => x.id === p.template_id);
              return (
                <div className="row-between" key={p.id}>
                  <div className="grow">
                    <p className="today-card__name truncate">{p.template_name}</p>
                    <p className="muted" style={{ fontSize: 12 }}>
                      {p.kind === 'rest'
                        ? 'Recovery day — take it easy'
                        : `${t?.exercises.length ?? 0} exercises`}
                    </p>
                  </div>
                  {p.kind === 'workout' && t && (
                    <Button size="sm" onClick={() => quickStart(t)}>
                      <PlayIcon width={13} height={13} /> Start
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ marginTop: 'var(--space-2)' }}>
            <p className="muted" style={{ fontSize: 14 }}>
              Nothing scheduled. Pick a workout below or plan your week.
            </p>
            <Button
              variant="secondary" size="sm" full
              style={{ marginTop: 'var(--space-3)' }}
              onClick={() => onNavigate('plan')}
            >
              Open planner
            </Button>
          </div>
        )}
      </Card>

      {/* ------------------------ this week ------------------------ */}
      <p className="section-title">This week</p>
      <div className="week-strip">
        {week.map((iso, i) => {
          const done = weekStats.days.has(iso);
          const planned = scheduled.some((s) => s.date === iso && s.kind === 'workout');
          return (
            <div
              key={iso}
              className={`week-day ${iso === today ? 'week-day--today' : ''} ${done ? 'week-day--done' : ''} ${planned && !done ? 'week-day--planned' : ''}`}
            >
              <span className="week-day__label">{WEEKDAYS[i][0]}</span>
              <span className="week-day__mark">{done ? '✓' : planned ? '•' : ''}</span>
            </div>
          );
        })}
      </div>

      <div className="stat-grid" style={{ marginTop: 'var(--space-3)' }}>
        <Stat label="Workouts" value={weekStats.workouts} tone="accent" />
        <Stat label="Active time" value={weekStats.minutes} unit="min" />
        <Stat label="Volume" value={round1(kgToDisplay(weekStats.volume, units))} unit={unit} />
        <Stat label="Distance run" value={round1(kmToDisplay(weekStats.runKm, distUnits))} unit={du} />
      </div>

      {/* ------------------------ quick start ------------------------ */}
      <div className="row-between" style={{ marginTop: 'var(--space-5)' }}>
        <p className="section-title" style={{ margin: 0 }}>Quick start</p>
        <Button size="sm" variant="ghost" onClick={() => onNavigate('workout')}>
          <PlusIcon width={15} height={15} /> New
        </Button>
      </div>

      {templates.length === 0 ? (
        <EmptyState
          icon="💪"
          title="No workouts yet"
          action={<Button onClick={() => onNavigate('workout')}>Create a workout</Button>}
        >
          Build a template once and start it from here any time.
        </EmptyState>
      ) : (
        <div className="quick-row">
          {templates.slice(0, 6).map((t) => (
            <button key={t.id} className="quick-card" onClick={() => quickStart(t)}>
              <span className="quick-card__icon"><FlameIcon width={16} height={16} /></span>
              <span className="quick-card__name truncate">{t.name}</span>
              <span className="quick-card__meta">{t.exercises.length} exercises</span>
            </button>
          ))}
        </div>
      )}

      {/* ------------------------ recent ------------------------ */}
      {recent.length > 0 && (
        <>
          <p className="section-title">Recent activity</p>
          <div className="stack-2">
            {recent.map((s) => (
              <div className="hist-row" key={s.id}>
                <div className="grow">
                  <p className="hist-row__name truncate">{s.template_name}</p>
                  <p className="muted" style={{ fontSize: 12 }}>
                    {relativeDay(toISODate(s.started_at))} · {formatDuration(s.duration_s ?? 0)}
                  </p>
                </div>
                <Badge tone="success">{s.sets_done ?? 0} sets</Badge>
              </div>
            ))}
          </div>
        </>
      )}

      {latestWeight && (
        <>
          <p className="section-title">Bodyweight</p>
          <Card className="row-between">
            <div>
              <p className="muted" style={{ fontSize: 12 }}>
                Last logged {relativeDay(latestWeight.logged_at)}
              </p>
              <p style={{ fontSize: 24, fontWeight: 800 }} className="tnum">
                {round1(kgToDisplay(latestWeight.weight_kg, units))}
                <span className="muted" style={{ fontSize: 14, marginLeft: 4 }}>{unit}</span>
              </p>
            </div>
            <Button size="sm" variant="secondary" onClick={() => onNavigate('profile')}>
              View progress
            </Button>
          </Card>
        </>
      )}
    </div>
  );
}

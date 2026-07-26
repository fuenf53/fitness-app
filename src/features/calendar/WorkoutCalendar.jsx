/** Monthly schedule — assign templates to days, mark rest days, see completions. */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { db, TABLES } from '../../lib/db.js';
import { useApp } from '../../lib/store.jsx';
import { toISODate, relativeDay, MONTHS, WEEKDAYS, formatDuration } from '../../lib/format.js';
import { useTemplates, startSession } from '../workouts/WorkoutsPage.jsx';
import { Button, Card, Modal, Spinner, Badge, EmptyState } from '../../components/ui.jsx';
import { ChevronLeft, ChevronRight, CheckIcon, PlayIcon, TrashIcon } from '../../components/Icons.jsx';
import './calendar.css';

/** Monday-first grid of the given month, padded to whole weeks. */
function monthGrid(year, month) {
  const first = new Date(year, month, 1);
  const lead = (first.getDay() + 6) % 7;           // Mon = 0
  const days = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < lead; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export default function WorkoutCalendar({ setActiveSession, onNavigate }) {
  const { profile, toast } = useApp();
  const { templates } = useTemplates(profile?.id);
  const [cursor, setCursor] = useState(() => new Date());
  const [scheduled, setScheduled] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dayOpen, setDayOpen] = useState(null);   // ISO date string

  const reload = useCallback(async () => {
    if (!profile?.id) return;
    try {
      const [sch, ses] = await Promise.all([
        db.select(TABLES.scheduled, { eq: { user_id: profile.id } }),
        db.select(TABLES.sessions, { eq: { user_id: profile.id } }),
      ]);
      setScheduled(sch);
      setSessions(ses.filter((s) => s.completed_at));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [profile?.id]);

  useEffect(() => { reload(); }, [reload]);

  const byDate = useMemo(() => {
    const map = {};
    for (const s of scheduled) (map[s.date] ??= { planned: [], done: [] }).planned.push(s);
    for (const s of sessions) {
      const d = toISODate(s.started_at);
      (map[d] ??= { planned: [], done: [] }).done.push(s);
    }
    return map;
  }, [scheduled, sessions]);

  const cells = monthGrid(cursor.getFullYear(), cursor.getMonth());
  const today = toISODate();
  const shift = (n) => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + n, 1));

  async function assign(templateId) {
    const t = templates.find((x) => x.id === templateId);
    await db.insert(TABLES.scheduled, {
      user_id: profile.id,
      date: dayOpen,
      template_id: t?.id ?? null,
      template_name: t?.name ?? 'Rest day',
      kind: t ? 'workout' : 'rest',
    });
    toast(t ? `${t.name} scheduled` : 'Rest day set', 'success');
    reload();
  }

  async function unschedule(id) {
    await db.remove(TABLES.scheduled, id);
    reload();
  }

  async function begin(item) {
    const t = templates.find((x) => x.id === item.template_id);
    if (!t) return toast('That workout no longer exists', 'danger');
    if (t.exercises.length === 0) return toast('Add exercises to this workout first', 'danger');
    const s = await startSession(profile.id, t);
    setActiveSession(s);
    setDayOpen(null);
    onNavigate?.('workout');
  }

  const detail = dayOpen ? byDate[dayOpen] : null;

  return (
    <div className="page">
      <div className="row-between">
        <div>
          <h1 className="page-title">Plan</h1>
          <p className="page-sub">Schedule your week</p>
        </div>
      </div>

      <Card style={{ marginTop: 'var(--space-4)' }}>
        <div className="cal-head">
          <button className="icon-btn" onClick={() => shift(-1)} aria-label="Previous month">
            <ChevronLeft width={16} height={16} />
          </button>
          <p className="cal-head__title">
            {MONTHS[cursor.getMonth()]} {cursor.getFullYear()}
          </p>
          <button className="icon-btn" onClick={() => shift(1)} aria-label="Next month">
            <ChevronRight width={16} height={16} />
          </button>
        </div>

        {loading ? <Spinner /> : (
          <>
            <div className="cal-grid cal-grid--head">
              {WEEKDAYS.map((d) => <span key={d}>{d[0]}</span>)}
            </div>
            <div className="cal-grid">
              {cells.map((date, i) => {
                if (!date) return <span key={`pad-${i}`} className="cal-cell cal-cell--pad" />;
                const iso = toISODate(date);
                const entry = byDate[iso];
                const isToday = iso === today;
                return (
                  <button
                    key={iso}
                    className={`cal-cell ${isToday ? 'cal-cell--today' : ''} ${entry?.done.length ? 'cal-cell--done' : ''} ${entry?.planned.length ? 'cal-cell--planned' : ''}`}
                    onClick={() => setDayOpen(iso)}
                  >
                    <span className="cal-cell__num">{date.getDate()}</span>
                    <span className="cal-cell__dots">
                      {entry?.done.length > 0 && <i className="dot dot--done" />}
                      {entry?.planned.some((p) => p.kind === 'workout') && <i className="dot dot--plan" />}
                      {entry?.planned.some((p) => p.kind === 'rest') && <i className="dot dot--rest" />}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="cal-legend">
              <span><i className="dot dot--plan" /> Planned</span>
              <span><i className="dot dot--done" /> Completed</span>
              <span><i className="dot dot--rest" /> Rest</span>
            </div>
          </>
        )}
      </Card>

      {/* -------------------- day detail -------------------- */}
      <Modal open={!!dayOpen} onClose={() => setDayOpen(null)} title={dayOpen ? relativeDay(dayOpen) : ''}>
        <div className="stack">
          {detail?.done?.length > 0 && (
            <>
              <p className="section-title" style={{ marginTop: 0 }}>Completed</p>
              {detail.done.map((s) => (
                <div className="day-row" key={s.id}>
                  <span className="day-row__check"><CheckIcon width={14} height={14} /></span>
                  <div className="grow">
                    <p className="day-row__name truncate">{s.template_name}</p>
                    <p className="muted" style={{ fontSize: 12 }}>
                      {formatDuration(s.duration_s ?? 0)} · {s.sets_done ?? 0} sets
                    </p>
                  </div>
                  <Badge tone="success">Done</Badge>
                </div>
              ))}
            </>
          )}

          {detail?.planned?.length > 0 && (
            <>
              <p className="section-title" style={{ marginTop: detail?.done?.length ? undefined : 0 }}>
                Planned
              </p>
              {detail.planned.map((p) => (
                <div className="day-row" key={p.id}>
                  <div className="grow">
                    <p className="day-row__name truncate">{p.template_name}</p>
                    <p className="muted" style={{ fontSize: 12 }}>
                      {p.kind === 'rest' ? 'Rest day' : 'Scheduled workout'}
                    </p>
                  </div>
                  {p.kind === 'workout' && (
                    <Button size="sm" onClick={() => begin(p)}>
                      <PlayIcon width={13} height={13} /> Start
                    </Button>
                  )}
                  <button className="icon-btn icon-btn--danger" onClick={() => unschedule(p.id)} aria-label="Remove">
                    <TrashIcon width={15} height={15} />
                  </button>
                </div>
              ))}
            </>
          )}

          <p className="section-title">Add to this day</p>
          {templates.length === 0 ? (
            <EmptyState icon="🗓️" title="No workouts saved">
              Create a workout template first, then schedule it here.
            </EmptyState>
          ) : (
            <div className="stack-2">
              {templates.map((t) => (
                <button key={t.id} className="pick-row" onClick={() => assign(t.id)}>
                  <span className="grow truncate">{t.name}</span>
                  <span className="muted" style={{ fontSize: 12 }}>{t.exercises.length} ex</span>
                </button>
              ))}
              <button className="pick-row pick-row--rest" onClick={() => assign(null)}>
                <span className="grow">Rest day</span>
              </button>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}

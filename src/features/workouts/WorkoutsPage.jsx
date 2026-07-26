/**
 * Workout tab — lists saved templates, starts sessions, and hosts the
 * builder / live-session views.
 */
import { useCallback, useEffect, useState } from 'react';
import { db, TABLES } from '../../lib/db.js';
import { useApp } from '../../lib/store.jsx';
import { formatDuration, formatDate, kgToDisplay, weightUnitLabel, round1 } from '../../lib/format.js';
import WorkoutBuilder from './WorkoutBuilder.jsx';
import WorkoutSession from './WorkoutSession.jsx';
import { Button, Card, Spinner, EmptyState, Badge, Modal } from '../../components/ui.jsx';
import { PlusIcon, PlayIcon, TrashIcon, GridIcon, ListIcon } from '../../components/Icons.jsx';
import './workouts.css';

const LAYOUT_KEY = 'fitapp:workoutLayout';

export function useTemplates(userId) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!userId) return;
    try {
      const rows = await db.select(TABLES.templates, {
        eq: { user_id: userId }, order: 'created_at', ascending: false,
      });
      const withCounts = await Promise.all(
        rows.map(async (t) => ({
          ...t,
          exercises: await db.select(TABLES.templateExercises, {
            eq: { template_id: t.id }, order: 'order_index',
          }),
        })),
      );
      setTemplates(withCounts);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { reload(); }, [reload]);
  return { templates, loading, reload };
}

/** Start a session from a template — shared with the Home tab quick-start. */
export async function startSession(userId, template) {
  return db.insert(TABLES.sessions, {
    user_id: userId,
    template_id: template.id,
    template_name: template.name,
    started_at: new Date().toISOString(),
    completed_at: null,
  });
}

export default function WorkoutsPage({ activeSession, setActiveSession }) {
  const { profile, units, toast } = useApp();
  const { templates, loading, reload } = useTemplates(profile?.id);
  const [view, setView] = useState('list');   // list | build
  const [layout, setLayout] = useState(() => localStorage.getItem(LAYOUT_KEY) ?? 'list');
  const [editing, setEditing] = useState(null);
  const [history, setHistory] = useState([]);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const setLayoutMode = (l) => { setLayout(l); localStorage.setItem(LAYOUT_KEY, l); };

  const loadHistory = useCallback(async () => {
    if (!profile?.id) return;
    const rows = await db.select(TABLES.sessions, {
      eq: { user_id: profile.id }, order: 'started_at', ascending: false,
    });
    setHistory(rows.filter((s) => s.completed_at).slice(0, 8));
  }, [profile?.id]);

  useEffect(() => { loadHistory(); }, [loadHistory, activeSession]);

  /* ------------------------------ live session ----------------------- */
  if (activeSession) {
    return (
      <WorkoutSession
        session={activeSession}
        onFinish={() => { setActiveSession(null); loadHistory(); }}
        onExit={() => setActiveSession(null)}
      />
    );
  }

  /* -------------------------------- builder -------------------------- */
  if (view === 'build') {
    return (
      <WorkoutBuilder
        template={editing}
        onDone={() => { setView('list'); setEditing(null); reload(); }}
        onCancel={() => { setView('list'); setEditing(null); }}
      />
    );
  }

  /* --------------------------------- list ---------------------------- */
  async function begin(template) {
    if (template.exercises.length === 0) {
      return toast('Add exercises to this workout first', 'danger');
    }
    const s = await startSession(profile.id, template);
    setActiveSession(s);
  }

  async function doDelete(t) {
    await db.removeWhere(TABLES.templateExercises, { template_id: t.id });
    await db.remove(TABLES.templates, t.id);
    setConfirmDelete(null);
    toast('Workout deleted');
    reload();
  }

  const unit = weightUnitLabel(units);

  return (
    <div className="page">
      <div className="row-between">
        <div className="grow">
          <h1 className="page-title">Workouts</h1>
          <p className="page-sub">{templates.length} saved template{templates.length === 1 ? '' : 's'}</p>
        </div>
        {templates.length > 1 && (
          <button
            className="icon-toggle"
            onClick={() => setLayoutMode(layout === 'list' ? 'grid' : 'list')}
            aria-label={layout === 'list' ? 'Switch to grid view' : 'Switch to list view'}
          >
            {layout === 'list' ? <GridIcon width={17} height={17} /> : <ListIcon width={17} height={17} />}
          </button>
        )}
        <Button size="sm" onClick={() => { setEditing(null); setView('build'); }}>
          <PlusIcon width={16} height={16} /> New
        </Button>
      </div>

      {loading ? (
        <Spinner />
      ) : templates.length === 0 ? (
        <EmptyState
          icon="🏋️"
          title="No workouts yet"
          action={<Button onClick={() => setView('build')}>Create your first workout</Button>}
        >
          Build a template once, then start it any time with a single tap.
        </EmptyState>
      ) : (
        <div
          className={layout === 'grid' ? 'tpl-grid' : 'stack'}
          style={{ marginTop: 'var(--space-4)' }}
        >
          {templates.map((t) =>
            layout === 'grid' ? (
              <Card key={t.id} className="tpl-tile">
                <button
                  className="tpl-tile__body"
                  onClick={() => { setEditing(t); setView('build'); }}
                >
                  <p className="tpl-tile__name">{t.name}</p>
                  <p className="tpl-tile__meta">
                    {t.exercises.length} ex · {t.exercises.reduce((n, e) => n + (e.sets ?? 0), 0)} sets
                  </p>
                </button>
                <div className="tpl-tile__actions">
                  <button
                    className="icon-btn icon-btn--danger"
                    onClick={() => setConfirmDelete(t)}
                    aria-label={`Delete ${t.name}`}
                  >
                    <TrashIcon width={15} height={15} />
                  </button>
                  <Button size="sm" className="grow" onClick={() => begin(t)}>
                    <PlayIcon width={13} height={13} /> Start
                  </Button>
                </div>
              </Card>
            ) : (
              <Card key={t.id} className="tpl-card">
                <div className="row-between">
                  <div className="grow" onClick={() => { setEditing(t); setView('build'); }} style={{ cursor: 'pointer' }}>
                    <p className="tpl-card__name truncate">{t.name}</p>
                    <p className="muted" style={{ fontSize: 12 }}>
                      {t.exercises.length} exercise{t.exercises.length === 1 ? '' : 's'} ·{' '}
                      {t.exercises.reduce((n, e) => n + (e.sets ?? 0), 0)} sets
                    </p>
                  </div>
                  <div className="row" style={{ gap: 6 }}>
                    <button
                      className="icon-btn icon-btn--danger"
                      onClick={() => setConfirmDelete(t)}
                      aria-label={`Delete ${t.name}`}
                    >
                      <TrashIcon width={16} height={16} />
                    </button>
                    <Button size="sm" onClick={() => begin(t)}>
                      <PlayIcon width={14} height={14} /> Start
                    </Button>
                  </div>
                </div>

                {t.exercises.length > 0 && (
                  <div className="tpl-card__ex">
                    {t.exercises.slice(0, 4).map((e) => (
                      <span key={e.id} className="tpl-pill truncate">
                        {e.exercise_name} <span className="muted">{e.sets}×{e.reps}</span>
                      </span>
                    ))}
                    {t.exercises.length > 4 && (
                      <span className="tpl-pill muted">+{t.exercises.length - 4} more</span>
                    )}
                  </div>
                )}
              </Card>
            ),
          )}
        </div>
      )}

      {history.length > 0 && (
        <>
          <p className="section-title">Recent sessions</p>
          <div className="stack-2">
            {history.map((s) => (
              <div className="hist-row" key={s.id}>
                <div className="grow">
                  <p className="hist-row__name truncate">{s.template_name}</p>
                  <p className="muted" style={{ fontSize: 12 }}>
                    {formatDate(s.started_at, { weekday: 'short', month: 'short', day: 'numeric' })}
                    {' · '}{formatDuration(s.duration_s ?? 0)}
                    {s.total_volume_kg ? ` · ${round1(kgToDisplay(s.total_volume_kg, units))} ${unit}` : ''}
                  </p>
                </div>
                <Badge tone="success">{s.sets_done ?? 0} sets</Badge>
              </div>
            ))}
          </div>
        </>
      )}

      <Modal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Delete workout?"
        footer={
          <>
            <Button variant="secondary" className="grow" onClick={() => setConfirmDelete(null)}>Cancel</Button>
            <Button variant="danger" className="grow" onClick={() => doDelete(confirmDelete)}>Delete</Button>
          </>
        }
      >
        <p className="muted">
          “{confirmDelete?.name}” and its exercises will be removed. Completed sessions are kept.
        </p>
      </Modal>
    </div>
  );
}

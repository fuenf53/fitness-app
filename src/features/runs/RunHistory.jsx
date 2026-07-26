/** List of synced/imported runs with distance, pace and HR. */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { db, TABLES } from '../../lib/db.js';
import { useApp } from '../../lib/store.jsx';
import {
  kmToDisplay, distUnitLabel, formatDuration, formatPace, formatDate, round1, KM_PER_MILE,
} from '../../lib/format.js';
import RunSync from './RunSync.jsx';
import { Button, Card, Stat, Spinner, EmptyState, Badge } from '../../components/ui.jsx';
import { PlusIcon, TrashIcon, RunIcon } from '../../components/Icons.jsx';
import './runs.css';

export default function RunHistory() {
  const { profile, distUnits, toast } = useApp();
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncOpen, setSyncOpen] = useState(false);

  const reload = useCallback(async () => {
    if (!profile?.id) return;
    try {
      const rows = await db.select(TABLES.runs, {
        eq: { user_id: profile.id }, order: 'started_at', ascending: false,
      });
      setRuns(rows);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [profile?.id]);

  useEffect(() => { reload(); }, [reload]);

  const totals = useMemo(() => {
    if (runs.length === 0) return null;
    const dist = runs.reduce((n, r) => n + (r.distance_km ?? 0), 0);
    const time = runs.reduce((n, r) => n + (r.duration_s ?? 0), 0);
    const thisMonth = runs.filter((r) => new Date(r.started_at).getMonth() === new Date().getMonth());
    return {
      dist, time,
      count: runs.length,
      monthDist: thisMonth.reduce((n, r) => n + (r.distance_km ?? 0), 0),
      avgPace: dist > 0 ? time / dist : null,
    };
  }, [runs]);

  async function remove(id) {
    await db.remove(TABLES.runs, id);
    toast('Run removed');
    reload();
  }

  const du = distUnitLabel(distUnits);
  const dist = (km) => round1(kmToDisplay(km ?? 0, distUnits));
  /** Pace is stored per km; convert to per mile when needed. */
  const pace = (secPerKm) =>
    secPerKm == null ? '—' : formatPace(distUnits === 'mi' ? secPerKm * KM_PER_MILE : secPerKm, du);

  if (loading) return <Spinner />;

  return (
    <>
      <div className="row-between" style={{ marginTop: 'var(--space-4)' }}>
        <p className="section-title" style={{ margin: 0 }}>Runs</p>
        <Button size="sm" variant="secondary" onClick={() => setSyncOpen(true)}>
          <PlusIcon width={16} height={16} /> Add
        </Button>
      </div>

      {runs.length === 0 ? (
        <EmptyState
          icon="🏃"
          title="No runs yet"
          action={<Button onClick={() => setSyncOpen(true)}>Add runs</Button>}
        >
          Sync from Garmin via Health Connect, import an export file, or add a run by hand.
        </EmptyState>
      ) : (
        <>
          <div className="stat-grid" style={{ marginTop: 'var(--space-3)' }}>
            <Stat label="Total distance" value={dist(totals.dist)} unit={du} tone="accent" />
            <Stat label="This month" value={dist(totals.monthDist)} unit={du} />
            <Stat label="Runs" value={totals.count} />
            <Stat label="Avg pace" value={pace(totals.avgPace)} />
          </div>

          <div className="stack-2" style={{ marginTop: 'var(--space-4)' }}>
            {runs.map((r) => (
              <Card key={r.id} className="run-card">
                <div className="row">
                  <span className="run-card__icon" aria-hidden><RunIcon width={18} height={18} /></span>
                  <div className="grow">
                    <div className="row" style={{ gap: 8 }}>
                      <p className="run-card__title truncate grow">{r.title ?? 'Run'}</p>
                      <Badge tone={r.source === 'manual' ? 'muted' : 'accent'}>
                        {r.source === 'health-connect' ? 'Health Connect' : r.source}
                      </Badge>
                    </div>
                    <p className="muted" style={{ fontSize: 12 }}>
                      {formatDate(r.started_at, { weekday: 'short', month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                  <button className="icon-btn icon-btn--danger" onClick={() => remove(r.id)} aria-label="Delete run">
                    <TrashIcon width={15} height={15} />
                  </button>
                </div>

                <div className="run-card__metrics">
                  <div><span className="run-metric tnum">{dist(r.distance_km)}</span><span className="muted">{du}</span></div>
                  <div><span className="run-metric tnum">{formatDuration(r.duration_s ?? 0)}</span><span className="muted">time</span></div>
                  <div><span className="run-metric tnum">{pace(r.avg_pace_s)}</span><span className="muted">pace</span></div>
                  <div><span className="run-metric tnum">{r.hr_avg ?? '—'}</span><span className="muted">avg bpm</span></div>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      <RunSync
        open={syncOpen}
        onClose={() => setSyncOpen(false)}
        onImported={reload}
        existing={runs}
      />
    </>
  );
}

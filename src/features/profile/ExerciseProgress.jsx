/** Per-exercise strength progress: pick a logged exercise, see its top-set chart. */
import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { db } from '../../lib/db.js';
import { useApp } from '../../lib/store.jsx';
import { kgToDisplay, weightUnitLabel, round1 } from '../../lib/format.js';
import { Card, Select, Stat, Spinner, EmptyState } from '../../components/ui.jsx';

const StrengthChart = lazy(() => import('./StrengthChart.jsx'));

export default function ExerciseProgress() {
  const { profile, units } = useApp();
  const [exercises, setExercises] = useState(null); // null = still loading
  const [selected, setSelected] = useState('');
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (!profile?.id) return;
    (async () => {
      const rows = await db.loggedExercises(profile.id);
      setExercises(rows);
      if (rows.length > 0) setSelected(rows[0].exercise_id);
    })();
  }, [profile?.id]);

  useEffect(() => {
    if (!selected || !profile?.id) return;
    setLoadingHistory(true);
    db.exerciseHistory(profile.id, selected)
      .then(setHistory)
      .finally(() => setLoadingHistory(false));
  }, [selected, profile?.id]);

  const unit = weightUnitLabel(units);
  const isBodyweight = history.length > 0 && history.every((h) => h.weightKg == null);
  const current = history[history.length - 1];
  const best = useMemo(() => {
    if (history.length === 0) return null;
    return history.reduce((a, b) => (
      (isBodyweight ? b.reps > a.reps : (b.estOneRM ?? 0) > (a.estOneRM ?? 0)) ? b : a
    ));
  }, [history, isBodyweight]);

  if (exercises === null) return <Spinner />;

  if (exercises.length === 0) {
    return (
      <EmptyState icon="📈" title="No lifts logged yet">
        Finish a workout session and each exercise you logged sets for will show up
        here with a progress chart.
      </EmptyState>
    );
  }

  return (
    <>
      <div style={{ marginTop: 'var(--space-4)' }}>
        <Select value={selected} onChange={(e) => setSelected(e.target.value)}>
          {exercises.map((e) => (
            <option key={e.exercise_id} value={e.exercise_id}>
              {e.exercise_name} · {e.count} set{e.count === 1 ? '' : 's'}
            </option>
          ))}
        </Select>
      </div>

      {loadingHistory ? (
        <Spinner />
      ) : history.length === 0 ? (
        <p className="muted" style={{ marginTop: 'var(--space-4)' }}>
          No completed sets for this exercise yet.
        </p>
      ) : (
        <>
          <div className="stat-grid" style={{ marginTop: 'var(--space-4)' }}>
            <Stat
              label="Best"
              value={isBodyweight ? best.reps : round1(kgToDisplay(best.weightKg, units))}
              unit={isBodyweight ? 'reps' : unit}
              tone="accent"
            />
            <Stat
              label="Latest"
              value={isBodyweight ? current.reps : round1(kgToDisplay(current.weightKg, units))}
              unit={isBodyweight ? 'reps' : unit}
            />
            <Stat label="Sessions" value={history.length} />
            <Stat
              label="Est. 1RM"
              value={!isBodyweight && best.estOneRM != null ? round1(kgToDisplay(best.estOneRM, units)) : '—'}
              unit={!isBodyweight && best.estOneRM != null ? unit : ''}
              hint={isBodyweight ? 'Bodyweight exercise' : 'Epley formula, from your best set'}
            />
          </div>

          <p className="section-title">Progress</p>
          <Card>
            <Suspense fallback={<div className="weight-chart" />}>
              <StrengthChart history={history} isBodyweight={isBodyweight} />
            </Suspense>
          </Card>
        </>
      )}
    </>
  );
}

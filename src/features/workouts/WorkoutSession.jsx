/** Live workout logging — tick off sets with actual reps and weight. */
import { useEffect, useMemo, useRef, useState } from 'react';
import { db, TABLES } from '../../lib/db.js';
import { useApp } from '../../lib/store.jsx';
import {
  weightUnitLabel, kgToDisplay, displayToKg, round1, formatDuration, parseReps,
} from '../../lib/format.js';
import { Button, Card, Modal, Spinner, Stat } from '../../components/ui.jsx';
import { CheckIcon, ChevronLeft } from '../../components/Icons.jsx';
import './workouts.css';

export default function WorkoutSession({ session, onFinish, onExit }) {
  const { profile, units, toast } = useApp();
  const [plan, setPlan] = useState([]);       // [{exercise_id, name, sets:[{done,reps,weight_kg}]}]
  const [loading, setLoading] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const startedAt = useRef(new Date(session.started_at).getTime());
  const repsRefs = useRef({});   // "exIdx-setIdx" -> input, for all-out sets

  /**
   * Build the working plan from the template.
   *
   * Weight and reps start empty and show a *suggestion* as placeholder text:
   * the weight last logged for that exercise (falling back to the template's
   * planned weight) and the target rep count. Ticking a set commits whatever
   * suggestion is still showing, so the common case is one tap per set.
   */
  useEffect(() => {
    (async () => {
      try {
        const [rows, last] = await Promise.all([
          db.select(TABLES.templateExercises, {
            eq: { template_id: session.template_id },
            order: 'order_index',
          }),
          db.lastWeights(profile.id).catch(() => ({})),
        ]);

        setPlan(
          rows.map((r) => {
            const target = parseReps(r.reps) ?? { min: 10, max: 10, label: '10' };
            const suggestedWeight = last[r.exercise_id]?.weight_kg ?? r.weight_kg ?? null;
            return {
              exercise_id: r.exercise_id,
              name: r.exercise_name,
              target,
              suggestedWeight,
              fromHistory: last[r.exercise_id]?.weight_kg != null,
              sets: Array.from({ length: r.sets }, () => ({
                done: false,
                reps: '',            // empty -> placeholder shows the target
                weight_kg: null,     // empty -> placeholder shows last used
              })),
            };
          }),
        );
      } catch (err) {
        console.error(err);
        toast('Could not load the workout', 'danger');
      } finally {
        setLoading(false);
      }
    })();
  }, [session.template_id, profile.id, toast]);

  /* Session timer. */
  useEffect(() => {
    const tick = () => setElapsed(Math.floor((Date.now() - startedAt.current) / 1000));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  /**
   * What a set counts as: typed value first, otherwise the suggestion.
   * An all-out set has no target, so an empty reps box counts as zero — the
   * number has to come from the user.
   */
  const effectiveWeight = (ex, s) => (s.weight_kg ?? ex.suggestedWeight ?? null);
  const effectiveReps = (ex, s) =>
    s.reps === '' ? (ex.target.amrap ? 0 : ex.target.min) : (Number(s.reps) || 0);

  const totals = useMemo(() => {
    let done = 0, total = 0, volume = 0;
    for (const ex of plan) {
      for (const s of ex.sets) {
        total++;
        if (s.done) {
          done++;
          volume += (effectiveWeight(ex, s) ?? 0) * effectiveReps(ex, s);
        }
      }
    }
    return { done, total, volume };
  }, [plan]);

  const patchSet = (exIdx, setIdx, patch) =>
    setPlan((p) =>
      p.map((ex, i) =>
        i !== exIdx
          ? ex
          : { ...ex, sets: ex.sets.map((s, j) => (j === setIdx ? { ...s, ...patch } : s)) },
      ),
    );

  /**
   * Ticking a set commits whatever the placeholder was showing, so the values
   * become real and editable rather than staying implicit.
   */
  const toggleSet = (exIdx, setIdx) => {
    const ex = plan[exIdx];
    const s = ex.sets[setIdx];
    if (s.done) return patchSet(exIdx, setIdx, { done: false });

    patchSet(exIdx, setIdx, {
      done: true,
      weight_kg: s.weight_kg ?? ex.suggestedWeight ?? null,
      // An all-out set has nothing to pre-fill — the count is the whole point,
      // so jump the cursor there instead of guessing a number.
      reps: s.reps === '' && !ex.target.amrap ? String(ex.target.min) : s.reps,
    });
    if (navigator.vibrate) navigator.vibrate(12);

    if (ex.target.amrap && s.reps === '') {
      repsRefs.current[`${exIdx}-${setIdx}`]?.focus();
    }
  };

  async function finish() {
    try {
      for (const ex of plan) {
        for (const [i, s] of ex.sets.entries()) {
          if (!s.done) continue;
          await db.insert(TABLES.sessionSets, {
            session_id: session.id,
            exercise_id: ex.exercise_id,
            exercise_name: ex.name,
            set_num: i + 1,
            reps_done: effectiveReps(ex, s),
            weight_kg: effectiveWeight(ex, s),
          });
        }
      }
      await db.update(TABLES.sessions, session.id, {
        completed_at: new Date().toISOString(),
        duration_s: elapsed,
        total_volume_kg: Math.round(totals.volume),
        sets_done: totals.done,
      });
      toast('Workout complete 💪', 'success');
      onFinish?.();
    } catch (err) {
      console.error(err);
      toast('Could not save the session', 'danger');
    }
  }

  async function abandon() {
    await db.remove(TABLES.sessions, session.id);
    onExit?.();
  }

  const unit = weightUnitLabel(units);
  if (loading) return <div className="page"><Spinner label="Loading workout…" /></div>;

  return (
    <div className="page session">
      <div className="row" style={{ marginBottom: 'var(--space-3)' }}>
        <Button variant="ghost" size="sm" onClick={() => setConfirmFinish('exit')} aria-label="Back">
          <ChevronLeft width={18} height={18} />
        </Button>
        <div className="grow">
          <h1 className="page-title" style={{ fontSize: 20 }}>{session.template_name}</h1>
          <p className="page-sub">In progress</p>
        </div>
      </div>

      <div className="session__stats">
        <Stat label="Time" value={formatDuration(elapsed)} tone="accent" />
        <Stat label="Sets" value={`${totals.done}/${totals.total}`} />
        <Stat label="Volume" value={round1(kgToDisplay(totals.volume, units))} unit={unit} />
      </div>

      <div className="session__progress" aria-hidden>
        <div
          className="session__progress-bar"
          style={{ width: `${totals.total ? (totals.done / totals.total) * 100 : 0}%` }}
        />
      </div>

      <div className="stack" style={{ marginTop: 'var(--space-4)' }}>
        {plan.map((ex, exIdx) => {
          const doneCount = ex.sets.filter((s) => s.done).length;
          const complete = doneCount === ex.sets.length;
          return (
            <Card key={`${ex.exercise_id}-${exIdx}`} glow={complete} className="session-ex">
              <div className="row-between" style={{ marginBottom: 'var(--space-3)' }}>
                <div className="grow" style={{ minWidth: 0 }}>
                  <p className="session-ex__name truncate">{ex.name}</p>
                  <p className="session-ex__target">
                    {ex.target.amrap ? 'all out — log your reps' : `target ${ex.target.label} reps`}
                    {ex.suggestedWeight != null && (
                      <> · {ex.fromHistory ? 'last' : 'plan'}{' '}
                        {round1(kgToDisplay(ex.suggestedWeight, units))} {unit}
                      </>
                    )}
                  </p>
                </div>
                <span className={`session-ex__count ${complete ? 'session-ex__count--done' : ''}`}>
                  {doneCount}/{ex.sets.length}
                </span>
              </div>

              <div className="set-head">
                <span>Set</span><span>{unit}</span><span>Reps</span><span />
              </div>

              {ex.sets.map((s, setIdx) => (
                <div className={`set-row ${s.done ? 'set-row--done' : ''}`} key={setIdx}>
                  <span className="set-row__num tnum">{setIdx + 1}</span>
                  <input
                    className="set-input tnum"
                    type="number" min="0" step="0.5" inputMode="decimal"
                    placeholder={
                      ex.suggestedWeight == null
                        ? '—'
                        : String(round1(kgToDisplay(ex.suggestedWeight, units)))
                    }
                    aria-label={`Weight for set ${setIdx + 1} of ${ex.name}`}
                    value={s.weight_kg == null ? '' : round1(kgToDisplay(s.weight_kg, units))}
                    onChange={(e) =>
                      patchSet(exIdx, setIdx, {
                        weight_kg: e.target.value === ''
                          ? null
                          : displayToKg(Number(e.target.value), units),
                      })
                    }
                  />
                  <input
                    className={`set-input tnum ${ex.target.amrap ? 'set-input--amrap' : ''}`}
                    type="number" min="0" inputMode="numeric"
                    placeholder={ex.target.label}
                    aria-label={`Reps for set ${setIdx + 1} of ${ex.name}`}
                    ref={(el) => { repsRefs.current[`${exIdx}-${setIdx}`] = el; }}
                    value={s.reps}
                    onChange={(e) => patchSet(exIdx, setIdx, { reps: e.target.value })}
                  />
                  <button
                    className={`set-check ${s.done ? 'set-check--on' : ''}`}
                    onClick={() => toggleSet(exIdx, setIdx)}
                    aria-label={`Mark set ${setIdx + 1} ${s.done ? 'incomplete' : 'complete'}`}
                  >
                    <CheckIcon width={16} height={16} />
                  </button>
                </div>
              ))}
            </Card>
          );
        })}
      </div>

      <div className="session__actions">
        <Button variant="secondary" onClick={() => setConfirmFinish('exit')} className="grow">
          Discard
        </Button>
        <Button onClick={() => setConfirmFinish('finish')} className="grow" disabled={totals.done === 0}>
          Finish
        </Button>
      </div>

      <Modal
        open={confirmFinish === 'finish'}
        onClose={() => setConfirmFinish(false)}
        title="Finish workout?"
        footer={
          <>
            <Button variant="secondary" className="grow" onClick={() => setConfirmFinish(false)}>
              Keep going
            </Button>
            <Button className="grow" onClick={finish}>Finish</Button>
          </>
        }
      >
        <p className="muted">
          You completed <strong>{totals.done}</strong> of {totals.total} sets in{' '}
          {formatDuration(elapsed)}. Unticked sets are not saved.
        </p>
      </Modal>

      <Modal
        open={confirmFinish === 'exit'}
        onClose={() => setConfirmFinish(false)}
        title="Discard this session?"
        footer={
          <>
            <Button variant="secondary" className="grow" onClick={() => setConfirmFinish(false)}>
              Cancel
            </Button>
            <Button variant="danger" className="grow" onClick={abandon}>Discard</Button>
          </>
        }
      >
        <p className="muted">Nothing from this session will be saved.</p>
      </Modal>
    </div>
  );
}

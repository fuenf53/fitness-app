/** Create / edit a named workout template with exercises, sets and reps. */
import { useEffect, useRef, useState } from 'react';
import { db, TABLES } from '../../lib/db.js';
import { useApp } from '../../lib/store.jsx';
import { weightUnitLabel, kgToDisplay, displayToKg, round1, parseReps } from '../../lib/format.js';
import ExercisePicker from '../exercises/ExercisePicker.jsx';
import { Button, Input, Field, EmptyState } from '../../components/ui.jsx';
import { PlusIcon, TrashIcon, ChevronLeft, DragIcon } from '../../components/Icons.jsx';
import './workouts.css';

const blankRow = (ex, order) => ({
  key: `${ex.id}-${Date.now()}-${order}`,
  exercise_id: ex.id,
  exercise_name: ex.name,
  target: ex.target,
  sets: 3,
  reps: '8-12',          // free text: "10" or a range like "10-12"
  weight_kg: null,
  order_index: order,
});

export default function WorkoutBuilder({ template, onDone, onCancel }) {
  const { profile, units, toast } = useApp();
  const [name, setName] = useState(template?.name ?? '');
  const [rows, setRows] = useState([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  /* Load exercises when editing an existing template. */
  useEffect(() => {
    if (!template) return;
    db.select(TABLES.templateExercises, {
      eq: { template_id: template.id },
      order: 'order_index',
    })
      .then((r) => setRows(r.map((x, i) => ({ ...x, key: x.id ?? `row-${i}` }))))
      .catch((err) => console.error(err));
  }, [template]);

  const addExercise = (ex) => {
    setRows((r) => [...r, blankRow(ex, r.length)]);
    toast(`${ex.name} added`, 'success');
  };

  const patchRow = (key, patch) =>
    setRows((r) => r.map((x) => (x.key === key ? { ...x, ...patch } : x)));

  const removeRow = (key) =>
    setRows((r) => r.filter((x) => x.key !== key).map((x, i) => ({ ...x, order_index: i })));

  const move = (key, dir) =>
    setRows((r) => {
      const i = r.findIndex((x) => x.key === key);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= r.length) return r;
      const next = [...r];
      [next[i], next[j]] = [next[j], next[i]];
      return next.map((x, k) => ({ ...x, order_index: k }));
    });

  /* ------------------------------------------------------------------ */
  /* drag to reorder                                                     */
  /*                                                                     */
  /* Pointer events rather than HTML5 drag-and-drop, which does not fire  */
  /* on touch. The list reorders live under the finger; the row being     */
  /* dragged is lifted visually. `touch-action: none` on the handle stops */
  /* the page scrolling instead of dragging.                             */
  /* ------------------------------------------------------------------ */
  const listRef = useRef(null);
  const dragKeyRef = useRef(null);
  const [dragKey, setDragKey] = useState(null);

  const onDragStart = (e, key) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    dragKeyRef.current = key;
    setDragKey(key);
    if (navigator.vibrate) navigator.vibrate(8);
  };

  const onDragMove = (e) => {
    const key = dragKeyRef.current;
    if (!key || !listRef.current) return;

    const els = [...listRef.current.querySelectorAll('[data-row-key]')];
    if (els.length < 2) return;

    // Insert before the first row whose midpoint is below the pointer.
    let target = els.findIndex((el) => {
      const r = el.getBoundingClientRect();
      return e.clientY < r.top + r.height / 2;
    });
    if (target === -1) target = els.length - 1;

    setRows((rs) => {
      const from = rs.findIndex((x) => x.key === key);
      if (from === -1 || from === target) return rs;
      const next = [...rs];
      const [item] = next.splice(from, 1);
      next.splice(target, 0, item);
      return next.map((x, i) => ({ ...x, order_index: i }));
    });
  };

  const onDragEnd = (e) => {
    if (!dragKeyRef.current) return;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
    dragKeyRef.current = null;
    setDragKey(null);
  };

  async function save() {
    if (!name.trim()) return toast('Give the workout a name', 'danger');
    if (rows.length === 0) return toast('Add at least one exercise', 'danger');

    const bad = rows.find((r) => !parseReps(r.reps));
    if (bad) {
      return toast(
        `Check the reps for ${bad.exercise_name} — use "10", "10-12", or "-" for all out`,
        'danger',
      );
    }

    setSaving(true);
    try {
      let templateId = template?.id;
      if (templateId) {
        await db.update(TABLES.templates, templateId, { name: name.trim() });
        await db.removeWhere(TABLES.templateExercises, { template_id: templateId });
      } else {
        const created = await db.insert(TABLES.templates, {
          user_id: profile.id,
          name: name.trim(),
        });
        templateId = created.id;
      }

      for (const [i, r] of rows.entries()) {
        await db.insert(TABLES.templateExercises, {
          template_id: templateId,
          exercise_id: r.exercise_id,
          exercise_name: r.exercise_name,
          sets: Number(r.sets) || 1,
          reps: parseReps(r.reps).label,     // stored as text: "10" or "10-12"
          weight_kg: r.weight_kg ?? null,
          order_index: i,
        });
      }

      toast(template ? 'Workout updated' : 'Workout saved', 'success');
      onDone?.(templateId);
    } catch (err) {
      console.error(err);
      toast('Could not save the workout', 'danger');
    } finally {
      setSaving(false);
    }
  }

  const unit = weightUnitLabel(units);

  return (
    <div className="page">
      <div className="row" style={{ marginBottom: 'var(--space-4)' }}>
        <Button variant="ghost" size="sm" onClick={onCancel} aria-label="Back">
          <ChevronLeft width={18} height={18} />
        </Button>
        <h1 className="page-title grow" style={{ fontSize: 20 }}>
          {template ? 'Edit workout' : 'New workout'}
        </h1>
      </div>

      <div className="stack">
        <Field label="Workout name" id="wname">
          <Input
            id="wname"
            placeholder="e.g. Push Day A"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>

        <div className="row-between">
          <p className="section-title" style={{ margin: 0 }}>
            Exercises {rows.length > 0 && `(${rows.length})`}
          </p>
          <Button size="sm" variant="secondary" onClick={() => setPickerOpen(true)}>
            <PlusIcon width={16} height={16} /> Add
          </Button>
        </div>

        {rows.length > 1 && (
          <p className="builder-hint">
            Drag the handle to reorder · reps take “10”, “10-12” or “-” for an all-out set
          </p>
        )}

        {rows.length === 0 ? (
          <EmptyState
            icon="🏋️"
            title="No exercises yet"
            action={<Button onClick={() => setPickerOpen(true)}>Browse exercises</Button>}
          >
            Search the database and build your session.
          </EmptyState>
        ) : (
          <div className="stack-2" ref={listRef}>
            {rows.map((r, i) => (
              <div
                className={`builder-row ${dragKey === r.key ? 'builder-row--dragging' : ''}`}
                key={r.key}
                data-row-key={r.key}
              >
                <div className="row-between">
                  <button
                    className="drag-handle"
                    onPointerDown={(e) => onDragStart(e, r.key)}
                    onPointerMove={onDragMove}
                    onPointerUp={onDragEnd}
                    onPointerCancel={onDragEnd}
                    aria-label={`Reorder ${r.exercise_name}`}
                    title="Drag to reorder"
                  >
                    <DragIcon width={18} height={18} />
                  </button>

                  <div className="grow" style={{ minWidth: 0 }}>
                    <p className="builder-row__name truncate">{r.exercise_name}</p>
                    {r.target && <p className="muted" style={{ fontSize: 12 }}>{r.target}</p>}
                  </div>
                  <div className="builder-row__tools">
                    <button className="icon-btn" onClick={() => move(r.key, -1)} disabled={i === 0} aria-label="Move up">↑</button>
                    <button className="icon-btn" onClick={() => move(r.key, 1)} disabled={i === rows.length - 1} aria-label="Move down">↓</button>
                    <button className="icon-btn icon-btn--danger" onClick={() => removeRow(r.key)} aria-label="Remove">
                      <TrashIcon width={16} height={16} />
                    </button>
                  </div>
                </div>

                <div className="builder-row__inputs">
                  <Field label="Sets">
                    <Input
                      type="number" min="1" max="20" inputMode="numeric"
                      value={r.sets}
                      onChange={(e) => patchRow(r.key, { sets: e.target.value })}
                    />
                  </Field>
                  <Field label={parseReps(r.reps)?.amrap ? 'Reps · all out' : 'Reps'}>
                    <Input
                      type="text"
                      inputMode="text"
                      placeholder="10-12"
                      aria-label={`Reps for ${r.exercise_name} — a number, a range, or "-" for an all-out set`}
                      className={parseReps(r.reps) ? '' : 'input--invalid'}
                      value={r.reps}
                      onChange={(e) => patchRow(r.key, { reps: e.target.value })}
                    />
                  </Field>
                  <Field label={`Weight (${unit})`}>
                    <Input
                      type="number" min="0" step="0.5" inputMode="decimal"
                      placeholder="—"
                      value={r.weight_kg == null ? '' : round1(kgToDisplay(r.weight_kg, units))}
                      onChange={(e) =>
                        patchRow(r.key, {
                          weight_kg: e.target.value === ''
                            ? null
                            : displayToKg(Number(e.target.value), units),
                        })
                      }
                    />
                  </Field>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="row" style={{ marginTop: 'var(--space-4)' }}>
          <Button variant="secondary" onClick={onCancel} className="grow">Cancel</Button>
          <Button onClick={save} loading={saving} className="grow">
            {template ? 'Save changes' : 'Save workout'}
          </Button>
        </div>
      </div>

      <ExercisePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={addExercise}
        addedIds={rows.map((r) => r.exercise_id)}
      />
    </div>
  );
}

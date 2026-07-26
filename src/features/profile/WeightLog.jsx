/** Log today's bodyweight + list recent entries. */
import { useState } from 'react';
import { db, TABLES } from '../../lib/db.js';
import { useApp } from '../../lib/store.jsx';
import {
  displayToKg, kgToDisplay, weightUnitLabel, round1, toISODate, relativeDay,
} from '../../lib/format.js';
import { Button, Input, Modal } from '../../components/ui.jsx';
import { PlusIcon, TrashIcon } from '../../components/Icons.jsx';
import './profile.css';

export default function WeightLog({ logs, onChange }) {
  const { profile, units, toast } = useApp();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  const [date, setDate] = useState(toISODate());
  const [saving, setSaving] = useState(false);

  const unit = weightUnitLabel(units);

  async function save() {
    const num = Number(value);
    if (!num || num <= 0) return toast('Enter a valid weight', 'danger');

    setSaving(true);
    try {
      const weight_kg = displayToKg(num, units);
      const existing = logs.find((l) => l.logged_at === date);
      if (existing) {
        await db.update(TABLES.weightLogs, existing.id, { weight_kg });
        toast('Weight updated', 'success');
      } else {
        await db.insert(TABLES.weightLogs, {
          user_id: profile.id,
          weight_kg,
          logged_at: date,
        });
        toast('Weight logged', 'success');
      }
      setValue('');
      setDate(toISODate());
      setOpen(false);
      onChange?.();
    } catch (err) {
      console.error(err);
      toast('Could not save', 'danger');
    } finally {
      setSaving(false);
    }
  }

  async function remove(id) {
    await db.remove(TABLES.weightLogs, id);
    onChange?.();
    toast('Entry removed');
  }

  const recent = [...logs].sort((a, b) => b.logged_at.localeCompare(a.logged_at)).slice(0, 6);

  return (
    <>
      <Button full variant="secondary" onClick={() => setOpen(true)}>
        <PlusIcon width={16} height={16} /> Log weight
      </Button>

      {recent.length > 0 && (
        <div className="stack-2" style={{ marginTop: 'var(--space-3)' }}>
          {recent.map((l) => (
            <div className="wlog-row" key={l.id}>
              <span className="grow">{relativeDay(l.logged_at)}</span>
              <span className="wlog-row__val tnum">
                {round1(kgToDisplay(l.weight_kg, units))} <span className="muted">{unit}</span>
              </span>
              <button className="icon-btn icon-btn--danger" onClick={() => remove(l.id)} aria-label="Delete entry">
                <TrashIcon width={15} height={15} />
              </button>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Log bodyweight"
        footer={
          <>
            <Button variant="secondary" className="grow" onClick={() => setOpen(false)}>Cancel</Button>
            <Button className="grow" onClick={save} loading={saving}>Save</Button>
          </>
        }
      >
        <div className="stack">
          <label className="field">
            <span className="field__label">Weight ({unit})</span>
            <Input
              autoFocus
              type="number" step="0.1" min="0" inputMode="decimal"
              placeholder={units === 'lb' ? '176.4' : '80.0'}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && save()}
            />
          </label>
          <label className="field">
            <span className="field__label">Date</span>
            <Input
              type="date"
              max={toISODate()}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
        </div>
      </Modal>
    </>
  );
}

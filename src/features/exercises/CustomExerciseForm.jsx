/** Create your own exercise when the catalogue is missing one. */
import { useEffect, useRef, useState } from 'react';
import { db, TABLES } from '../../lib/db.js';
import { useApp } from '../../lib/store.jsx';
import { bodyParts, equipmentTypes } from './exerciseApi.js';
import { Modal, Button, Input, Field, Select } from '../../components/ui.jsx';
import './exercises.css';

const EMPTY = {
  name: '',
  body_part: 'chest',
  target: '',
  equipment: 'barbell',
  instructions: '',
};

export default function CustomExerciseForm({ open, onClose, onCreated, initialName = '' }) {
  const { profile, toast } = useApp();
  const [form, setForm] = useState({ ...EMPTY, name: initialName });
  const [saving, setSaving] = useState(false);
  const wasOpen = useRef(false);

  /**
   * This component stays mounted while closed, so the initial state was fixed
   * before the user ever typed a search. Seed the form from the search term on
   * each closed -> open transition instead (and only then, so typing here is
   * never clobbered).
   */
  useEffect(() => {
    if (open && !wasOpen.current) setForm({ ...EMPTY, name: initialName });
    wasOpen.current = open;
  }, [open, initialName]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function save() {
    const name = form.name.trim();
    if (name.length < 2) return toast('Give the exercise a name', 'danger');

    setSaving(true);
    try {
      const row = await db.insert(TABLES.customExercises, {
        user_id: profile.id,
        name,
        body_part: form.body_part,
        target: form.target.trim() || form.body_part,
        equipment: form.equipment,
        instructions: form.instructions.trim(),
      });
      toast(`${name} created`, 'success');
      setForm({ ...EMPTY });
      onCreated?.(row);
      onClose?.();
    } catch (err) {
      console.error(err);
      toast('Could not save the exercise', 'danger');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create exercise"
      footer={
        <>
          <Button variant="secondary" className="grow" onClick={onClose}>Cancel</Button>
          <Button className="grow" onClick={save} loading={saving}>Create</Button>
        </>
      }
    >
      <div className="stack">
        <Field label="Name" id="cx-name">
          <Input
            id="cx-name"
            autoFocus
            placeholder="e.g. Reverse Nordic Curl"
            value={form.name}
            onChange={set('name')}
          />
        </Field>

        <Field label="Muscle group" id="cx-bp">
          <Select id="cx-bp" value={form.body_part} onChange={set('body_part')}>
            {bodyParts().map((bp) => <option key={bp} value={bp}>{bp}</option>)}
          </Select>
        </Field>

        <Field label="Target muscle" id="cx-target" hint="Optional — defaults to the muscle group">
          <Input
            id="cx-target"
            placeholder="e.g. quadriceps"
            value={form.target}
            onChange={set('target')}
          />
        </Field>

        <Field label="Equipment" id="cx-eq">
          <Select id="cx-eq" value={form.equipment} onChange={set('equipment')}>
            {equipmentTypes().map((eq) => <option key={eq} value={eq}>{eq}</option>)}
          </Select>
        </Field>

        <Field label="Instructions" id="cx-ins" hint="Optional — one step per line">
          <textarea
            id="cx-ins"
            className="input textarea"
            rows={4}
            placeholder={'Kneel with the ankles anchored.\nLean back slowly, keeping the hips extended.\nReturn under control.'}
            value={form.instructions}
            onChange={set('instructions')}
          />
        </Field>
      </div>
    </Modal>
  );
}

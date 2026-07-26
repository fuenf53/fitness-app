/** Health Connect sync UI: native bridge, file import, or manual entry. */
import { useRef, useState } from 'react';
import { db, TABLES } from '../../lib/db.js';
import { useApp } from '../../lib/store.jsx';
import {
  isNativeBridgeAvailable, requestPermissions, readRuns, parseRunExport, syncStatus,
} from '../../lib/healthConnect.js';
import { kmToDisplay, distUnitLabel, round1, toISODate } from '../../lib/format.js';
import { Modal, Button, Input, Field, Badge } from '../../components/ui.jsx';
import { SyncIcon } from '../../components/Icons.jsx';
import './runs.css';

export default function RunSync({ open, onClose, onImported, existing = [] }) {
  const { profile, distUnits, toast } = useApp();
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);
  const status = syncStatus();

  const [manual, setManual] = useState({
    date: toISODate(),
    distance: '',
    hours: '',
    minutes: '',
    seconds: '',
    hr: '',
  });

  const seen = new Set(existing.map((r) => r.external_id).filter(Boolean));

  async function saveRows(rows) {
    const fresh = rows.filter((r) => !r.external_id || !seen.has(r.external_id));
    for (const r of fresh) {
      await db.insert(TABLES.runs, {
        ...r,
        user_id: profile.id,
        synced_at: new Date().toISOString(),
      });
    }
    const skipped = rows.length - fresh.length;
    toast(
      fresh.length === 0
        ? 'No new runs found'
        : `Imported ${fresh.length} run${fresh.length === 1 ? '' : 's'}${skipped ? ` (${skipped} already saved)` : ''}`,
      fresh.length ? 'success' : 'info',
    );
    onImported?.();
    if (fresh.length) onClose?.();
  }

  async function syncNative() {
    setBusy(true);
    try {
      const granted = await requestPermissions();
      if (!granted) return toast('Permission denied in Health Connect', 'danger');
      await saveRows(await readRuns());
    } catch (err) {
      console.error(err);
      toast(err.message ?? 'Sync failed', 'danger');
    } finally {
      setBusy(false);
    }
  }

  async function importFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const rows = parseRunExport(JSON.parse(await file.text()));
      if (rows.length === 0) return toast('No runs found in that file', 'danger');
      await saveRows(rows);
    } catch (err) {
      console.error(err);
      toast('Could not read that file', 'danger');
    } finally {
      setBusy(false);
      e.target.value = '';
    }
  }

  async function addManual() {
    const distInput = Number(manual.distance);
    const duration =
      (Number(manual.hours) || 0) * 3600 +
      (Number(manual.minutes) || 0) * 60 +
      (Number(manual.seconds) || 0);

    if (!distInput || distInput <= 0) return toast('Enter a distance', 'danger');
    if (duration <= 0) return toast('Enter a duration', 'danger');

    const distance_km = distUnits === 'mi' ? distInput * 1.609344 : distInput;
    setBusy(true);
    try {
      await db.insert(TABLES.runs, {
        user_id: profile.id,
        source: 'manual',
        external_id: null,
        title: 'Run',
        started_at: new Date(`${manual.date}T09:00:00`).toISOString(),
        distance_km,
        duration_s: duration,
        avg_pace_s: duration / distance_km,
        hr_avg: manual.hr ? Number(manual.hr) : null,
        hr_max: null,
        calories: null,
        synced_at: new Date().toISOString(),
      });
      toast('Run added', 'success');
      setManual({ date: toISODate(), distance: '', hours: '', minutes: '', seconds: '', hr: '' });
      onImported?.();
      onClose?.();
    } catch (err) {
      console.error(err);
      toast('Could not save the run', 'danger');
    } finally {
      setBusy(false);
    }
  }

  const du = distUnitLabel(distUnits);
  const set = (k) => (e) => setManual((m) => ({ ...m, [k]: e.target.value }));

  return (
    <Modal open={open} onClose={onClose} title="Add runs" size="lg">
      <div className="stack">
        {/* ---------------- Health Connect ---------------- */}
        <div className="sync-block">
          <div className="row-between">
            <p className="sync-block__title">Health Connect</p>
            <Badge tone={status.ok ? 'success' : 'warning'}>
              {status.ok ? 'Available' : 'Android only'}
            </Badge>
          </div>
          <p className="muted" style={{ fontSize: 13, lineHeight: 1.5 }}>{status.message}</p>

          {isNativeBridgeAvailable() ? (
            <Button full onClick={syncNative} loading={busy}>
              <SyncIcon width={16} height={16} /> Sync from Health Connect
            </Button>
          ) : (
            <details className="sync-help">
              <summary>How to get your Garmin runs in</summary>
              <ol>
                <li>In <strong>Garmin Connect</strong> on Android, enable syncing to Health Connect (Settings → Connected apps → Health Connect).</li>
                <li>In <strong>Health Connect</strong>, use Data and access → Export data to get a JSON file.</li>
                <li>Import that file below — Garmin Connect activity exports work too.</li>
              </ol>
            </details>
          )}
        </div>

        {/* ---------------- File import ---------------- */}
        <div className="sync-block">
          <p className="sync-block__title">Import a file</p>
          <p className="muted" style={{ fontSize: 13 }}>
            Health Connect or Garmin Connect JSON export.
          </p>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            onChange={importFile}
            hidden
          />
          <Button variant="secondary" full onClick={() => fileRef.current?.click()} loading={busy}>
            Choose JSON file
          </Button>
        </div>

        {/* ---------------- Manual ---------------- */}
        <div className="sync-block">
          <p className="sync-block__title">Add manually</p>
          <div className="stack-2">
            <Field label="Date">
              <Input type="date" max={toISODate()} value={manual.date} onChange={set('date')} />
            </Field>
            <Field label={`Distance (${du})`}>
              <Input
                type="number" step="0.01" min="0" inputMode="decimal"
                placeholder={du === 'mi' ? '3.10' : '5.00'}
                value={manual.distance} onChange={set('distance')}
              />
            </Field>
            <Field label="Duration">
              <div className="dur-grid">
                <Input type="number" min="0" placeholder="hh" inputMode="numeric" value={manual.hours} onChange={set('hours')} />
                <Input type="number" min="0" max="59" placeholder="mm" inputMode="numeric" value={manual.minutes} onChange={set('minutes')} />
                <Input type="number" min="0" max="59" placeholder="ss" inputMode="numeric" value={manual.seconds} onChange={set('seconds')} />
              </div>
            </Field>
            <Field label="Average heart rate (optional)">
              <Input
                type="number" min="0" max="250" inputMode="numeric" placeholder="—"
                value={manual.hr} onChange={set('hr')}
              />
            </Field>
            <Button full onClick={addManual} loading={busy}>Add run</Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

/** Settings, living inside the Profile tab: theme, units, gender, goal, export. */
import { useState } from 'react';
import { db, TABLES } from '../../lib/db.js';
import { useApp } from '../../lib/store.jsx';
import {
  displayToKg, kgToDisplay, weightUnitLabel, round1,
} from '../../lib/format.js';
import { Card, Button, Input, Select, Modal, Badge } from '../../components/ui.jsx';
import { SunIcon, MoonIcon, DownloadIcon, LogoutIcon } from '../../components/Icons.jsx';
import './profile.css';

export default function SettingsPanel() {
  const {
    profile, theme, toggleTheme, units, distUnits, updateProfile, signOut, backend, syncStatus, toast,
  } = useApp();
  const [goal, setGoal] = useState(
    profile?.weight_goal ? String(round1(kgToDisplay(profile.weight_goal, units))) : '',
  );
  const [confirmOut, setConfirmOut] = useState(false);

  const unit = weightUnitLabel(units);

  const syncBadge = (() => {
    if (backend !== 'supabase') return { tone: 'muted', label: 'On this device' };
    if (!syncStatus) return { tone: 'success', label: 'Synced' };
    if (!syncStatus.online) {
      return {
        tone: 'warning',
        label: syncStatus.pending > 0 ? `Offline · ${syncStatus.pending} pending` : 'Offline',
      };
    }
    if (syncStatus.syncing || syncStatus.pending > 0) {
      return { tone: 'warning', label: `Syncing… ${syncStatus.pending}` };
    }
    return { tone: 'success', label: 'Synced' };
  })();

  /**
   * Revoking the object URL synchronously after `a.click()` can free the blob
   * before the browser has actually read it for the download, producing a
   * 0-byte file — so the revoke is deferred instead of immediate.
   */
  function downloadFile(filename, content, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function exportData() {
    try {
      const dump = await db.exportAll(profile.id);
      downloadFile(
        `fitness-export-${profile.username}-${new Date().toISOString().slice(0, 10)}.json`,
        JSON.stringify(dump, null, 2),
        'application/json',
      );
      toast('Export downloaded', 'success');
    } catch (err) {
      console.error(err);
      toast('Export failed', 'danger');
    }
  }

  /** One row per logged set — the format Strong/Hevy-style CSV exports use. */
  async function exportCSV() {
    try {
      const sessions = (
        await db.select(TABLES.sessions, { eq: { user_id: profile.id }, order: 'started_at' })
      ).filter((s) => s.completed_at);
      const sessionById = new Map(sessions.map((s) => [s.id, s]));
      const sets = await db.select(TABLES.sessionSets, {
        inList: { session_id: sessions.map((s) => s.id) },
      });

      const rows = sets
        .map((s) => ({ ...s, session: sessionById.get(s.session_id) }))
        .filter((s) => s.session)
        .sort((a, b) =>
          a.session.started_at.localeCompare(b.session.started_at) || a.set_num - b.set_num);

      const esc = (v) => {
        const s = String(v ?? '');
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      };

      const header = ['date', 'workout', 'exercise', 'set', `weight_${unit}`, 'reps'];
      const lines = [header.join(',')];
      for (const r of rows) {
        lines.push([
          r.session.started_at.slice(0, 10),
          r.session.template_name,
          r.exercise_name,
          r.set_num,
          r.weight_kg == null ? '' : round1(kgToDisplay(r.weight_kg, units)),
          r.reps_done,
        ].map(esc).join(','));
      }

      downloadFile(
        `fitness-log-${profile.username}-${new Date().toISOString().slice(0, 10)}.csv`,
        lines.join('\n'),
        'text/csv',
      );
      toast('CSV downloaded', 'success');
    } catch (err) {
      console.error(err);
      toast('Export failed', 'danger');
    }
  }

  return (
    <>
      <p className="section-title">Settings</p>

      <Card className="stack">
        {/* Theme */}
        <div className="setting-row">
          <div className="grow">
            <p className="setting-row__label">Theme</p>
            <p className="muted" style={{ fontSize: 12 }}>
              {theme === 'dark' ? 'Dark' : 'Light'} mode
            </p>
          </div>
          <button
            className={`theme-toggle ${theme === 'light' ? 'theme-toggle--light' : ''}`}
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
          >
            <span className="theme-toggle__knob">
              {theme === 'dark' ? <MoonIcon width={14} height={14} /> : <SunIcon width={14} height={14} />}
            </span>
          </button>
        </div>

        {/* Weight units */}
        <div className="setting-row">
          <div className="grow">
            <p className="setting-row__label">Weight units</p>
          </div>
          <div className="seg">
            {['kg', 'lb'].map((u) => (
              <button
                key={u}
                className={`seg__btn ${units === u ? 'seg__btn--on' : ''}`}
                onClick={() => updateProfile({ units: u })}
              >{u}</button>
            ))}
          </div>
        </div>

        {/* Distance units */}
        <div className="setting-row">
          <div className="grow">
            <p className="setting-row__label">Distance units</p>
          </div>
          <div className="seg">
            {['km', 'mi'].map((u) => (
              <button
                key={u}
                className={`seg__btn ${distUnits === u ? 'seg__btn--on' : ''}`}
                onClick={() => updateProfile({ dist_units: u })}
              >{u}</button>
            ))}
          </div>
        </div>

        {/* Gender */}
        <div className="setting-row">
          <div className="grow">
            <p className="setting-row__label">Gender</p>
          </div>
          <div style={{ width: 160 }}>
            <Select
              value={profile?.gender ?? 'unspecified'}
              onChange={(e) => updateProfile({ gender: e.target.value })}
            >
              <option value="unspecified">Prefer not to say</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="other">Other</option>
            </Select>
          </div>
        </div>

        {/* Goal weight */}
        <div className="setting-row">
          <div className="grow">
            <p className="setting-row__label">Goal weight ({unit})</p>
            <p className="muted" style={{ fontSize: 12 }}>Shown as a dashed line on the chart</p>
          </div>
          <div style={{ width: 110 }}>
            <Input
              type="number" step="0.1" min="0" inputMode="decimal"
              placeholder="—"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              onBlur={() =>
                updateProfile({
                  weight_goal: goal === '' ? null : displayToKg(Number(goal), units),
                })
              }
            />
          </div>
        </div>
      </Card>

      <p className="section-title">Account</p>
      <Card className="stack">
        <div className="setting-row">
          <div className="grow">
            <p className="setting-row__label">Username</p>
            <p className="muted" style={{ fontSize: 12 }}>{profile?.username}</p>
          </div>
          <Badge tone={syncBadge.tone}>{syncBadge.label}</Badge>
        </div>

        <Button variant="secondary" full onClick={exportData}>
          <DownloadIcon width={16} height={16} /> Export data (JSON)
        </Button>

        <Button variant="secondary" full onClick={exportCSV}>
          <DownloadIcon width={16} height={16} /> Export workout log (CSV)
        </Button>

        <Button variant="ghost" full onClick={() => setConfirmOut(true)}>
          <LogoutIcon width={16} height={16} /> Sign out
        </Button>
      </Card>

      <Modal
        open={confirmOut}
        onClose={() => setConfirmOut(false)}
        title="Sign out?"
        footer={
          <>
            <Button variant="secondary" className="grow" onClick={() => setConfirmOut(false)}>Cancel</Button>
            <Button variant="danger" className="grow" onClick={signOut}>Sign out</Button>
          </>
        }
      >
        <p className="muted">
          {backend === 'supabase'
            ? 'Your data stays synced to your account.'
            : 'Your data stays on this device and returns when you sign back in.'}
        </p>
      </Modal>
    </>
  );
}

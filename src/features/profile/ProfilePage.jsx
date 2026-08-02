/** Profile tab — weight stats, chart, log, run history and settings. */
import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { db, TABLES } from '../../lib/db.js';
import { useApp } from '../../lib/store.jsx';
import { kgToDisplay, weightUnitLabel, round1, toISODate } from '../../lib/format.js';
import WeightLog from './WeightLog.jsx';
import SettingsPanel from './SettingsPanel.jsx';
import ExerciseProgress from './ExerciseProgress.jsx';
import RunHistory from '../runs/RunHistory.jsx';
import { Card, Stat, Spinner, Chip } from '../../components/ui.jsx';
import './profile.css';

/** Chart.js is ~70 kB — only pulled in when the chart is actually shown. */
const WeightChart = lazy(() => import('./WeightChart.jsx'));

/** Consecutive days (ending today or yesterday) with a weight entry. */
function loggingStreak(logs) {
  const days = new Set(logs.map((l) => l.logged_at));
  if (days.size === 0) return 0;
  const today = toISODate();
  const yesterday = toISODate(new Date(Date.now() - 86400000));
  let cursor = days.has(today) ? new Date() : days.has(yesterday) ? new Date(Date.now() - 86400000) : null;
  if (!cursor) return 0;
  let streak = 0;
  while (days.has(toISODate(cursor))) {
    streak++;
    cursor = new Date(cursor.getTime() - 86400000);
  }
  return streak;
}

export default function ProfilePage() {
  const { profile, units } = useApp();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('progress');   // progress | exercises | runs | settings

  const reload = useCallback(async () => {
    if (!profile?.id) return;
    try {
      const rows = await db.select(TABLES.weightLogs, {
        eq: { user_id: profile.id }, order: 'logged_at',
      });
      setLogs(rows);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [profile?.id]);

  useEffect(() => { reload(); }, [reload]);

  const stats = useMemo(() => {
    if (logs.length === 0) return null;
    const sorted = [...logs].sort((a, b) => a.logged_at.localeCompare(b.logged_at));
    const start = sorted[0].weight_kg;
    const current = sorted[sorted.length - 1].weight_kg;
    return {
      current, start,
      change: current - start,
      streak: loggingStreak(logs),
      goalLeft: profile?.weight_goal ? current - profile.weight_goal : null,
    };
  }, [logs, profile?.weight_goal]);

  const unit = weightUnitLabel(units);
  const d = (kg) => round1(kgToDisplay(kg, units));

  return (
    <div className="page">
      <div className="profile-head">
        <div className="avatar" aria-hidden>
          {profile?.username?.slice(0, 2).toUpperCase()}
        </div>
        <div className="grow">
          <h1 className="page-title" style={{ fontSize: 22 }}>{profile?.username}</h1>
          <p className="page-sub">
            {logs.length} weight entr{logs.length === 1 ? 'y' : 'ies'}
            {stats?.streak ? ` · ${stats.streak} day streak 🔥` : ''}
          </p>
        </div>
      </div>

      <div className="chip-row" style={{ marginTop: 'var(--space-4)' }}>
        <Chip active={tab === 'progress'} onClick={() => setTab('progress')}>Progress</Chip>
        <Chip active={tab === 'exercises'} onClick={() => setTab('exercises')}>Exercises</Chip>
        <Chip active={tab === 'runs'} onClick={() => setTab('runs')}>Runs</Chip>
        <Chip active={tab === 'settings'} onClick={() => setTab('settings')}>Settings</Chip>
      </div>

      {tab === 'progress' && (
        loading ? <Spinner /> : (
          <>
            <div className="stat-grid" style={{ marginTop: 'var(--space-4)' }}>
              <Stat label="Current" value={stats ? d(stats.current) : '—'} unit={stats ? unit : ''} tone="accent" />
              <Stat label="Starting" value={stats ? d(stats.start) : '—'} unit={stats ? unit : ''} />
              <Stat
                label="Change"
                value={stats ? `${stats.change > 0 ? '+' : ''}${d(stats.change)}` : '—'}
                unit={stats ? unit : ''}
                tone={!stats ? 'default' : stats.change <= 0 ? 'success' : 'danger'}
              />
              <Stat
                label="To goal"
                value={stats?.goalLeft != null ? `${stats.goalLeft > 0 ? '' : '+'}${d(-stats.goalLeft)}` : '—'}
                unit={stats?.goalLeft != null ? unit : ''}
                hint={profile?.weight_goal ? `Goal ${d(profile.weight_goal)} ${unit}` : 'Set a goal in Settings'}
              />
            </div>

            <p className="section-title">Bodyweight</p>
            <Card>
              <Suspense fallback={<div className="weight-chart" />}>
                <WeightChart logs={logs} goalKg={profile?.weight_goal} />
              </Suspense>
            </Card>

            <div style={{ marginTop: 'var(--space-4)' }}>
              <WeightLog logs={logs} onChange={reload} />
            </div>
          </>
        )
      )}

      {tab === 'exercises' && <ExerciseProgress />}
      {tab === 'runs' && <RunHistory />}
      {tab === 'settings' && <SettingsPanel />}
    </div>
  );
}

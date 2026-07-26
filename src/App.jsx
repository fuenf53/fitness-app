/** Root component — auth gate, tab routing, and the persistent bottom nav. */
import { useState } from 'react';
import { useApp } from './lib/store.jsx';
import LoginPage from './features/auth/LoginPage.jsx';
import HomePage from './features/home/HomePage.jsx';
import WorkoutsPage from './features/workouts/WorkoutsPage.jsx';
import WorkoutCalendar from './features/calendar/WorkoutCalendar.jsx';
import ProfilePage from './features/profile/ProfilePage.jsx';
import BottomNav from './components/BottomNav.jsx';
import { ToastHost, Spinner } from './components/ui.jsx';

export default function App() {
  const { profile, loading } = useApp();
  const [tab, setTab] = useState('home');
  const [activeSession, setActiveSession] = useState(null);

  if (loading) {
    return <div className="app-shell"><Spinner label="Loading…" /></div>;
  }

  if (!profile) {
    return (
      <>
        <LoginPage />
        <ToastHost />
      </>
    );
  }

  /* A live session takes over the Workout tab until it is finished. */
  const navigate = (next) => {
    setTab(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="app-shell">
      {tab === 'home' && (
        <HomePage setActiveSession={setActiveSession} onNavigate={navigate} />
      )}
      {tab === 'workout' && (
        <WorkoutsPage activeSession={activeSession} setActiveSession={setActiveSession} />
      )}
      {tab === 'plan' && (
        <WorkoutCalendar setActiveSession={setActiveSession} onNavigate={navigate} />
      )}
      {tab === 'profile' && <ProfilePage />}

      <BottomNav tab={tab} onChange={navigate} />
      <ToastHost />
    </div>
  );
}

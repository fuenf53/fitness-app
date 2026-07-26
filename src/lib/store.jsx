/**
 * store.jsx — app-wide state: session (username login), profile settings,
 * theme application, and the toast queue.
 *
 * Auth is username-only per the plan. With Supabase configured, the username is
 * looked up in `profiles` and mapped to a synthetic email so Supabase Auth can
 * issue a real JWT; locally, the session is just a stored profile id.
 */
import { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { db, TABLES, backend, uid } from './db.js';
import { supabase, isSupabaseConfigured } from './supabase.js';

const SESSION_KEY = 'fitapp:session';

const AppCtx = createContext(null);
export const useApp = () => {
  const ctx = useContext(AppCtx);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  return ctx;
};

const DEFAULT_PROFILE = {
  theme: 'dark',
  units: 'kg',
  dist_units: 'km',
  gender: 'unspecified',
  weight_goal: null,
};

/**
 * username -> deterministic pseudo-email for Supabase Auth.
 *
 * Supabase's validator rejects the `.local` TLD outright, so this uses
 * example.com, which IANA reserves for exactly this purpose and which can
 * never reach a real inbox. Nothing is ever sent there: "Confirm email" must
 * be OFF in the Supabase auth settings for username-only login to work — see
 * the Supabase section of the README.
 */
const emailFor = (username) => `${username.toLowerCase().trim()}@fitapp.example.com`;

export function AppProvider({ children }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState([]);
  const toastId = useRef(0);

  /* ---------------- toasts ---------------- */
  const toast = useCallback((message, tone = 'info') => {
    const id = ++toastId.current;
    setToasts((t) => [...t, { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  const dismissToast = useCallback(
    (id) => setToasts((t) => t.filter((x) => x.id !== id)),
    [],
  );

  /* ---------------- restore session ---------------- */
  useEffect(() => {
    (async () => {
      try {
        if (isSupabaseConfigured) {
          const { data } = await supabase.auth.getSession();
          if (data?.session?.user) {
            const rows = await db.select(TABLES.profiles, { eq: { id: data.session.user.id } });
            if (rows[0]) setProfile({ ...DEFAULT_PROFILE, ...rows[0] });
          }
        } else {
          const savedId = localStorage.getItem(SESSION_KEY);
          if (savedId) {
            const rows = await db.select(TABLES.profiles, { eq: { id: savedId } });
            if (rows[0]) setProfile({ ...DEFAULT_PROFILE, ...rows[0] });
            else localStorage.removeItem(SESSION_KEY);
          }
        }
      } catch (err) {
        console.error('Session restore failed', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* ---------------- theme ---------------- */
  const theme = profile?.theme ?? 'dark';
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', theme === 'light' ? '#f2faf5' : '#080d0b');
  }, [theme]);

  /* ---------------- auth ---------------- */
  const signIn = useCallback(async (username, password) => {
    const name = username.trim();
    if (!name) throw new Error('Enter a username');

    if (isSupabaseConfigured) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailFor(name),
        password,
      });
      if (error) throw new Error('Wrong username or password');
      const rows = await db.select(TABLES.profiles, { eq: { id: data.user.id } });
      const p = { ...DEFAULT_PROFILE, ...(rows[0] ?? {}) };
      setProfile(p);
      return p;
    }

    const rows = await db.select(TABLES.profiles, {});
    const found = rows.find((r) => r.username.toLowerCase() === name.toLowerCase());
    if (!found) throw new Error('No account with that username');
    if ((found.password ?? '') !== password) throw new Error('Wrong password');
    localStorage.setItem(SESSION_KEY, found.id);
    const p = { ...DEFAULT_PROFILE, ...found };
    setProfile(p);
    return p;
  }, []);

  const signUp = useCallback(async (username, password) => {
    const name = username.trim();
    if (name.length < 2) throw new Error('Username needs at least 2 characters');
    if (password.length < 4) throw new Error('Password needs at least 4 characters');

    if (isSupabaseConfigured) {
      const { data, error } = await supabase.auth.signUp({
        email: emailFor(name),
        password,
      });
      if (error) throw new Error(error.message);
      const p = await db.insert(TABLES.profiles, {
        id: data.user.id,
        username: name,
        ...DEFAULT_PROFILE,
      });
      setProfile({ ...DEFAULT_PROFILE, ...p });
      return p;
    }

    const rows = await db.select(TABLES.profiles, {});
    if (rows.some((r) => r.username.toLowerCase() === name.toLowerCase())) {
      throw new Error('That username is taken');
    }
    const p = await db.insert(TABLES.profiles, {
      id: uid(),
      username: name,
      password,
      ...DEFAULT_PROFILE,
    });
    localStorage.setItem(SESSION_KEY, p.id);
    setProfile({ ...DEFAULT_PROFILE, ...p });
    return p;
  }, []);

  const signOut = useCallback(async () => {
    if (isSupabaseConfigured) await supabase.auth.signOut();
    localStorage.removeItem(SESSION_KEY);
    setProfile(null);
  }, []);

  /* ---------------- profile updates ---------------- */
  const updateProfile = useCallback(
    async (patch) => {
      if (!profile) return;
      setProfile((p) => ({ ...p, ...patch })); // optimistic
      try {
        await db.update(TABLES.profiles, profile.id, patch);
      } catch (err) {
        console.error('Profile update failed', err);
        toast('Could not save settings', 'danger');
      }
    },
    [profile, toast],
  );

  const toggleTheme = useCallback(
    () => updateProfile({ theme: theme === 'dark' ? 'light' : 'dark' }),
    [theme, updateProfile],
  );

  const value = useMemo(
    () => ({
      profile, user: profile, loading, backend,
      theme, toggleTheme,
      units: profile?.units ?? 'kg',
      distUnits: profile?.dist_units ?? 'km',
      signIn, signUp, signOut, updateProfile,
      toast, toasts, dismissToast,
    }),
    [profile, loading, theme, toggleTheme, signIn, signUp, signOut, updateProfile, toast, toasts, dismissToast],
  );

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

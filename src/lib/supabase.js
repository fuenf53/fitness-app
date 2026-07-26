/**
 * Supabase client init.
 *
 * The app runs with NO Supabase project by default — see lib/db.js, which falls
 * back to localStorage when this returns null. To enable cross-device sync,
 * create a .env file (copy .env.example) with:
 *
 *   VITE_SUPABASE_URL=https://xxxx.supabase.co
 *   VITE_SUPABASE_ANON_KEY=eyJhbGci...
 *
 * ...then run the SQL in supabase/schema.sql against your project.
 */
const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);

/**
 * Imported dynamically so the ~120 kB client is only downloaded when the app
 * is actually configured for sync. Top-level await keeps the export
 * synchronous for consumers (db.js, store.jsx).
 */
export const supabase = isSupabaseConfigured
  ? (await import('@supabase/supabase-js')).createClient(url, anonKey, {
      auth: { persistSession: true, autoRefreshToken: true },
    })
  : null;

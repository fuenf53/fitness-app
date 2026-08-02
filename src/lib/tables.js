/** Table name registry, shared by db.js (reads/writes) and sync.js (pull). */
export const TABLES = {
  profiles: 'profiles',
  weightLogs: 'weight_logs',
  templates: 'workout_templates',
  templateExercises: 'template_exercises',
  sessions: 'workout_sessions',
  sessionSets: 'session_sets',
  scheduled: 'scheduled_workouts',
  runs: 'run_sessions',
  customExercises: 'custom_exercises',
};

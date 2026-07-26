# Fitness

A mobile-first PWA for tracking workouts, bodyweight and runs. Dark theme with
purple accents, light theme toggle, bottom navigation. Built from
`implementation_plan.md`.

## Run it

```bash
npm install
npm run dev
```

- Local: <http://localhost:5173>
- On your phone: the dev server also prints a `Network:` URL (e.g.
  `http://10.0.0.44:5173`) — open that on any device on the same Wi-Fi.

Other scripts:

| Command | What it does |
|---|---|
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the production build (port 4173) |
| `npm run icons` | Regenerate the PWA PNG icons from `scripts/make-icons.mjs` |

There is no account to set up — create a username on first launch and you are in.

## Where things live

```
src/
├── styles/tokens.css              ← every colour, font, radius, spacing (both themes)
├── components/                    ← Button, Card, Modal, Toast, Icons, BottomNav
├── lib/
│   ├── db.js                      ← the ONLY data layer; localStorage or Supabase
│   ├── supabase.js                ← client (lazy-loaded, null when unconfigured)
│   ├── store.jsx                  ← session, profile, theme, toasts
│   ├── healthConnect.js           ← Garmin / Health Connect normalising + import
│   └── format.js                  ← units, dates, pace, duration
├── features/
│   ├── auth/LoginPage.jsx
│   ├── home/HomePage.jsx          ← dashboard, quick-start, week summary
│   ├── workouts/                  ← WorkoutsPage, WorkoutBuilder, WorkoutSession
│   ├── exercises/                 ← ExercisePicker, ExerciseCard, exerciseApi, exerciseData
│   ├── calendar/WorkoutCalendar.jsx
│   ├── runs/                      ← RunHistory, RunSync
│   └── profile/                   ← ProfilePage, WeightLog, WeightChart, SettingsPanel
└── App.jsx                        ← auth gate + tab routing
```

`tokens.css` is the single source of truth for the design system — no other file
hard-codes a colour. Change a variable there and the whole app follows, in both
themes.

## Three places this differs from the plan

The plan named three services that don't work as written. Each is implemented
behind an interface so swapping in the real thing later touches one file.

### 1. Storage: localStorage by default, Supabase when configured

No Supabase project is wired up, so the app runs entirely on `localStorage`.
Every feature works; data just stays on the device it was entered on.

To turn on cross-device sync — **all four steps are required**:

1. Create a project at [supabase.com](https://supabase.com) (free tier).
2. **Run `supabase/schema.sql`** in the SQL editor. It creates all nine tables
   plus the row-level-security policies that make each row private to its
   owner. Without this the app fails on every read with "the tables do not
   exist yet".
3. **Turn off email confirmation**: Authentication → Sign In / Providers →
   Email → uncheck *Confirm email*. Login here is username-only, so accounts
   are registered against a synthetic `<username>@fitapp.example.com` address
   that can never receive mail. Leave confirmation on and Supabase tries to
   send to it, which fails and quickly trips `email rate limit exceeded`.
4. Copy `.env.example` to `.env`, fill in `VITE_SUPABASE_URL` and
   `VITE_SUPABASE_ANON_KEY`, and restart the dev server. Vite only reads
   `.env` — putting real values in `.env.example` does nothing, and that file
   is the committed template.

> [!NOTE]
> Switching backends does not migrate anything: data already in `localStorage`
> stays there and the Supabase account starts empty. Export first from
> Profile → Settings → Export data if you want a copy.

The anon/publishable key is safe to ship in the client bundle — it is designed
to be public, and RLS is what actually protects the data. That is why step 2
is not optional.

`lib/db.js` picks the backend at import time; no feature file changes. Username
login maps to Supabase Auth via a synthetic `username@fitapp.local` address, so
no email is ever required.

### 2. Exercises: 691 bundled, organised on the ExRx taxonomy

ExRx.net has no public API and its database is copyrighted commercial content
behind a paid membership, so it is **not** scraped or reproduced here. What the
app uses instead:

- **The ExRx classification scheme** — muscle group → target muscle →
  equipment, plus mechanics (compound/isolated) and force (push/pull/static).
  Those are standard kinesiology categories, not ExRx's content.
- **691 exercises** generated in `features/exercises/exerciseData.js` from ~120
  base movements expanded across their sensible equipment and stance
  variations, with instructions written for this app. Every muscle group is
  covered, including neck, forearms and calves.
- **A link out to ExRx.net** on each exercise's detail sheet, pointing at the
  matching muscle-group directory page.
- **Your own exercises** for anything still missing — see below.

Point `VITE_EXERCISE_API` at a self-hosted
[ExerciseDB](https://github.com/cyberboyanmol/exercisedb-api) instance and
`exerciseApi.js` fetches from it instead — same functions, same shape, and it
falls back to the bundled list if the request fails.

### Finding things in 691 exercises

- **The search and filter bar is pinned** to the top of the picker, so adding
  several exercises in a row never means scrolling back up.
- **List or grid view**, toggled top-right and remembered between sessions.
  Grid fits roughly three times as many exercises on screen.
- **Sort by A–Z, Most used, or Last used.** "Most used" and "Last used" come
  from your own logged sets (`db.exerciseUsage`), with a usage count shown on
  each card. Under a search term the relevance ranking takes over, since
  alphabetising a search result would bury the obvious match.
- **Results render 60 at a time** and extend as you scroll. Rendering all 691
  at once cost ~7,000 DOM nodes and made every keystroke lag; this keeps it to
  ~750 nodes, with the picker opening in ~84ms instead of ~181ms and filtering
  at ~20ms per keystroke instead of ~63ms.

> [!NOTE]
> "Most used" needs a popularity ordering before you have history of your own,
> and there is no licensable public dataset of exercise popularity to draw
> from. The fallback is therefore an editorial list in `exerciseData.js`
> (`POPULAR`) of the movements common in mainstream programming — it is a
> judgement call, not measured data. Reorder it freely; nothing else depends
> on it. Once you have logged sets, your own history takes precedence.

## Building workouts

**Custom exercises.** If a search comes up empty, the picker offers "Create
*&lt;what you typed&gt;*". Name, muscle group, target, equipment and optional
instructions; it saves to `custom_exercises`, is added to the workout straight
away, and from then on appears in every search ranked above the catalogue with
a green "Yours" badge. Open one from the picker to delete it.

**Rep targets.** The reps field takes:

| Input | Meaning |
|---|---|
| `10` | fixed target |
| `10-12` | a range — any common dash, or `to` |
| `12+` | open-ended |
| `-` | **all out** — as many reps as you can (`max` and `amrap` work too) |

`8-12` is the default for a newly added exercise. Input is parsed by
`parseReps` in `lib/format.js`, and the field turns red with the save blocked
if it cannot be parsed. Stored as text, so `template_exercises.reps` is a
`text` column — see the migration note at the bottom of `schema.sql` if you
created your database before this.

An all-out set behaves differently during a session: there is no target to
pre-fill, so ticking it does *not* invent a number — it marks the set done and
puts the cursor in the reps box, because the count is the whole point of the
set. The box reads `MAX` in accent colour until you fill it in.

**Reordering.** Drag the handle on the left of any exercise to move it; the
list reorders live under your finger. Implemented with pointer events rather
than HTML5 drag-and-drop, which does not fire on touch. The ↑/↓ buttons still
work for keyboard and accessibility.

**Weight suggestions.** During a session the weight and reps boxes start empty
and show a dimmed suggestion behind them: the weight you last actually logged
for that exercise, falling back to the template's planned weight, and the
target rep count. Type over it to log something else, or just tick the set —
ticking commits whatever suggestion was showing, so a normal set is one tap.
The exercise header shows where the number came from (`last 72.5 kg` vs
`plan 60 kg`).

### 3. Runs: Health Connect has no Web API

This is the significant one. Health Connect is an **Android-only SDK**
(`androidx.health.connect`) readable only by an installed Android app. A browser
tab — PWA included — cannot query it. Garmin's own developer API is also out:
new applications are limited to registered companies.

So the Runs tab supports three paths, in `lib/healthConnect.js`:

1. **Native bridge** — if you later wrap this PWA (Capacitor / TWA) and the
   wrapper exposes `window.HealthConnect`, the app detects it and syncs
   directly. The expected interface is documented at the top of the file.
2. **File import** — export from Health Connect (Data and access → Export) or
   Garmin Connect and drop the JSON in. `parseRunExport` reads both shapes and
   de-duplicates on repeat imports. **Works today, in any browser.**
3. **Manual entry** — distance, duration, heart rate; pace is derived.

## Verification

`npm run build` completes with zero errors. Two flows were driven in a headless
browser at a 400×860 mobile viewport, both with no console errors:

1. Sign up → build a template from the exercise picker → run a live session and
   tick sets → finish → schedule to the calendar → log four bodyweight entries
   and render the chart → add a run → toggle light/dark → reload and confirm
   everything persists.
2. Search the 691-exercise library → create a custom exercise from a failed
   search → set rep ranges of `10-12`, `5` and `12-15` → confirm an unparseable
   range blocks the save → run a session and check the placeholders read from
   the template plan → override one weight and tick every set → finish → start
   the workout again and confirm the placeholders now read the last *logged*
   weight.
3. Confirm the search bar holds position after scrolling 2,500px → switch to
   grid view and scroll until all 691 tiles have loaded → check each sort order
   → build a 7-exercise workout including a custom one → confirm the page still
   scrolls after those nested modals closed → drag an exercise from first to
   third → set reps to `-` and confirm the session shows "all out", refuses to
   invent a rep count on tick, and moves focus to the reps box.

## Installing on Android

Serve the production build over HTTPS (or `localhost`), open it in Chrome, and
use "Add to Home Screen". `vite-plugin-pwa` generates the manifest and a service
worker that precaches the app shell for offline use. For LAN testing over plain
HTTP, `npm run dev` works but the install prompt needs HTTPS.

## Notes

- Modals render through a portal to `<body>`. `.page` carries a fill-mode
  animation whose identity `transform` makes it the containing block for
  `position: fixed` children, which otherwise clips the modal backdrop to the
  page box.
- The page scroll lock is reference-counted (`lockPageScroll` in `ui.jsx`).
  Modals nest and do not always close in the order they opened — creating a
  custom exercise closes the picker first, then the form — so save/restore of
  `overflow` per modal would leave the page permanently unscrollable.
- Weights are stored in kg and distances in km always; display units are a
  presentation concern handled in `lib/format.js`.
- In local mode passwords are stored in plain text in `localStorage` — fine for
  a personal device, but real auth only exists once Supabase is configured.

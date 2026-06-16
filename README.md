# Tally — Personal Finance, Done Right

Keep count of what counts. A complete, beautifully designed personal expense tracker.. Built with React + TypeScript + Vite on the frontend and Supabase (PostgreSQL + Auth + Row Level Security) as the backend, so your data persists reliably and syncs across devices. Installable as a PWA on any device.

## What's built (current state)

**Core money tracking**
- Income, expense, and transfer logging with categories, tags, and notes
- Fast-entry transaction form optimized for mobile (big amount input, category chips)
- Multiple accounts: bank, credit card, UPI/wallet, cash, investment, loan — each with opening balance, emoji icon, and color
- Account archiving, asset vs liability grouping, per-account running balances
- Transfers between accounts that keep both balances correct

**Planning**
- Monthly budgets per expense category with progress bars and over-budget warnings, browsable month by month
- Savings goals with targets, deadlines, contribution logging, and progress rings
- Recurring rules (daily/weekly/monthly/yearly with custom intervals) — an engine materializes due transactions automatically on app load; rules can be paused or set to reminder-only; 30-day upcoming preview

**Insight**
- Analytics across week / month / quarter / year / all-time ranges
- Income vs spending trend chart, category donut breakdown, period-over-period comparison, net worth over time
- Computed insight cards from your own data: savings rate, spending change vs last period, biggest category movement, top category share, largest single expense, statistical anomaly days (mean + 2σ), no-spend days
- Calendar view with daily spend heatmap and tap-to-inspect day details
- Net worth tracking across all accounts (assets minus liabilities)

**Sharing & data**
- Split expenses: record who owes what, settle per person, see outstanding balances
- Global search and filtering: text, type, category, account, date range, amount range
- CSV and JSON export; CSV import that auto-creates missing accounts/categories
- Full category customization (create, edit, archive) for income and expense, with icons and colors
- Currency preference (formatted via Intl), display name, light/dark/system theme

**Foundation**
- Supabase schema with Row Level Security — every user only ever sees their own rows (`supabase/migrations/0001_init.sql`)
- New users are auto-seeded with a profile, default categories, and a cash account
- TanStack Query for server state, Zustand for UI state, React Router for navigation
- Design system: editorial aesthetic with Fraunces + Inter, warm paper palette, dark mode, designed empty states, skeletons, toasts
- Fully responsive: sidebar on desktop, bottom tab bar + floating add button on mobile
- PWA-ready via vite-plugin-pwa (installable, auto-updating service worker)

## Getting started

1. **Create a Supabase project** at [supabase.com](https://supabase.com) (free tier works).
2. **Run the migration**: open the SQL editor in your Supabase dashboard and run the contents of `supabase/migrations/0001_init.sql` (or use `supabase db push` with the CLI).
3. **Configure env locally**: copy `.env.example` to `.env` and fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from Project Settings > API. Keep `.env` out of GitHub.
4. **Install and run**:
   ```sh
   npm install
   npm run dev
   ```
5. Sign up in the app — default categories and a cash account are created automatically.

For production: add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as environment variables in your host/deployment settings, then `npm run build` and deploy `dist/` to any static host (Netlify, Vercel, Cloudflare Pages). Enable email confirmation settings in Supabase Auth as desired.

## Architecture

```
src/
  api.ts              # All Supabase queries/mutations as typed React Query hooks
  auth.tsx            # Session provider + first-login seeding
  store.ts            # UI state (toasts, quick-add modal)
  types.ts            # Domain types mirroring the DB schema
  lib/                # Pure domain logic: balances, insights, recurring engine, CSV, formatting
  components/         # Design-system primitives (ui.tsx), shell, shared forms
  pages/              # One file per route
supabase/migrations/  # SQL schema with RLS policies
```

## Next steps (roadmap)

- **Verify end-to-end against a live Supabase project** — run the migration, exercise every flow (signup seeding, recurring posting, import/export), and fix anything the first real session surfaces
- **PWA icons**: replace the SVG-only icon with proper 192/512 maskable PNGs for best install experience on Android/iOS
- **Budget rollover**: the `rollover` flag exists in the schema; carry unused budget into the next month in the UI
- **Goal funding from accounts**: optionally link goal contributions to a real transfer transaction
- **Attachments**: receipt photos on transactions via Supabase Storage
- **Offline writes**: queue mutations while offline and sync on reconnect (currently only the app shell is offline-capable)
- **Multi-currency accounts**: per-account currency with conversion for net worth
- **Notifications**: reminders for upcoming non-auto-post recurring rules
- **Type generation**: generate Supabase types from the schema and a CI job for `npm run typecheck` + lint
- **Tests**: unit tests for `lib/` (insights, recurring, CSV) and a smoke E2E

## Tech stack

React 18 · TypeScript · Vite · Tailwind CSS · Supabase (Postgres, Auth, RLS) · TanStack Query · Zustand · React Router · Recharts · date-fns · vite-plugin-pwa

## Changelog

- Fixed duplicated default categories/accounts and the "categories appear only after adding one" bug: first-login seeding is now idempotent and StrictMode-safe, caches refresh after seeding, and `supabase/migrations/0002_dedupe_seed_data.sql` cleans up existing duplicates.

# talak-web3 website

Website frontend for talak-web3 docs, dashboard, billing, and admin flows, backed by Supabase.

## Prerequisites

- Node.js 20+
- pnpm 9+
- Supabase project with the website SQL migrations applied

## Setup

1. Install dependencies:

```bash
pnpm install
```

2. Copy env template and fill in Supabase values:

```bash
cp .env.example .env.local
```

Required keys:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_TALAK_API_BASE_URL` (talak-web3 backend API, default `http://localhost:8787`)

Optional:

- `VITE_TREASURY_ADDRESS`

## Supabase migration order

Apply SQL files in `supabase/migrations` in numeric order:

1. `0001_core.sql`
2. `0002_blog_admin_settings.sql`
3. `0003_projects_webhooks.sql`
4. `0004_subscriptions.sql`
5. `0005_billing_usage.sql`
6. `0006_profile_trigger.sql`
7. `0007_changelog.sql`
8. `0008_storage_buckets.sql`

You can apply these with Supabase SQL editor or Supabase CLI (`supabase db push`) after linking your project.

## Run

```bash
pnpm run dev
```

Legacy wrappers (kept for compatibility):

- `pnpm run dev:script`
- `node install.cjs`

## Quality checks

```bash
pnpm run typecheck
pnpm run test
pnpm run lint
pnpm run build
pnpm run check
```

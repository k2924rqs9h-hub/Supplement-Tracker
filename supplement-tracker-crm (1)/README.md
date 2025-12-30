# Supplement Tracker CRM (Fully Functional)

This is a Next.js + Supabase internal CRM for tracking supplement files/jobs through workflow statuses, with:
- Board drag/drop persistence + audit activity
- Documents upload to Supabase Storage + metadata in Postgres (preview/download/rename)
- Comments with @mentions → notifications → deep-link to exact comment (scroll + highlight)
- Tags on jobs with admin management
- Admin-only QA runner page

## 1) Prerequisites
- Node.js 18+ / 20+
- A Supabase project

## 2) Configure Supabase
1. Create a Supabase project.
2. In Supabase SQL Editor, run the migration:
   - `supabase/migrations/0001_init.sql`
3. Create a Storage bucket:
   - Bucket name: `job-documents`
4. Add Storage policies (Supabase Storage → Policies) for bucket `job-documents`:
   - Allow authenticated users to `select`, `insert`, `update`, `delete` objects in this bucket.

## 3) Configure environment
Copy `.env.example` → `.env.local` and fill:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## 4) Install and run
```bash
npm install
npm run dev
```

## 5) Seed demo data
```bash
npm run seed
```

Demo accounts:
- Admin: `admin@demo.local` / `password123!`
- Estimator: `estimator1@demo.local` / `password123!`
- Estimator: `estimator2@demo.local` / `password123!`

## 6) QA
- Log in as Admin
- Go to `/qa`
- Run automated checks + guided steps.

## Notes
This app is an internal system. RLS policies are currently permissive for authenticated users (tighten later as needed).

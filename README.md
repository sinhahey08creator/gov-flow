# GovFlow AI — Hackathon MVP

See HANDOFF.md for full status, known issues, and next steps.

## Quick start
npm install
cp .env.example .env.local   # fill in your own keys, never commit them
npm run dev
npm test                      # 18 tests, vitest
npm run build                 # production build check
npm run db:seed               # populate Supabase with demo officers/case (needs Supabase env vars)

## What works right now
- Full loop on the home page: upload -> extraction -> document validation ->
  workflow -> officer recommendation (real score breakdown) -> SLA risk ->
  WHY explanation -> what-if simulation
- /cases and /resources list pages
- Works with or without Supabase/Gemini configured (falls back to
  deterministic demo data automatically)

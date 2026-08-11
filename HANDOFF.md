# GovFlow AI — Project Handoff

Last updated: Aug 11, 2026 (rev 2 — Supabase wiring + remaining phases added)
Handoff from: Claude (Anthropic) session
For: next coder / agent picking this up

---

## 1. What this project is

SIH hackathon MVP. Government offices route case files (land compensation,
birth certificate correction, citizen grievance) through fixed workflows
without knowing the current load on officers/departments. GovFlow AI adds
a resource-intelligence layer on top:

- Gemini reads an uploaded document -> extracts structured case data
- Deterministic code (NOT the LLM) scores which officer should handle the
  next step, calculates SLA breach risk, and runs a "what if this officer
  becomes unavailable" simulation
- Gemini explains the already-calculated bottleneck in plain language

**Core rule that must never be violated**: the LLM never invents numbers
(scores, risk %, queue lengths). All numeric intelligence is pure
TypeScript functions in lib/calculations/. Gemini only does extraction
and explanation.

Full original spec (69 sections) was provided by the user at project
start — ask them for it again if you need exact UI copy, demo script
wording, or anything not covered here.

---

## 2. Current status

**Builds clean.** npm run build passes, 0 TS errors, all routes compile.
**Tests pass.** npm test runs 18 tests, all green, covering eligibility,
scoring, SLA risk monotonicity, simulation non-mutation, and document
validation (per original spec section 50's test plan).

### Done
- Next.js 15 (App Router, Turbopack) + TypeScript strict + Tailwind v4
- All deterministic calculation logic:
  lib/calculations/{eligibility,officerScore,slaRisk,whatIf}.ts
- Gemini integration with Zod validation + automatic demo fallback:
  lib/gemini/{client,documentExtraction,explainBottleneck}.ts
- lib/workflow/templates.ts — workflow templates, required docs, SLA hours
  for all 3 case types
- lib/demo/seedData.ts — 20 varied officers + DEMO_CASE (GF-1024)
- **Supabase wiring (new this round):**
  - supabase/migrations/0001_init.sql — all 5 tables (cases, documents,
    officers, workflow_steps, actions_log), indexes included
  - supabase/migrations/0002_rls.sql — RLS enabled, public read policies,
    no public write policies (writes go through service role key only,
    server-side)
  - lib/supabase/browser.ts — anon-key client (read-only, safe for client components)
  - lib/supabase/server.ts — service-role client (server-only) +
    isSupabaseConfigured() check
  - lib/supabase/data.ts — getOfficers(): tries Supabase first, falls back
    to in-memory SEED_OFFICERS if not configured or the query fails
    (same fallback pattern as Gemini)
  - supabase/seed/seed.ts — seeds Supabase with the exact same 20 officers
    + GF-1024 case + workflow steps + documents already hardcoded in
    seedData.ts, so switching to a real DB doesn't change what the demo
    looks like. Run with npm run db:seed
  - /api/recommend-officer and /api/simulate now call getOfficers()
    instead of importing SEED_OFFICERS directly, and both echo back a
    "source": "supabase" | "demo_data" field
- **UI additions (new this round):**
  - components/Sidebar.tsx — nav shell (Overview / Cases / Resources),
    wired into app/layout.tsx
  - app/cases/page.tsx — cases table (currently lists the one demo case;
    swap CASES array for a real Supabase fetch once more cases exist)
  - app/resources/page.tsx — officers table sorted by utilization
  - components/DocumentUpload.tsx — drag-and-drop upload UI wired to
    /api/analyze-document, shows extraction results + missing docs +
    a "DEMO AI" badge when Gemini fallback was used. Now embedded at the
    top of app/page.tsx.
- **Tests (new this round):** lib/calculations/__tests__/calculations.test.ts
  — 18 tests, run with npm test (vitest)
### UI Changes — Aug 11, 2026

- Added a functional **+ New Case** flow in `app/page.tsx`.
- Added validation for applicant name, district, and case document.
- Added a success state after case creation.
- The **Create Case** button becomes disabled after successful creation to prevent duplicate submissions.
- Added newly created case data to browser `localStorage` as a temporary frontend implementation.
- Updated `app/cases/page.tsx` to display the existing demo case along with newly created local cases.
- Added a success confirmation message inside the New Case modal.

### Current limitation of this UI change

- New cases are currently stored in browser `localStorage`.
- They are **not yet persisted to Supabase**.
- This is a temporary frontend implementation until the live Supabase case creation/fetch flow is connected.


### Not done yet
1. **Live Supabase project not created.** All the SQL/client/seed code
   above is written and typechecks, but nobody has run it against a real
   Supabase project yet — you need to create one, paste the URL/keys into
   .env.local, run the two migration files (Supabase SQL editor or CLI),
   then npm run db:seed. Until that happens the app keeps working exactly
   as before, on in-memory demo data (this is intentional, same fallback
   design as Gemini).
2. **app/page.tsx is still the single combined dashboard/case-detail/
   simulator page**, hardcoded to GF-1024. Not yet split into
   /dashboard (aggregate metrics) + /cases/[id] (dynamic by case). This
   is the highest-value next step once Supabase has more than one case.
3. **PDF text extraction is a stub.** DocumentUpload.tsx currently sends
   `Uploaded file: ${file.name}` as the "documentText" instead of real
   extracted PDF text — so any uploaded file just exercises the demo
   fallback path today, regardless of its actual content. Needs a real
   PDF-to-text step (e.g. pdfjs-dist) before this is a genuine feature
   rather than a UI mockup.
4. **No /bottlenecks, /simulator, /documents, /audit pages** as separate
   routes (spec sections 32-33, 41) — bottleneck/simulator UI still only
   lives inside app/page.tsx.
5. **No demo controls panel** (reset / make officer unavailable / restore
   — spec section 62), no one-click "Launch Demo" reset flow.
6. **No auth, no real file storage bucket** (govflow-documents bucket
   from spec section 5 not created).

---

## 3. Known issues / judgment calls to review

- **scoreOfficer() availability term**: eligibility.ts already hard-
  excludes unavailable officers before scoring runs, so the spec's
  `available ? +2 : -5` branch's -5 case is unreachable by construction.
  Scored as a flat +2 constant instead, documented in a code comment.
  Revisit together with eligibility.ts if a future spec wants unavailable
  officers scored-but-penalized rather than excluded.
- **whatIf.ts queue pressure bump**: simulating an officer going
  unavailable adds a synthetic +2 to queue length for the "after" SLA
  risk. Judgment call, not from spec — flag for review if someone wants a
  more principled model of reassignment pressure.
- **Next.js + Google Fonts**: app/layout.tsx uses system fonts, not
  next/font/google Geist, because the sandbox this was built in had no
  internet access to fonts.googleapis.com. One-line revert if the next
  environment has internet and wants Geist back.
- **Gemini model name** hardcoded as "gemini-2.0-flash" — verify this is
  still current when you pick this up.
- **DocumentUpload's fake documentText** (see "Not done yet" #3 above) —
  don't mistake this for working PDF parsing, it isn't yet.

---

## 4. Security note

A live Gemini API key was pasted directly into chat by the user earlier
in this project. **Treat it as compromised — confirm revocation/rotation
in Google AI Studio.** Going forward:
1. Real keys only ever go in .env.local (gitignored by the Next.js
   template — double check .gitignore before any commit)
2. Never paste keys into chat, commits, or .env.example
3. lib/gemini/client.ts and lib/supabase/server.ts both already read from
   process.env and fall back to demo data if missing — keep this pattern

---

## 5. Environment setup

```
npm install
cp .env.example .env.local
# fill in .env.local with your own values:
#   GEMINI_API_KEY=...
#   NEXT_PUBLIC_SUPABASE_URL=...
#   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
#   SUPABASE_SERVICE_ROLE_KEY=...
npm run dev          # local dev server
npm run build         # production build check — must pass before any handoff/deploy
npm test              # vitest — 18 tests, must pass
npm run db:seed        # populates Supabase with the demo officers/case (requires Supabase env vars)
```

Without GEMINI_API_KEY or Supabase vars set, the app fully works using
deterministic demo fallbacks — this is intentional, not a bug.

---

## 6. Recommended next steps, in order

1. **Create the actual Supabase project** (not done yet — needs a human
   with Supabase account access). Run migrations 0001 and 0002, then
   npm run db:seed. Confirm /api/recommend-officer response includes
   "source": "supabase" once wired.
2. **Split app/page.tsx into /dashboard + /cases/[id]** — most of the JSX
   already exists in page.tsx, this is mostly extraction + making it
   dynamic by case ID instead of hardcoded to GF-1024. Also wire
   app/cases/page.tsx to fetch real cases from Supabase instead of the
   single-item CASES array.
3. **Real PDF text extraction** in DocumentUpload.tsx (pdfjs-dist,
   client-side, before sending to /api/analyze-document).
4. **/bottlenecks, /simulator, /documents, /audit** as separate routes,
   reusing components already built in page.tsx.
5. **Demo controls panel** (spec section 62) + one-click Launch Demo reset.
6. **Auth + storage bucket** if moving beyond a hackathon demo.

---

## 7. File map (updated)

```
app/
  page.tsx                        <- combined demo page (upload + case + workflow + officer + bottleneck + WHY + simulate)
  app/cases/page.tsx  <- cases list (demo case + locally created cases)
  resources/page.tsx              <- officers list, sorted by utilization
  layout.tsx                      <- sidebar shell, system fonts
  globals.css
  api/
    analyze-document/route.ts
    recommend-officer/route.ts     <- now uses lib/supabase/data.ts getOfficers()
    explain-bottleneck/route.ts
    simulate/route.ts              <- now uses lib/supabase/data.ts getOfficers()

components/
  Sidebar.tsx
  DocumentUpload.tsx               <- PDF text extraction is a stub, see section 3

lib/
  calculations/
    eligibility.ts
    officerScore.ts
    slaRisk.ts
    whatIf.ts
    __tests__/calculations.test.ts  <- 18 tests, vitest
  gemini/
    client.ts
    documentExtraction.ts
    explainBottleneck.ts
  workflow/
    templates.ts
  demo/
    seedData.ts
  supabase/
    browser.ts                     <- anon key, client-safe
    server.ts                      <- service role key, server-only
    data.ts                        <- getOfficers() with Supabase-or-fallback pattern

supabase/
  migrations/0001_init.sql
  migrations/0002_rls.sql
  seed/seed.ts                     <- npm run db:seed

types/index.ts
.env.example
vitest.config.ts
README.md
HANDOFF.md                         <- this file
```

---

## 8. Context for whoever picks this up

Aayush (3rd-year CSE, building this for an SIH-style buildathon) prefers
direct/brutally-honest technical feedback over hedging, communicates in
Hinglish, works solo/small team. He has a detailed 69-section master spec
not reproduced in full here — ask him for it if anything is ambiguous
about exact UI copy, demo script, or table schemas. He's juggling other
projects in parallel (FlowTalent AI, Double AA Recruiter Workspace,
GyaanSetu AI) so don't assume full-time bandwidth on this one.

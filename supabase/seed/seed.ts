/**
 * Seeds Supabase with the same 20 officers + demo case already hardcoded
 * in lib/demo/seedData.ts, so switching from in-memory to DB-backed data
 * does not change what the demo looks like.
 *
 * Run with: npx tsx supabase/seed/seed.ts
 * Requires SUPABASE_SERVICE_ROLE_KEY + NEXT_PUBLIC_SUPABASE_URL in .env.local
 */
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import { SEED_OFFICERS, DEMO_CASE } from "../../lib/demo/seedData";
import { WORKFLOW_TEMPLATES } from "../../lib/workflow/templates";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
    process.exit(1);
  }
  const supabase = createClient(url, key);

  console.log("Seeding officers...");
  const officerIdMap: Record<string, string> = {};
  for (const officer of SEED_OFFICERS) {
    const { data, error } = await supabase
      .from("officers")
      .insert({
        name: officer.name,
        department: officer.department,
        skills: officer.skills,
        authority: officer.authority,
        current_load: officer.current_load,
        max_load: officer.max_load,
        avg_processing_days: officer.avg_processing_days,
        available: officer.available,
      })
      .select("id")
      .single();
    if (error) throw error;
    officerIdMap[officer.id] = data.id; // map seed id -> real DB uuid
  }
  console.log(`Inserted ${SEED_OFFICERS.length} officers.`);

  console.log("Seeding demo case...");
  const { data: caseRow, error: caseError } = await supabase
    .from("cases")
    .insert({
      case_number: DEMO_CASE.case_number,
      case_type: DEMO_CASE.case_type,
      applicant_name: DEMO_CASE.applicant_name,
      district: DEMO_CASE.district,
      priority: DEMO_CASE.priority,
      sla_hours: DEMO_CASE.sla_hours,
      status: DEMO_CASE.status,
      current_step: DEMO_CASE.current_step,
      summary: DEMO_CASE.summary,
      extracted_data: DEMO_CASE.extracted_data,
      created_at: DEMO_CASE.created_at,
    })
    .select("id")
    .single();
  if (caseError) throw caseError;
  console.log(`Inserted case ${DEMO_CASE.case_number}.`);

  console.log("Seeding workflow steps...");
  const steps = WORKFLOW_TEMPLATES[DEMO_CASE.case_type];
  const financeOfficerRealId = officerIdMap["off-01"]; // Officer A, overloaded — triggers the bottleneck

  for (let i = 0; i < steps.length; i++) {
    const s = steps[i];
    const isFinanceStep = s.name === "Finance Verification";
    const { error } = await supabase.from("workflow_steps").insert({
      case_id: caseRow.id,
      step_name: s.name,
      department: s.department,
      step_order: i + 1,
      status: i < 3 ? "completed" : isFinanceStep ? "in_progress" : "pending",
      assigned_officer_id: isFinanceStep ? financeOfficerRealId : null,
      estimated_processing_days: s.estimated_processing_days,
      required_skill: s.required_skill ?? null,
      required_authority: s.required_authority ?? null,
    });
    if (error) throw error;
  }
  console.log(`Inserted ${steps.length} workflow steps.`);

  console.log("Seeding required documents...");
  const documentsDetected = (DEMO_CASE.extracted_data as { documents_detected: string[] }).documents_detected;
  const allRequired = ["application_form", "id_proof", "land_record", "bank_details", "acquisition_order"];
  for (const doc of allRequired) {
    const { error } = await supabase.from("documents").insert({
      case_id: caseRow.id,
      doc_type: doc,
      status: documentsDetected.includes(doc) ? "present" : "missing",
      confidence: documentsDetected.includes(doc) ? 0.95 : null,
    });
    if (error) throw error;
  }

  console.log("Done. Demo case + officers are live in Supabase.");
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});

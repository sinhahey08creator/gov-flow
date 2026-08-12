import { Officer, CaseRecord } from "@/types";

// 20 officers across 6 departments, deliberately varied
// (overloaded, fast, slow, unavailable, specialized) so the
// recommendation engine's output is visibly meaningful.
export const SEED_OFFICERS: Officer[] = [
  { id: "off-01", name: "Officer A", department: "Finance", skills: ["finance_verification"], authority: ["finance_verification"], current_load: 42, max_load: 50, avg_processing_days: 4.1, available: true },
  { id: "off-02", name: "Officer B", department: "Finance", skills: ["finance_verification"], authority: ["finance_verification"], current_load: 11, max_load: 50, avg_processing_days: 1.2, available: true },
  { id: "off-03", name: "Officer C", department: "Finance", skills: ["finance_verification"], authority: ["finance_verification"], current_load: 7, max_load: 50, avg_processing_days: 0.9, available: true },
  { id: "off-04", name: "Officer D", department: "Finance", skills: ["finance_verification"], authority: [], current_load: 28, max_load: 50, avg_processing_days: 3.2, available: true },
  { id: "off-05", name: "Officer E", department: "Finance", skills: ["finance_verification"], authority: ["finance_verification"], current_load: 15, max_load: 50, avg_processing_days: 1.8, available: false },
  { id: "off-06", name: "Officer F", department: "Revenue", skills: ["revenue_verification"], authority: ["final_authority"], current_load: 20, max_load: 45, avg_processing_days: 2.0, available: true },
  { id: "off-07", name: "Officer G", department: "Revenue", skills: ["revenue_verification"], authority: [], current_load: 35, max_load: 45, avg_processing_days: 2.9, available: true },
  { id: "off-08", name: "Officer H", department: "Revenue", skills: ["revenue_verification"], authority: ["final_authority"], current_load: 9, max_load: 45, avg_processing_days: 1.1, available: true },
  { id: "off-09", name: "Officer I", department: "Land Records", skills: ["land_records"], authority: [], current_load: 18, max_load: 40, avg_processing_days: 1.6, available: true },
  { id: "off-10", name: "Officer J", department: "Land Records", skills: ["land_records"], authority: [], current_load: 33, max_load: 40, avg_processing_days: 3.5, available: true },
  { id: "off-11", name: "Officer K", department: "Land Records", skills: ["land_records"], authority: [], current_load: 5, max_load: 40, avg_processing_days: 0.8, available: true },
  { id: "off-12", name: "Officer L", department: "Municipal", skills: ["identity_verification"], authority: [], current_load: 22, max_load: 50, avg_processing_days: 1.9, available: true },
  { id: "off-13", name: "Officer M", department: "Municipal", skills: ["records_management"], authority: ["review_authority"], current_load: 12, max_load: 50, avg_processing_days: 1.3, available: true },
  { id: "off-14", name: "Officer N", department: "Municipal", skills: ["identity_verification", "records_management"], authority: ["review_authority"], current_load: 40, max_load: 50, avg_processing_days: 2.7, available: true },
  { id: "off-15", name: "Officer O", department: "Legal", skills: ["legal_review"], authority: ["legal_authority"], current_load: 14, max_load: 35, avg_processing_days: 2.2, available: true },
  { id: "off-16", name: "Officer P", department: "Legal", skills: ["legal_review"], authority: [], current_load: 25, max_load: 35, avg_processing_days: 3.0, available: true },
  { id: "off-17", name: "Officer Q", department: "Citizen Grievance", skills: ["investigation"], authority: ["resolution_authority"], current_load: 19, max_load: 45, avg_processing_days: 1.5, available: true },
  { id: "off-18", name: "Officer R", department: "Citizen Grievance", skills: ["investigation"], authority: [], current_load: 30, max_load: 45, avg_processing_days: 2.4, available: true },
  { id: "off-19", name: "Officer S", department: "Citizen Grievance", skills: ["investigation"], authority: ["resolution_authority"], current_load: 8, max_load: 45, avg_processing_days: 1.0, available: true },
  { id: "off-20", name: "Officer T", department: "Finance", skills: ["finance_verification"], authority: [], current_load: 23, max_load: 50, avg_processing_days: 1.8, available: true },
];

// The canonical demo scenario walked through in the 3-minute pitch.
export const DEMO_CASE: CaseRecord = {
  id: "case-demo-01",
  case_number: "GF-1024",
  case_type: "land_compensation",
  applicant_name: "Ram Kumar",
  district: "Panipat",
  priority: "high",
  sla_hours: 72,
  status: "in_progress",
  compensation_status: "pending",
  current_step: 4,
  summary:
    "Applicant is requesting compensation for land acquired for road construction. Finance verification remains pending.",
  extracted_data: {
    documents_detected: ["application_form", "id_proof", "land_record", "bank_details"],
    missing_documents: ["acquisition_order"],
  },
  created_at: new Date(Date.now() - 60 * 60 * 60 * 1000).toISOString(), // 60h ago
};

export const DEMO_FINANCE_QUEUE_LENGTH = 18;
export const DEMO_ASSIGNED_OFFICER_ID = "off-01"; // Officer A — overloaded, triggers bottleneck

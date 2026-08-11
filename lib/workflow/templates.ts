import { CaseType } from "@/types";

export interface WorkflowStepTemplate {
  name: string;
  department: string;
  required_skill?: string;
  required_authority?: string;
  estimated_processing_days: number;
}

export const WORKFLOW_TEMPLATES: Record<CaseType, WorkflowStepTemplate[]> = {
  land_compensation: [
    { name: "Document Validation", department: "Revenue", estimated_processing_days: 0.5 },
    { name: "Revenue Verification", department: "Revenue", required_skill: "revenue_verification", estimated_processing_days: 1.5 },
    { name: "Land Records Verification", department: "Land Records", required_skill: "land_records", estimated_processing_days: 1.5 },
    { name: "Finance Verification", department: "Finance", required_skill: "finance_verification", required_authority: "finance_verification", estimated_processing_days: 2 },
    { name: "Final Authority", department: "Revenue", required_authority: "final_authority", estimated_processing_days: 1 },
  ],
  birth_certificate_correction: [
    { name: "Document Validation", department: "Municipal", estimated_processing_days: 0.5 },
    { name: "Identity Verification", department: "Municipal", required_skill: "identity_verification", estimated_processing_days: 1 },
    { name: "Municipal Records", department: "Municipal", required_skill: "records_management", estimated_processing_days: 1 },
    { name: "Officer Review", department: "Municipal", required_authority: "review_authority", estimated_processing_days: 1 },
    { name: "Certificate Generation", department: "Municipal", estimated_processing_days: 0.5 },
  ],
  citizen_grievance: [
    { name: "Classification", department: "Citizen Grievance", estimated_processing_days: 0.5 },
    { name: "Department Assignment", department: "Citizen Grievance", estimated_processing_days: 0.5 },
    { name: "Officer Investigation", department: "Citizen Grievance", required_skill: "investigation", estimated_processing_days: 1.5 },
    { name: "Resolution", department: "Citizen Grievance", required_authority: "resolution_authority", estimated_processing_days: 1 },
    { name: "Escalation", department: "Citizen Grievance", estimated_processing_days: 1 },
  ],
};

export const REQUIRED_DOCUMENTS: Record<CaseType, string[]> = {
  land_compensation: ["application_form", "id_proof", "land_record", "bank_details", "acquisition_order"],
  birth_certificate_correction: ["application_form", "id_proof", "existing_certificate"],
  citizen_grievance: ["application_form", "id_proof", "supporting_document"],
};

export const SLA_HOURS: Record<CaseType, number> = {
  land_compensation: 72,
  birth_certificate_correction: 72,
  citizen_grievance: 48,
};

export function validateDocuments(caseType: CaseType, documentsDetected: string[]) {
  const required = REQUIRED_DOCUMENTS[caseType];
  const missing = required.filter((d) => !documentsDetected.includes(d));
  return {
    required,
    present: required.filter((d) => documentsDetected.includes(d)),
    missing,
    complete: missing.length === 0,
  };
}

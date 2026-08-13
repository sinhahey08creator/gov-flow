export type CaseType =
  | "land_compensation"
  | "birth_certificate_correction"
  | "citizen_grievance";

export type ExtractedCaseType = CaseType | "unsupported";

export type Priority = "low" | "medium" | "high";
export type RiskLevel = "low" | "medium" | "high";

export interface Officer {
  id: string;
  name: string;
  department: string;
  skills: string[];
  authority: string[];
  current_load: number;
  max_load: number;
  avg_processing_days: number;
  available: boolean;
}

export interface WorkflowStep {
  id: string;
  case_id: string;
  step_name: string;
  department: string;
  step_order: number;
  status: "pending" | "in_progress" | "completed" | "blocked";
  assigned_officer_id: string | null;
  estimated_processing_days: number;
  required_skill?: string;
  required_authority?: string;
  queue_length?: number;
}

export interface CaseRecord {
  id: string;
  case_number: string;
  case_type: CaseType;
  applicant_name: string;
  district: string;
  priority: Priority;
  sla_hours: number;
  status: string;
  current_step: number;
  summary: string;
  extracted_data: Record<string, unknown>;
  created_at: string;
  compensation_status?: string; // "not_started" | "pending" | "disbursed" | "rejected"
}

export interface DocumentRecord {
  id: string;
  case_id: string;
  doc_type: string;
  file_url: string | null;
  status: "present" | "missing";
  confidence: number | null;
}

export interface ScoreBreakdown {
  authority: number;
  skill: number;
  availability: number;
  workloadPenalty: number;
  processingPenalty: number;
}

export interface OfficerRecommendation {
  officer: Officer;
  score: number;
  breakdown: ScoreBreakdown;
  reasons: string[];
}

export interface EligibilityResult {
  eligible: boolean;
  reasons: string[];
}

export interface SLARiskResult {
  percentage: number;
  level: RiskLevel;
}

export interface WhatIfResult {
  before: OfficerRecommendation | null;
  after: OfficerRecommendation | null;
  slaRiskBefore: SLARiskResult;
  slaRiskAfter: SLARiskResult;
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DEMO_CASE } from "@/lib/demo/seedData";
import { calculateSLARisk } from "@/lib/calculations/slaRisk";

// Only one demo case exists right now (GF-1024).
// Once Supabase is wired with more than one seeded case,
// replace this with a real fetch from lib/supabase/data.ts.

export default function CasesPage() {
  const [cases, setCases] = useState([DEMO_CASE]);

  // Automatically determine compensation status from workflow step
  const getCompensationStatus = (currentStep: number) => {
    if (currentStep <= 2) return "not_started";
    if (currentStep === 3) return "pending";
    if (currentStep === 4) return "processing";
    if (currentStep === 5) return "approved";
    if (currentStep >= 6) return "disbursed";

    return "not_started";
  };

  // Load saved cases from localStorage
  useEffect(() => {
    const savedCases = localStorage.getItem("govflow-cases");

    if (savedCases) {
      setCases([DEMO_CASE, ...JSON.parse(savedCases)]);
    }
  }, []);

  const getPriorityClass = (priority: string) => {
    if (priority === "high") {
      return "gf-status gf-status-critical";
    }

    if (priority === "medium") {
      return "gf-status gf-status-warning";
    }

    return "gf-status gf-status-success";
  };

  const getStatusClass = (status: string) => {
    const normalized = status.toLowerCase();

    if (
      normalized.includes("complete") ||
      normalized.includes("approved")
    ) {
      return "gf-status gf-status-success";
    }

    if (
      normalized.includes("pending") ||
      normalized.includes("processing")
    ) {
      return "gf-status gf-status-warning";
    }

    return "gf-status";
  };

  const getCompensationClass = (status: string) => {
    if (status === "disbursed" || status === "approved") {
      return "gf-status gf-status-success";
    }

    if (status === "processing" || status === "pending") {
      return "gf-status gf-status-warning";
    }

    return "gf-status";
  };

  return (
    <main className="px-8 py-8 max-w-6xl mx-auto">
      {/* PAGE HEADER */}
      <div className="mb-6">
        <h1
          className="text-2xl font-semibold"
          style={{ color: "var(--navy)" }}
        >
          Cases
        </h1>

        <p
          className="text-sm mt-1"
          style={{ color: "var(--muted)" }}
        >
          Monitor government cases, workflow progress, and SLA risk.
        </p>
      </div>

      {/* CASE TABLE */}
      <div className="gf-card overflow-hidden">
        <div className="px-5 py-4 border-b" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center justify-between">
            <div>
              <h2
                className="text-sm font-semibold"
                style={{ color: "var(--navy)" }}
              >
                Case Overview
              </h2>

              <p
                className="text-xs mt-1"
                style={{ color: "var(--muted)" }}
              >
                {cases.length} {cases.length === 1 ? "case" : "cases"} currently tracked
              </p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr
                className="border-b text-left"
                style={{
                  borderColor: "var(--border)",
                  background: "var(--bg)",
                }}
              >
                <th
                  className="px-5 py-3 font-medium"
                  style={{ color: "var(--muted)" }}
                >
                  Case
                </th>

                <th
                  className="px-5 py-3 font-medium"
                  style={{ color: "var(--muted)" }}
                >
                  Type
                </th>

                <th
                  className="px-5 py-3 font-medium"
                  style={{ color: "var(--muted)" }}
                >
                  Applicant
                </th>

                <th
                  className="px-5 py-3 font-medium"
                  style={{ color: "var(--muted)" }}
                >
                  Priority
                </th>

                <th
                  className="px-5 py-3 font-medium"
                  style={{ color: "var(--muted)" }}
                >
                  SLA Risk
                </th>

                <th
                  className="px-5 py-3 font-medium"
                  style={{ color: "var(--muted)" }}
                >
                  Status
                </th>

                <th
                  className="px-5 py-3 font-medium"
                  style={{ color: "var(--muted)" }}
                >
                  Compensation
                </th>
              </tr>
            </thead>

            <tbody>
              {cases.map((c) => {
                const risk = calculateSLARisk({
                  createdAt: c.created_at,
                  slaHours: c.sla_hours,
                  queueLength: 18,
                  priority: c.priority,
                });

                const riskClass =
                  risk.level === "high"
                    ? "gf-status gf-status-critical"
                    : risk.level === "medium"
                      ? "gf-status gf-status-warning"
                      : "gf-status gf-status-success";

                const compensationStatus = getCompensationStatus(
                  c.current_step ?? 0
                );

                return (
                  <tr
                    key={c.id}
                    className="border-b last:border-0 hover:bg-slate-50/70 transition-colors"
                    style={{ borderColor: "var(--border)" }}
                  >
                    {/* CASE */}
                    <td className="px-5 py-4">
                      <Link
                        href="/"
                        className="font-semibold hover:underline"
                        style={{ color: "var(--navy)" }}
                      >
                        {c.case_number}
                      </Link>
                    </td>

                    {/* TYPE */}
                    <td
                      className="px-5 py-4 capitalize"
                      style={{ color: "var(--text)" }}
                    >
                      {c.case_type.replace(/_/g, " ")}
                    </td>

                    {/* APPLICANT */}
                    <td
                      className="px-5 py-4"
                      style={{ color: "var(--text)" }}
                    >
                      {c.applicant_name}
                    </td>

                    {/* PRIORITY */}
                    <td className="px-5 py-4">
                      <span className={getPriorityClass(c.priority)}>
                        {c.priority}
                      </span>
                    </td>

                    {/* SLA RISK */}
                    <td className="px-5 py-4">
                      <span className={riskClass}>
                        {risk.percentage}%
                        <span className="opacity-70">·</span>
                        {risk.level}
                      </span>
                    </td>

                    {/* CASE STATUS */}
                    <td className="px-5 py-4">
                      <span
                        className={getStatusClass(
                          c.status.replace(/_/g, " ")
                        )}
                      >
                        {c.status.replace(/_/g, " ")}
                      </span>
                    </td>

                    {/* COMPENSATION STATUS */}
                    <td className="px-5 py-4">
                      <span
                        className={getCompensationClass(
                          compensationStatus
                        )}
                      >
                        {compensationStatus.replace(/_/g, " ")}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
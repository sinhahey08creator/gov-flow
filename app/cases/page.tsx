"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { DEMO_CASE } from "@/lib/demo/seedData";
import { calculateSLARisk } from "@/lib/calculations/slaRisk";

// Only one demo case exists right now (GF-1024). Once Supabase is wired
// with more than one seeded case, replace this with a real fetch from
// lib/supabase/data.ts (mirror the getOfficers() pattern).


export default function CasesPage() {
  const [cases, setCases] = useState([DEMO_CASE]);

  useEffect(() => {
    const savedCases = localStorage.getItem("govflow-cases");

    if (savedCases) {
      setCases([DEMO_CASE, ...JSON.parse(savedCases)]);
    }
  }, []);
  return (
    <main className="px-8 py-8 max-w-5xl mx-auto">
      <h1 className="text-xl font-semibold mb-6" style={{ color: "var(--navy)" }}>Cases</h1>
      <div className="rounded-lg border bg-white overflow-hidden" style={{ borderColor: "var(--border)" }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left" style={{ borderColor: "var(--border)" }}>
              <th className="px-4 py-3 font-medium" style={{ color: "var(--muted)" }}>Case</th>
              <th className="px-4 py-3 font-medium" style={{ color: "var(--muted)" }}>Type</th>
              <th className="px-4 py-3 font-medium" style={{ color: "var(--muted)" }}>Applicant</th>
              <th className="px-4 py-3 font-medium" style={{ color: "var(--muted)" }}>Priority</th>
              <th className="px-4 py-3 font-medium" style={{ color: "var(--muted)" }}>SLA Risk</th>
              <th className="px-4 py-3 font-medium" style={{ color: "var(--muted)" }}>Status</th>
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
              const riskColor =
                risk.level === "high" ? "var(--critical)" : risk.level === "medium" ? "var(--warning)" : "var(--success)";
              return (
                <tr key={c.id} className="border-b last:border-0" style={{ borderColor: "var(--border)" }}>
                  <td className="px-4 py-3">
                    <Link href="/" className="font-medium hover:underline" style={{ color: "var(--navy)" }}>
                      {c.case_number}
                    </Link>
                  </td>
                  <td className="px-4 py-3 capitalize">{c.case_type.replace(/_/g, " ")}</td>
                  <td className="px-4 py-3">{c.applicant_name}</td>
                  <td className="px-4 py-3 capitalize">{c.priority}</td>
                  <td className="px-4 py-3 font-medium" style={{ color: riskColor }}>{risk.percentage}%</td>
                  <td className="px-4 py-3 capitalize">{c.status.replace(/_/g, " ")}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </main>
  );
}

"use client";

import { useEffect, useState } from "react";
import { getAuditLogs, AuditLogItem } from "@/lib/audit/data";

const ACTION_FILTERS = [
  { label: "All", value: "all" },
  { label: "Case Created", value: "case created" },
  { label: "Why Generated", value: "why generated" },
  { label: "Simulation Run", value: "simulation run" },
  { label: "Officer Reassigned", value: "officer reassigned" },
];

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  useEffect(() => {
    setLogs(getAuditLogs());
  }, []);

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      selectedCategory === "all" ||
      log.action.toLowerCase() === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const getActionClass = (action: string) => {
    const normalized = action.toLowerCase();

    if (normalized === "officer reassigned") {
      return "gf-status gf-status-warning";
    }

    if (normalized === "simulation run") {
      return "gf-status gf-status-critical";
    }

    if (normalized === "case created") {
      return "gf-status gf-status-success";
    }

    return "gf-status";
  };

  const getActionDot = (action: string) => {
    const normalized = action.toLowerCase();

    if (normalized === "officer reassigned") {
      return "var(--warning)";
    }

    if (normalized === "simulation run") {
      return "var(--critical)";
    }

    if (normalized === "case created") {
      return "var(--success)";
    }

    return "var(--muted)";
  };

  return (
    <main className="px-8 py-8 max-w-6xl mx-auto">
      {/* PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
        <div>
          <h1
            className="text-2xl font-semibold"
            style={{ color: "var(--navy)" }}
          >
            Audit Log
          </h1>

          <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
            Track automated workflow events and user actions.
          </p>
        </div>

        <span className="gf-status">
          {filteredLogs.length}{" "}
          {filteredLogs.length === 1 ? "Event" : "Events"} Logged
        </span>
      </div>

      {/* SEARCH + FILTERS */}
      <div className="gf-card p-4 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* SEARCH */}
          <div className="relative w-full lg:w-80">
            <input
              type="text"
              placeholder="Search logs by action or details..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-md border bg-white focus:outline-none"
              style={{
                borderColor: "var(--border)",
                color: "var(--text)",
              }}
            />

            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold"
                style={{ color: "var(--muted)" }}
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </div>

          {/* FILTERS */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
            {ACTION_FILTERS.map((filter) => {
              const active = selectedCategory === filter.value;

              return (
                <button
                  key={filter.value}
                  onClick={() => setSelectedCategory(filter.value)}
                  className="px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors"
                  style={{
                    background: active
                      ? "var(--navy)"
                      : "var(--bg)",
                    color: active
                      ? "white"
                      : "var(--muted)",
                    border: `1px solid ${
                      active ? "var(--navy)" : "var(--border)"
                    }`,
                  }}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* AUDIT EVENTS */}
      <div className="gf-card overflow-hidden">
        <div
          className="px-5 py-4 border-b"
          style={{ borderColor: "var(--border)" }}
        >
          <h2
            className="text-sm font-semibold"
            style={{ color: "var(--navy)" }}
          >
            Activity History
          </h2>

          <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
            Recorded actions across GovFlow workflows.
          </p>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="p-12 text-center">
            <div
              className="mx-auto mb-3 w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: "var(--bg)" }}
            >
              <span
                className="text-lg font-semibold"
                style={{ color: "var(--muted)" }}
              >
                —
              </span>
            </div>

            <h3
              className="text-sm font-semibold"
              style={{ color: "var(--navy)" }}
            >
              No matching audit logs
            </h3>

            <p
              className="text-xs mt-1"
              style={{ color: "var(--muted)" }}
            >
              Try changing the search term or selected action filter.
            </p>
          </div>
        ) : (
          <div>
            {filteredLogs.map((log) => (
              <div
                key={log.id}
                className="px-5 py-5 border-b last:border-0 hover:bg-slate-50/60 transition-colors"
                style={{ borderColor: "var(--border)" }}
              >
                <div className="flex items-start gap-4">
                  {/* TIMELINE DOT */}
                  <div className="pt-1.5 shrink-0">
                    <span
                      className="block w-2.5 h-2.5 rounded-full"
                      style={{
                        background: getActionDot(log.action),
                      }}
                    />
                  </div>

                  {/* TIMESTAMP */}
                  <div
                    className="w-32 shrink-0 text-xs leading-tight"
                    style={{ color: "var(--muted)" }}
                  >
                    {log.timestamp.split(", ").map((part, idx) => (
                      <div key={idx}>{part}</div>
                    ))}
                  </div>

                  {/* EVENT DETAILS */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <h3
                        className="text-sm font-semibold capitalize"
                        style={{ color: "var(--navy)" }}
                      >
                        {log.action}
                      </h3>

                      <span className={getActionClass(log.action)}>
                        {log.action}
                      </span>
                    </div>

                    <p
                      className="text-xs leading-relaxed mt-2"
                      style={{ color: "var(--muted)" }}
                    >
                      {log.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
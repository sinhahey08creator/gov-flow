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
      selectedCategory === "all" || log.action.toLowerCase() === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="flex-1 bg-slate-50 min-h-screen">
      <main className="p-8 max-w-6xl mx-auto space-y-6">
        {/* Header Section */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Audit Log</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Track all automated workflow events and user actions
            </p>
          </div>
          
          <span className="text-xs font-medium text-slate-500 bg-slate-200/60 px-3 py-1.5 rounded-full">
            {filteredLogs.length} {filteredLogs.length === 1 ? "Event" : "Events"} Logged
          </span>
        </div>

        {/* Search & Category Filter Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-3 border border-slate-200 rounded-xl shadow-sm">
          {/* Search Box */}
          <div className="relative w-full sm:w-80">
            <input
              type="text"
              placeholder="Search logs by action or details..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-3 pr-8 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-sm font-semibold"
              >
                ×
              </button>
            )}
          </div>

          {/* Action Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            {ACTION_FILTERS.map((filter) => {
              const active = selectedCategory === filter.value;
              return (
                <button
                  key={filter.value}
                  onClick={() => setSelectedCategory(filter.value)}
                  className={`px-3 py-1 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                    active
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200/70"
                  }`}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Audit Log Card Box */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 shadow-sm">
          {filteredLogs.length === 0 ? (
            <div className="p-12 text-center text-sm text-slate-500">
              No matching audit logs found.
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div
                key={log.id}
                className="p-5 flex items-start gap-8 hover:bg-slate-50/50 transition-colors"
              >
                {/* Left Column: Timestamp */}
                <div className="w-32 shrink-0 text-xs text-slate-500 font-mono leading-tight">
                  {log.timestamp.split(", ").map((part, idx) => (
                    <div key={idx}>{part}</div>
                  ))}
                </div>

                {/* Right Column: Action & Description */}
                <div className="flex-1 space-y-1">
                  <h3 className="font-semibold text-slate-900 text-sm capitalize">
                    {log.action}
                  </h3>
                  <p className="text-xs text-slate-500 leading-normal">
                    {log.description}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
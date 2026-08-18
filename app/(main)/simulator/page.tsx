"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Activity, Pause, Play, RotateCcw } from "lucide-react";
import { defaultConfig, runSimulation, runWhatIf, validateConfig } from "@/lib/simulation/engine";
import { SCENARIO_PRESETS, getPreset } from "@/lib/simulation/scenarios";
import { SEED_OFFICERS } from "@/lib/demo/seedData";
import { WORKFLOW_TEMPLATES } from "@/lib/workflow/templates";
import { logAction } from "@/lib/audit/data";
import { CaseType } from "@/types";
import { SimulationConfig, SimulationResult } from "@/lib/simulation/types";

const OFFICE_LABELS: Record<CaseType, string> = {
  land_compensation: "Land Compensation (Revenue → Land Records → Finance)",
  birth_certificate_correction: "Birth Certificate Correction (Municipal)",
  citizen_grievance: "Citizen Grievance",
};

const SPEEDS = [1, 2, 5, 10];

function riskColor(level: string) {
  if (level === "high") return "var(--critical)";
  if (level === "medium") return "var(--warning)";
  return "var(--success)";
}

export default function SimulatorPage() {
  const [config, setConfig] = useState<SimulationConfig>(() => defaultConfig());
  const [presetId, setPresetId] = useState("normal_day");
  const [errors, setErrors] = useState<string[]>([]);

  const [result, setResult] = useState<SimulationResult | null>(null);
  const [currentDay, setCurrentDay] = useState(0);
  const [status, setStatus] = useState<"idle" | "running" | "paused" | "done">("idle");
  const [speed, setSpeed] = useState(2);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [showWhatIf, setShowWhatIf] = useState(false);
  const [whatIfExtraOfficers, setWhatIfExtraOfficers] = useState(0);

  const officeOfficers = useMemo(() => {
    const departments = new Set(WORKFLOW_TEMPLATES[config.office].map((s) => s.department));
    return SEED_OFFICERS.filter((o) => departments.has(o.department));
  }, [config.office]);

  function updateConfig(patch: Partial<SimulationConfig>) {
    setConfig((c) => ({ ...c, ...patch }));
    setPresetId("custom");
  }

  function applyPreset(id: string) {
    setPresetId(id);
    const preset = getPreset(id);
    setConfig((c) => ({ ...c, ...preset.overrides }));
  }

  function toggleOfficerUnavailable(officerId: string) {
    updateConfig({
      unavailableOfficerIds: config.unavailableOfficerIds.includes(officerId)
        ? config.unavailableOfficerIds.filter((id) => id !== officerId)
        : [...config.unavailableOfficerIds, officerId],
    });
  }

  function handleStart() {
    const validationErrors = validateConfig(config);
    if (config.unavailableOfficerIds.length >= officeOfficers.length && officeOfficers.length > 0) {
      validationErrors.push("Every officer in this office is marked unavailable — nothing could be processed.");
    }
    setErrors(validationErrors);
    if (validationErrors.length > 0) return;

    const simResult = runSimulation(config, SEED_OFFICERS);
    setResult(simResult);
    setCurrentDay(1);
    setStatus("running");

    logAction(
      "simulation run",
      `Ran Office Simulator for ${OFFICE_LABELS[config.office]} (${config.incomingCases} incoming cases, ${config.simulationDurationDays} days)`
    );
  }

  function handlePause() {
    setStatus("paused");
  }

  function handleResume() {
    setStatus("running");
  }

  function handleReset() {
    setStatus("idle");
    setResult(null);
    setCurrentDay(0);
  }

  // Playback: the engine already computed the full timeline up front —
  // this just steps an index through it on an interval. The simulation
  // engine is the source of truth; this loop never calculates anything.
  useEffect(() => {
    if (status !== "running" || !result) return;

    intervalRef.current = setInterval(() => {
      setCurrentDay((d) => {
        if (d >= result.timeline.length) {
          setStatus("done");
          return d;
        }
        const next = d + 1;
        if (next >= result.timeline.length) setStatus("done");
        return next;
      });
    }, Math.max(100, 800 / speed));

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [status, result, speed]);

  const dayIndex = Math.min(Math.max(currentDay - 1, 0), (result?.timeline.length ?? 1) - 1);
  const snapshot = result?.timeline[dayIndex] ?? null;

  const whatIfComparison = useMemo(() => {
    if (!showWhatIf || !result) return null;
    const extraOfficers = officeOfficers
      .filter((o) => o.available)
      .slice(0, whatIfExtraOfficers)
      .map((o, i) => ({ ...o, id: `${o.id}-whatif-${i}` }));
    return runWhatIf(config, config, [...SEED_OFFICERS, ...extraOfficers]);
  }, [showWhatIf, whatIfExtraOfficers, config, officeOfficers, result]);

  return (
    <main className="min-h-screen px-8 py-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ background: "var(--navy)" }}
        >
          <Activity size={18} color="white" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: "var(--navy)" }}>
            Office Simulator
          </h1>
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            Simulate how an office pipeline performs under different workload and staffing conditions.
          </p>
        </div>
      </div>

      {/* CONFIGURATION */}
      <div className="gf-card p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* OFFICE */}
          <div>
            <label className="block text-xs font-medium mb-1.5">Office / Case Pipeline</label>
            <select
              value={config.office}
              onChange={(e) => updateConfig({ office: e.target.value as CaseType })}
              disabled={status === "running"}
              className="w-full text-sm px-3 py-2.5 bg-white border rounded-md"
              style={{ borderColor: "var(--border)" }}
            >
              {(Object.keys(OFFICE_LABELS) as CaseType[]).map((office) => (
                <option key={office} value={office}>
                  {OFFICE_LABELS[office]}
                </option>
              ))}
            </select>
          </div>

          {/* SCENARIO */}
          <div>
            <label className="block text-xs font-medium mb-1.5">Scenario</label>
            <select
              value={presetId}
              onChange={(e) => applyPreset(e.target.value)}
              disabled={status === "running"}
              className="w-full text-sm px-3 py-2.5 bg-white border rounded-md"
              style={{ borderColor: "var(--border)" }}
            >
              {SCENARIO_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
            <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
              {getPreset(presetId).description}
            </p>
          </div>

          {/* SIMULATION DURATION */}
          <div>
            <label className="block text-xs font-medium mb-1.5">Simulation Duration (days)</label>
            <input
              type="number"
              min={1}
              value={config.simulationDurationDays}
              onChange={(e) => updateConfig({ simulationDurationDays: Number(e.target.value) })}
              disabled={status === "running"}
              className="w-full text-sm px-3 py-2.5 bg-white border rounded-md"
              style={{ borderColor: "var(--border)" }}
            />
          </div>

          {/* INCOMING CASES */}
          <div>
            <label className="block text-xs font-medium mb-1.5">Incoming Cases</label>
            <input
              type="number"
              min={0}
              value={config.incomingCases}
              onChange={(e) => updateConfig({ incomingCases: Number(e.target.value) })}
              disabled={status === "running"}
              className="w-full text-sm px-3 py-2.5 bg-white border rounded-md"
              style={{ borderColor: "var(--border)" }}
            />
          </div>

          {/* EXISTING PENDING */}
          <div>
            <label className="block text-xs font-medium mb-1.5">Existing Pending Cases</label>
            <input
              type="number"
              min={0}
              value={config.existingPendingCases}
              onChange={(e) => updateConfig({ existingPendingCases: Number(e.target.value) })}
              disabled={status === "running"}
              className="w-full text-sm px-3 py-2.5 bg-white border rounded-md"
              style={{ borderColor: "var(--border)" }}
            />
          </div>

          {/* SLA HOURS */}
          <div>
            <label className="block text-xs font-medium mb-1.5">SLA (hours)</label>
            <input
              type="number"
              min={1}
              value={config.slaHours}
              onChange={(e) => updateConfig({ slaHours: Number(e.target.value) })}
              disabled={status === "running"}
              className="w-full text-sm px-3 py-2.5 bg-white border rounded-md"
              style={{ borderColor: "var(--border)" }}
            />
          </div>
        </div>

        {/* OFFICER AVAILABILITY */}
        <div>
          <label className="block text-xs font-medium mb-2">
            Officers in this pipeline ({officeOfficers.length}) — click to toggle availability
          </label>
          <div className="flex flex-wrap gap-2">
            {officeOfficers.map((o) => {
              const unavailable = config.unavailableOfficerIds.includes(o.id) || !o.available;
              const toggledByUser = config.unavailableOfficerIds.includes(o.id);
              return (
                <button
                  key={o.id}
                  onClick={() => toggleOfficerUnavailable(o.id)}
                  disabled={status === "running" || !o.available}
                  className="text-xs px-3 py-1.5 rounded-full border"
                  style={{
                    borderColor: unavailable ? "var(--critical)" : "var(--border)",
                    background: unavailable ? "#fef2f2" : "white",
                    color: unavailable ? "var(--critical)" : "var(--text)",
                    opacity: !o.available && !toggledByUser ? 0.6 : 1,
                  }}
                  title={o.department}
                >
                  {o.name} {unavailable ? "· Unavailable" : ""}
                </button>
              );
            })}
          </div>
        </div>

        {errors.length > 0 && (
          <div className="rounded-md border p-3 text-sm" style={{ borderColor: "var(--critical)", background: "#fef2f2", color: "var(--critical)" }}>
            {errors.map((e) => (
              <p key={e}>{e}</p>
            ))}
          </div>
        )}

        {/* CONTROLS */}
        <div className="flex items-center gap-3 flex-wrap">
          {status === "idle" || status === "done" ? (
            <button onClick={handleStart} className="gf-button" style={{ color: "white", background: "var(--navy)", borderColor: "var(--navy)" }}>
              <Play size={14} className="mr-1.5" /> Start Simulation
            </button>
          ) : status === "running" ? (
            <button onClick={handlePause} className="gf-button">
              <Pause size={14} className="mr-1.5" /> Pause
            </button>
          ) : (
            <button onClick={handleResume} className="gf-button" style={{ color: "white", background: "var(--navy)", borderColor: "var(--navy)" }}>
              <Play size={14} className="mr-1.5" /> Resume
            </button>
          )}

          <button onClick={handleReset} className="gf-button">
            <RotateCcw size={14} className="mr-1.5" /> Reset
          </button>

          <div className="flex items-center gap-1.5 ml-2">
            <span className="text-xs" style={{ color: "var(--muted)" }}>Speed</span>
            {SPEEDS.map((s) => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className="text-xs px-2 py-1 rounded border"
                style={{
                  borderColor: speed === s ? "var(--navy)" : "var(--border)",
                  background: speed === s ? "#F0F4FF" : "white",
                  color: "var(--navy)",
                }}
              >
                {s}x
              </button>
            ))}
          </div>

          {result && (
            <span className="text-xs ml-auto" style={{ color: "var(--muted)" }}>
              Day {currentDay} / {result.timeline.length} · {status}
            </span>
          )}
        </div>
      </div>

      {/* LIVE WORKFLOW + METRICS */}
      {result && snapshot && (
        <>
          <div className="gf-card overflow-hidden">
            <div className="px-6 py-4 border-b" style={{ borderColor: "var(--border)" }}>
              <h3 className="text-sm font-semibold" style={{ color: "var(--navy)" }}>Live Workflow</h3>
              <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
                Cases visibly flow left to right through each stage as the simulation progresses.
              </p>
            </div>
            <div className="px-6 py-5 overflow-x-auto">
              <div className="flex items-stretch gap-3 min-w-max">
                {snapshot.stages.map((stage, i) => (
                  <div key={stage.stage} className="flex items-center gap-3">
                    <div
                      className="w-44 rounded-lg border p-3"
                      style={{
                        borderColor: stage.utilization >= 0.9 ? riskColor(stage.utilization >= 1.2 ? "high" : "medium") : "var(--border)",
                        background: stage.utilization >= 1.2 ? "#fef2f2" : stage.utilization >= 0.9 ? "#fffbeb" : "white",
                      }}
                    >
                      <p className="text-xs font-semibold" style={{ color: "var(--navy)" }}>{stage.stage}</p>
                      <p className="text-[11px]" style={{ color: "var(--muted)" }}>{stage.department}</p>
                      <div className="mt-2 text-xs space-y-0.5">
                        <p>Queue: <strong>{Math.round(stage.queue)}</strong></p>
                        <p>Processed today: <strong>{Math.round(stage.processed)}</strong></p>
                        <p>Capacity/day: <strong>{stage.capacity.toFixed(1)}</strong></p>
                      </div>
                    </div>
                    {i < snapshot.stages.length - 1 && (
                      <span style={{ color: "var(--muted)" }}>→</span>
                    )}
                  </div>
                ))}
                <span style={{ color: "var(--muted)" }}>→</span>
                <div className="w-32 rounded-lg border p-3 flex flex-col items-center justify-center" style={{ borderColor: "var(--success)", background: "#f0fdf4" }}>
                  <p className="text-xs font-semibold" style={{ color: "var(--success)" }}>Completed</p>
                  <p className="text-lg font-semibold" style={{ color: "var(--success)" }}>{snapshot.cumulativeCompleted}</p>
                </div>
              </div>
            </div>
          </div>

          {/* LIVE METRICS */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Cases Pending", value: snapshot.casesPending },
              { label: "Cases Completed", value: snapshot.cumulativeCompleted },
              { label: "Cases Processed Today", value: snapshot.casesCompleted },
              { label: "Total Incoming So Far", value: snapshot.cumulativeIncoming },
            ].map((m) => (
              <div key={m.label} className="gf-card p-4">
                <span className="text-xs font-medium" style={{ color: "var(--muted)" }}>{m.label}</span>
                <p className="text-2xl font-semibold mt-2" style={{ color: "var(--navy)" }}>{m.value}</p>
              </div>
            ))}
          </div>
        </>
      )}

      {/* FINAL SUMMARY (once complete) */}
      {status === "done" && result && (
        <div className="gf-card overflow-hidden">
          <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
            <h3 className="text-sm font-semibold" style={{ color: "var(--navy)" }}>Simulation Complete</h3>
            {result.metrics.primaryBottleneck && (
              <span className="gf-status gf-status-critical">
                Primary bottleneck: {result.metrics.primaryBottleneck.stage}
              </span>
            )}
          </div>

          <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Cases Processed", value: result.metrics.casesProcessed },
              { label: "Cases Pending", value: result.metrics.casesPending },
              { label: "SLA At Risk", value: result.metrics.slaAtRisk },
              { label: "SLA Breached", value: result.metrics.slaBreached, critical: result.metrics.slaBreached > 0 },
              { label: "Avg Processing", value: `${result.metrics.avgProcessingDays}d` },
              { label: "Avg Waiting", value: `${result.metrics.avgWaitingDays}d` },
              { label: "Officer Utilization", value: `${Math.round(result.metrics.officerUtilization * 100)}%` },
              { label: "Overloaded Officers", value: result.metrics.overloadedOfficers },
            ].map((m) => (
              <div key={m.label} className="gf-card p-4">
                <span className="text-xs font-medium" style={{ color: "var(--muted)" }}>{m.label}</span>
                <p
                  className="text-2xl font-semibold mt-2"
                  style={{ color: m.critical ? "var(--critical)" : "var(--navy)" }}
                >
                  {m.value}
                </p>
              </div>
            ))}
          </div>

          <div className="px-6 pb-6 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--muted)" }}>
              Recommendations
            </p>
            {result.recommendations.map((r, i) => (
              <div
                key={i}
                className="rounded-md border p-3 text-sm"
                style={{
                  borderColor: "var(--border)",
                  background: r.severity === "high" ? "#fef2f2" : r.severity === "medium" ? "#fffbeb" : "var(--bg)",
                }}
              >
                <p>{r.message}</p>
                <p className="font-medium mt-0.5">{r.action}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* WHAT-IF COMPARISON */}
      {status === "done" && result && (
        <div className="gf-card overflow-hidden">
          <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
            <div>
              <h3 className="text-sm font-semibold" style={{ color: "var(--navy)" }}>What-If: Add Officers</h3>
              <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
                See the impact of adding extra officers to this pipeline, same config otherwise.
              </p>
            </div>
            <button
              onClick={() => setShowWhatIf((v) => !v)}
              className="gf-button"
            >
              {showWhatIf ? "Hide" : "Compare"}
            </button>
          </div>

          {showWhatIf && (
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <label className="text-xs font-medium">Extra officers to add:</label>
                <input
                  type="number"
                  min={0}
                  max={10}
                  value={whatIfExtraOfficers}
                  onChange={(e) => setWhatIfExtraOfficers(Number(e.target.value))}
                  className="w-20 text-sm px-2 py-1 border rounded-md"
                  style={{ borderColor: "var(--border)" }}
                />
              </div>

              {whatIfComparison && (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b" style={{ borderColor: "var(--border)" }}>
                      <th className="py-2 font-medium" style={{ color: "var(--muted)" }}>Metric</th>
                      <th className="py-2 font-medium text-right" style={{ color: "var(--muted)" }}>Current</th>
                      <th className="py-2 font-medium text-right" style={{ color: "var(--muted)" }}>With +{whatIfExtraOfficers} Officers</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label: "Pending Cases", current: whatIfComparison.baseline.metrics.casesPending, modified: whatIfComparison.modified.metrics.casesPending },
                      { label: "SLA Breaches", current: whatIfComparison.baseline.metrics.slaBreached, modified: whatIfComparison.modified.metrics.slaBreached },
                      { label: "Avg Processing (days)", current: whatIfComparison.baseline.metrics.avgProcessingDays, modified: whatIfComparison.modified.metrics.avgProcessingDays },
                      { label: "Officer Utilization", current: `${Math.round(whatIfComparison.baseline.metrics.officerUtilization * 100)}%`, modified: `${Math.round(whatIfComparison.modified.metrics.officerUtilization * 100)}%` },
                    ].map((row) => (
                      <tr key={row.label} className="border-b last:border-0" style={{ borderColor: "var(--border)" }}>
                        <td className="py-2">{row.label}</td>
                        <td className="py-2 text-right">{row.current}</td>
                        <td className="py-2 text-right font-medium" style={{ color: "var(--navy)" }}>{row.modified}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      )}

      {/* EMPTY STATE */}
      {!result && (
        <div className="gf-card p-12 text-center" style={{ color: "var(--muted)" }}>
          <h3 className="text-sm font-semibold" style={{ color: "var(--navy)" }}>No simulation running</h3>
          <p className="text-xs mt-1 max-w-md mx-auto">
            Configure the office, scenario, and workload above, then start the simulation to see live metrics and bottleneck detection.
          </p>
        </div>
      )}
    </main>
  );
}

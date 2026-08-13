import { SEED_OFFICERS } from "@/lib/demo/seedData";
import { calculateUtilization } from "@/lib/calculations/slaRisk";

// TODO once Supabase is wired: replace SEED_OFFICERS with a server-side
// call to lib/supabase/data.ts getOfficers() (same fallback pattern used
// in the API routes already).

export default function ResourcesPage() {
  const officers = [...SEED_OFFICERS].sort(
    (a, b) =>
      calculateUtilization(b.current_load, b.max_load) -
      calculateUtilization(a.current_load, a.max_load)
  );

  // Summary information
  const totalOfficers = officers.length;

  const availableOfficers = officers.filter(
    (officer) => officer.available
  ).length;

  const averageUtilization =
    totalOfficers > 0
      ? Math.round(
          officers.reduce(
            (total, officer) =>
              total +
              calculateUtilization(
                officer.current_load,
                officer.max_load
              ),
            0
          ) / totalOfficers
        )
      : 0;

  return (
    <main className="px-8 py-8 max-w-6xl mx-auto">
      {/* PAGE HEADER */}
      <div className="mb-6">
        <h1
          className="text-2xl font-semibold"
          style={{ color: "var(--navy)" }}
        >
          Resource Management
        </h1>

        <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
          Monitor officer workload, availability, and processing capacity.
        </p>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {/* TOTAL OFFICERS */}
        <div className="gf-card p-5">
          <p className="gf-muted text-xs font-medium uppercase tracking-wide">
            Total Officers
          </p>

          <p
            className="text-2xl font-semibold mt-2"
            style={{ color: "var(--navy)" }}
          >
            {totalOfficers}
          </p>

          <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
            Officers in the resource pool
          </p>
        </div>

        {/* AVAILABLE OFFICERS */}
        <div className="gf-card p-5">
          <p className="gf-muted text-xs font-medium uppercase tracking-wide">
            Available
          </p>

          <p
            className="text-2xl font-semibold mt-2"
            style={{ color: "var(--success)" }}
          >
            {availableOfficers}
          </p>

          <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
            Currently available for assignment
          </p>
        </div>

        {/* AVERAGE UTILIZATION */}
        <div className="gf-card p-5">
          <p className="gf-muted text-xs font-medium uppercase tracking-wide">
            Average Utilization
          </p>

          <p
            className="text-2xl font-semibold mt-2"
            style={{
              color:
                averageUtilization >= 80
                  ? "var(--critical)"
                  : averageUtilization >= 50
                    ? "var(--warning)"
                    : "var(--success)",
            }}
          >
            {averageUtilization}%
          </p>

          <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
            Across all officers
          </p>
        </div>
      </div>

      {/* OFFICER TABLE */}
      <div className="gf-card overflow-hidden">
        <div
          className="px-5 py-4 border-b"
          style={{ borderColor: "var(--border)" }}
        >
          <h2
            className="text-sm font-semibold"
            style={{ color: "var(--navy)" }}
          >
            Officer Capacity
          </h2>

          <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
            Officers are ordered by highest workload utilization.
          </p>
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
                  Officer
                </th>

                <th
                  className="px-5 py-3 font-medium"
                  style={{ color: "var(--muted)" }}
                >
                  Department
                </th>

                <th
                  className="px-5 py-3 font-medium"
                  style={{ color: "var(--muted)" }}
                >
                  Load
                </th>

                <th
                  className="px-5 py-3 font-medium"
                  style={{ color: "var(--muted)" }}
                >
                  Utilization
                </th>

                <th
                  className="px-5 py-3 font-medium"
                  style={{ color: "var(--muted)" }}
                >
                  Avg Processing
                </th>

                <th
                  className="px-5 py-3 font-medium"
                  style={{ color: "var(--muted)" }}
                >
                  Available
                </th>
              </tr>
            </thead>

            <tbody>
              {officers.map((o) => {
                const util = calculateUtilization(
                  o.current_load,
                  o.max_load
                );

                const utilClass =
                  util >= 80
                    ? "gf-status gf-status-critical"
                    : util >= 50
                      ? "gf-status gf-status-warning"
                      : "gf-status gf-status-success";

                return (
                  <tr
                    key={o.id}
                    className="border-b last:border-0 hover:bg-slate-50/70 transition-colors"
                    style={{ borderColor: "var(--border)" }}
                  >
                    {/* OFFICER */}
                    <td className="px-5 py-4">
                      <div
                        className="font-medium"
                        style={{ color: "var(--navy)" }}
                      >
                        {o.name}
                      </div>
                    </td>

                    {/* DEPARTMENT */}
                    <td className="px-5 py-4">
                      {o.department}
                    </td>

                    {/* LOAD */}
                    <td className="px-5 py-4">
                      {o.current_load} / {o.max_load}
                    </td>

                    {/* UTILIZATION */}
                    <td className="px-5 py-4">
                      <span className={utilClass}>
                        {util}%
                      </span>
                    </td>

                    {/* AVG PROCESSING */}
                    <td className="px-5 py-4">
                      {o.avg_processing_days}d
                    </td>

                    {/* AVAILABILITY */}
                    <td className="px-5 py-4">
                      <span
                        className={
                          o.available
                            ? "gf-status gf-status-success"
                            : "gf-status"
                        }
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{
                            backgroundColor: o.available
                              ? "var(--success)"
                              : "var(--muted)",
                          }}
                        />

                        {o.available ? "Available" : "Unavailable"}
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
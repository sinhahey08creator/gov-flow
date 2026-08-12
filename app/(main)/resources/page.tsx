import { SEED_OFFICERS } from "@/lib/demo/seedData";
import { calculateUtilization } from "@/lib/calculations/slaRisk";

// TODO once Supabase is wired: replace SEED_OFFICERS with a server-side
// call to lib/supabase/data.ts getOfficers() (same fallback pattern used
// in the API routes already).
export default function ResourcesPage() {
  const officers = [...SEED_OFFICERS].sort(
    (a, b) => calculateUtilization(b.current_load, b.max_load) - calculateUtilization(a.current_load, a.max_load)
  );

  return (
    <main className="px-8 py-8 max-w-5xl mx-auto">
      <h1 className="text-xl font-semibold mb-6" style={{ color: "var(--navy)" }}>Resources</h1>
      <div className="rounded-lg border bg-white overflow-hidden" style={{ borderColor: "var(--border)" }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left" style={{ borderColor: "var(--border)" }}>
              <th className="px-4 py-3 font-medium" style={{ color: "var(--muted)" }}>Officer</th>
              <th className="px-4 py-3 font-medium" style={{ color: "var(--muted)" }}>Department</th>
              <th className="px-4 py-3 font-medium" style={{ color: "var(--muted)" }}>Load</th>
              <th className="px-4 py-3 font-medium" style={{ color: "var(--muted)" }}>Utilization</th>
              <th className="px-4 py-3 font-medium" style={{ color: "var(--muted)" }}>Avg Processing</th>
              <th className="px-4 py-3 font-medium" style={{ color: "var(--muted)" }}>Available</th>
            </tr>
          </thead>
          <tbody>
            {officers.map((o) => {
              const util = calculateUtilization(o.current_load, o.max_load);
              const utilColor = util >= 80 ? "var(--critical)" : util >= 50 ? "var(--warning)" : "var(--success)";
              return (
                <tr key={o.id} className="border-b last:border-0" style={{ borderColor: "var(--border)" }}>
                  <td className="px-4 py-3 font-medium">{o.name}</td>
                  <td className="px-4 py-3">{o.department}</td>
                  <td className="px-4 py-3">{o.current_load}/{o.max_load}</td>
                  <td className="px-4 py-3 font-medium" style={{ color: utilColor }}>{util}%</td>
                  <td className="px-4 py-3">{o.avg_processing_days}d</td>
                  <td className="px-4 py-3">
                    <span
                      className="inline-flex items-center justify-center w-[96px] h-[28px] rounded-md text-xs font-medium border"
                      style={
                        o.available
                          ? {
                            color: "var(--success)",
                            borderColor: "var(--success)",
                            backgroundColor:
                              "color-mix(in srgb, var(--success) 8%, white)",
                          }
                          : {
                            color: "var(--muted)",
                            borderColor: "var(--border)",
                            backgroundColor: "var(--border)",
                          }
                      }
                    >
                      {o.available ? "Available" : "Unavailable"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </main>
  );
}

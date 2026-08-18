"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Officer } from "@/types";

export default function AssignOfficerControl({
  caseId,
  stepId,
  eligibleOfficers,
  currentOfficerId,
}: {
  caseId: string;
  stepId: string;
  eligibleOfficers: Officer[];
  currentOfficerId: string | null;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState(currentOfficerId ?? "");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function handleAssign() {
    if (!selected) return;
    setError(null);

    const res = await fetch(`/api/cases/${caseId}/assign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stepId, officerId: selected }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to assign officer.");
      return;
    }

    startTransition(() => router.refresh());
  }

  if (eligibleOfficers.length === 0) {
    return (
      <p className="text-xs" style={{ color: "var(--critical)" }}>
        No available officers for this department.
      </p>
    );
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <select
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        className="text-xs px-2 py-1.5 border rounded-md bg-white"
        style={{ borderColor: "var(--border)" }}
      >
        <option value="">Select officer…</option>
        {eligibleOfficers.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name} ({o.current_load}/{o.max_load} load)
          </option>
        ))}
      </select>
      <button
        onClick={handleAssign}
        disabled={!selected || isPending || selected === currentOfficerId}
        className="text-xs px-3 py-1.5 rounded-md font-medium"
        style={{
          background: "var(--navy)",
          color: "white",
          opacity: !selected || isPending || selected === currentOfficerId ? 0.5 : 1,
        }}
      >
        {isPending ? "Assigning…" : currentOfficerId ? "Reassign" : "Assign"}
      </button>
      {error && <span className="text-xs" style={{ color: "var(--critical)" }}>{error}</span>}
    </div>
  );
}

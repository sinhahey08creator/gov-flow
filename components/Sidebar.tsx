"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createBrowserClient } from "@/lib/supabase/browser";

const NAV_ITEMS = [
  { href: "/", label: "Overview" },
  { href: "/cases", label: "Cases" },
  { href: "/resources", label: "Resources" },
   { href: "/simulator", label: "Simulator" },
  { href: "/audit", label: "Audit Log" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createBrowserClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside
      className="w-56 shrink-0 border-r px-4 py-6 flex flex-col justify-between min-h-screen"
      style={{ borderColor: "var(--border)" }}
    >
      <div>
        <h1
          className="text-lg font-semibold px-2 mb-6"
          style={{ color: "var(--navy)" }}
        >
          GovFlow AI
        </h1>
        <nav className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block px-2 py-1.5 rounded text-sm transition-colors ${
                  isActive
                    ? "bg-slate-200/60 font-medium"
                    : "hover:bg-slate-100"
                }`}
                style={{ color: "var(--text)" }}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="space-y-3">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-2 px-2 py-1.5 rounded text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
        >
          <LogOut size={16} />
          Logout
        </button>

        <div
          className="text-xs px-2 py-2 rounded border"
          style={{ borderColor: "var(--border)", color: "var(--muted)" }}
        >
          DEMO MODE
          <br />
          Synthetic Dataset
        </div>
      </div>
    </aside>
  );
}
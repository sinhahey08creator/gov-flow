"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ShieldCheck,
  LayoutDashboard,
  FolderKanban,
  Boxes,
  Gauge,
  ScrollText,
} from "lucide-react";

const WORKSPACE_ITEMS = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/cases", label: "Cases", icon: FolderKanban },
  { href: "/resources", label: "Resources", icon: Boxes },
];

const MONITORING_ITEMS = [
  { href: "/simulator", label: "Simulator", icon: Gauge },
  { href: "/audit", label: "Audit Log", icon: ScrollText },
];

function NavLink({
  href,
  label,
  icon: Icon,
  isActive,
}: {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  isActive: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-colors ${
        isActive
          ? "bg-white/10 text-white font-medium"
          : "text-slate-300 hover:bg-white/5 hover:text-white"
      }`}
    >
      <Icon
        size={16}
        strokeWidth={2}
        className={
          isActive
            ? "text-white"
            : "text-slate-400 group-hover:text-slate-200"
        }
      />
      {label}
    </Link>
  );
}

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="w-60 shrink-0 flex flex-col justify-between min-h-screen"
      style={{ background: "var(--navy-deep)" }}
    >
      <div className="px-4 py-5">
        {/* BRAND */}
        <div className="flex items-center gap-2.5 px-1 mb-8">
          <div className="w-8 h-8 rounded-md bg-white/10 flex items-center justify-center shrink-0">
            <ShieldCheck
              size={17}
              className="text-white"
              strokeWidth={2}
            />
          </div>

          <div className="min-w-0">
            <div className="text-sm font-semibold text-white leading-tight">
              GovFlow AI
            </div>

            <div className="text-[11px] text-slate-400 leading-tight truncate">
              Government Operations
            </div>
          </div>
        </div>

        {/* WORKSPACE */}
        <div className="mb-5">
          <div className="text-[10px] font-semibold tracking-wider text-slate-500 uppercase px-2.5 mb-1.5">
            Workspace
          </div>

          <nav className="space-y-0.5">
            {WORKSPACE_ITEMS.map((item) => (
              <NavLink
                key={item.href}
                {...item}
                isActive={pathname === item.href}
              />
            ))}
          </nav>
        </div>

        {/* MONITORING */}
        <div>
          <div className="text-[10px] font-semibold tracking-wider text-slate-500 uppercase px-2.5 mb-1.5">
            Monitoring
          </div>

          <nav className="space-y-0.5">
            {MONITORING_ITEMS.map((item) => (
              <NavLink
                key={item.href}
                {...item}
                isActive={pathname === item.href}
              />
            ))}
          </nav>
        </div>
      </div>

      {/* BOTTOM SECTION */}
      <div className="px-4 py-5 space-y-3">
        {/* SYSTEM STATUS */}
        <div className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-2.5">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            All systems operational
          </div>
        </div>

        {/* ADMIN USER */}
        <div className="flex items-center gap-2.5 px-1">
          <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-[11px] font-semibold text-white shrink-0">
            AU
          </div>

          <div className="min-w-0">
            <div className="text-xs font-medium text-white truncate">
              Admin User
            </div>

            <div className="text-[10px] text-slate-500 truncate">
              Administrator
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
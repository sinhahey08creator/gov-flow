"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  FolderOpen,
  FileText,
  FlaskConical,
  ClipboardList,
  ShieldCheck,
  LogOut,
  User,
  CircleCheck,
} from "lucide-react";
import { createBrowserClient } from "@/lib/supabase/browser";

const WORKSPACE_ITEMS = [
  {
    href: "/",
    label: "Overview",
    icon: LayoutDashboard,
  },
  {
    href: "/cases",
    label: "Cases",
    icon: FolderOpen,
  },
  {
    href: "/resources",
    label: "Resources",
    icon: FileText,
  },
];

const MONITORING_ITEMS = [
  {
    href: "/simulator",
    label: "Simulator",
    icon: FlaskConical,
  },
  {
    href: "/audit",
    label: "Audit Log",
    icon: ClipboardList,
  },
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

  function renderNavItem(
    item: {
      href: string;
      label: string;
      icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
    }
  ) {
    const Icon = item.icon;

    const isActive =
      item.href === "/"
        ? pathname === "/"
        : pathname.startsWith(item.href);

    return (
      <Link
        key={item.href}
        href={item.href}
        className="flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors"
        style={{
          color: isActive ? "#FFFFFF" : "#CBD5E1",
          background: isActive
            ? "#243B63"
            : "transparent",
          fontWeight: isActive ? 600 : 500,
        }}
      >
        <Icon
          size={17}
          strokeWidth={isActive ? 2.2 : 1.8}
        />

        <span>{item.label}</span>
      </Link>
    );
  }

  return (
    <aside
      className="w-60 shrink-0 border-r flex flex-col min-h-screen"
      style={{
        borderColor: "#1E3152",
        backgroundColor: "#0B1F41",
      }}
    >
      {/* BRAND */}
      <div className="px-5 py-5">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{
              background: "var(--navy)",
              color: "white",
            }}
          >
            <ShieldCheck size={20} strokeWidth={2} />
          </div>

          <div>
            <h1
              className="text-base font-semibold leading-tight"
              style={{ color: "#FFFFFF" }}
            >
              GovFlow AI
            </h1>

            <p
              className="text-[11px] mt-0.5"
              style={{ color: "#94A3B8" }}
            >
              Workflow Intelligence
            </p>
          </div>
        </div>
      </div>

      {/* NAVIGATION */}
      <div className="flex-1 px-3">
        {/* WORKSPACE */}
        <p
          className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider"
          style={{ color: "var(--muted)" }}
        >
          Workspace
        </p>

        <nav className="space-y-1">
          {WORKSPACE_ITEMS.map(renderNavItem)}
        </nav>

        {/* MONITORING */}
        <p
          className="px-3 mt-7 mb-2 text-[11px] font-semibold uppercase tracking-wider"
          style={{ color: "var(--muted)" }}
        >
          Monitoring
        </p>

        <nav className="space-y-1">
          {MONITORING_ITEMS.map(renderNavItem)}
        </nav>
      </div>

      {/* BOTTOM */}
      <div className="px-3 pb-4 space-y-3">
        {/* SYSTEM STATUS */}
        <div
          className="flex items-center gap-2 px-3 py-2.5 rounded-md border"
          style={{
            borderColor: "var(--border)",
            background: "var(--bg)",
          }}
        >
          <CircleCheck
            size={16}
            style={{ color: "var(--success)" }}
          />

          <div>
            <p
              className="text-xs font-medium"
              style={{ color: "var(--text)" }}
            >
              All systems operational
            </p>

            <p
              className="text-[10px] mt-0.5"
              style={{ color: "var(--muted)" }}
            >
              GovFlow AI
            </p>
          </div>
        </div>

        {/* USER */}
        <div
          className="flex items-center justify-between px-3 py-2.5 rounded-md border"
          style={{
            borderColor: "var(--border)",
          }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
              style={{
                background: "#162F5C",
                color: "#FFFFFF",
              }}
            >
              <User size={16} />
            </div>

            <div className="min-w-0">
              <p
                className="text-xs font-medium truncate"
                style={{ color: "#FFFFFF" }}
              >
                Admin User
              </p>

              <p
                className="text-[10px] truncate"
                style={{ color: "#94A3B8" }}
              >
                Administrator
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            title="Logout"
            className="p-1.5 rounded-md transition-colors hover:bg-slate-100"
            style={{ color: "var(--muted)" }}
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
}
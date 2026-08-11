import Link from "next/link";

const NAV_ITEMS = [
  { href: "/", label: "Overview" },
  { href: "/cases", label: "Cases" },
  { href: "/resources", label: "Resources" },
];

export default function Sidebar() {
  return (
    <aside
      className="w-56 shrink-0 border-r px-4 py-6 flex flex-col justify-between min-h-screen"
      style={{ borderColor: "var(--border)" }}
    >
      <div>
        <h1 className="text-lg font-semibold px-2 mb-6" style={{ color: "var(--navy)" }}>
          GovFlow AI
        </h1>
        <nav className="space-y-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block px-2 py-1.5 rounded text-sm hover:bg-slate-100"
              style={{ color: "var(--text)" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="text-xs px-2 py-2 rounded border" style={{ borderColor: "var(--border)", color: "var(--muted)" }}>
        DEMO MODE
        <br />
        Synthetic Dataset
      </div>
    </aside>
  );
}

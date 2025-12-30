"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { useAuth } from "@/contexts/AuthContext";
import { ButtonOutline } from "@/components/ui/button";

const nav = [
  { href: "/", label: "Dashboard" },
  { href: "/board", label: "Board" },
  { href: "/table", label: "Table" },
  { href: "/calendar", label: "Calendar" },
  { href: "/companies", label: "Companies" },
  { href: "/team", label: "Team" },
  { href: "/settings", label: "Settings" },
  { href: "/notifications", label: "Notifications" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 border-r bg-slate-50 p-4 hidden md:flex md:flex-col">
        <div className="font-semibold">Supplement Tracker CRM</div>
        <div className="text-xs text-slate-600 mt-1">{user?.name} • {user?.role}</div>

        <nav className="mt-6 space-y-1">
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={clsx(
                "block px-3 py-2 rounded text-sm",
                path === n.href ? "bg-white border border-slate-200" : "hover:bg-white hover:border hover:border-slate-200"
              )}
            >
              {n.label}
            </Link>
          ))}
          {user?.role === "Admin" ? (
            <Link
              href="/qa"
              className={clsx(
                "block px-3 py-2 rounded text-sm",
                path === "/qa" ? "bg-white border border-slate-200" : "hover:bg-white hover:border hover:border-slate-200"
              )}
            >
              QA (Admin)
            </Link>
          ) : null}
        </nav>

        <div className="mt-auto pt-4">
          <ButtonOutline onClick={() => signOut()} className="w-full">Sign out</ButtonOutline>
        </div>
      </aside>

      <main className="flex-1">
        <div className="md:hidden border-b p-3 flex items-center justify-between">
          <div className="font-semibold text-sm">Supplement Tracker CRM</div>
          <button className="text-sm underline" onClick={() => signOut()}>Sign out</button>
        </div>
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}

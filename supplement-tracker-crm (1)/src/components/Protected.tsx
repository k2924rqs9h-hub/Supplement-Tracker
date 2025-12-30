"use client";

import { useAuth } from "@/contexts/AuthContext";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

export function Protected({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const path = usePathname();
  const sp = useSearchParams();

  useEffect(() => {
    if (!loading && !user) {
      const returnTo = `${path}${sp.toString() ? `?${sp.toString()}` : ""}`;
      router.replace(`/login?returnTo=${encodeURIComponent(returnTo)}`);
    }
  }, [loading, user, router, path, sp]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-sm text-slate-600">Checking session…</div>;
  if (!user) return null;

  return <>{children}</>;
}

export function AdminOnly({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!loading && user && user.role !== "Admin") router.replace("/not-authorized");
  }, [loading, user, router]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-sm text-slate-600">Checking permissions…</div>;
  if (!user || user.role !== "Admin") return null;
  return <>{children}</>;
}

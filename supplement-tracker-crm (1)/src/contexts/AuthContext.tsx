"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

type Role = "Admin" | "User";
export type AuthUser = { id: string; email: string; name: string; role: Role };

type AuthCtx = {
  user: AuthUser | null;
  accessToken: string | null;
  loading: boolean;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const sb = useMemo(() => supabaseBrowser(), []);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data } = await sb.auth.getSession();
    const session = data.session;
    setAccessToken(session?.access_token || null);

    if (!session?.user) {
      setUser(null);
      setLoading(false);
      return;
    }

    // Pull role/name from public.users table
    const { data: profile } = await sb
      .from("users")
      .select("id,email,name,role")
      .eq("id", session.user.id)
      .single();

    setUser((profile as any) || null);
    setLoading(false);
  }

  useEffect(() => {
    load();
    const { data: sub } = sb.auth.onAuthStateChange(() => {
      load();
    });
    return () => sub.subscription.unsubscribe();
  }, [sb]);

  async function signInWithPassword(email: string, password: string) {
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
    await load();
  }

  async function signOut() {
    await sb.auth.signOut();
    setUser(null);
    setAccessToken(null);
  }

  async function refreshProfile() {
    await load();
  }

  const value: AuthCtx = { user, accessToken, loading, signInWithPassword, signOut, refreshProfile };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used within AuthProvider");
  return v;
}

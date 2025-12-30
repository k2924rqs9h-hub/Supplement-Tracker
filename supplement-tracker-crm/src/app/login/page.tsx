"use client";

import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Button, ButtonOutline } from "@/components/ui/button";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function LoginPage() {
  const { user, loading, signInWithPassword } = useAuth();
  const router = useRouter();
  const sp = useSearchParams();
  const returnTo = sp.get("returnTo") || "/";
  const [email, setEmail] = useState("admin@demo.local");
  const [password, setPassword] = useState("password123!");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace(returnTo);
  }, [loading, user, router, returnTo]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await signInWithPassword(email, password);
      router.replace(returnTo);
    } catch (err: any) {
      setError(err?.message || "Sign-in failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md w-full border rounded-lg p-6">
        <h1 className="text-lg font-semibold">Sign in</h1>
        <p className="text-sm text-slate-600 mt-2">Use the seeded demo accounts or your own Supabase users.</p>

        <form onSubmit={onSubmit} className="mt-6 space-y-3">
          <div>
            <label className="text-xs text-slate-600">Email</label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
          </div>
          <div>
            <label className="text-xs text-slate-600">Password</label>
            <Input value={password} onChange={(e) => setPassword(e.target.value)} type="password" />
          </div>

          {error ? <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded p-2">{error}</div> : null}

          <Button className="w-full" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</Button>

          <div className="grid grid-cols-2 gap-2">
            <ButtonOutline type="button" onClick={() => { setEmail("admin@demo.local"); setPassword("password123!"); }}>
              Use Admin demo
            </ButtonOutline>
            <ButtonOutline type="button" onClick={() => { setEmail("estimator1@demo.local"); setPassword("password123!"); }}>
              Use Estimator demo
            </ButtonOutline>
          </div>
        </form>

        <div className="text-xs text-slate-500 mt-4">
          If demo sign-in fails, run the DB + seed steps in README.
        </div>
      </div>
    </div>
  );
}

"use client";

import { AuthedPage } from "@/components/AuthedPage";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button, ButtonOutline } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useMemo, useState } from "react";

type Check = { name: string; ok: boolean; detail: string };

export default function QAPage() {
  return (
    <AuthedPage>
      <QAInner />
    </AuthedPage>
  );
}

function QAInner() {
  const sb = useMemo(() => supabaseBrowser(), []);
  const { user } = useAuth();
  const [checks, setChecks] = useState<Check[]>([]);
  const [running, setRunning] = useState(false);

  if (user?.role !== "Admin") {
    return <div className="text-sm text-slate-600">Admin only.</div>;
  }

  async function run() {
    setRunning(true);
    const out: Check[] = [];

    // Env
    out.push({
      name: "Supabase env vars present",
      ok: !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      detail: "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set in .env.local.",
    });

    // Auth user
    const u = await sb.auth.getUser();
    out.push({
      name: "Authenticated session",
      ok: !!u.data.user,
      detail: u.data.user ? `Signed in as ${u.data.user.email}` : "No active session.",
    });

    // Tables reachable
    const t1 = await sb.from("jobs").select("id", { count: "exact", head: true });
    out.push({
      name: "DB reachable (jobs table)",
      ok: !t1.error,
      detail: t1.error ? String(t1.error.message) : `jobs count: ${t1.count ?? "unknown"}`,
    });

    const t2 = await sb.from("status_options").select("id", { count: "exact", head: true });
    out.push({
      name: "Statuses seeded",
      ok: !t2.error && (t2.count || 0) > 0,
      detail: t2.error ? String(t2.error.message) : `status_options count: ${t2.count ?? 0}`,
    });

    const t3 = await sb.from("tag_options").select("id", { count: "exact", head: true });
    out.push({
      name: "Tags seeded",
      ok: !t3.error && (t3.count || 0) > 0,
      detail: t3.error ? String(t3.error.message) : `tag_options count: ${t3.count ?? 0}`,
    });

    const t4 = await sb.from("companies").select("id", { count: "exact", head: true });
    out.push({
      name: "Companies seeded",
      ok: !t4.error && (t4.count || 0) > 0,
      detail: t4.error ? String(t4.error.message) : `companies count: ${t4.count ?? 0}`,
    });

    setChecks(out);
    setRunning(false);
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="text-xl font-semibold">QA Runner (Admin)</div>
        <div className="text-sm text-slate-600 mt-1">Automated checks + manual verification steps.</div>
      </div>

      <Card>
        <CardHeader title="Automated checks" description="Runs lightweight sanity checks against Supabase." right={
          <div className="flex gap-2">
            <Button onClick={run} disabled={running}>{running ? "Running…" : "Run checks"}</Button>
            <ButtonOutline onClick={()=>setChecks([])} disabled={running}>Clear</ButtonOutline>
          </div>
        } />
        <CardContent>
          {checks.length ? (
            <div className="divide-y">
              {checks.map((c) => (
                <div key={c.name} className="py-3">
                  <div className="text-sm font-medium">{c.ok ? "PASS" : "FAIL"} — {c.name}</div>
                  <div className="text-xs text-slate-600 mt-1">{c.detail}</div>
                </div>
              ))}
            </div>
          ) : <div className="text-sm text-slate-600">No results yet. Run checks.</div>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader title="Manual verification checklist" description="Use these steps to confirm end-to-end functionality." />
        <CardContent>
          <ol className="list-decimal pl-5 text-sm space-y-2">
            <li>Go to Board. Drag a job to a new column. Refresh the page: job should remain in the new column.</li>
            <li>Open a job. Change statuses + a field (claim #). Refresh: changes persist. Check Activity tab: JOB_UPDATED entry exists.</li>
            <li>Upload a PDF in Documents. Refresh: file remains listed. Preview should open. Download should work.</li>
            <li>Create a comment and @mention another user. Log in as the mentioned user and verify a notification appears.</li>
            <li>Open notification; it should deep-link to the job Comments tab and scroll/highlight the referenced comment.</li>
            <li>Settings: add a new tag, assign it on a job, and verify it appears on Board and Table.</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}

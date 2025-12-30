"use client";

import { AuthedPage } from "@/components/AuthedPage";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useBootstrap } from "@/contexts/BootstrapContext";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

type TaskRow = { id: string; job_id: string; title: string; due_date: string | null; priority: string; status: string };

export default function Dashboard() {
  return (
    <AuthedPage>
      <DashboardInner />
    </AuthedPage>
  );
}

function DashboardInner() {
  const sb = useMemo(() => supabaseBrowser(), []);
  const { user } = useAuth();
  const { statuses } = useBootstrap();
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [myTasks, setMyTasks] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: jobs, error: jErr } = await sb.from("jobs").select("internal_primary_status_id");
      if (jErr) console.error(jErr);
      const c: Record<string, number> = {};
      for (const row of jobs || []) c[row.internal_primary_status_id] = (c[row.internal_primary_status_id] || 0) + 1;
      setCounts(c);

      const { data: tasks, error: tErr } = await sb
        .from("tasks")
        .select("id,job_id,title,due_date,priority,status")
        .eq("assignee_id", user!.id)
        .neq("status", "Done")
        .order("due_date", { ascending: true, nullsFirst: false })
        .limit(20);

      if (tErr) console.error(tErr);
      setMyTasks((tasks || []) as any);
      setLoading(false);
    })();
  }, [sb, user]);

  const primaryStatuses = statuses.filter((s) => s.kind === "internal_primary" && s.is_active).sort((a,b)=>a.sort_order-b.sort_order);

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xl font-semibold">Dashboard</div>
        <div className="text-sm text-slate-600 mt-1">Operational overview and your work queue.</div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader title="Work by status" description="Count of jobs in each internal primary status." />
          <CardContent>
            {loading ? <div className="text-sm text-slate-600">Loading…</div> : (
              <div className="space-y-2">
                {primaryStatuses.map((s) => (
                  <div key={s.id} className="flex items-center justify-between text-sm">
                    <div>{s.name}</div>
                    <Badge tone="gray">{counts[s.id] || 0}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader title="My work queue" description="Open tasks assigned to you." />
          <CardContent>
            {loading ? <div className="text-sm text-slate-600">Loading…</div> : (
              myTasks.length ? (
                <div className="divide-y">
                  {myTasks.map((t) => (
                    <div key={t.id} className="py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{t.title}</div>
                        <div className="text-xs text-slate-600 mt-1">
                          Due: {t.due_date || "—"} • Priority: {t.priority} • Status: {t.status}
                        </div>
                      </div>
                      <Link className="text-sm underline" href={`/jobs/${t.job_id}`}>Open job</Link>
                    </div>
                  ))}
                </div>
              ) : <div className="text-sm text-slate-600">No open tasks assigned to you.</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

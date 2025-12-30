"use client";

import { AuthedPage } from "@/components/AuthedPage";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

type Row = { id: string; insured_name: string; date_supplement_sent: string | null; date_xactimate_built: string | null; date_file_created: string };

export default function CalendarPage() {
  return (
    <AuthedPage>
      <CalendarInner />
    </AuthedPage>
  );
}

function CalendarInner() {
  const sb = useMemo(() => supabaseBrowser(), []);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await sb
        .from("jobs")
        .select("id,insured_name,date_supplement_sent,date_xactimate_built,date_file_created")
        .order("date_file_created", { ascending: false })
        .limit(200);
      if (error) console.error(error);
      setRows((data || []) as any);
      setLoading(false);
    })();
  }, [sb]);

  return (
    <div className="space-y-4">
      <div>
        <div className="text-xl font-semibold">Calendar</div>
        <div className="text-sm text-slate-600 mt-1">Key dates (created, built, supplement sent). Calendar visualization can be added later.</div>
      </div>

      <Card>
        <CardHeader title="Upcoming / Recent milestones" description="Sorted by file created date." />
        <CardContent>
          {loading ? <div className="text-sm text-slate-600">Loading…</div> : (
            <div className="divide-y">
              {rows.map((r) => (
                <div key={r.id} className="py-3 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{r.insured_name}</div>
                    <div className="text-xs text-slate-600 mt-1">
                      Created: {r.date_file_created} • Xactimate Built: {r.date_xactimate_built || "—"} • Supplement Sent: {r.date_supplement_sent || "—"}
                    </div>
                  </div>
                  <Link href={`/jobs/${r.id}`} className="text-sm underline">Open</Link>
                </div>
              ))}
              {!rows.length ? <div className="text-sm text-slate-600">No jobs found.</div> : null}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

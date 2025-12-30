"use client";

import { AuthedPage } from "@/components/AuthedPage";
import { useBootstrap } from "@/contexts/BootstrapContext";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { Job } from "@/lib/types";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export default function TablePage() {
  return (
    <AuthedPage>
      <TableInner />
    </AuthedPage>
  );
}

function TableInner() {
  const sb = useMemo(() => supabaseBrowser(), []);
  const { statuses, tags } = useBootstrap();
  const [rows, setRows] = useState<Job[]>([]);
  const [jobTags, setJobTags] = useState<Record<string, string[]>>({});
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await sb.from("jobs").select("*").order("created_at", { ascending: false });
      if (error) console.error(error);

      const { data: mapData } = await sb.from("job_tag_map").select("job_id, tag_id");
      const m: Record<string, string[]> = {};
      for (const r of mapData || []) {
        m[r.job_id] = m[r.job_id] || [];
        m[r.job_id].push(r.tag_id);
      }
      setJobTags(m);
      setRows((data || []) as any);
      setLoading(false);
    })();
  }, [sb]);

  const primaryById = Object.fromEntries(statuses.filter(s=>s.kind==="internal_primary").map(s=>[s.id,s.name]));
  const filtered = rows.filter((r) => {
    if (!q.trim()) return true;
    const t = q.toLowerCase();
    return (
      r.insured_name.toLowerCase().includes(t) ||
      r.property_address.toLowerCase().includes(t) ||
      (r.claim_number || "").toLowerCase().includes(t)
    );
  });

  return (
    <div className="space-y-4">
      <div>
        <div className="text-xl font-semibold">Table</div>
        <div className="text-sm text-slate-600 mt-1">Search and open jobs.</div>
      </div>

      <div className="max-w-md">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by insured, address, or claim…" />
      </div>

      {loading ? <div className="text-sm text-slate-600">Loading…</div> : (
        <div className="border rounded-lg overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="text-left p-3 border-b">Insured</th>
                <th className="text-left p-3 border-b">Address</th>
                <th className="text-left p-3 border-b">Claim</th>
                <th className="text-left p-3 border-b">Status</th>
                <th className="text-left p-3 border-b">Tags</th>
                <th className="text-left p-3 border-b">Open</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="p-3 border-b">{r.insured_name}</td>
                  <td className="p-3 border-b">{r.property_address}</td>
                  <td className="p-3 border-b">{r.claim_number || "—"}</td>
                  <td className="p-3 border-b">
                    <Badge tone="gray">{primaryById[r.internal_primary_status_id] || "—"}</Badge>
                  </td>
                  <td className="p-3 border-b">
                    <div className="flex flex-wrap gap-1">
                      {(jobTags[r.id] || []).slice(0,4).map((tid) => {
                        const t = tags.find(x=>x.id===tid);
                        return <Badge key={tid} tone="blue">{t?.name || "Tag"}</Badge>;
                      })}
                    </div>
                  </td>
                  <td className="p-3 border-b"><Link className="underline" href={`/jobs/${r.id}`}>Open</Link></td>
                </tr>
              ))}
              {!filtered.length ? (
                <tr><td className="p-3 text-slate-600" colSpan={6}>No matching jobs.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

"use client";

import { AuthedPage } from "@/components/AuthedPage";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button, ButtonOutline } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useBootstrap } from "@/contexts/BootstrapContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export default function NewJobPage() {
  return (
    <AuthedPage>
      <NewJobInner />
    </AuthedPage>
  );
}

function NewJobInner() {
  const sb = useMemo(() => supabaseBrowser(), []);
  const { carriers, roofers, users, statuses } = useBootstrap();
  const { user } = useAuth();
  const router = useRouter();

  const primary = statuses.filter(s=>s.kind==="internal_primary" && s.is_active).sort((a,b)=>a.sort_order-b.sort_order);
  const customer = statuses.filter(s=>s.kind==="customer_status" && s.is_active).sort((a,b)=>a.sort_order-b.sort_order);

  const [form, setForm] = useState({
    insured_name: "",
    property_address: "",
    claim_number: "",
    carrier_company_id: "",
    roofing_company_id: "",
    assigned_estimator_id: user?.id || "",
    internal_primary_status_id: primary[0]?.id || "",
    customer_status_id: customer[0]?.id || "",
  });
  const [busy, setBusy] = useState(false);

  async function create() {
    if (!form.insured_name.trim() || !form.property_address.trim()) return;
    setBusy(true);
    const { data, error } = await sb.from("jobs").insert({
      insured_name: form.insured_name.trim(),
      property_address: form.property_address.trim(),
      claim_number: form.claim_number.trim() || null,
      carrier_company_id: form.carrier_company_id || null,
      roofing_company_id: form.roofing_company_id || null,
      assigned_estimator_id: form.assigned_estimator_id || null,
      internal_primary_status_id: form.internal_primary_status_id,
      customer_status_id: form.customer_status_id || null,
    }).select("id").single();
    if (error) {
      console.error(error);
      setBusy(false);
      return;
    }
    await sb.from("activity").insert({
      job_id: data!.id,
      actor_user_id: user!.id,
      type: "JOB_CREATED",
      metadata: {},
    });
    setBusy(false);
    router.push(`/jobs/${data!.id}`);
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="text-xl font-semibold">New Job</div>
        <div className="text-sm text-slate-600 mt-1">Create a new supplement file/job.</div>
      </div>

      <Card>
        <CardHeader title="Job info" description="Minimum required: Insured name and property address." />
        <CardContent>
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-600">Insured name *</label>
              <Input value={form.insured_name} onChange={(e)=>setForm((p)=>({ ...p, insured_name: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-slate-600">Property address *</label>
              <Input value={form.property_address} onChange={(e)=>setForm((p)=>({ ...p, property_address: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-slate-600">Claim #</label>
              <Input value={form.claim_number} onChange={(e)=>setForm((p)=>({ ...p, claim_number: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-slate-600">Carrier</label>
              <select className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                value={form.carrier_company_id}
                onChange={(e)=>setForm((p)=>({ ...p, carrier_company_id: e.target.value }))}
              >
                <option value="">—</option>
                {carriers.map((c:any)=> <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-600">Roofing company</label>
              <select className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                value={form.roofing_company_id}
                onChange={(e)=>setForm((p)=>({ ...p, roofing_company_id: e.target.value }))}
              >
                <option value="">—</option>
                {roofers.map((c:any)=> <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-600">Assigned estimator</label>
              <select className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                value={form.assigned_estimator_id}
                onChange={(e)=>setForm((p)=>({ ...p, assigned_estimator_id: e.target.value }))}
              >
                <option value="">—</option>
                {users.map((u:any)=> <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-600">Internal primary status</label>
              <select className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                value={form.internal_primary_status_id}
                onChange={(e)=>setForm((p)=>({ ...p, internal_primary_status_id: e.target.value }))}
              >
                {primary.map((s:any)=> <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-600">Customer status</label>
              <select className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                value={form.customer_status_id}
                onChange={(e)=>setForm((p)=>({ ...p, customer_status_id: e.target.value }))}
              >
                <option value="">—</option>
                {customer.map((s:any)=> <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <Button onClick={create} disabled={busy}>{busy ? "Creating…" : "Create job"}</Button>
            <ButtonOutline onClick={()=>router.back()} disabled={busy}>Cancel</ButtonOutline>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

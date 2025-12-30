"use client";

import { AuthedPage } from "@/components/AuthedPage";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button, ButtonOutline } from "@/components/ui/button";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useEffect, useMemo, useState } from "react";

type CompanyRow = { id: string; name: string; type: string; email: string | null; phone: string | null };

export default function CompaniesPage() {
  return (
    <AuthedPage>
      <CompaniesInner />
    </AuthedPage>
  );
}

function CompaniesInner() {
  const sb = useMemo(() => supabaseBrowser(), []);
  const [rows, setRows] = useState<CompanyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [type, setType] = useState<"Roofing Company" | "Carrier" | "Other">("Roofing Company");

  async function load() {
    setLoading(true);
    const { data, error } = await sb.from("companies").select("id,name,type,email,phone").order("name");
    if (error) console.error(error);
    setRows((data || []) as any);
    setLoading(false);
  }
  useEffect(() => { load(); }, [sb]);

  async function add() {
    if (!name.trim()) return;
    await sb.from("companies").insert({ name: name.trim(), type });
    setName("");
    await load();
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="text-xl font-semibold">Companies</div>
        <div className="text-sm text-slate-600 mt-1">Roofing companies (customers) and carriers.</div>
      </div>

      <Card>
        <CardHeader title="Add company" description="Creates a roofing company, carrier, or other entity." />
        <CardContent>
          <div className="grid md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-slate-600">Name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Company name" />
            </div>
            <div>
              <label className="text-xs text-slate-600">Type</label>
              <select className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                value={type}
                onChange={(e) => setType(e.target.value as any)}
              >
                <option value="Roofing Company">Roofing Company</option>
                <option value="Carrier">Carrier</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={add}>Add</Button>
              <ButtonOutline onClick={load}>Refresh</ButtonOutline>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader title="Directory" description="All companies in the system." />
        <CardContent>
          {loading ? <div className="text-sm text-slate-600">Loading…</div> : (
            <div className="border rounded-lg overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left p-3 border-b">Name</th>
                    <th className="text-left p-3 border-b">Type</th>
                    <th className="text-left p-3 border-b">Email</th>
                    <th className="text-left p-3 border-b">Phone</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="p-3 border-b">{r.name}</td>
                      <td className="p-3 border-b">{r.type}</td>
                      <td className="p-3 border-b">{r.email || "—"}</td>
                      <td className="p-3 border-b">{r.phone || "—"}</td>
                    </tr>
                  ))}
                  {!rows.length ? <tr><td className="p-3 text-slate-600" colSpan={4}>No companies found.</td></tr> : null}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

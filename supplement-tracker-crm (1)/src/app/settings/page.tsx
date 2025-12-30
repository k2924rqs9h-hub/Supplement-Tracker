"use client";

import { AuthedPage } from "@/components/AuthedPage";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button, ButtonOutline } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useBootstrap } from "@/contexts/BootstrapContext";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";

export default function SettingsPage() {
  return (
    <AuthedPage>
      <SettingsInner />
    </AuthedPage>
  );
}

function SettingsInner() {
  const sb = useMemo(() => supabaseBrowser(), []);
  const { user } = useAuth();
  const { tags, statuses, docCategories, refresh } = useBootstrap();
  const [newTag, setNewTag] = useState("");
  const [busy, setBusy] = useState(false);

  if (user?.role !== "Admin") {
    return (
      <div className="border rounded-lg p-6">
        <div className="font-semibold">Settings</div>
        <div className="text-sm text-slate-600 mt-2">Only Admin users can edit system settings.</div>
      </div>
    );
  }

  async function addTag() {
    if (!newTag.trim()) return;
    setBusy(true);
    await sb.from("tag_options").insert({ name: newTag.trim(), sort_order: tags.length });
    setNewTag("");
    await refresh();
    setBusy(false);
  }

  async function saveTag(tid: string, patch: any) {
    setBusy(true);
    await sb.from("tag_options").update(patch).eq("id", tid);
    await refresh();
    setBusy(false);
  }

  async function deleteTagWithMapping(tagId: string, replacementTagId: string) {
    if (tagId === replacementTagId) return;
    setBusy(true);
    // remap assignments
    const { data: rows } = await sb.from("job_tag_map").select("job_id, tag_id").eq("tag_id", tagId);
    if (rows?.length) {
      // insert replacements (upsert by PK)
      await sb.from("job_tag_map").upsert(rows.map((r) => ({ job_id: r.job_id, tag_id: replacementTagId })));
      // remove old tag mappings
      await sb.from("job_tag_map").delete().eq("tag_id", tagId);
    }
    // delete tag option
    await sb.from("tag_options").delete().eq("id", tagId);
    await refresh();
    setBusy(false);
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xl font-semibold">Settings</div>
        <div className="text-sm text-slate-600 mt-1">Admin-only system configuration (tags, statuses, document categories).</div>
      </div>

      <Card>
        <CardHeader title="Tags" description="Used for quick context on jobs. Tags display on Board/Table/Job." />
        <CardContent>
          <div className="flex gap-2 max-w-md">
            <Input value={newTag} onChange={(e) => setNewTag(e.target.value)} placeholder="New tag name" />
            <Button onClick={addTag} disabled={busy}>Add</Button>
            <ButtonOutline onClick={refresh} disabled={busy}>Refresh</ButtonOutline>
          </div>

          <div className="mt-4 border rounded-lg overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left p-3 border-b">Name</th>
                  <th className="text-left p-3 border-b">Sort</th>
                  <th className="text-left p-3 border-b">Active</th>
                  <th className="text-left p-3 border-b">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tags.map((t) => (
                  <TagRow key={t.id} tag={t} allTags={tags} onSave={saveTag} onDeleteMap={deleteTagWithMapping} busy={busy} />
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader title="Statuses" description="These drive the workflow. Managed via status_options table." right={<Badge tone="amber">Editable in DB</Badge>} />
        <CardContent>
          <div className="text-sm text-slate-600">
            Status options are seeded and can be edited in Supabase (status_options). If you want full CRUD UI for statuses, say so and I’ll add it.
          </div>

          <div className="mt-3 text-sm">
            <div className="font-medium">Internal Primary</div>
            <div className="flex flex-wrap gap-2 mt-2">
              {statuses.filter(s=>s.kind==="internal_primary" && s.is_active).map((s)=> <Badge key={s.id} tone="gray">{s.name}</Badge>)}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader title="Document Categories" description="Categories for uploaded files." right={<Badge tone="amber">Editable in DB</Badge>} />
        <CardContent>
          <div className="text-sm text-slate-600">
            Document categories are stored in document_categories. CRUD UI can be added; currently managed via Supabase table.
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            {docCategories.filter(c=>c.is_active).map((c)=> <Badge key={c.id} tone="gray">{c.name}</Badge>)}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function TagRow({ tag, allTags, onSave, onDeleteMap, busy }: any) {
  const [name, setName] = useState(tag.name);
  const [sort, setSort] = useState(String(tag.sort_order));
  const [active, setActive] = useState(!!tag.is_active);
  const [mode, setMode] = useState<"idle"|"mapdel">("idle");
  const [replacement, setReplacement] = useState(allTags.find((t:any)=>t.id!==tag.id)?.id || "");

  return (
    <tr className="hover:bg-slate-50">
      <td className="p-3 border-b">
        <Input value={name} onChange={(e)=>setName(e.target.value)} />
      </td>
      <td className="p-3 border-b w-28">
        <Input value={sort} onChange={(e)=>setSort(e.target.value)} />
      </td>
      <td className="p-3 border-b w-28">
        <label className="inline-flex items-center gap-2 text-sm">
          <input type="checkbox" checked={active} onChange={(e)=>setActive(e.target.checked)} />
          Active
        </label>
      </td>
      <td className="p-3 border-b">
        <div className="flex flex-wrap gap-2">
          <ButtonOutline disabled={busy} onClick={() => onSave(tag.id, { name, sort_order: Number(sort)||0, is_active: active })}>Save</ButtonOutline>
          <ButtonOutline disabled={busy} onClick={() => onSave(tag.id, { is_active: false })}>Deactivate</ButtonOutline>
          <ButtonOutline disabled={busy} onClick={() => setMode(mode==="idle" ? "mapdel" : "idle")}>
            Delete w/ mapping
          </ButtonOutline>
        </div>

        {mode==="mapdel" ? (
          <div className="mt-2 border rounded p-2 bg-white">
            <div className="text-xs text-slate-600">Choose a replacement tag. Existing assignments will be remapped, then this tag will be deleted.</div>
            <div className="flex items-center gap-2 mt-2">
              <select className="rounded border border-slate-300 px-2 py-2 text-sm"
                value={replacement}
                onChange={(e)=>setReplacement(e.target.value)}
              >
                {allTags.filter((t:any)=>t.id!==tag.id).map((t:any)=> <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <Button disabled={busy} onClick={() => onDeleteMap(tag.id, replacement)}>Confirm delete</Button>
            </div>
          </div>
        ) : null}
      </td>
    </tr>
  );
}

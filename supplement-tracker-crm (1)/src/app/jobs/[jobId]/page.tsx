"use client";

import { AuthedPage } from "@/components/AuthedPage";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button, ButtonOutline } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useBootstrap } from "@/contexts/BootstrapContext";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { Job } from "@/lib/types";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { v4 as uuidv4 } from "uuid";

type CommentRow = { id: string; job_id: string; author_id: string; body: string; created_at: string; updated_at: string; is_edited: boolean };
type MentionRow = { comment_id: string; mentioned_user_id: string };
type DocRow = { id: string; category_id: string | null; display_name: string; original_file_name: string; mime_type: string; file_size: number; storage_path: string; upload_date: string; uploaded_by_user_id: string };
type ActivityRow = { id: string; type: string; metadata: any; created_at: string; actor_user_id: string };
type WorksheetRow = { id: string; category: string; description: string; amount: number; notes: string | null; sort_order: number };

export default function JobDetailPage() {
  return (
    <AuthedPage>
      <JobDetailInner />
    </AuthedPage>
  );
}

function JobDetailInner() {
  const { jobId } = useParams<{ jobId: string }>();
  const sp = useSearchParams();
  const initialTab = (sp.get("tab") || "overview") as any;

  const sb = useMemo(() => supabaseBrowser(), []);
  const { user } = useAuth();
  const { carriers, roofers, users, statuses, tags, docCategories, refresh } = useBootstrap();

  const [job, setJob] = useState<Job | null>(null);
  const [jobTags, setJobTags] = useState<string[]>([]);
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [mentions, setMentions] = useState<MentionRow[]>([]);
  const [documents, setDocuments] = useState<DocRow[]>([]);
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [worksheet, setWorksheet] = useState<WorksheetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"overview"|"documents"|"comments"|"financial"|"activity">(initialTab);

  const highlightCommentId = sp.get("commentId");

  async function loadAll() {
    setLoading(true);
    const j = await sb.from("jobs").select("*").eq("id", jobId).single();
    if (j.error) console.error(j.error);
    setJob((j.data || null) as any);

    const jt = await sb.from("job_tag_map").select("tag_id").eq("job_id", jobId);
    setJobTags((jt.data || []).map((x:any) => x.tag_id));

    const c = await sb.from("comments").select("*").eq("job_id", jobId).order("created_at", { ascending: true });
    setComments((c.data || []) as any);

    const m = await sb.from("comment_mentions").select("comment_id,mentioned_user_id").in("comment_id", (c.data || []).map((x:any)=>x.id));
    setMentions((m.data || []) as any);

    const d = await sb.from("documents").select("*").eq("job_id", jobId).order("upload_date", { ascending: false });
    setDocuments((d.data || []) as any);

    const a = await sb.from("activity").select("*").eq("job_id", jobId).order("created_at", { ascending: false }).limit(200);
    setActivity((a.data || []) as any);

    const w = await sb.from("financial_worksheet_rows").select("*").eq("job_id", jobId).order("sort_order", { ascending: true });
    setWorksheet((w.data || []) as any);

    setLoading(false);
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  useEffect(() => {
    const t = sp.get("tab");
    if (t === "comments" || t === "documents" || t === "financial" || t === "activity" || t === "overview") {
      setTab(t);
    }
  }, [sp]);

  const primaryStatuses = statuses.filter(s=>s.kind==="internal_primary" && s.is_active).sort((a,b)=>a.sort_order-b.sort_order);
  const subStatuses = statuses.filter(s=>s.kind==="internal_sub" && s.is_active).sort((a,b)=>a.sort_order-b.sort_order);
  const customerStatuses = statuses.filter(s=>s.kind==="customer_status" && s.is_active).sort((a,b)=>a.sort_order-b.sort_order);

  const carrierName = carriers.find((c)=>c.id===job?.carrier_company_id)?.name || "—";
  const rooferName = roofers.find((c)=>c.id===job?.roofing_company_id)?.name || "—";
  const estimatorName = users.find((u)=>u.id===job?.assigned_estimator_id)?.name || "—";
  const primaryName = primaryStatuses.find(s=>s.id===job?.internal_primary_status_id)?.name || "—";

  async function saveJob(patch: Partial<Job>) {
    if (!job) return;
    const next = { ...job, ...patch };
    setJob(next as any);
    const { error } = await sb.from("jobs").update({ ...patch, last_updated: new Date().toISOString() }).eq("id", job.id);
    if (error) {
      console.error(error);
      await loadAll();
      return;
    }
    await sb.from("activity").insert({
      job_id: job.id,
      actor_user_id: user!.id,
      type: "JOB_UPDATED",
      metadata: patch,
    });
  }

  async function toggleTag(tagId: string) {
    const has = jobTags.includes(tagId);
    if (has) {
      await sb.from("job_tag_map").delete().eq("job_id", jobId).eq("tag_id", tagId);
    } else {
      await sb.from("job_tag_map").insert({ job_id: jobId, tag_id: tagId });
    }
    await loadAll();
  }

  if (loading) return <div className="text-sm text-slate-600">Loading job…</div>;
  if (!job) return <div className="text-sm text-rose-700">Job not found.</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-xl font-semibold truncate">{job.insured_name}</div>
          <div className="text-sm text-slate-600 mt-1 truncate">{job.property_address}</div>
          <div className="text-xs text-slate-600 mt-1">Claim: {job.claim_number || "—"} • Internal Status: <Badge tone="gray">{primaryName}</Badge></div>
        </div>
        <div className="flex gap-2">
          <ButtonOutline onClick={() => loadAll()}>Refresh</ButtonOutline>
          <Link className="text-sm underline self-center" href="/board">Back to Board</Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <TabButton active={tab==="overview"} onClick={()=>setTab("overview")}>Overview</TabButton>
        <TabButton active={tab==="documents"} onClick={()=>setTab("documents")}>Documents</TabButton>
        <TabButton active={tab==="comments"} onClick={()=>setTab("comments")}>Comments</TabButton>
        <TabButton active={tab==="financial"} onClick={()=>setTab("financial")}>Financial</TabButton>
        <TabButton active={tab==="activity"} onClick={()=>setTab("activity")}>Activity</TabButton>
      </div>

      {tab === "overview" ? (
        <OverviewTab
          job={job}
          carrierName={carrierName}
          rooferName={rooferName}
          estimatorName={estimatorName}
          primaryStatuses={primaryStatuses}
          subStatuses={subStatuses}
          customerStatuses={customerStatuses}
          carriers={carriers}
          roofers={roofers}
          users={users}
          tags={tags.filter(t=>t.is_active)}
          jobTags={jobTags}
          onSave={saveJob}
          onToggleTag={toggleTag}
        />
      ) : null}

      {tab === "documents" ? (
        <DocumentsTab jobId={jobId} documents={documents} docCategories={docCategories.filter(c=>c.is_active)} onChanged={loadAll} />
      ) : null}

      {tab === "comments" ? (
        <CommentsTab
          jobId={jobId}
          comments={comments}
          mentions={mentions}
          users={users}
          highlightCommentId={highlightCommentId}
          onChanged={loadAll}
        />
      ) : null}

      {tab === "financial" ? (
        <FinancialTab jobId={jobId} job={job} worksheet={worksheet} onChanged={loadAll} onSaveJob={saveJob} />
      ) : null}

      {tab === "activity" ? (
        <ActivityTab activity={activity} users={users} />
      ) : null}
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      className={active ? "px-3 py-2 text-sm rounded border bg-slate-900 text-white border-slate-900" : "px-3 py-2 text-sm rounded border bg-white hover:bg-slate-50 border-slate-300"}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function OverviewTab({ job, carrierName, rooferName, estimatorName, primaryStatuses, subStatuses, customerStatuses, carriers, roofers, users, tags, jobTags, onSave, onToggleTag }: any) {
  return (
    <div className="grid md:grid-cols-3 gap-4">
      <Card className="md:col-span-2">
        <CardHeader title="Job details" description="Policyholder, carrier, roofer, adjuster, and statuses (persisted)." />
        <CardContent>
          <div className="grid md:grid-cols-2 gap-3">
            <Field label="Insured name" value={job.insured_name} onChange={(v)=>onSave({ insured_name: v })} />
            <Field label="Property address" value={job.property_address} onChange={(v)=>onSave({ property_address: v })} />
            <Field label="Claim #" value={job.claim_number || ""} onChange={(v)=>onSave({ claim_number: v || null })} />
            <div>
              <label className="text-xs text-slate-600">Carrier</label>
              <select className="w-full rounded border border-slate-300 px-3 py-2 text-sm" value={job.carrier_company_id || ""} onChange={(e)=>onSave({ carrier_company_id: e.target.value || null })}>
                <option value="">—</option>
                {carriers.map((c:any)=> <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-600">Roofing company (customer)</label>
              <select className="w-full rounded border border-slate-300 px-3 py-2 text-sm" value={job.roofing_company_id || ""} onChange={(e)=>onSave({ roofing_company_id: e.target.value || null })}>
                <option value="">—</option>
                {roofers.map((c:any)=> <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-600">Assigned estimator</label>
              <select className="w-full rounded border border-slate-300 px-3 py-2 text-sm" value={job.assigned_estimator_id || ""} onChange={(e)=>onSave({ assigned_estimator_id: e.target.value || null })}>
                <option value="">—</option>
                {users.map((u:any)=> <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-600">Internal primary status</label>
              <select className="w-full rounded border border-slate-300 px-3 py-2 text-sm" value={job.internal_primary_status_id} onChange={(e)=>onSave({ internal_primary_status_id: e.target.value })}>
                {primaryStatuses.map((s:any)=> <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-600">Internal sub status</label>
              <select className="w-full rounded border border-slate-300 px-3 py-2 text-sm" value={job.internal_sub_status_id || ""} onChange={(e)=>onSave({ internal_sub_status_id: e.target.value || null })}>
                <option value="">—</option>
                {subStatuses.map((s:any)=> <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-600">Customer-facing status</label>
              <select className="w-full rounded border border-slate-300 px-3 py-2 text-sm" value={job.customer_status_id || ""} onChange={(e)=>onSave({ customer_status_id: e.target.value || null })}>
                <option value="">—</option>
                {customerStatuses.map((s:any)=> <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            <Field label="Adjuster name" value={job.adjuster_name || ""} onChange={(v)=>onSave({ adjuster_name: v || null })} />
            <Field label="Adjuster email" value={job.adjuster_email || ""} onChange={(v)=>onSave({ adjuster_email: v || null })} />
            <Field label="Adjuster phone" value={job.adjuster_phone || ""} onChange={(v)=>onSave({ adjuster_phone: v || null })} />
            <Field label="Date file created" type="date" value={job.date_file_created} onChange={(v)=>onSave({ date_file_created: v })} />
            <Field label="Date Xactimate built" type="date" value={job.date_xactimate_built || ""} onChange={(v)=>onSave({ date_xactimate_built: v || null })} />
            <Field label="Date supplement sent" type="date" value={job.date_supplement_sent || ""} onChange={(v)=>onSave({ date_supplement_sent: v || null })} />
          </div>

          <div className="mt-4">
            <label className="text-xs text-slate-600">Adjuster notes</label>
            <textarea className="w-full rounded border border-slate-300 px-3 py-2 text-sm min-h-[120px]" value={job.adjuster_notes || ""} onChange={(e)=>onSave({ adjuster_notes: e.target.value || null })} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader title="Tags" description="Click to add/remove tags (persisted)." />
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {tags.map((t:any)=> {
              const active = jobTags.includes(t.id);
              return (
                <button key={t.id} onClick={()=>onToggleTag(t.id)} className={active ? "px-2 py-1 text-xs rounded border bg-slate-900 text-white border-slate-900" : "px-2 py-1 text-xs rounded border bg-white border-slate-300 hover:bg-slate-50"}>
                  {t.name}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, value, onChange, type="text" }: { label: string; value: string; onChange: (v:string)=>void; type?: string }) {
  return (
    <div>
      <label className="text-xs text-slate-600">{label}</label>
      <Input value={value} onChange={(e)=>onChange(e.target.value)} type={type} />
    </div>
  );
}

function DocumentsTab({ jobId, documents, docCategories, onChanged }: any) {
  const sb = useMemo(() => supabaseBrowser(), []);
  const [busy, setBusy] = useState(false);
  const [categoryId, setCategoryId] = useState<string>(docCategories[0]?.id || "");
  const [rename, setRename] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<{ docId: string; url: string; mime: string; name: string } | null>(null);

  async function upload(file: File) {
    setBusy(true);
    try {
      const path = `${jobId}/${uuidv4()}-${file.name}`;
      const up = await sb.storage.from("job-documents").upload(path, file, { upsert: false });
      if (up.error) throw up.error;

      const user = (await sb.auth.getUser()).data.user;
      await sb.from("documents").insert({
        job_id: jobId,
        category_id: categoryId || null,
        original_file_name: file.name,
        display_name: file.name,
        mime_type: file.type || "application/octet-stream",
        file_size: file.size,
        storage_path: path,
        uploaded_by_user_id: user?.id,
      });

      await onChanged();
    } finally {
      setBusy(false);
    }
  }

  async function openPreview(d: any) {
    const { data, error } = await sb.storage.from("job-documents").createSignedUrl(d.storage_path, 3600);
    if (error || !data?.signedUrl) {
      console.error(error);
      return;
    }
    setPreview({ docId: d.id, url: data.signedUrl, mime: d.mime_type, name: d.display_name });
  }

  async function downloadDoc(d: any) {
    const { data, error } = await sb.storage.from("job-documents").createSignedUrl(d.storage_path, 60);
    if (error || !data?.signedUrl) throw error;
    const r = await fetch(data.signedUrl);
    const blob = await r.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = d.display_name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function renameDoc(d: any) {
    const nextName = (rename[d.id] || "").trim();
    if (!nextName) return;
    await sb.from("documents").update({ display_name: nextName, updated_at: new Date().toISOString() }).eq("id", d.id);
    setRename((p:any)=> ({ ...p, [d.id]: "" }));
    await onChanged();
  }

  return (
    <div className="grid md:grid-cols-3 gap-4">
      <Card className="md:col-span-1">
        <CardHeader title="Upload document" description="Uploads to Supabase Storage + saves metadata." />
        <CardContent>
          <div>
            <label className="text-xs text-slate-600">Category</label>
            <select className="w-full rounded border border-slate-300 px-3 py-2 text-sm" value={categoryId} onChange={(e)=>setCategoryId(e.target.value)}>
              {docCategories.map((c:any)=> <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div className="mt-3">
            <input
              type="file"
              disabled={busy}
              onChange={(e)=> {
                const f = e.target.files?.[0];
                if (f) upload(f);
                e.currentTarget.value = "";
              }}
            />
            <div className="text-xs text-slate-600 mt-2">PDFs and images preview inline. Others download-only.</div>
          </div>
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader title="Documents" description="Rename, preview, and download. Refresh persistence verified by reloading the page." />
        <CardContent>
          <div className="divide-y">
            {documents.map((d:any)=> (
              <div key={d.id} className="py-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{d.display_name}</div>
                  <div className="text-xs text-slate-600 mt-1">
                    {d.mime_type} • {(d.file_size/1024).toFixed(1)} KB • {new Date(d.upload_date).toLocaleString()}
                  </div>
                </div>
                <div className="flex flex-col gap-2 items-end">
                  <div className="flex gap-2">
                    <ButtonOutline onClick={()=>openPreview(d)}>Preview</ButtonOutline>
                    <ButtonOutline onClick={()=>downloadDoc(d)}>Download</ButtonOutline>
                  </div>
                  <div className="flex gap-2">
                    <Input className="w-48" value={rename[d.id] || ""} placeholder="New filename" onChange={(e)=>setRename((p:any)=>({ ...p, [d.id]: e.target.value }))} />
                    <ButtonOutline onClick={()=>renameDoc(d)}>Rename</ButtonOutline>
                  </div>
                </div>
              </div>
            ))}
            {!documents.length ? <div className="text-sm text-slate-600 py-3">No documents uploaded yet.</div> : null}
          </div>
        </CardContent>
      </Card>

      {preview ? (
        <Card className="md:col-span-3">
          <CardHeader title={`Preview: ${preview.name}`} description="Signed URL preview (expires). Close and reopen if expired." right={<ButtonOutline onClick={()=>setPreview(null)}>Close</ButtonOutline>} />
          <CardContent>
            {preview.mime.includes("pdf") ? (
              <iframe src={preview.url} className="w-full h-[70vh] border rounded" />
            ) : preview.mime.startsWith("image/") ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview.url} alt={preview.name} className="max-w-full border rounded" />
            ) : (
              <div className="text-sm text-slate-600">Preview not available for this file type. Use Download.</div>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function CommentsTab({ jobId, comments, mentions, users, highlightCommentId, onChanged }: any) {
  const sb = useMemo(() => supabaseBrowser(), []);
  const { user } = useAuth();
  const [body, setBody] = useState("");
  const [mentionIds, setMentionIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const commentRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (highlightCommentId) {
      const el = commentRefs.current[highlightCommentId];
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [highlightCommentId, comments.length]);

  async function submit() {
    if (!body.trim()) return;
    setBusy(true);
    try {
      const { data: c, error } = await sb.from("comments").insert({
        job_id: jobId,
        author_id: user!.id,
        body: body.trim(),
      }).select("*").single();
      if (error) throw error;

      if (mentionIds.length) {
        await sb.from("comment_mentions").insert(mentionIds.map((uid)=>({ comment_id: c!.id, mentioned_user_id: uid })));
        // dedup handled by unique index
        await sb.from("notifications").upsert(mentionIds.map((uid)=>({
          recipient_user_id: uid,
          job_id: jobId,
          comment_id: c!.id,
          type: "mention",
          is_read: false,
        })));
      }

      await sb.from("activity").insert({
        job_id: jobId,
        actor_user_id: user!.id,
        type: "COMMENT_CREATED",
        metadata: { commentId: c!.id, mentionUserIds: mentionIds },
      });

      setBody("");
      setMentionIds([]);
      await onChanged();
    } finally {
      setBusy(false);
    }
  }

  async function editComment(id: string, nextBody: string) {
    await sb.from("comments").update({ body: nextBody, is_edited: true, updated_at: new Date().toISOString() }).eq("id", id).eq("author_id", user!.id);
    await onChanged();
  }

  const mentionsByComment: Record<string, string[]> = {};
  for (const m of mentions) {
    mentionsByComment[m.comment_id] = mentionsByComment[m.comment_id] || [];
    mentionsByComment[m.comment_id].push(m.mentioned_user_id);
  }

  return (
    <div className="grid md:grid-cols-3 gap-4">
      <Card className="md:col-span-1">
        <CardHeader title="New comment" description="Add notes, @mention coworkers (creates notifications), persists after refresh." />
        <CardContent>
          <textarea className="w-full rounded border border-slate-300 px-3 py-2 text-sm min-h-[140px]" value={body} onChange={(e)=>setBody(e.target.value)} placeholder="Write a comment…" />
          <div className="mt-3">
            <label className="text-xs text-slate-600">Mentions</label>
            <div className="flex flex-wrap gap-2 mt-2">
              {users.map((u:any)=> {
                const on = mentionIds.includes(u.id);
                return (
                  <button key={u.id} type="button" className={on ? "px-2 py-1 text-xs rounded border bg-slate-900 text-white border-slate-900" : "px-2 py-1 text-xs rounded border bg-white border-slate-300 hover:bg-slate-50"}
                    onClick={()=> setMentionIds((prev:any)=> on ? prev.filter((x:any)=>x!==u.id) : [...prev, u.id])}
                  >
                    @{u.name}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="mt-4">
            <Button onClick={submit} disabled={busy}>{busy ? "Posting…" : "Post comment"}</Button>
          </div>
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader title="Thread" description="All comments for this job." />
        <CardContent>
          <div className="space-y-3">
            {comments.map((c:any)=> (
              <CommentItem
                key={c.id}
                refCb={(el:any)=> { commentRefs.current[c.id] = el; }}
                comment={c}
                authorName={users.find((u:any)=>u.id===c.author_id)?.name || "Unknown"}
                mentionNames={(mentionsByComment[c.id] || []).map((uid)=> users.find((u:any)=>u.id===uid)?.name || "User")}
                canEdit={c.author_id === user!.id}
                highlight={highlightCommentId === c.id}
                onEdit={editComment}
              />
            ))}
            {!comments.length ? <div className="text-sm text-slate-600">No comments yet.</div> : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function CommentItem({ comment, authorName, mentionNames, canEdit, highlight, onEdit, refCb }: any) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(comment.body);
  useEffect(()=> setVal(comment.body), [comment.body]);

  return (
    <div ref={refCb} className={highlight ? "border rounded-lg p-3 bg-amber-50 border-amber-200" : "border rounded-lg p-3"}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-medium">{authorName}</div>
          <div className="text-xs text-slate-600 mt-1">
            {new Date(comment.created_at).toLocaleString()}
            {comment.is_edited ? " (edited)" : ""}
          </div>
          {mentionNames.length ? (
            <div className="mt-2 flex flex-wrap gap-1">
              {mentionNames.map((n:string)=> <Badge key={n} tone="blue">@{n}</Badge>)}
            </div>
          ) : null}
        </div>
        {canEdit ? (
          <ButtonOutline onClick={()=> setEditing((p:boolean)=>!p)}>{editing ? "Cancel" : "Edit"}</ButtonOutline>
        ) : null}
      </div>

      {editing ? (
        <div className="mt-3 space-y-2">
          <textarea className="w-full rounded border border-slate-300 px-3 py-2 text-sm min-h-[90px]" value={val} onChange={(e)=>setVal(e.target.value)} />
          <div className="flex gap-2">
            <Button onClick={()=> { onEdit(comment.id, val); setEditing(false);} }>Save</Button>
            <ButtonOutline onClick={()=> { setVal(comment.body); setEditing(false);} }>Cancel</ButtonOutline>
          </div>
        </div>
      ) : (
        <div className="mt-3 text-sm whitespace-pre-wrap">{comment.body}</div>
      )}
    </div>
  );
}

function FinancialTab({ jobId, job, worksheet, onChanged, onSaveJob }: any) {
  const sb = useMemo(() => supabaseBrowser(), []);
  const [newRow, setNewRow] = useState({ category: "Labor", description: "", amount: "0", notes: "" });
  const [busy, setBusy] = useState(false);

  async function addRow() {
    if (!newRow.description.trim()) return;
    setBusy(true);
    await sb.from("financial_worksheet_rows").insert({
      job_id: jobId,
      category: newRow.category,
      description: newRow.description.trim(),
      amount: Number(newRow.amount) || 0,
      notes: newRow.notes.trim() || null,
      sort_order: worksheet.length,
    });
    setNewRow({ category: "Labor", description: "", amount: "0", notes: "" });
    await onChanged();
    setBusy(false);
  }

  async function updateRow(id: string, patch: any) {
    setBusy(true);
    await sb.from("financial_worksheet_rows").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", id);
    await onChanged();
    setBusy(false);
  }

  async function deleteRow(id: string) {
    setBusy(true);
    await sb.from("financial_worksheet_rows").delete().eq("id", id);
    await onChanged();
    setBusy(false);
  }

  const total = worksheet.reduce((sum:number, r:any)=> sum + (Number(r.amount)||0), 0);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="Job totals" description="Top-level financial fields stored on the job record." />
        <CardContent>
          <div className="grid md:grid-cols-3 gap-3">
            <Field label="Initial RCV" value={String(job.initial_rcv ?? "")} onChange={(v)=>onSaveJob({ initial_rcv: v ? Number(v) : null })} />
            <Field label="Requested RCV" value={String(job.requested_rcv ?? "")} onChange={(v)=>onSaveJob({ requested_rcv: v ? Number(v) : null })} />
            <Field label="Final Approved RCV" value={String(job.final_approved_rcv ?? "")} onChange={(v)=>onSaveJob({ final_approved_rcv: v ? Number(v) : null })} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader title="Financial worksheet" description={`Line items. Current worksheet total: $${total.toFixed(2)}`} />
        <CardContent>
          <div className="grid md:grid-cols-4 gap-2">
            <select className="rounded border border-slate-300 px-3 py-2 text-sm" value={newRow.category} onChange={(e)=>setNewRow((p)=>({ ...p, category: e.target.value }))}>
              {["Labor","Material","Equipment","Subcontractor","Permit","Overhead","Other"].map((c)=> <option key={c} value={c}>{c}</option>)}
            </select>
            <Input value={newRow.description} onChange={(e)=>setNewRow((p)=>({ ...p, description: e.target.value }))} placeholder="Description" />
            <Input value={newRow.amount} onChange={(e)=>setNewRow((p)=>({ ...p, amount: e.target.value }))} placeholder="Amount" />
            <div className="flex gap-2">
              <Button onClick={addRow} disabled={busy}>Add</Button>
              <ButtonOutline onClick={onChanged} disabled={busy}>Refresh</ButtonOutline>
            </div>
          </div>

          <div className="mt-3 border rounded-lg overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left p-3 border-b">Category</th>
                  <th className="text-left p-3 border-b">Description</th>
                  <th className="text-left p-3 border-b">Amount</th>
                  <th className="text-left p-3 border-b">Notes</th>
                  <th className="text-left p-3 border-b">Actions</th>
                </tr>
              </thead>
              <tbody>
                {worksheet.map((r:any)=> (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="p-3 border-b">{r.category}</td>
                    <td className="p-3 border-b">
                      <Input value={r.description} onChange={(e)=>updateRow(r.id, { description: e.target.value })} />
                    </td>
                    <td className="p-3 border-b w-40">
                      <Input value={String(r.amount)} onChange={(e)=>updateRow(r.id, { amount: Number(e.target.value) || 0 })} />
                    </td>
                    <td className="p-3 border-b">
                      <Input value={r.notes || ""} onChange={(e)=>updateRow(r.id, { notes: e.target.value || null })} />
                    </td>
                    <td className="p-3 border-b w-32">
                      <ButtonOutline onClick={()=>deleteRow(r.id)} disabled={busy}>Delete</ButtonOutline>
                    </td>
                  </tr>
                ))}
                {!worksheet.length ? <tr><td className="p-3 text-slate-600" colSpan={5}>No worksheet rows.</td></tr> : null}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ActivityTab({ activity, users }: any) {
  const nameById = Object.fromEntries(users.map((u:any)=>[u.id,u.name]));
  return (
    <Card>
      <CardHeader title="Activity log" description="Status changes, updates, and comment creation." />
      <CardContent>
        <div className="divide-y">
          {activity.map((a:any)=> (
            <div key={a.id} className="py-3">
              <div className="text-sm font-medium">{a.type}</div>
              <div className="text-xs text-slate-600 mt-1">{new Date(a.created_at).toLocaleString()} • {nameById[a.actor_user_id] || "Unknown"}</div>
              <pre className="text-xs bg-slate-50 border rounded p-2 mt-2 overflow-auto">{JSON.stringify(a.metadata, null, 2)}</pre>
            </div>
          ))}
          {!activity.length ? <div className="text-sm text-slate-600 py-3">No activity yet.</div> : null}
        </div>
      </CardContent>
    </Card>
  );
}

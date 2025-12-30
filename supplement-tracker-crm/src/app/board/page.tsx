"use client";

import { AuthedPage } from "@/components/AuthedPage";
import { useBootstrap } from "@/contexts/BootstrapContext";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useEffect, useMemo, useState } from "react";
import type { Job } from "@/lib/types";
import { DndContext, DragEndEvent, DragOverlay, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Card } from "@/components/ui/card";

type JobWithTags = Job & { tags: { id: string; name: string }[] };

export default function BoardPage() {
  return (
    <AuthedPage>
      <BoardInner />
    </AuthedPage>
  );
}

function BoardInner() {
  const sb = useMemo(() => supabaseBrowser(), []);
  const { statuses, tags } = useBootstrap();
  const primary = statuses.filter((s) => s.kind === "internal_primary" && s.is_active).sort((a,b)=>a.sort_order-b.sort_order);

  const [jobs, setJobs] = useState<JobWithTags[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeJob, setActiveJob] = useState<JobWithTags | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  async function load() {
    setLoading(true);
    const { data: jobsData, error } = await sb.from("jobs").select("*").order("created_at", { ascending: false });
    if (error) console.error(error);

    const { data: mapData } = await sb.from("job_tag_map").select("job_id, tag_id");
    const tagMapByJob: Record<string, string[]> = {};
    for (const m of mapData || []) {
      tagMapByJob[m.job_id] = tagMapByJob[m.job_id] || [];
      tagMapByJob[m.job_id].push(m.tag_id);
    }

    const enriched: JobWithTags[] = (jobsData || []).map((j: any) => ({
      ...j,
      tags: (tagMapByJob[j.id] || []).map((tid) => {
        const t = tags.find((x) => x.id === tid);
        return t ? { id: t.id, name: t.name } : { id: tid, name: "Unknown" };
      }),
    }));
    setJobs(enriched);
    setLoading(false);
  }

  useEffect(() => { load(); }, [sb, tags.length]);

  function jobsIn(colId: string) {
    return jobs.filter((j) => j.internal_primary_status_id === colId);
  }

  async function onDragEnd(e: DragEndEvent) {
    const activeId = e.active.id as string;
    const overId = e.over?.id as string | undefined;
    setActiveJob(null);
    if (!overId) return;
    if (!overId.startsWith("col:")) return;

    const jobId = activeId.replace("job:", "");
    const newStatusId = overId.replace("col:", "");
    const job = jobs.find((j) => j.id === jobId);
    if (!job) return;
    if (job.internal_primary_status_id === newStatusId) return;

    // Optimistic UI
    setJobs((prev) => prev.map((j) => j.id === jobId ? { ...j, internal_primary_status_id: newStatusId, last_updated: new Date().toISOString() } : j));

    const { error: upErr } = await sb
      .from("jobs")
      .update({ internal_primary_status_id: newStatusId, last_updated: new Date().toISOString() })
      .eq("id", jobId);

    if (upErr) {
      console.error(upErr);
      await load();
      return;
    }

    await sb.from("activity").insert({
      job_id: jobId,
      actor_user_id: (await sb.auth.getUser()).data.user?.id,
      type: "STATUS_CHANGED",
      metadata: { from: job.internal_primary_status_id, to: newStatusId },
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="text-xl font-semibold">Board</div>
        <div className="text-sm text-slate-600 mt-1">Drag and drop jobs across internal primary statuses (persists).</div>
      </div>

      {loading ? <div className="text-sm text-slate-600">Loading jobs…</div> : (
        <DndContext
          sensors={sensors}
          onDragStart={(e) => {
            const id = (e.active.id as string).replace("job:", "");
            const j = jobs.find((x) => x.id === id);
            setActiveJob(j || null);
          }}
          onDragEnd={onDragEnd}
        >
          <div className="flex gap-4 overflow-x-auto pb-4">
            {primary.map((col) => (
              <div key={col.id} id={`col:${col.id}`} className="min-w-[320px] max-w-[320px]">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-semibold text-sm">{col.name}</div>
                  <Badge tone="gray">{jobsIn(col.id).length}</Badge>
                </div>
                <DroppableColumn id={`col:${col.id}`}>
                  <div className="space-y-2">
                    {jobsIn(col.id).map((j) => (
                      <DraggableCard key={j.id} id={`job:${j.id}`} job={j} />
                    ))}
                  </div>
                </DroppableColumn>
              </div>
            ))}
          </div>

          <DragOverlay>
            {activeJob ? (
              <div className="w-[300px]">
                <JobCard job={activeJob} dragging />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
}

import { useDroppable, useDraggable } from "@dnd-kit/core";
import clsx from "clsx";

function DroppableColumn({ id, children }: { id: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={clsx("rounded-lg border bg-slate-50 p-2 min-h-[200px]", isOver && "ring-2 ring-slate-300")}>
      {children}
    </div>
  );
}

function DraggableCard({ id, job }: { id: string; job: JobWithTags }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;
  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes} className={clsx(isDragging && "opacity-30")}>
      <JobCard job={job} />
    </div>
  );
}

function JobCard({ job, dragging }: { job: JobWithTags; dragging?: boolean }) {
  return (
    <Card className={clsx("p-3", dragging && "shadow-lg")}>
      <div className="text-sm font-medium truncate">{job.insured_name}</div>
      <div className="text-xs text-slate-600 mt-1 ">{job.property_address}</div>
      <div className="flex flex-wrap gap-1 mt-2">
        {job.tags.slice(0, 4).map((t) => <Badge key={t.id} tone="blue">{t.name}</Badge>)}
      </div>
      <div className="mt-3 flex items-center justify-between">
        <div className="text-xs text-slate-500">Claim: {job.claim_number || "—"}</div>
        <Link href={`/jobs/${job.id}`} className="text-xs underline">Open</Link>
      </div>
    </Card>
  );
}

"use client";

import { AuthedPage } from "@/components/AuthedPage";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ButtonOutline } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabaseBrowser } from "@/lib/supabase/client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";

type Notif = { id: string; job_id: string | null; comment_id: string | null; type: string; is_read: boolean; created_at: string };

export default function NotificationsPage() {
  return (
    <AuthedPage>
      <NotificationsInner />
    </AuthedPage>
  );
}

function NotificationsInner() {
  const sb = useMemo(() => supabaseBrowser(), []);
  const { user } = useAuth();
  const [rows, setRows] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data, error } = await sb
      .from("notifications")
      .select("id,job_id,comment_id,type,is_read,created_at")
      .eq("recipient_user_id", user!.id)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) console.error(error);
    setRows((data || []) as any);
    setLoading(false);
  }

  useEffect(() => { load(); }, [sb, user]);

  async function markRead(id: string) {
    await sb.from("notifications").update({ is_read: true, read_at: new Date().toISOString() }).eq("id", id);
    await load();
  }

  async function markAllRead() {
    await sb.from("notifications").update({ is_read: true, read_at: new Date().toISOString() }).eq("recipient_user_id", user!.id).eq("is_read", false);
    await load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xl font-semibold">Notifications</div>
          <div className="text-sm text-slate-600 mt-1">Mentions and system alerts.</div>
        </div>
        <ButtonOutline onClick={markAllRead}>Mark all read</ButtonOutline>
      </div>

      <Card>
        <CardHeader title="Inbox" description="Click to open the related job and highlight the referenced comment." />
        <CardContent>
          {loading ? <div className="text-sm text-slate-600">Loading…</div> : (
            <div className="divide-y">
              {rows.map((n) => (
                <div key={n.id} className="py-3 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-sm font-medium">
                      {n.type === "mention" ? "You were mentioned in a comment" : "Notification"}
                      {!n.is_read ? <span className="ml-2"><Badge tone="amber">New</Badge></span> : null}
                    </div>
                    <div className="text-xs text-slate-600 mt-1">{new Date(n.created_at).toLocaleString()}</div>
                    {n.job_id ? (
                      <div className="mt-2">
                        <Link className="text-sm underline" href={`/jobs/${n.job_id}?tab=comments&commentId=${n.comment_id || ""}`}>
                          Open job
                        </Link>
                      </div>
                    ) : null}
                  </div>
                  {!n.is_read ? <ButtonOutline onClick={() => markRead(n.id)}>Mark read</ButtonOutline> : null}
                </div>
              ))}
              {!rows.length ? <div className="text-sm text-slate-600">No notifications.</div> : null}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

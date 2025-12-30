"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { Company, StatusOption, TagOption } from "@/lib/types";

export type UserLite = { id: string; name: string; email: string; role: "Admin" | "User" };
export type DocCategory = { id: string; name: string; is_active: boolean; sort_order: number };

type Boot = {
  companies: Company[];
  carriers: Company[];
  roofers: Company[];
  users: UserLite[];
  statuses: StatusOption[];
  tags: TagOption[];
  docCategories: DocCategory[];
  loading: boolean;
  refresh: () => Promise<void>;
};

const Ctx = createContext<Boot | null>(null);

export function BootstrapProvider({ children }: { children: React.ReactNode }) {
  const sb = useMemo(() => supabaseBrowser(), []);
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [users, setUsers] = useState<UserLite[]>([]);
  const [statuses, setStatuses] = useState<StatusOption[]>([]);
  const [tags, setTags] = useState<TagOption[]>([]);
  const [docCategories, setDocCategories] = useState<DocCategory[]>([]);

  async function refresh() {
    setLoading(true);
    const [c, u, s, t, dc] = await Promise.all([
      sb.from("companies").select("id,name,type").order("name"),
      sb.from("users").select("id,name,email,role").order("name"),
      sb.from("status_options").select("*").order("sort_order"),
      sb.from("tag_options").select("*").order("sort_order"),
      sb.from("document_categories").select("*").order("sort_order"),
    ]);

    if (c.error) console.error(c.error);
    if (u.error) console.error(u.error);
    if (s.error) console.error(s.error);
    if (t.error) console.error(t.error);
    if (dc.error) console.error(dc.error);

    setCompanies((c.data || []) as any);
    setUsers((u.data || []) as any);
    setStatuses((s.data || []) as any);
    setTags((t.data || []) as any);
    setDocCategories((dc.data || []) as any);
    setLoading(false);
  }

  useEffect(() => {
    refresh();
  }, []);

  const value: Boot = {
    companies,
    carriers: companies.filter((x) => x.type === "Carrier"),
    roofers: companies.filter((x) => x.type === "Roofing Company"),
    users,
    statuses,
    tags,
    docCategories,
    loading,
    refresh,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useBootstrap() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useBootstrap must be used within BootstrapProvider");
  return v;
}

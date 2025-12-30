import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";

export type AppUser = {
  id: string;
  email: string;
  name: string;
  role: "Admin" | "User";
};

export async function getAppUserOrNull(): Promise<AppUser | null> {
  const sb = supabaseServer();
  const { data: sessionData } = await sb.auth.getUser();
  const authUser = sessionData.user;
  if (!authUser) return null;

  const { data, error } = await sb
    .from("users")
    .select("id,email,name,role")
    .eq("id", authUser.id)
    .single();

  if (error || !data) return null;
  return data as AppUser;
}

export async function requireAppUser(returnTo?: string): Promise<AppUser> {
  const u = await getAppUserOrNull();
  if (!u) {
    const rt = returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : "";
    redirect(`/login${rt}`);
  }
  return u;
}

export function requireAdmin(user: AppUser) {
  if (user.role !== "Admin") redirect("/not-authorized");
}

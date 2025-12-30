import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export type ApiUser = { id: string; email: string; role: "Admin" | "User"; name: string };

export async function requireApiUser(req: NextRequest): Promise<ApiUser> {
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) throw new Response("Missing bearer token", { status: 401 });

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) throw new Response("Invalid token", { status: 401 });

  const { data: profile, error: pErr } = await supabaseAdmin
    .from("users")
    .select("id,email,name,role")
    .eq("id", data.user.id)
    .single();

  if (pErr || !profile) throw new Response("User profile not found", { status: 403 });
  return profile as ApiUser;
}

export function requireApiAdmin(u: ApiUser) {
  if (u.role !== "Admin") throw new Response("Not authorized", { status: 403 });
}

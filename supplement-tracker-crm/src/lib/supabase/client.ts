"use client";

import { createBrowserClient } from "@supabase/ssr";
import { env } from "@/lib/env";

export function supabaseBrowser() {
  return createBrowserClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

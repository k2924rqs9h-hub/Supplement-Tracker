"use client";

import { Protected } from "@/components/Protected";
import { AppShell } from "@/components/AppShell";
import { BootstrapProvider } from "@/contexts/BootstrapContext";

export function AuthedPage({ children }: { children: React.ReactNode }) {
  return (
    <Protected>
      <BootstrapProvider>
        <AppShell>{children}</AppShell>
      </BootstrapProvider>
    </Protected>
  );
}

"use client";

import { AuthedPage } from "@/components/AuthedPage";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useBootstrap } from "@/contexts/BootstrapContext";

export default function TeamPage() {
  return (
    <AuthedPage>
      <TeamInner />
    </AuthedPage>
  );
}

function TeamInner() {
  const { users, loading } = useBootstrap();
  return (
    <div className="space-y-4">
      <div>
        <div className="text-xl font-semibold">Team</div>
        <div className="text-sm text-slate-600 mt-1">Users and roles (managed in Supabase Auth + users table).</div>
      </div>

      <Card>
        <CardHeader title="Users" description="Name, email, role." />
        <CardContent>
          {loading ? <div className="text-sm text-slate-600">Loading…</div> : (
            <div className="border rounded-lg overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left p-3 border-b">Name</th>
                    <th className="text-left p-3 border-b">Email</th>
                    <th className="text-left p-3 border-b">Role</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50">
                      <td className="p-3 border-b">{u.name}</td>
                      <td className="p-3 border-b">{u.email}</td>
                      <td className="p-3 border-b">{u.role}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

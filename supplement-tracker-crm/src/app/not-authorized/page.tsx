"use client";
import Link from "next/link";
export default function NotAuthorized() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md w-full border rounded-lg p-6">
        <h1 className="text-lg font-semibold">Not authorized</h1>
        <p className="text-sm text-slate-600 mt-2">You do not have permission to access that page.</p>
        <div className="mt-4">
          <Link href="/" className="text-sm underline">Go to Dashboard</Link>
        </div>
      </div>
    </div>
  );
}

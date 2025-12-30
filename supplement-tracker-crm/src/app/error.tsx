"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="max-w-lg w-full border rounded-lg p-6">
            <h1 className="text-lg font-semibold">Something went wrong</h1>
            <p className="text-sm text-slate-600 mt-2">
              The app encountered an unexpected error. You can reload the page or return to the dashboard.
            </p>
            <pre className="text-xs bg-slate-50 border rounded p-3 mt-4 overflow-auto">
              {error.message}
            </pre>
            <div className="flex gap-2 mt-4">
              <button className="px-3 py-2 rounded bg-slate-900 text-white text-sm" onClick={() => reset()}>
                Try again
              </button>
              <a className="px-3 py-2 rounded border text-sm" href="/">
                Go to Dashboard
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}

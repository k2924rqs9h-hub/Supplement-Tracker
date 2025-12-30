import { ReactNode } from "react";
import clsx from "clsx";

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={clsx("border rounded-lg bg-white", className)}>{children}</div>;
}

export function CardHeader({ title, description, right }: { title: string; description?: string; right?: ReactNode }) {
  return (
    <div className="p-4 border-b flex items-start justify-between gap-3">
      <div>
        <div className="font-semibold">{title}</div>
        {description ? <div className="text-sm text-slate-600 mt-1">{description}</div> : null}
      </div>
      {right ? <div>{right}</div> : null}
    </div>
  );
}

export function CardContent({ children }: { children: ReactNode }) {
  return <div className="p-4">{children}</div>;
}

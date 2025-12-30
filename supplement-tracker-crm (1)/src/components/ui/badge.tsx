import clsx from "clsx";

export function Badge({ children, tone = "gray" }: { children: React.ReactNode; tone?: "gray" | "blue" | "green" | "red" | "amber" }) {
  const map: Record<string, string> = {
    gray: "bg-slate-100 text-slate-800 border-slate-200",
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    green: "bg-emerald-50 text-emerald-700 border-emerald-200",
    red: "bg-rose-50 text-rose-700 border-rose-200",
    amber: "bg-amber-50 text-amber-800 border-amber-200",
  };
  return <span className={clsx("inline-flex items-center px-2 py-0.5 text-xs rounded border", map[tone])}>{children}</span>;
}

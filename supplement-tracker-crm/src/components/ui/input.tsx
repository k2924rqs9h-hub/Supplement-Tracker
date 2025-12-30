import { ComponentProps } from "react";
import clsx from "clsx";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      {...props}
      className={clsx(
        "w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none",
        "focus:ring-2 focus:ring-slate-400 focus:border-slate-400",
        className
      )}
    />
  );
}

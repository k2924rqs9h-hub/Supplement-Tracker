import { ComponentProps } from "react";
import clsx from "clsx";

export function Button({ className, ...props }: ComponentProps<"button">) {
  return (
    <button
      {...props}
      className={clsx(
        "inline-flex items-center justify-center rounded px-3 py-2 text-sm border",
        "bg-slate-900 text-white border-slate-900 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed",
        className
      )}
    />
  );
}

export function ButtonOutline({ className, ...props }: ComponentProps<"button">) {
  return (
    <button
      {...props}
      className={clsx(
        "inline-flex items-center justify-center rounded px-3 py-2 text-sm border",
        "bg-white text-slate-900 border-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed",
        className
      )}
    />
  );
}

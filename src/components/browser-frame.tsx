import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function BrowserFrame({
  children,
  className,
  label,
}: {
  children: ReactNode;
  className?: string;
  label?: string;
}) {
  return (
    <div className={cn("overflow-hidden rounded-xl border border-border bg-card", className)}>
      <div className="flex items-center gap-1.5 border-b border-border bg-muted px-3 py-2">
        <span className="size-2 rounded-full bg-foreground/15" />
        <span className="size-2 rounded-full bg-foreground/15" />
        <span className="size-2 rounded-full bg-foreground/15" />
        {label ? (
          <span className="ml-3 truncate rounded-md bg-background px-2 py-0.5 text-[11px] text-muted-foreground">
            {label}
          </span>
        ) : null}
      </div>
      {children}
    </div>
  );
}

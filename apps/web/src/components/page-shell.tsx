import type { ReactNode } from "react";

export function PageShell({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <main className={`mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 ${className}`}>{children}</main>;
}

export function PageHeader({ title, description, className = "" }: { title: string; description?: string; className?: string }) {
  return (
    <div className={`rounded-2xl border bg-card/80 p-6 shadow-sm backdrop-blur-sm ${className}`}>
      <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
      {description ? <p className="mt-2 text-muted-foreground">{description}</p> : null}
    </div>
  );
}

import type { ReactNode } from "react";

interface DataCardProps {
  title: string;
  children: ReactNode;
}

export function DataCard({ title, children }: DataCardProps) {
  return (
    <article
      className="rounded-xl border p-5"
      style={{ borderColor: "var(--rf-border)", background: "rgba(15, 22, 33, 0.9)" }}
    >
      <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--rf-muted)] font-mono mb-4">
        {title}
      </p>
      {children}
    </article>
  );
}

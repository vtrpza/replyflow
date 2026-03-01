interface KpiCardProps {
  label: string;
  value: number;
  helper: string;
  tone: string;
}

export function KpiCard({ label, value, helper, tone }: KpiCardProps) {
  return (
    <article
      className="rounded-xl border px-4 py-3"
      style={{ borderColor: "var(--rf-border)", background: "rgba(15, 22, 33, 0.9)" }}
    >
      <p className="text-xs uppercase tracking-[0.16em] text-[var(--rf-muted)] font-mono">
        {label}
      </p>
      <p className={`rf-number text-2xl font-bold mt-1.5 ${tone}`}>
        {value.toLocaleString()}
      </p>
      <p className="text-xs text-[var(--rf-muted)] mt-1">{helper}</p>
    </article>
  );
}

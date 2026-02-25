interface Summary {
  totalSpentSeconds: number;
  totalEstimateSeconds: number;
  ticketsWithEstimate: number;
  overrunCount: number;
  totalCycleSeconds: number;
  activeCycleCount: number;
  completedCycleCount: number;
}

interface KpiGridProps {
  ticketsCount: number;
  summary: Summary;
  formatDuration: (seconds: number) => string;
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="stats-metric-card">
      <p className="stats-metric-label">{label}</p>
      <p className="stats-metric-value">{value}</p>
    </article>
  );
}

export function KpiGrid({ ticketsCount, summary, formatDuration }: KpiGridProps) {
  return (
    <section className="stats-metrics-grid">
      <KpiCard label="Total spent" value={formatDuration(summary.totalSpentSeconds)} />
      <KpiCard label="Total estimate" value={formatDuration(summary.totalEstimateSeconds)} />
      <KpiCard label="Overrun tickets" value={String(summary.overrunCount)} />
      <KpiCard
        label="Tickets with estimate"
        value={`${summary.ticketsWithEstimate} / ${ticketsCount}`}
      />
      <KpiCard label="Cycle time cumulé" value={formatDuration(summary.totalCycleSeconds)} />
      <KpiCard
        label="Cycles"
        value={`${summary.completedCycleCount} done / ${summary.activeCycleCount} en cours`}
      />
    </section>
  );
}

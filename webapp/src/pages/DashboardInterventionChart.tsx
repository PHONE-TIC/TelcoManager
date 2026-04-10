import {
  DASHBOARD_COLORS,
  type InterventionStat,
} from "./dashboard.utils";

interface DashboardInterventionChartProps {
  interventionStats: InterventionStat[];
}

const CHART_HEIGHT = 250;
const BAR_GAP = 12;
const BAR_RADIUS = 8;
const MAX_BAR_HEIGHT = 150;

function DashboardInterventionChart({
  interventionStats,
}: DashboardInterventionChartProps) {
  if (interventionStats.length === 0) {
    return (
      <div
        className="flex items-center justify-center"
        style={{ height: `${CHART_HEIGHT}px`, color: "var(--text-secondary)" }}
      >
        Aucune donnée disponible
      </div>
    );
  }

  const maxValue = Math.max(...interventionStats.map((stat) => stat.value), 1);
  const barWidth = `calc((100% - ${(interventionStats.length - 1) * BAR_GAP}px) / ${interventionStats.length})`;

  return (
    <div
      aria-label="Répartition des interventions"
      role="img"
      style={{
        height: `${CHART_HEIGHT}px`,
        display: "flex",
        alignItems: "flex-end",
        gap: `${BAR_GAP}px`,
        padding: "16px 0 8px",
      }}
    >
      {interventionStats.map((stat, index) => {
        const height = Math.max((stat.value / maxValue) * MAX_BAR_HEIGHT, 10);
        const color = DASHBOARD_COLORS[index % DASHBOARD_COLORS.length];

        return (
          <div
            key={stat.name}
            title={`${stat.name}: ${stat.value}`}
            style={{
              width: barWidth,
              minWidth: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "flex-end",
              height: "100%",
            }}
          >
            <span
              style={{
                fontSize: "0.875rem",
                fontWeight: 600,
                marginBottom: "8px",
                color: "var(--text-primary)",
              }}
            >
              {stat.value}
            </span>
            <div
              aria-hidden="true"
              style={{
                width: "100%",
                height: `${height}px`,
                minHeight: "10px",
                background: `linear-gradient(180deg, ${color}, ${color}cc)`,
                borderRadius: `${BAR_RADIUS}px ${BAR_RADIUS}px 0 0`,
                boxShadow: "inset 0 -1px 0 rgba(255,255,255,0.15)",
              }}
            />
            <span
              style={{
                marginTop: "10px",
                fontSize: "0.75rem",
                textAlign: "center",
                color: "var(--text-secondary)",
                lineHeight: 1.3,
                wordBreak: "break-word",
              }}
            >
              {stat.name}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default DashboardInterventionChart;

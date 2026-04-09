import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  DASHBOARD_COLORS,
  type InterventionStat,
} from "./dashboard.utils";

interface DashboardInterventionChartProps {
  interventionStats: InterventionStat[];
}

function DashboardInterventionChart({
  interventionStats,
}: DashboardInterventionChartProps) {
  return (
    <div style={{ height: "250px" }}>
      {interventionStats.length > 0 ? (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={interventionStats}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--border-color)"
            />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 12, fill: "var(--text-secondary)" }}
            />
            <YAxis tick={{ fontSize: 12, fill: "var(--text-secondary)" }} />
            <Tooltip
              contentStyle={{
                borderRadius: "8px",
                border: "1px solid var(--border-color)",
                backgroundColor: "var(--bg-primary)",
                boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
              }}
            />
            <Bar
              dataKey="value"
              name="Interventions"
              fill="#3b82f6"
              radius={[4, 4, 0, 0]}
            >
              {interventionStats.map((_entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={DASHBOARD_COLORS[index % DASHBOARD_COLORS.length]}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div
          className="flex items-center justify-center h-full"
          style={{ color: "var(--text-secondary)" }}
        >
          Aucune donnée disponible
        </div>
      )}
    </div>
  );
}

export default DashboardInterventionChart;

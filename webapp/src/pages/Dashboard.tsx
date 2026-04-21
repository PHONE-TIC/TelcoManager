import { lazy, Suspense, useEffect, useState } from "react";
import { apiService } from "../services/api.service";
import type { Intervention } from "../types";
import {
  buildInterventionStats,
  type DashboardStats,
  type InterventionStat,
} from "./dashboard.utils";
import {
  DashboardChartSection,
  DashboardHeader,
  DashboardLowStockAlerts,
  DashboardRecentInterventions,
  DashboardStockCategories,
} from "./dashboard.sections";
import "./Dashboard.css";

const DashboardInterventionChart = lazy(() => import("./DashboardInterventionChart"));

function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentInterventions, setRecentInterventions] = useState<Intervention[]>([]);
  const [interventionStats, setInterventionStats] = useState<InterventionStat[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [stockStats, clientsData, interventionsData, recentInterventionsData] =
          await Promise.all([
            apiService.getStockStats(),
            apiService.getClients({ limit: 1 }),
            apiService.getInterventions({ limit: 1000 }),
            apiService.getInterventions({ limit: 5, sort: "datePlanifiee:desc" }),
          ]);

        const interventions = interventionsData.interventions || [];

        setStats({
          stock: stockStats,
          totalClients: clientsData.pagination.total,
          totalInterventions: interventionsData.pagination.total,
        });
        setInterventionStats(buildInterventionStats(interventions));
        setRecentInterventions(recentInterventionsData.interventions || []);
      } catch (error) {
        console.error("Erreur lors du chargement des données:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="dashboard-container dashboard-shell" style={{ color: "var(--text-primary)" }}>
      <DashboardHeader stats={stats} />

      <div className="dashboard-main-grid animate-fade-in-3">
        <DashboardChartSection>
          <Suspense
            fallback={
              <div className="dashboard-chart-fallback">
                Chargement du graphique...
              </div>
            }
          >
            <DashboardInterventionChart interventionStats={interventionStats} />
          </Suspense>
        </DashboardChartSection>
        <DashboardRecentInterventions recentInterventions={recentInterventions} />
      </div>

      <div className="dashboard-secondary-grid animate-fade-in-4">
        <DashboardStockCategories categories={stats?.stock?.parCategorie ?? []} />
        <DashboardLowStockAlerts items={stats?.stock?.stockFaible ?? []} />
      </div>
    </div>
  );
}

export default Dashboard;

import { lazy, Suspense, useEffect, useState } from "react";
import { apiService } from "../services/api.service";
import type { Intervention } from "../types";
import type { IpLink } from "../types";
import {
  buildInterventionStats,
  type DashboardStats,
  type DashboardIpLinksAlertItem,
  type InterventionStat,
} from "./dashboard.utils";
import {
  DashboardChartSection,
  DashboardHeader,
  DashboardIpLinksPanel,
  DashboardLowStockAlerts,
  DashboardRecentInterventions,
  DashboardStockCategories,
} from "./dashboard.sections";
import "./Dashboard.css";

const DashboardInterventionChart = lazy(() => import("./DashboardInterventionChart"));

import SkeletonLoader from "../components/SkeletonLoader";

function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentInterventions, setRecentInterventions] = useState<Intervention[]>([]);
  const [interventionStats, setInterventionStats] = useState<InterventionStat[]>([]);
  const [ipLinksAlerts, setIpLinksAlerts] = useState<DashboardIpLinksAlertItem[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [stockStats, clientsData, interventionsData, recentInterventionsData, ipLinksSnapshot] =
          await Promise.all([
            apiService.getStockStats(),
            apiService.getClients({ limit: 1 }),
            apiService.getInterventions({ limit: 1000 }),
            apiService.getInterventions({ limit: 5, sort: "datePlanifiee:desc" }),
            apiService.getIpLinks(),
          ]);

        const interventions = interventionsData.interventions || [];
        const disconnectedLinks = (ipLinksSnapshot.items || [])
          .filter((link: IpLink) => link.healthStatus === "disconnected")
          .sort((a: IpLink, b: IpLink) => a.reference.localeCompare(b.reference, "fr"));

        setStats({
          stock: stockStats,
          ipLinks: ipLinksSnapshot.stats,
          totalClients: clientsData.pagination.total,
          totalInterventions: interventionsData.pagination.total,
        });
        setInterventionStats(buildInterventionStats(interventions));
        setRecentInterventions(recentInterventionsData.interventions || []);
        setIpLinksAlerts(disconnectedLinks);
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
      <div className="dashboard-container" style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "24px" }}>
        <div style={{ display: "flex", gap: "20px", width: "100%", flexWrap: "wrap" }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div 
              key={i} 
              className="shimmer" 
              style={{ 
                flex: "1 1 200px", 
                height: "100px", 
                backgroundColor: "var(--card-bg, #ffffff)", 
                borderRadius: "16px", 
                border: "1px solid var(--border-color, rgba(0,0,0,0.05))",
                position: "relative",
                overflow: "hidden"
              }} 
            />
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "24px", width: "100%" }}>
          <SkeletonLoader type="form" rows={3} />
          <SkeletonLoader type="card" rows={2} />
        </div>
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
        <DashboardIpLinksPanel stats={stats?.ipLinks} items={ipLinksAlerts} />
        <DashboardLowStockAlerts items={stats?.stock?.stockFaible ?? []} />
      </div>
    </div>
  );
}

export default Dashboard;

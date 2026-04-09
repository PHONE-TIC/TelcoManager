import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { apiService } from "../services/api.service";
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
import moment from "moment";
import type { Intervention } from "../types";
import {
  buildInterventionStats,
  DASHBOARD_COLORS,
  DASHBOARD_PANEL_STYLE,
  getDashboardStatCards,
  getInterventionStatusBadge,
  getLowStockStyles,
  getRecentInterventionTitle,
  QUICK_LINKS,
  type DashboardStats,
  type InterventionStat,
  type StockCategorySummary,
} from "./dashboard.utils";

function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentInterventions, setRecentInterventions] = useState<Intervention[]>([]);
  const [interventionStats, setInterventionStats] = useState<InterventionStat[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Fetch necessary data
      const [
        stockStats,
        clientsData,
        interventionsData,
        recentInterventionsData,
      ] = await Promise.all([
        apiService.getStockStats(),
        apiService.getClients({ limit: 1 }),
        apiService.getInterventions({ limit: 1000 }), // Fetch more for stats
        apiService.getInterventions({ limit: 5, sort: "datePlanifiee:desc" }),
      ]);

      const interventions = interventionsData.interventions || [];
      const processedInterventionStats = buildInterventionStats(interventions);

      setStats({
        stock: stockStats,
        totalClients: clientsData.pagination.total,
        totalInterventions: interventionsData.pagination.total,
      });
      setInterventionStats(processedInterventionStats);
      setRecentInterventions(recentInterventionsData.interventions || []);
    } catch (error) {
      console.error("Erreur lors du chargement des données:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div
      className="dashboard-container space-y-4"
      style={{ color: "var(--text-primary)" }}
    >
      {/* Header with Quick Actions */}
      <div
        style={DASHBOARD_PANEL_STYLE}
        className="animate-fade-in-1"
      >
        <div className="flex justify-between items-center flex-wrap gap-3">
          <div>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 700 }}>
              📊 Tableau de bord
            </h1>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
              Vue d'ensemble
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {QUICK_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                style={{
                  padding: "8px 14px",
                  borderRadius: "8px",
                  border: "1px solid var(--border-color)",
                  backgroundColor: "var(--bg-secondary)",
                  color: "var(--text-primary)",
                  fontSize: "0.85rem",
                  fontWeight: 500,
                  textDecoration: "none",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  transition: "all 0.2s ease",
                }}
              >
                {link.icon} {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Compact Stats Cards */}
      <div
        className="grid gap-3 animate-fade-in-2"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))" }}
      >
        {getDashboardStatCards(stats).map((stat, idx) => (
          <div
            key={idx}
            style={{
              backgroundColor: "var(--bg-primary)",
              padding: "16px",
              borderRadius: "12px",
              border: "1px solid var(--border-color)",
              borderLeft: `4px solid ${stat.color}`,
            }}
          >
            <div
              style={{
                fontSize: "1.75rem",
                fontWeight: 700,
                color: stat.color,
              }}
            >
              {stat.value}
            </div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
              {stat.label}
            </div>
          </div>
        ))}
        {stats?.stock?.stockFaible && stats.stock.stockFaible.length > 0 && (
          <div
            style={{
              backgroundColor: "var(--bg-primary)",
              padding: "16px",
              borderRadius: "12px",
              border: "1px solid var(--border-color)",
              borderLeft: "4px solid #eab308",
            }}
          >
            <div
              style={{ fontSize: "1.75rem", fontWeight: 700, color: "#eab308" }}
            >
              {stats.stock.stockFaible.length}
            </div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
              Stock Faible
            </div>
          </div>
        )}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 animate-fade-in-3">
        {/* Chart */}
        <div
          className="lg:col-span-2"
          style={DASHBOARD_PANEL_STYLE}
        >
          <h2
            style={{
              fontSize: "1.1rem",
              fontWeight: 700,
              marginBottom: "16px",
            }}
          >
            📊 Répartition des Interventions
          </h2>
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
                  <YAxis
                    tick={{ fontSize: 12, fill: "var(--text-secondary)" }}
                  />
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
                        fill={
                          DASHBOARD_COLORS[index % DASHBOARD_COLORS.length]
                        }
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
        </div>

        {/* Recent Interventions */}
        <div
          style={DASHBOARD_PANEL_STYLE}
        >
          <h2
            style={{
              fontSize: "1.1rem",
              fontWeight: 700,
              marginBottom: "16px",
            }}
          >
            📋 Dernières Interventions
          </h2>
          <div>
            {recentInterventions.length > 0 ? (
              recentInterventions.slice(0, 5).map((intervention) => (
                <Link
                  key={intervention.id}
                  to={`/interventions/${intervention.id}`}
                  className="intervention-card-item"
                >
                  {(() => {
                    const statusBadge = getInterventionStatusBadge(
                      intervention.statut
                    );

                    return (
                      <div className="flex justify-between items-center mb-1">
                        <span
                          className="font-semibold text-sm"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {intervention.client?.nom || "Client inconnu"}
                        </span>
                        <span
                          style={{
                            fontSize: "11px",
                            padding: "4px 10px",
                            borderRadius: "12px",
                            fontWeight: 600,
                            backgroundColor: statusBadge.backgroundColor,
                            color: "white",
                          }}
                        >
                          {statusBadge.label}
                        </span>
                      </div>
                    );
                  })()}
                  <div
                    className="flex justify-between items-center text-xs"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    <span>
                      {getRecentInterventionTitle(intervention.titre)}
                    </span>
                    <span className="font-medium">
                      {moment(intervention.datePlanifiee).format(
                        "DD/MM à HH:mm"
                      )}
                    </span>
                  </div>
                </Link>
              ))
            ) : (
              <div
                className="text-center py-6"
                style={{ color: "var(--text-secondary)" }}
              >
                <div className="text-2xl mb-2">📋</div>
                <p className="text-sm">Aucune intervention récente</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Row: Stock Categories & Low Stock Alert */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-fade-in-4">
        {/* Stock by Category */}
        <div
          style={DASHBOARD_PANEL_STYLE}
        >
          <h2
            style={{
              fontSize: "1.1rem",
              fontWeight: 700,
              marginBottom: "16px",
            }}
          >
            📦 Stock par Catégorie
          </h2>
          {stats?.stock?.parCategorie && stats.stock.parCategorie.length > 0 ? (
            <div>
              {stats.stock.parCategorie
                .slice(0, 5)
                .map((cat: StockCategorySummary, idx: number) => (
                  <div
                    key={idx}
                    className="intervention-card-item"
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span
                      style={{ fontWeight: 500, color: "var(--text-primary)" }}
                    >
                      {cat.categorie}
                    </span>
                    <div
                      style={{
                        display: "flex",
                        gap: "12px",
                        alignItems: "center",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "12px",
                          color: "var(--text-secondary)",
                        }}
                      >
                        {cat.articles} art.
                      </span>
                      <span
                        style={{
                          fontWeight: 600,
                          fontSize: "14px",
                          color: "#f97316",
                          backgroundColor: "rgba(249, 115, 22, 0.1)",
                          padding: "4px 10px",
                          borderRadius: "8px",
                        }}
                      >
                        {cat.quantite}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <p
              style={{
                color: "var(--text-secondary)",
                fontSize: "14px",
                fontStyle: "italic",
              }}
            >
              Aucune donnée
            </p>
          )}
        </div>

        {/* Low Stock Alert */}
        {stats?.stock?.stockFaible && stats.stock.stockFaible.length > 0 && (
          <div
            style={{
              backgroundColor: "var(--bg-primary)",
              padding: "20px",
              borderRadius: "12px",
              border: "1px solid var(--border-color)",
              borderLeft: "4px solid #f97316",
            }}
          >
            <h2
              style={{
                fontSize: "1.1rem",
                fontWeight: 700,
                marginBottom: "16px",
                color: "#f97316",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              ⚠️ Alertes Stock
            </h2>
            <div>
              {stats.stock.stockFaible
                .slice(0, 5)
                .map(
                  (
                    item: { id: string; nomMateriel: string; quantite: number },
                    idx: number
                  ) => (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "10px 12px",
                        marginBottom: "8px",
                        borderRadius: "8px",
                        border: "1px solid var(--border-color)",
                        backgroundColor: getLowStockStyles(item.quantite)
                          .containerColor,
                      }}
                    >
                      <span
                        style={{
                          color: "var(--text-primary)",
                          fontWeight: 500,
                        }}
                      >
                        {item.nomMateriel}
                      </span>
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: "14px",
                          padding: "4px 12px",
                          borderRadius: "6px",
                          backgroundColor: getLowStockStyles(item.quantite)
                            .badgeColor,
                          color: "white",
                        }}
                      >
                        {item.quantite}
                      </span>
                    </div>
                  )
                )}
            </div>
            <Link
              to="/stock"
              style={{
                display: "block",
                textAlign: "center",
                fontSize: "0.9rem",
                marginTop: "16px",
                color: "#f97316",
                textDecoration: "none",
                fontWeight: 500,
              }}
            >
              Gérer le stock →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;

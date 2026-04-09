import type { CSSProperties, ReactNode } from "react";
import { Link } from "react-router-dom";
import moment from "moment";
import type { Intervention } from "../types";
import {
  DASHBOARD_PANEL_STYLE,
  getDashboardStatCards,
  getInterventionStatusBadge,
  getLowStockStyles,
  getRecentInterventionTitle,
  QUICK_LINKS,
  type DashboardStats,
  type LowStockItem,
  type StockCategorySummary,
} from "./dashboard.utils";

const SECTION_TITLE_STYLE: CSSProperties = {
  fontSize: "1.1rem",
  fontWeight: 700,
  marginBottom: "16px",
};

export function DashboardHeader() {
  return (
    <div style={DASHBOARD_PANEL_STYLE} className="animate-fade-in-1">
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
  );
}

export function DashboardStatsCards({ stats }: { stats: DashboardStats | null }) {
  const lowStockCount = stats?.stock?.stockFaible?.length ?? 0;

  return (
    <div
      className="grid gap-3 animate-fade-in-2"
      style={{ gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))" }}
    >
      {getDashboardStatCards(stats).map((stat) => (
        <div
          key={stat.label}
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
      {lowStockCount > 0 && (
        <div
          style={{
            backgroundColor: "var(--bg-primary)",
            padding: "16px",
            borderRadius: "12px",
            border: "1px solid var(--border-color)",
            borderLeft: "4px solid #eab308",
          }}
        >
          <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#eab308" }}>
            {lowStockCount}
          </div>
          <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
            Stock Faible
          </div>
        </div>
      )}
    </div>
  );
}

export function DashboardChartSection({ children }: { children: ReactNode }) {
  return (
    <div className="lg:col-span-2" style={DASHBOARD_PANEL_STYLE}>
      <h2 style={SECTION_TITLE_STYLE}>📊 Répartition des Interventions</h2>
      {children}
    </div>
  );
}

export function DashboardRecentInterventions({
  recentInterventions,
}: {
  recentInterventions: Intervention[];
}) {
  return (
    <div style={DASHBOARD_PANEL_STYLE}>
      <h2 style={SECTION_TITLE_STYLE}>📋 Dernières Interventions</h2>
      <div>
        {recentInterventions.length > 0 ? (
          recentInterventions.slice(0, 5).map((intervention) => {
            const statusBadge = getInterventionStatusBadge(intervention.statut);

            return (
              <Link
                key={intervention.id}
                to={`/interventions/${intervention.id}`}
                className="intervention-card-item"
              >
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
                <div
                  className="flex justify-between items-center text-xs"
                  style={{ color: "var(--text-secondary)" }}
                >
                  <span>{getRecentInterventionTitle(intervention.titre)}</span>
                  <span className="font-medium">
                    {moment(intervention.datePlanifiee).format("DD/MM à HH:mm")}
                  </span>
                </div>
              </Link>
            );
          })
        ) : (
          <div className="text-center py-6" style={{ color: "var(--text-secondary)" }}>
            <div className="text-2xl mb-2">📋</div>
            <p className="text-sm">Aucune intervention récente</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function DashboardStockCategories({
  categories,
}: {
  categories: StockCategorySummary[];
}) {
  return (
    <div style={DASHBOARD_PANEL_STYLE}>
      <h2 style={SECTION_TITLE_STYLE}>📦 Stock par Catégorie</h2>
      {categories.length > 0 ? (
        <div>
          {categories.slice(0, 5).map((cat) => (
            <div
              key={cat.categorie}
              className="intervention-card-item"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ fontWeight: 500, color: "var(--text-primary)" }}>
                {cat.categorie}
              </span>
              <div
                style={{
                  display: "flex",
                  gap: "12px",
                  alignItems: "center",
                }}
              >
                <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
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
  );
}

export function DashboardLowStockAlerts({ items }: { items: LowStockItem[] }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        ...DASHBOARD_PANEL_STYLE,
        borderLeft: "4px solid #f97316",
      }}
    >
      <h2
        style={{
          ...SECTION_TITLE_STYLE,
          color: "#f97316",
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        ⚠️ Alertes Stock
      </h2>
      <div>
        {items.slice(0, 5).map((item) => {
          const lowStockStyles = getLowStockStyles(item.quantite);

          return (
            <div
              key={item.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "10px 12px",
                marginBottom: "8px",
                borderRadius: "8px",
                border: "1px solid var(--border-color)",
                backgroundColor: lowStockStyles.containerColor,
              }}
            >
              <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>
                {item.nomMateriel}
              </span>
              <span
                style={{
                  fontWeight: 700,
                  fontSize: "14px",
                  padding: "4px 12px",
                  borderRadius: "6px",
                  backgroundColor: lowStockStyles.badgeColor,
                  color: "white",
                }}
              >
                {item.quantite}
              </span>
            </div>
          );
        })}
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
  );
}

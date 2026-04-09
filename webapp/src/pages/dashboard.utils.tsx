import type { CSSProperties } from "react";
import type { Intervention, Stock } from "../types";

const FALLBACK_STATUS = "Inconnu";

export const DASHBOARD_COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#8884d8",
];

export const DASHBOARD_PANEL_STYLE: CSSProperties = {
  backgroundColor: "var(--bg-primary)",
  padding: "20px",
  borderRadius: "12px",
  border: "1px solid var(--border-color)",
};

export const QUICK_LINKS = [
  { to: "/interventions", icon: "📅", label: "Interventions" },
  { to: "/clients", icon: "👥", label: "Clients" },
  { to: "/stock", icon: "📦", label: "Stock" },
  { to: "/inventaire", icon: "🔍", label: "Inventaire" },
  { to: "/rapports", icon: "📈", label: "Rapports" },
] as const;

export interface InterventionStat {
  name: string;
  value: number;
}

export interface StockCategorySummary {
  categorie: string;
  articles: number;
  quantite: number;
}

export interface StockSummaryGroup {
  totalQuantite: number;
}

export interface LowStockItem extends Stock {
  totalTechniciens?: number;
}

export interface DashboardStats {
  stock: {
    stockCourant?: StockSummaryGroup;
    stockHS?: StockSummaryGroup;
    stockFaible?: LowStockItem[];
    parCategorie?: StockCategorySummary[];
  };
  totalClients: number;
  totalInterventions: number;
}

export function buildInterventionStats(
  interventions: Pick<Intervention, "statut">[]
): InterventionStat[] {
  const statusCounts = interventions.reduce<Record<string, number>>((acc, curr) => {
    const status = curr.statut || FALLBACK_STATUS;
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  return Object.keys(statusCounts).map((status) => ({
    name: status.charAt(0).toUpperCase() + status.slice(1),
    value: statusCounts[status],
  }));
}

export function getDashboardStatCards(stats: DashboardStats | null) {
  return [
    {
      value: stats?.totalClients || 0,
      label: "Clients",
      color: "#3b82f6",
    },
    {
      value: stats?.totalInterventions || 0,
      label: "Interventions",
      color: "#10b981",
    },
    {
      value: stats?.stock?.stockCourant?.totalQuantite || 0,
      label: "Pièces Stock",
      color: "#f97316",
    },
    {
      value: stats?.stock?.stockHS?.totalQuantite || 0,
      label: "Pièces HS",
      color: "#ef4444",
    },
  ];
}

export function getInterventionStatusBadge(statut?: string) {
  switch (statut) {
    case "terminee":
      return { backgroundColor: "#10b981", label: "✓ Terminée" };
    case "planifiee":
      return { backgroundColor: "#3b82f6", label: "📅 Planifiée" };
    case "en_cours":
      return { backgroundColor: "#f59e0b", label: "⏳ En cours" };
    case "annulee":
      return { backgroundColor: "#ef4444", label: "✕ Annulée" };
    default:
      return { backgroundColor: "#6b7280", label: statut || FALLBACK_STATUS };
  }
}

export function getRecentInterventionTitle(titre?: string) {
  if (!titre) return "Sans titre";
  return titre.length > 30 ? `${titre.substring(0, 30)}...` : titre;
}

export function getLowStockStyles(quantite: number) {
  const empty = quantite === 0;

  return {
    containerColor: empty ? "rgba(239, 68, 68, 0.1)" : "rgba(249, 115, 22, 0.1)",
    badgeColor: empty ? "#ef4444" : "#f97316",
  };
}

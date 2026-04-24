import type { CSSProperties, ReactNode } from "react";
import { Link } from "react-router-dom";
import moment from "moment";
import type { Intervention } from "../types";
import {
  DASHBOARD_PANEL_STYLE,
  formatDashboardSyncDate,
  getDashboardStatCards,
  getIpLinksHealthBadge,
  getInterventionStatusBadge,
  getLowStockStyles,
  getRecentInterventionTitle,
  QUICK_LINKS,
  type DashboardIpLinksAlertItem,
  type DashboardStats,
  type LowStockItem,
  type StockCategorySummary,
} from "./dashboard.utils";
import { AppIcon } from "../components/AppIcon";

const SECTION_TITLE_STYLE: CSSProperties = {
  fontSize: "1.05rem",
  fontWeight: 700,
  marginBottom: "16px",
};

export function DashboardHeader({ stats }: { stats: DashboardStats | null }) {
  return (
    <section style={DASHBOARD_PANEL_STYLE} className="dashboard-panel dashboard-header-card animate-fade-in-1">
      <div className="dashboard-header-top">
        <div className="dashboard-header-copy">
          <span className="dashboard-eyebrow">Pilotage opérationnel</span>
          <h1 className="dashboard-title"><AppIcon name="dashboard" size={22} /> Tableau de bord</h1>
          <p className="dashboard-subtitle">
            Vue rapide des interventions, du stock et des points d'attention.
          </p>
        </div>
        <div className="dashboard-quick-links">
          {QUICK_LINKS.map((link) => (
            <Link key={link.to} to={link.to} className="dashboard-quick-link">
              <span><AppIcon name={link.iconName} size={18} /></span>
              <span>{link.label}</span>
            </Link>
          ))}
        </div>
      </div>
      <DashboardStatsCards stats={stats} />
    </section>
  );
}

export function DashboardStatsCards({ stats }: { stats: DashboardStats | null }) {
  const lowStockCount = stats?.stock?.stockFaible?.length ?? 0;

  return (
    <div className="dashboard-stats-grid animate-fade-in-2">
      {getDashboardStatCards(stats).map((stat) => (
        <article key={stat.label} className="dashboard-stat-card">
          <div className="dashboard-stat-accent" style={{ backgroundColor: stat.color }} />
          <div className="dashboard-stat-content">
            <div className="dashboard-stat-value" style={{ color: stat.color }}>
              {stat.value}
            </div>
            <div className="dashboard-stat-label">{stat.label}</div>
          </div>
        </article>
      ))}
      {lowStockCount > 0 ? (
        <article className="dashboard-stat-card dashboard-stat-card--warning">
          <div className="dashboard-stat-accent" style={{ backgroundColor: "#eab308" }} />
          <div className="dashboard-stat-content">
            <div className="dashboard-stat-value" style={{ color: "#eab308" }}>
              {lowStockCount}
            </div>
            <div className="dashboard-stat-label">Stock faible</div>
          </div>
        </article>
      ) : null}
    </div>
  );
}

export function DashboardChartSection({ children }: { children: ReactNode }) {
  return (
    <section className="dashboard-panel dashboard-panel--chart lg:col-span-2" style={DASHBOARD_PANEL_STYLE}>
      <div className="dashboard-section-head">
        <h2 style={SECTION_TITLE_STYLE}><AppIcon name="reports" size={18} /> Répartition des interventions</h2>
        <span className="dashboard-section-hint">Vue globale</span>
      </div>
      {children}
    </section>
  );
}

export function DashboardRecentInterventions({
  recentInterventions,
}: {
  recentInterventions: Intervention[];
}) {
  return (
    <section className="dashboard-panel" style={DASHBOARD_PANEL_STYLE}>
      <div className="dashboard-section-head">
        <h2 style={SECTION_TITLE_STYLE}><AppIcon name="interventions" size={18} /> Dernières interventions</h2>
        <span className="dashboard-section-hint">5 plus récentes</span>
      </div>
      <div className="dashboard-list">
        {recentInterventions.length > 0 ? (
          recentInterventions.slice(0, 5).map((intervention) => {
            const statusBadge = getInterventionStatusBadge(intervention.statut);

            return (
              <Link
                key={intervention.id}
                to={`/interventions/${intervention.id}`}
                className="dashboard-list-card"
              >
                <div className="dashboard-list-card__header">
                  <div>
                    <div className="dashboard-list-card__title">
                      {intervention.client?.nom || "Client inconnu"}
                    </div>
                    <div className="dashboard-list-card__subtitle">
                      {getRecentInterventionTitle(intervention.titre)}
                    </div>
                  </div>
                  <span
                    className="dashboard-status-badge"
                    style={{ backgroundColor: statusBadge.backgroundColor, color: "white" }}
                  >
                    {statusBadge.label}
                  </span>
                </div>
                <div className="dashboard-list-card__meta">
                  <span>{moment(intervention.datePlanifiee).format("DD/MM/YYYY")}</span>
                  <span>{moment(intervention.datePlanifiee).format("HH:mm")}</span>
                </div>
              </Link>
            );
          })
        ) : (
          <div className="dashboard-empty-state">
            <div className="text-2xl mb-2"><AppIcon name="interventions" size={28} /></div>
            <p className="text-sm">Aucune intervention récente</p>
          </div>
        )}
      </div>
    </section>
  );
}

export function DashboardStockCategories({
  categories,
}: {
  categories: StockCategorySummary[];
}) {
  return (
    <section className="dashboard-panel" style={DASHBOARD_PANEL_STYLE}>
      <div className="dashboard-section-head">
        <h2 style={SECTION_TITLE_STYLE}><AppIcon name="stock" size={18} /> Stock par catégorie</h2>
        <span className="dashboard-section-hint">Top 5</span>
      </div>
      {categories.length > 0 ? (
        <div className="dashboard-list">
          {categories.slice(0, 5).map((cat) => (
            <div key={cat.categorie} className="dashboard-data-row">
              <div>
                <div className="dashboard-data-row__title">{cat.categorie}</div>
                <div className="dashboard-data-row__subtitle">{cat.articles} article(s)</div>
              </div>
              <span className="dashboard-data-pill">{cat.quantite}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="dashboard-muted-text">Aucune donnée</p>
      )}
    </section>
  );
}

export function DashboardLowStockAlerts({ items }: { items: LowStockItem[] }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section
      className="dashboard-panel dashboard-panel--warning"
      style={{
        ...DASHBOARD_PANEL_STYLE,
        borderLeft: "4px solid #f97316",
      }}
    >
      <div className="dashboard-section-head">
        <h2 style={{ ...SECTION_TITLE_STYLE, color: "#f97316", marginBottom: 0 }}>
          Alertes stock
        </h2>
        <span className="dashboard-section-hint">Action recommandée</span>
      </div>
      <div className="dashboard-list">
        {items.slice(0, 5).map((item) => {
          const lowStockStyles = getLowStockStyles(item.quantite);

          return (
            <div
              key={item.id}
              className="dashboard-alert-row"
              style={{ backgroundColor: lowStockStyles.containerColor }}
            >
              <div>
                <div className="dashboard-data-row__title">{item.nomMateriel}</div>
                <div className="dashboard-data-row__subtitle">Stock disponible</div>
              </div>
              <span
                className="dashboard-status-badge"
                style={{ backgroundColor: lowStockStyles.badgeColor, color: "white" }}
              >
                {item.quantite}
              </span>
            </div>
          );
        })}
      </div>
      <Link to="/stock" className="dashboard-footer-link">
        Gérer le stock →
      </Link>
    </section>
  );
}

export function DashboardIpLinksPanel({
  stats,
  items,
}: {
  stats: DashboardStats["ipLinks"];
  items: DashboardIpLinksAlertItem[];
}) {
  return (
    <section className="dashboard-panel" style={DASHBOARD_PANEL_STYLE}>
      <div className="dashboard-section-head">
        <h2 style={SECTION_TITLE_STYLE}><AppIcon name="ip-links" size={18} /> Supervision des liens</h2>
        <span className="dashboard-section-hint">
          {formatDashboardSyncDate(stats?.lastSyncedAt)}
        </span>
      </div>

      <div className="dashboard-inline-stats">
        <div className="dashboard-inline-stat dashboard-inline-stat--neutral">
          <strong>{stats?.total ?? 0}</strong>
          <span>Total</span>
        </div>
        <div className="dashboard-inline-stat dashboard-inline-stat--success">
          <strong>{stats?.connected ?? 0}</strong>
          <span>Connectés</span>
        </div>
        <div className="dashboard-inline-stat dashboard-inline-stat--danger">
          <strong>{stats?.disconnected ?? 0}</strong>
          <span>Déconnectés</span>
        </div>
      </div>

      {items.length > 0 ? (
        <div className="dashboard-list">
          {items.slice(0, 5).map((item) => {
            const badge = getIpLinksHealthBadge(item.healthStatus);

            return (
              <Link
                key={item.id}
                to="/supervision-liens-ip"
                className="dashboard-list-card"
              >
                <div className="dashboard-list-card__header">
                  <div>
                    <div className="dashboard-list-card__title">{item.reference}</div>
                    <div className="dashboard-list-card__subtitle">{item.clientName}</div>
                  </div>
                  <span
                    className="dashboard-status-badge"
                    style={{ backgroundColor: badge.backgroundColor, color: "white" }}
                  >
                    {badge.label}
                  </span>
                </div>
                <div className="dashboard-list-card__meta">
                  <span>{item.collecteOperator || "Collecte non renseignée"}</span>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="dashboard-empty-state dashboard-empty-state--compact">
          <div className="text-2xl mb-2"><AppIcon name="check-circle" size={28} /></div>
          <p className="text-sm">Aucun lien déconnecté actuellement</p>
        </div>
      )}

      <Link to="/supervision-liens-ip" className="dashboard-footer-link">
        Ouvrir la supervision des liens →
      </Link>
    </section>
  );
}

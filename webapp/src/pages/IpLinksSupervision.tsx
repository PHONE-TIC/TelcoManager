import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { apiService } from "../services/api.service";
import type { IpLink, IpLinksSnapshot } from "../types";
import { ResponsivePage } from "../components/ResponsivePage";
import { AppIcon } from "../components/AppIcon";
import "./screen-harmonization.css";
import "./IpLinksSupervision.css";

type HealthFilter = "all" | "connected" | "disconnected";
type ViewMode = "service" | "supervision";

const emptySnapshot: IpLinksSnapshot = {
  items: [],
  stats: {
    total: 0,
    connected: 0,
    disconnected: 0,
    ignored: 0,
    lastSyncedAt: null,
  },
};

function formatSyncDate(value: string | null) {
  if (!value) return "Jamais synchronisé";
  return new Date(value).toLocaleString("fr-FR");
}

function renderHealthBadge(link: IpLink) {
  if (link.healthStatus === "connected") {
    return (
      <span className="ip-links-health ip-links-health--connected" title="Connecté">
        <span className="ip-links-health__emoji"><AppIcon name="check-circle" size={16} /></span>
        <span>Connecté</span>
      </span>
    );
  }

  if (link.healthStatus === "disconnected") {
    return (
      <span className="ip-links-health ip-links-health--disconnected" title="Déconnecté">
        <span className="ip-links-health__emoji"><AppIcon name="x-circle" size={16} /></span>
        <span>Déconnecté</span>
      </span>
    );
  }

  return (
    <span className="ip-links-health ip-links-health--ignored" title="Non supervisé">
      <span className="ip-links-health__emoji"><AppIcon name="ban" size={16} /></span>
      <span>Non supervisé</span>
    </span>
  );
}

function renderYesNoBadge(value: boolean) {
  return (
    <span className={`ip-links-yesno ${value ? "ip-links-yesno--yes" : "ip-links-yesno--no"}`}>
      {value ? "Oui" : "Non"}
    </span>
  );
}

function getStatusTone(status: IpLink["healthStatus"]) {
  if (status === "connected") return "connected";
  if (status === "disconnected") return "disconnected";
  return "ignored";
}

export default function IpLinksSupervision() {
  const [snapshot, setSnapshot] = useState<IpLinksSnapshot>(emptySnapshot);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [healthFilter, setHealthFilter] = useState<HealthFilter>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("service");

  const loadData = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const data = await apiService.getIpLinks();
      setSnapshot(data);
    } catch (error) {
      console.error("Erreur lors du chargement des liens IP:", error);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(() => loadData(true), 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  const handleSync = async () => {
    try {
      setSyncing(true);
      const data = await apiService.syncIpLinks();
      setSnapshot(data);
    } catch (error) {
      console.error("Erreur lors de la synchronisation des liens IP:", error);
      alert("Erreur lors de la synchronisation des liens IP");
    } finally {
      setSyncing(false);
    }
  };

  const filteredItems = useMemo(() => {
    return snapshot.items.filter((link) => {
      return healthFilter === "all" ? true : link.healthStatus === healthFilter;
    });
  }, [healthFilter, snapshot.items]);

  const disconnectedRatio = snapshot.stats.total > 0
    ? Math.round((snapshot.stats.disconnected / snapshot.stats.total) * 100)
    : 0;

  const prioritizedItems = useMemo(() => {
    return [...filteredItems].sort((a, b) => {
      const priority = { disconnected: 0, connected: 1, ignored: 2 } as const;
      const statusOrder = priority[getStatusTone(a.healthStatus)] - priority[getStatusTone(b.healthStatus)];
      if (statusOrder !== 0) return statusOrder;
      return a.reference.localeCompare(b.reference, "fr");
    });
  }, [filteredItems]);

  const supervisionGroups = useMemo(() => {
    return {
      disconnected: prioritizedItems.filter((link) => getStatusTone(link.healthStatus) === "disconnected"),
      connected: prioritizedItems.filter((link) => getStatusTone(link.healthStatus) === "connected"),
      ignored: prioritizedItems.filter((link) => getStatusTone(link.healthStatus) === "ignored"),
    };
  }, [prioritizedItems]);

  const headerStats = (
    <div className="harmonized-stats-grid">
      <div className="harmonized-stat-card ip-links-kpi-card ip-links-kpi-card--total">
        <div>{snapshot.stats.total}</div>
        <div>Total supervisé</div>
      </div>
      <div className="harmonized-stat-card ip-links-kpi-card ip-links-kpi-card--connected">
        <div>{snapshot.stats.connected}</div>
        <div>Connectés</div>
      </div>
      <div className="harmonized-stat-card ip-links-kpi-card ip-links-kpi-card--disconnected">
        <div>{snapshot.stats.disconnected}</div>
        <div>Déconnectés</div>
      </div>
      <div className="harmonized-stat-card ip-links-kpi-card ip-links-kpi-card--focus">
        <div>{disconnectedRatio}%</div>
        <div>Taux de rupture</div>
      </div>
    </div>
  );

  const supervisionLegend: ReactNode = viewMode === "supervision" ? (
    <div className="ip-links-header-legend">
      <span className="ip-links-legend ip-links-legend--connected">Connecté</span>
      <span className="ip-links-legend ip-links-legend--disconnected">Déconnecté</span>
      <span className="ip-links-legend ip-links-legend--ignored">Non supervisé</span>
    </div>
  ) : null;

  return (
    <ResponsivePage
      title="Liens IP"
      subtitle={`Dernière synchronisation: ${formatSyncDate(snapshot.stats.lastSyncedAt)} • ${snapshot.stats.ignored} lien(s) non supervisé(s) ignoré(s)`}
      headerStats={headerStats}
      headerAside={supervisionLegend}
      actions={[
        {
          label: viewMode === "service" ? "Vue supervision" : "Vue service",
          onClick: () => setViewMode((current) => current === "service" ? "supervision" : "service"),
          variant: "secondary",
        },
        {
          label: syncing ? "Synchronisation..." : "Synchroniser",
          onClick: handleSync,
          variant: "primary",
          disabled: syncing,
        },
      ]}
    >
      <div className="ip-links-page">
      <div className="harmonized-surface ip-links-filters-surface">
        <div className="harmonized-toolbar ip-links-toolbar">
          <div className="harmonized-filter-group ip-links-toolbar__group">
            <select
              className="harmonized-select ip-links-select"
              value={healthFilter}
              onChange={(event) => setHealthFilter(event.target.value as HealthFilter)}
            >
              <option value="all">Tous les états</option>
              <option value="connected">Connectés</option>
              <option value="disconnected">Déconnectés</option>
            </select>
          </div>
          <div className="harmonized-summary-text">
            {filteredItems.length} lien(s) affiché(s)
          </div>
        </div>
      </div>

      {viewMode === "service" ? (
        <section className="ip-links-table-card">
          <div className="ip-links-table-wrap">
            <table className="ip-links-table">
              <thead>
                <tr>
                  <th className="ip-links-col-reference">Référence</th>
                  <th className="ip-links-col-client">Client</th>
                  <th className="ip-links-col-operator">Collecte</th>
                  <th className="ip-links-col-type">Type</th>
                  <th className="ip-links-col-bandwidth">Débit max</th>
                  <th>Backup 4G</th>
                  <th>Firewall</th>
                  <th>Santé</th>
                </tr>
              </thead>
              <tbody>
                {!loading && prioritizedItems.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="ip-links-empty">
                      Aucun lien IP trouvé
                    </td>
                  </tr>
                ) : (
                  prioritizedItems.map((link) => (
                    <tr key={`${link.id}-${link.reference}`}>
                      <td className="ip-links-col-reference" data-label="Référence">
                      <Link
                        to={`/supervision-liens-ip/${encodeURIComponent(link.reference)}`}
                        className="ip-links-reference-link"
                      >
                        {link.reference}
                      </Link>
                    </td>
                      <td className="ip-links-col-client" data-label="Client">{link.clientName}</td>
                      <td className="ip-links-col-operator" data-label="Collecte">{link.collecteOperator || "-"}</td>
                      <td className="ip-links-col-type" data-label="Type">{link.type}</td>
                      <td className="ip-links-col-bandwidth" data-label="Débit max">{link.maxBandwidth || "-"}</td>
                      <td data-label="Backup 4G">{renderYesNoBadge(link.backup4g)}</td>
                      <td data-label="Firewall">{renderYesNoBadge(link.firewall)}</td>
                      <td data-label="Santé">{renderHealthBadge(link)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <section className="ip-links-supervision-view">
          <div className="ip-links-supervision-summary-grid">
            <article className="ip-links-supervision-summary ip-links-supervision-summary--critical">
              <span>Liens à traiter</span>
              <strong>{snapshot.stats.disconnected}</strong>
              <p>À afficher en priorité sur grand écran.</p>
            </article>
            <article className="ip-links-supervision-summary">
              <span>Liens stables</span>
              <strong>{snapshot.stats.connected}</strong>
              <p>Connexion active détectée.</p>
            </article>
            <article className="ip-links-supervision-summary">
              <span>Non supervisés</span>
              <strong>{snapshot.stats.ignored}</strong>
              <p>Exclus de la supervision active.</p>
            </article>
          </div>

          {loading ? (
            <div className="ip-links-empty">Chargement de la supervision…</div>
          ) : prioritizedItems.length === 0 ? (
            <div className="ip-links-empty">Aucun lien IP trouvé</div>
          ) : (
            <div className="ip-links-supervision-sections">
              {([
                ["Déconnectés", supervisionGroups.disconnected, "disconnected"],
                ["Connectés", supervisionGroups.connected, "connected"],
                ["Non supervisés", supervisionGroups.ignored, "ignored"],
              ] as const).map(([title, items, tone]) =>
                items.length > 0 ? (
                  <section key={title} className={`ip-links-supervision-section ip-links-supervision-section--${tone}`}>
                    <div className="ip-links-supervision-section__header">
                      <h3>{title}</h3>
                      <span>{items.length} lien(s)</span>
                    </div>
                    <div className="ip-links-supervision-grid">
                      {items.map((link) => {
                        const cardTone = getStatusTone(link.healthStatus);
                        return (
                          <article
                            key={`${link.id}-${link.reference}`}
                            className={`ip-links-supervision-card ip-links-supervision-card--${cardTone}`}
                          >
                            <div className="ip-links-supervision-card__top">
                              <div>
                                <div className="ip-links-supervision-card__reference">
                                  <Link
                                    to={`/supervision-liens-ip/${encodeURIComponent(link.reference)}`}
                                    className="ip-links-reference-link"
                                  >
                                    {link.reference}
                                  </Link>
                                </div>
                                <div className="ip-links-supervision-card__client">{link.clientName}</div>
                              </div>
                              {renderHealthBadge(link)}
                            </div>

                            <div className="ip-links-supervision-card__meta">
                              <div>
                                <span>Collecte</span>
                                <strong>{link.collecteOperator || "-"}</strong>
                              </div>
                              <div>
                                <span>Type</span>
                                <strong>{link.type}</strong>
                              </div>
                              <div>
                                <span>Débit max</span>
                                <strong>{link.maxBandwidth || "-"}</strong>
                              </div>
                            </div>

                            <div className="ip-links-supervision-card__flags">
                              <div>
                                <span>Backup 4G</span>
                                {renderYesNoBadge(link.backup4g)}
                              </div>
                              <div>
                                <span>Firewall</span>
                                {renderYesNoBadge(link.firewall)}
                              </div>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </section>
                ) : null
              )}
            </div>
          )}
        </section>
      )}
      </div>
    </ResponsivePage>
  );
}

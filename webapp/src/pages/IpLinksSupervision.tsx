import { useCallback, useEffect, useMemo, useState } from "react";
import { apiService } from "../services/api.service";
import type { IpLink, IpLinksSnapshot } from "../types";
import { ResponsivePage } from "../components/ResponsivePage";
import "./screen-harmonization.css";
import "./IpLinksSupervision.css";

type HealthFilter = "all" | "connected" | "disconnected";

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
        <span className="ip-links-health__emoji">✅</span>
        <span>Connecté</span>
      </span>
    );
  }

  if (link.healthStatus === "disconnected") {
    return (
      <span className="ip-links-health ip-links-health--disconnected" title="Déconnecté">
        <span className="ip-links-health__emoji">❌</span>
        <span>Déconnecté</span>
      </span>
    );
  }

  return (
    <span className="ip-links-health ip-links-health--ignored" title="Non supervisé">
      <span className="ip-links-health__emoji">⛔</span>
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

export default function IpLinksSupervision() {
  const [snapshot, setSnapshot] = useState<IpLinksSnapshot>(emptySnapshot);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [search, setSearch] = useState("");
  const [healthFilter, setHealthFilter] = useState<HealthFilter>("all");

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
    const normalizedSearch = search.trim().toLowerCase();
    return snapshot.items.filter((link) => {
      const matchesHealth =
        healthFilter === "all" ? true : link.healthStatus === healthFilter;
      const matchesSearch = normalizedSearch
        ? [
            link.reference,
            link.clientName,
            link.collecteOperator || "",
            link.type,
            link.maxBandwidth,
          ]
            .join(" ")
            .toLowerCase()
            .includes(normalizedSearch)
        : true;

      return matchesHealth && matchesSearch;
    });
  }, [healthFilter, search, snapshot.items]);

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
    </div>
  );

  return (
    <ResponsivePage
      title="Supervision de liens IP"
      subtitle={`Dernière synchronisation: ${formatSyncDate(snapshot.stats.lastSyncedAt)} • ${snapshot.stats.ignored} lien(s) non supervisé(s) ignoré(s)`}
      headerStats={headerStats}
      actions={[
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
          <div className="harmonized-filter-group ip-links-toolbar__group ip-links-toolbar__group--grow">
            <input
              type="search"
              className="harmonized-input ip-links-search"
              placeholder="Rechercher un lien, un client, une collecte..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
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
              {!loading && filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="ip-links-empty">
                    Aucun lien IP trouvé
                  </td>
                </tr>
              ) : (
                filteredItems.map((link) => (
                  <tr key={`${link.id}-${link.reference}`}>
                    <td className="ip-links-col-reference">{link.reference}</td>
                    <td className="ip-links-col-client">{link.clientName}</td>
                    <td className="ip-links-col-operator">{link.collecteOperator || "-"}</td>
                    <td className="ip-links-col-type">{link.type}</td>
                    <td className="ip-links-col-bandwidth">{link.maxBandwidth || "-"}</td>
                    <td>{renderYesNoBadge(link.backup4g)}</td>
                    <td>{renderYesNoBadge(link.firewall)}</td>
                    <td>{renderHealthBadge(link)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
      </div>
    </ResponsivePage>
  );
}

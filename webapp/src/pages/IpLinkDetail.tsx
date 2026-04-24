import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiService } from "../services/api.service";
import type { IpLink, IpLinkDetailResponse } from "../types";
import { ResponsivePage } from "../components/ResponsivePage";
import "./screen-harmonization.css";
import "./IpLinksSupervision.css";

const ATLAS_LINK_BASE_URL = "https://atlas.unyc.io/lien";

function getAtlasLinkUrl(link: IpLink) {
  const atlasId = link.atlasLinkId ?? link.id;
  return atlasId ? `${ATLAS_LINK_BASE_URL}/${atlasId}` : null;
}

function renderHealthBadge(link: IpLink) {
  if (link.healthStatus === "connected") {
    return <span className="ip-links-health ip-links-health--connected">Connecté</span>;
  }

  if (link.healthStatus === "disconnected") {
    return <span className="ip-links-health ip-links-health--disconnected">Déconnecté</span>;
  }

  return <span className="ip-links-health ip-links-health--ignored">Non supervisé</span>;
}

function renderYesNoBadge(value: boolean) {
  return (
    <span className={`ip-links-yesno ${value ? "ip-links-yesno--yes" : "ip-links-yesno--no"}`}>
      {value ? "Oui" : "Non"}
    </span>
  );
}

export default function IpLinkDetail() {
  const navigate = useNavigate();
  const { reference } = useParams<{ reference: string }>();
  const [item, setItem] = useState<IpLink | null>(null);
  const [loading, setLoading] = useState(true);
  const [uptimeLoading, setUptimeLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      if (!reference) return;
      try {
        setLoading(true);
        setError("");
        setItem(null);
        const data = (await apiService.getIpLinkByReference(reference)) as IpLinkDetailResponse;
        setItem(data.item);
        setLoading(false);

        const linkId = data.item.atlasLinkId ?? data.item.id;
        if (linkId) {
          setUptimeLoading(true);
          try {
            const uptimeResponse = await apiService.getIpLinkUptime(linkId);
            setItem((current) => current ? { ...current, routerUptime: uptimeResponse.routerUptime || null } : current);
          } catch (uptimeError) {
            console.error(uptimeError);
          } finally {
            setUptimeLoading(false);
          }
        }
      } catch (err) {
        console.error(err);
        setError("Impossible de charger la fiche du lien IP");
        setLoading(false);
      }
    };

    void load();
  }, [reference]);

  const atlasUrl = useMemo(() => (item ? getAtlasLinkUrl(item) : null), [item]);

  return (
    <ResponsivePage
      title={item ? item.reference : "Fiche lien IP"}
      subtitle={item ? `${item.clientName} • ${item.collecteOperator || "Collecte non renseignée"}` : "Chargement de la fiche lien IP"}
      actions={[
        {
          label: "← Retour à la supervision des liens IP",
          onClick: () => navigate("/supervision-liens-ip"),
          variant: "secondary",
        },
      ]}
    >
      {loading ? (
        <section className="ip-links-table-card">
          <div className="ip-links-empty">Chargement de la fiche…</div>
        </section>
      ) : error || !item ? (
        <section className="ip-links-table-card">
          <div className="ip-links-empty">{error || "Lien IP introuvable"}</div>
        </section>
      ) : (
        <div className="ip-links-page">
          <section className="ip-links-table-card" style={{ padding: 24 }}>
            <div className="ip-links-supervision-card__top" style={{ marginBottom: 20 }}>
              <div>
                <div className="ip-links-supervision-card__reference">{item.reference}</div>
                <div className="ip-links-supervision-card__client">{item.clientName}</div>
              </div>
              {renderHealthBadge(item)}
            </div>

            <div className="harmonized-stats-grid" style={{ marginBottom: 20 }}>
              <div className="harmonized-stat-card ip-links-kpi-card ip-links-kpi-card--focus">
                <div>{item.healthLabel}</div>
                <div>État du lien</div>
              </div>
              <div className="harmonized-stat-card ip-links-kpi-card ip-links-kpi-card--connected">
                <div>{uptimeLoading ? "…" : item.routerUptime || "-"}</div>
                <div>Uptime</div>
              </div>
            </div>

            <div className="ip-links-supervision-card__meta" style={{ marginBottom: 20 }}>
              <div>
                <span>Client</span>
                <strong>{item.clientName}</strong>
              </div>
              <div>
                <span>Collecte</span>
                <strong>{item.collecteOperator || "-"}</strong>
              </div>
              <div>
                <span>Type</span>
                <strong>{item.type || "-"}</strong>
              </div>
              <div>
                <span>Débit max</span>
                <strong>{item.maxBandwidth || "-"}</strong>
              </div>
              <div>
                <span>État Atlas</span>
                <strong>{item.stateLabel || "-"}</strong>
              </div>
              <div>
                <span>GTR</span>
                <strong>{item.gtr || "-"}</strong>
              </div>
              <div>
                <span>Lien Atlas</span>
                <strong>
                  {atlasUrl ? <a href={atlasUrl} target="_blank" rel="noreferrer" className="ip-links-reference-link">Ouvrir Atlas</a> : "-"}
                </strong>
              </div>
            </div>

            <div className="ip-links-supervision-card__flags">
              <div>
                <span>Backup 4G</span>
                {renderYesNoBadge(item.backup4g)}
              </div>
              <div>
                <span>Firewall</span>
                {renderYesNoBadge(item.firewall)}
              </div>
            </div>

          </section>
        </div>
      )}
    </ResponsivePage>
  );
}

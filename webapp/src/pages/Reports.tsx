import { useState, useEffect, useCallback } from "react";
import moment from "moment";
import { apiService } from "../services/api.service";
import {
  ResponsiveMobileCard,
  ResponsiveMobileCards,
  ResponsivePage,
  ResponsiveSection,
  ResponsiveStat,
  ResponsiveStats,
} from "../components/ResponsivePage";
import { useResponsive } from "../hooks/useResponsive";
import type { Intervention, Technicien } from "../types";
import "./Reports.css";

interface ReportStats {
  total: number;
  completed: number;
  pending: number;
  inProgress: number;
  completionRate: number;
  avgDuration: number;
}

function Reports() {
  const { isMobile } = useResponsive();
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [dateRange, setDateRange] = useState({
    start: moment().subtract(30, "days").format("YYYY-MM-DD"),
    end: moment().format("YYYY-MM-DD"),
  });
  const [selectedTechnician, setSelectedTechnician] = useState("");
  const [technicians, setTechnicians] = useState<Technicien[]>([]);

  const loadTechnicians = useCallback(async () => {
    try {
      const data = await apiService.getTechniciens();
      setTechnicians(data.techniciens || data || []);
    } catch (error) {
      console.error("Error loading technicians:", error);
    }
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {
        dateDebut: dateRange.start,
        dateFin: dateRange.end,
        limit: "500",
      };

      if (selectedTechnician) {
        params.technicienId = selectedTechnician;
      }

      const data = await apiService.getInterventions(params);
      const all = data.interventions || [];

      setInterventions(all);

      const completed = all.filter(
        (i: { statut: string; heureArrivee?: string; heureDepart?: string }) =>
          i.statut === "terminee"
      );
      const pending = all.filter(
        (i: { statut: string; heureArrivee?: string; heureDepart?: string }) =>
          i.statut === "planifiee"
      );
      const inProgress = all.filter(
        (i: { statut: string; heureArrivee?: string; heureDepart?: string }) =>
          i.statut === "en_cours"
      );

      let avgDuration = 0;
      const withDuration = completed.filter(
        (i: { heureArrivee?: string; heureDepart?: string }) =>
          i.heureArrivee && i.heureDepart
      );

      if (withDuration.length > 0) {
        const totalMinutes = withDuration.reduce(
          (acc: number, i: { heureArrivee: string; heureDepart: string }) => {
            const start = moment(i.heureArrivee, "HH:mm");
            const end = moment(i.heureDepart, "HH:mm");
            return acc + end.diff(start, "minutes");
          },
          0
        );
        avgDuration = Math.round(totalMinutes / withDuration.length);
      }

      setStats({
        total: all.length,
        completed: completed.length,
        pending: pending.length,
        inProgress: inProgress.length,
        completionRate: all.length > 0 ? Math.round((completed.length / all.length) * 100) : 0,
        avgDuration,
      });
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  }, [dateRange, selectedTechnician]);

  useEffect(() => {
    loadTechnicians();
  }, [loadTechnicians]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const exportCSV = () => {
    const headers = ["N°", "Date", "Client", "Titre", "Technicien", "Statut", "Durée"];
    const rows = interventions.map((i) => [
      i.numero || "",
      moment(i.datePlanifiee).format("DD/MM/YYYY"),
      i.client?.nom || "",
      i.titre || "",
      i.technicien?.nom || "",
      i.statut || "",
      i.heureArrivee && i.heureDepart ? `${i.heureArrivee} - ${i.heureDepart}` : "",
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `interventions_${dateRange.start}_${dateRange.end}.csv`;
    link.click();
  };

  const exportPDF = async () => {
    const [{ jsPDF }, { default: autoTable }] = await Promise.all([
      import("jspdf"),
      import("jspdf-autotable"),
    ]);

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(249, 115, 22);
    doc.text("Rapport d'Interventions", pageWidth / 2, 20, { align: "center" });

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(
      `Période: ${moment(dateRange.start).format("DD/MM/YYYY")} - ${moment(dateRange.end).format("DD/MM/YYYY")}`,
      pageWidth / 2,
      28,
      { align: "center" }
    );

    if (selectedTechnician) {
      const tech = technicians.find((t) => t.id === selectedTechnician);
      doc.text(`Technicien: ${tech?.nom || "N/A"}`, pageWidth / 2, 34, { align: "center" });
    }

    let y = 45;
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("Résumé", 14, y);

    y += 8;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Total interventions: ${stats?.total || 0}`, 14, y);
    doc.text(`Terminées: ${stats?.completed || 0} (${stats?.completionRate || 0}%)`, 80, y);
    y += 6;
    doc.text(`En cours: ${stats?.inProgress || 0}`, 14, y);
    doc.text(`Planifiées: ${stats?.pending || 0}`, 80, y);
    y += 6;
    doc.text(`Durée moyenne: ${stats?.avgDuration || 0} min`, 14, y);

    y += 12;

    autoTable(doc, {
      startY: y,
      head: [["N°", "Date", "Client", "Titre", "Technicien", "Statut"]],
      body: interventions.slice(0, 50).map((i) => [
        i.numero || "-",
        moment(i.datePlanifiee).format("DD/MM/YY"),
        i.client?.nom?.substring(0, 20) || "-",
        (i.titre || "").substring(0, 25),
        i.technicien?.nom?.substring(0, 15) || "-",
        getStatusLabel(i.statut),
      ]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [249, 115, 22], textColor: 255 },
      alternateRowStyles: { fillColor: [255, 247, 237] },
    });

    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Généré le ${moment().format("DD/MM/YYYY HH:mm")} - TelcoManager`,
      pageWidth / 2,
      pageHeight - 10,
      { align: "center" }
    );

    doc.save(`rapport_interventions_${dateRange.start}_${dateRange.end}.pdf`);
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      planifiee: "Planifiée",
      en_cours: "En cours",
      terminee: "Terminée",
      annulee: "Annulée",
    };
    return labels[status] || status;
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string; color: string }> = {
      planifiee: { bg: "rgba(59, 130, 246, 0.15)", color: "#3b82f6" },
      en_cours: { bg: "rgba(245, 158, 11, 0.15)", color: "#d97706" },
      terminee: { bg: "rgba(16, 185, 129, 0.15)", color: "#10b981" },
      annulee: { bg: "rgba(239, 68, 68, 0.15)", color: "#ef4444" },
    };
    return styles[status] || { bg: "var(--bg-secondary)", color: "var(--text-secondary)" };
  };

  const selectedTechnicianName =
    technicians.find((technician) => technician.id === selectedTechnician)?.nom || "Tous les techniciens";

  const periodLabel = `${moment(dateRange.start).format("DD MMM")} - ${moment(dateRange.end).format("DD MMM YYYY")}`;

  return (
    <ResponsivePage
      title="Rapports"
      subtitle="Suivi d'activité, synthèse rapide et exports prêts à partager"
      actions={[
        {
          label: "Export CSV",
          onClick: exportCSV,
          variant: "secondary",
          disabled: interventions.length === 0,
        },
        {
          label: "Export PDF",
          onClick: exportPDF,
          variant: "primary",
          disabled: !stats,
        },
      ]}
      filters={
        <div className="reports-filters-grid">
          <div className="reports-filter-field">
            <label className="reports-filter-label">Date début</label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="reports-filter-input"
            />
          </div>
          <div className="reports-filter-field">
            <label className="reports-filter-label">Date fin</label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="reports-filter-input"
            />
          </div>
          <div className="reports-filter-field reports-filter-field--wide">
            <label className="reports-filter-label">Technicien</label>
            <select
              value={selectedTechnician}
              onChange={(e) => setSelectedTechnician(e.target.value)}
              className="reports-filter-input"
            >
              <option value="">Tous les techniciens</option>
              {technicians.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nom}
                </option>
              ))}
            </select>
          </div>
          <div className="reports-filter-summary">
            <span className="reports-filter-chip">Période: {periodLabel}</span>
            <span className="reports-filter-chip">Vue: {selectedTechnicianName}</span>
          </div>
        </div>
      }
    >
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : (
        <>
          {stats ? (
            <ResponsiveStats>
              <ResponsiveStat value={stats.total} label="Interventions totales" />
              <ResponsiveStat value={stats.completed} label="Terminées" />
              <ResponsiveStat value={stats.pending} label="Planifiées" />
              <ResponsiveStat value={stats.inProgress} label="En cours" />
              <ResponsiveStat value={`${stats.completionRate}%`} label="Taux de complétion" />
              <ResponsiveStat value={`${stats.avgDuration} min`} label="Durée moyenne" />
            </ResponsiveStats>
          ) : null}

          <div className="reports-overview-grid">
            <ResponsiveSection title="Synthèse de la période">
              <div className="reports-overview-list">
                <div className="reports-overview-item">
                  <span className="reports-overview-kicker">Période analysée</span>
                  <strong>{periodLabel}</strong>
                  <p>Données filtrées pour simplifier la lecture et les exports.</p>
                </div>
                <div className="reports-overview-item">
                  <span className="reports-overview-kicker">Technicien</span>
                  <strong>{selectedTechnicianName}</strong>
                  <p>Affichage global ou focalisé selon le besoin terrain.</p>
                </div>
              </div>
            </ResponsiveSection>

            <ResponsiveSection title="Répartition des statuts">
              <div className="reports-status-stack">
                {stats
                  ? [
                      { label: "Terminées", value: stats.completed, tone: "success" },
                      { label: "En cours", value: stats.inProgress, tone: "warning" },
                      { label: "Planifiées", value: stats.pending, tone: "info" },
                    ].map((item) => {
                      const percentage = stats.total > 0 ? Math.round((item.value / stats.total) * 100) : 0;
                      return (
                        <div key={item.label} className="reports-status-row">
                          <div>
                            <div className="reports-status-label">{item.label}</div>
                            <div className="reports-status-meta">{item.value} intervention(s)</div>
                          </div>
                          <div className={`reports-status-pill reports-status-pill--${item.tone}`}>
                            {percentage}%
                          </div>
                        </div>
                      );
                    })
                  : null}
              </div>
            </ResponsiveSection>
          </div>

          <ResponsiveSection title={`Interventions (${interventions.length})`}>
            {interventions.length === 0 ? (
              <div className="reports-empty-state">
                <div className="reports-empty-state__icon">📭</div>
                <h3>Aucune intervention trouvée</h3>
                <p>Modifiez les filtres pour afficher des résultats.</p>
              </div>
            ) : isMobile ? (
              <ResponsiveMobileCards>
                {interventions.slice(0, 100).map((intervention) => {
                  const badge = getStatusBadge(intervention.statut);

                  return (
                    <ResponsiveMobileCard key={intervention.id}>
                      <div className="responsive-mobile-card__header">
                        <div>
                          <div className="responsive-mobile-card__title">
                            #{intervention.numero || "-"}
                          </div>
                          <div className="reports-mobile-date">
                            {moment(intervention.datePlanifiee).format("DD/MM/YYYY")}
                          </div>
                        </div>
                        <span
                          className="responsive-badge"
                          style={{ backgroundColor: badge.bg, color: badge.color }}
                        >
                          {getStatusLabel(intervention.statut)}
                        </span>
                      </div>
                      <div className="responsive-mobile-card__details">
                        <div className="reports-mobile-field">
                          <span className="reports-mobile-label">Client</span>
                          <span>{intervention.client?.nom || "-"}</span>
                        </div>
                        <div className="reports-mobile-field">
                          <span className="reports-mobile-label">Titre</span>
                          <span>{intervention.titre || "-"}</span>
                        </div>
                        <div className="reports-mobile-field">
                          <span className="reports-mobile-label">Technicien</span>
                          <span>{intervention.technicien?.nom || "Non assigné"}</span>
                        </div>
                      </div>
                    </ResponsiveMobileCard>
                  );
                })}
              </ResponsiveMobileCards>
            ) : (
              <div className="reports-table-wrap">
                <table className="table reports-table">
                  <thead>
                    <tr>
                      <th>N°</th>
                      <th>Date</th>
                      <th>Client</th>
                      <th>Titre</th>
                      <th>Technicien</th>
                      <th>Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {interventions.slice(0, 100).map((intervention) => {
                      const badge = getStatusBadge(intervention.statut);
                      return (
                        <tr key={intervention.id}>
                          <td className="reports-cell-strong">#{intervention.numero || "-"}</td>
                          <td>{moment(intervention.datePlanifiee).format("DD/MM/YYYY")}</td>
                          <td>{intervention.client?.nom || "-"}</td>
                          <td className="reports-cell-muted">{intervention.titre || "-"}</td>
                          <td>{intervention.technicien?.nom || "Non assigné"}</td>
                          <td>
                            <span
                              className="responsive-badge"
                              style={{ backgroundColor: badge.bg, color: badge.color }}
                            >
                              {getStatusLabel(intervention.statut)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {interventions.length > 100 ? (
              <p className="reports-limit-note">
                Affichage limité à 100 résultats. Exportez en CSV pour obtenir toutes les données.
              </p>
            ) : null}
          </ResponsiveSection>
        </>
      )}
    </ResponsivePage>
  );
}

export default Reports;

import { useState, useEffect, useCallback } from "react";
import type { AxiosError } from "axios";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { apiService } from "../services/api.service";
import { generateInterventionPDF } from "../utils/pdfGenerator";
import { formatDateTimeLocal } from "../utils/dateUtils";
import InterventionLocation from "../components/InterventionLocation";
import PhotoCapture from "../components/PhotoCapture";
import InterventionWorkflow from "../components/InterventionWorkflow";
import { useAuth } from "../contexts/useAuth";
import {
  canEditInterventionByRole,
  findDetailArtifactReport,
  getInterventionBackState,
  isInterventionClosed,
  mapDetailArtifactAttachments,
  mapDetailArtifactPhotos,
} from "./intervention-detail.utils";
import { getInterventionDetailStatusBadgeConfig } from "./intervention-detail-status.utils";

import type { Client, Intervention, Photo, Technicien } from "../types";

type InterventionLocationState = {
  from?: string;
};

type ApiErrorResponse = {
  message?: string;
  error?: string;
  lockedBy?: string;
};

const InterventionDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  // Handle back navigation - return to original view if came from calendar or all
  const handleGoBack = () => {
    const fromView = (location.state as InterventionLocationState | null)?.from;
    const target = getInterventionBackState(fromView);
    navigate(target.path, target.state ? { state: target.state } : undefined);
  };

  // Determine if user can edit based on role and intervention status
  const canEdit = (statut: string) =>
    canEditInterventionByRole(user?.role, statut);

  const isClosedIntervention = (statut: string) =>
    isInterventionClosed(statut);

  const [intervention, setIntervention] = useState<Intervention | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loadedAttachments, setLoadedAttachments] = useState<
    Array<{ name: string; url: string; type: string }>
  >([]);
  const [reportUrl, setReportUrl] = useState<string | null>(null);

  // Form data
  const [formData, setFormData] = useState({
    titre: "",
    description: "",
    datePlanifiee: "",
    statut: "",
    notes: "",
    clientId: "",
    technicienId: "",
  });

  // Liste des clients et techniciens pour les sélecteurs
  const [clients, setClients] = useState<Client[]>([]);
  const [techniciens, setTechniciens] = useState<Technicien[]>([]);

  const loadIntervention = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      if (!id) return;
      const data = await apiService.getInterventionById(id);
      setIntervention(data);

      try {
        const artifacts = await apiService.getInterventionArtifacts(id);
        const loadedPhotos = mapDetailArtifactPhotos(artifacts);
        setPhotos(loadedPhotos);

        const otherFiles = mapDetailArtifactAttachments(artifacts);
        setLoadedAttachments(otherFiles);

        const report = findDetailArtifactReport(artifacts);
        setReportUrl(report?.url ?? null);
      } catch (e) {
        console.warn("Failed to load artifacts", e);
      }

      if (!isEditing) {
        setFormData({
          titre: data.titre,
          description: data.description || "",
          datePlanifiee: data.datePlanifiee
            ? formatDateTimeLocal(data.datePlanifiee)
            : "",
          statut: data.statut,
          notes: data.notes || "",
          clientId: data.client.id,
          technicienId: data.technicien?.id || "",
        });
      }
    } catch (err: unknown) {
      const axiosError = err as AxiosError<ApiErrorResponse>;
      setError(
        axiosError.response?.data?.message || "Erreur lors du chargement"
      );
    } finally {
      if (!silent) setLoading(false);
    }
  }, [id, isEditing]);

  const loadClientsAndTechniciens = useCallback(async () => {
    try {
      const [clientsData, techniciensData] = await Promise.all([
        apiService.getClients({ limit: 1000 }),
        apiService.getTechniciens({ limit: 1000 }),
      ]);
      setClients(clientsData.clients || clientsData);
      setTechniciens(techniciensData.techniciens || techniciensData);
    } catch (err) {
      console.error("Erreur lors du chargement des listes:", err);
    }
  }, []);

  useEffect(() => {
    loadIntervention();
    loadClientsAndTechniciens();

    // Lock logic
    const lock = async () => {
      if (!id) return;
      try {
        await apiService.lockIntervention(id);
      } catch (e: unknown) {
        const axiosError = e as AxiosError<ApiErrorResponse>;
        if (axiosError.response?.status === 409) {
          alert(
            `ATTENTION: Cette intervention est actuellement modifiée par ${
              axiosError.response.data?.lockedBy || "un autre utilisateur"
            }.`
          );
        }
      }
    };
    lock();

    // Polling (Auto-Refresh)
    const interval = setInterval(() => {
      loadIntervention(true); // Silent reload
    }, 10000); // 10 seconds

    return () => {
      clearInterval(interval);
      if (id) apiService.unlockIntervention(id).catch(() => {});

      // Stop all cameras when leaving page
      document.querySelectorAll("video").forEach((video) => {
        if (video.srcObject) {
          const stream = video.srcObject as MediaStream;
          stream.getTracks().forEach((track) => track.stop());
          video.srcObject = null;
        }
      });
    };
  }, [id, loadClientsAndTechniciens, loadIntervention]);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError("");

      const updateData = {
        titre: formData.titre,
        description: formData.description,
        datePlanifiee: new Date(formData.datePlanifiee).toISOString(),
        statut: formData.statut,
        notes: formData.notes,
        clientId: formData.clientId,
        technicienId: formData.technicienId || null,
      };

      await apiService.updateIntervention(id!, updateData);
      await loadIntervention();
      setIsEditing(false);
      alert("Intervention mise à jour avec succès !");
    } catch (err: unknown) {
      const axiosError = err as AxiosError<ApiErrorResponse>;
      setError(
        axiosError.response?.data?.message || "Erreur lors de la sauvegarde"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (intervention) {
      setFormData({
        titre: intervention.titre,
        description: intervention.description || "",
        datePlanifiee: intervention.datePlanifiee
          ? formatDateTimeLocal(intervention.datePlanifiee)
          : "",
        statut: intervention.statut,
        notes: intervention.notes || "",
        clientId: intervention.client?.id || "",
        technicienId: intervention.technicien?.id || "",
      });
    }
    setIsEditing(false);
    setError("");
  };

  // Prise en charge rapide (pour techniciens)
  const handleTakeCharge = async () => {
    if (!id) return;
    try {
      await apiService.updateInterventionStatus(id, {
        statut: "en_cours",
        datePriseEnCharge: new Date().toISOString(),
      });
      loadIntervention();
      alert("Intervention prise en charge !");
    } catch (err: unknown) {
      const axiosError = err as AxiosError<ApiErrorResponse>;
      setError(
        axiosError.response?.data?.error || "Erreur lors de la prise en charge"
      );
    }
  };

  // Quick status change (for admins)
  const handleQuickStatusChange = async (newStatus: string) => {
    if (!id) return;
    try {
      await apiService.updateInterventionStatus(id, { statut: newStatus });
      loadIntervention();
    } catch (err: unknown) {
      const axiosError = err as AxiosError<ApiErrorResponse>;
      setError(
        axiosError.response?.data?.error ||
          "Erreur lors du changement de statut"
      );
    }
  };

  // Quick technician reassignment (for admins)
  const handleQuickReassign = async (techId: string) => {
    if (!id) return;
    try {
      await apiService.updateIntervention(id, { technicienId: techId || null });
      loadIntervention();
    } catch (err: unknown) {
      const axiosError = err as AxiosError<ApiErrorResponse>;
      setError(
        axiosError.response?.data?.error || "Erreur lors de la réassignation"
      );
    }
  };

  const getStatusBadge = (statut: string) => {
    const badge = getInterventionDetailStatusBadgeConfig(statut);
    return <span className={`badge ${badge.className} `}>{badge.label}</span>;
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading">Chargement...</div>
      </div>
    );
  }

  if (!intervention) {
    return (
      <div className="page-container">
        <div className="error-message">Intervention non trouvée</div>
        <button onClick={handleGoBack} className="btn btn-secondary">
          ← Retour à la liste
        </button>
      </div>
    );
  }

  return (
    <div className="page-container intervention-detail">
      {/* En-tête */}
      <div className="detail-header">
        <div className="header-info">
          <button onClick={handleGoBack} className="btn btn-back">
            ← Retour
          </button>
          <div className="title-row">
            <h1>
              <span className="intervention-number">
                {intervention.numero || "------"}
              </span>
              {intervention.titre}
            </h1>
            {!isEditing && getStatusBadge(intervention.statut)}
          </div>
        </div>
        <div className="header-actions responsive-stack" style={{ justifyContent: "flex-end" }}>
          {!isEditing ? (
            <>
              {/* PDF uniquement pour interventions terminées */}
              {isClosedIntervention(intervention.statut) && (
                <button
                  onClick={() => {
                    if (reportUrl) {
                      window.open(reportUrl, "_blank");
                    } else {
                      void generateInterventionPDF(intervention);
                    }
                  }}
                  className="btn btn-secondary btn-export-pdf"
                >
                  📄 {reportUrl ? "Voir le rapport" : "Télécharger PDF"}
                </button>
              )}
              {/* Bouton Prendre en charge pour techniciens (en haut à droite) */}
              {user?.role === "technicien" &&
                intervention.statut === "planifiee" && (
                  <button
                    onClick={handleTakeCharge}
                    className="btn btn-success"
                  >
                    ▶️ Prendre en charge
                  </button>
                )}
              {/* Quick status actions for admins */}
              {user?.role === "admin" &&
                !isClosedIntervention(intervention.statut) && (
                  <div className="responsive-stack" style={{ justifyContent: "flex-end" }}>
                    {intervention.statut === "planifiee" && (
                      <button
                        onClick={() => handleQuickStatusChange("en_cours")}
                        className="btn"
                        style={{
                          backgroundColor: "#f59e0b",
                          color: "white",
                          border: "none",
                        }}
                      >
                        ▶️ Démarrer
                      </button>
                    )}
                    {intervention.statut === "en_cours" && (
                      <button
                        onClick={() => handleQuickStatusChange("terminee")}
                        className="btn"
                        style={{
                          backgroundColor: "#10b981",
                          color: "white",
                          border: "none",
                        }}
                      >
                        ✓ Terminer
                      </button>
                    )}
                    {(intervention.statut as string) !== "annulee" && (
                      <button
                        onClick={() => {
                          if (
                            confirm(
                              "Voulez-vous vraiment annuler cette intervention ?"
                            )
                          ) {
                            handleQuickStatusChange("annulee");
                          }
                        }}
                        className="btn"
                        style={{
                          backgroundColor: "#ef4444",
                          color: "white",
                          border: "none",
                        }}
                      >
                        ✕ Annuler
                      </button>
                    )}
                  </div>
                )}
              {/* Bouton Modifier pour admins uniquement */}
              {user?.role === "admin" && canEdit(intervention.statut) && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="btn btn-primary"
                >
                  ✏️ Modifier
                </button>
              )}
              {isClosedIntervention(intervention.statut) && (
                <span className="badge badge-info">🔒 Lecture seule</span>
              )}
            </>
          ) : (
            <>
              <button
                onClick={handleCancel}
                className="btn btn-secondary"
                disabled={saving}
              >
                Annuler
              </button>
              <button
                onClick={handleSave}
                className="btn btn-success"
                disabled={saving}
              >
                {saving ? "Enregistrement..." : "💾 Enregistrer"}
              </button>
            </>
          )}
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {/* === WORKFLOW TECHNICIEN (en haut pour mobile) === */}
      {user?.role === "technicien" &&
        !isClosedIntervention(intervention.statut) && (
          <InterventionWorkflow
            intervention={intervention} // Pass full object including client data
            photos={photos} // Pass photos for upload
            onStatusChange={loadIntervention}
            readOnly={isClosedIntervention(intervention.statut)}
          />
        )}

      {/* Carte Informations Générales */}
      <div className="info-card">
        <h3>📋 Informations générales</h3>
        <div className="info-grid">
          <div className="info-item">
            <label>Client</label>
            {!isEditing ? (
              <div className="info-value">
                <strong>{intervention.client?.nom}</strong>
                <br />
                <small>
                  {intervention.client?.contact} -{" "}
                  {intervention.client?.telephone}
                </small>
              </div>
            ) : (
              <select
                value={formData.clientId}
                onChange={(e) =>
                  setFormData({ ...formData, clientId: e.target.value })
                }
                className="edit-input"
              >
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.nom}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Adresse client (inline for admins) */}
          {user?.role === "admin" && intervention.client?.rue && (
            <div className="info-item">
              <label>Adresse</label>
              <div className="info-value">
                {intervention.client?.rue}
                <br />
                <small>
                  {intervention.client?.codePostal} {intervention.client?.ville}
                </small>
              </div>
            </div>
          )}

          <div className="info-item">
            <label>Technicien assigné</label>
            {!isEditing ? (
              <div className="info-value">
                {user?.role === "admin" &&
                !isClosedIntervention(intervention.statut) ? (
                  /* Quick reassignment dropdown for admins */
                  <select
                    value={intervention.technicien?.id || ""}
                    onChange={(e) => handleQuickReassign(e.target.value)}
                    className="input"
                    style={{
                      maxWidth: "280px",
                      padding: "10px 14px",
                      border: "2px solid var(--primary-color)",
                      borderRadius: "8px",
                      backgroundColor: "var(--bg-secondary)",
                      fontWeight: 500,
                      cursor: "pointer",
                    }}
                  >
                    <option value="">🔄 Non assigné</option>
                    {techniciens
                      .filter((t) => t.role !== "admin")
                      .map((tech) => (
                        <option key={tech.id} value={tech.id}>
                          👤 {tech.nom} (@{tech.username})
                        </option>
                      ))}
                  </select>
                ) : /* Read-only display for technicians */
                intervention.technicien ? (
                  <>
                    <strong>{intervention.technicien.nom}</strong>
                    <br />
                    <small>@{intervention.technicien.username}</small>
                  </>
                ) : intervention.technicienNom ? (
                  <>
                    <strong>{intervention.technicienNom}</strong>
                    <br />
                    <small style={{ color: "#ef4444" }}>
                      👤 Utilisateur supprimé
                    </small>
                  </>
                ) : (
                  <em className="text-muted">Non assigné</em>
                )}
              </div>
            ) : (
              <select
                value={formData.technicienId}
                onChange={(e) =>
                  setFormData({ ...formData, technicienId: e.target.value })
                }
                className="edit-input"
              >
                <option value="">Non assigné</option>
                {techniciens.map((tech) => (
                  <option key={tech.id} value={tech.id}>
                    {tech.nom} (@{tech.username})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="info-item">
            <label>Date planifiée</label>
            {!isEditing ? (
              <div className="info-value">
                {new Date(intervention.datePlanifiee).toLocaleString("fr-FR")}
              </div>
            ) : (
              <input
                type="datetime-local"
                value={formData.datePlanifiee}
                onChange={(e) =>
                  setFormData({ ...formData, datePlanifiee: e.target.value })
                }
                className="edit-input"
              />
            )}
          </div>

          <div className="info-item">
            <label>Statut</label>
            {!isEditing ? (
              <div className="info-value">
                {getStatusBadge(intervention.statut)}
              </div>
            ) : (
              <select
                value={formData.statut}
                onChange={(e) =>
                  setFormData({ ...formData, statut: e.target.value })
                }
                className="edit-input"
              >
                <option value="planifiee">🔵 Planifiée</option>
                <option value="en_cours">🟠 En cours</option>
                <option value="terminee">🟢 Terminée</option>
                <option value="annulee">🔴 Annulée</option>
              </select>
            )}
          </div>

          {intervention.dateRealisee && (
            <div className="info-item">
              <label>Date de réalisation</label>
              <div className="info-value">
                {new Date(intervention.dateRealisee).toLocaleString("fr-FR")}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Carte Localisation Client - Only for technicians */}
      {user?.role !== "admin" && intervention.client?.rue && (
        <InterventionLocation
          clientAddress={intervention.client?.rue}
          clientCity={intervention.client?.ville || ""}
          clientPostalCode={intervention.client?.codePostal || ""}
        />
      )}

      {/* Carte Description */}
      <div className="info-card">
        <h3>📝 Description</h3>
        {!isEditing ? (
          <div className="description-content">
            {intervention.description || (
              <em className="text-muted">Aucune description</em>
            )}
          </div>
        ) : (
          <textarea
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            className="edit-input"
            rows={4}
            placeholder="Description de l'intervention..."
          />
        )}
      </div>

      {/* Carte Commentaires */}
      <div className="info-card comment-section">
        <h3>💬 Commentaires / Notes</h3>
        {!isEditing ? (
          <div className="description-content">
            {intervention.notes || (
              <em className="text-muted">Aucun commentaire</em>
            )}
          </div>
        ) : (
          <textarea
            value={formData.notes}
            onChange={(e) =>
              setFormData({ ...formData, notes: e.target.value })
            }
            className="edit-input"
            rows={6}
            placeholder="Ajoutez des commentaires, observations ou notes techniques..."
          />
        )}
      </div>

      {/* Carte Rapport Technicien (Compte Rendu) */}
      <div
        className="info-card"
        style={{ borderLeft: "4px solid var(--success-color, #10b981)" }}
      >
        <h3>📄 Rapport d'Intervention (Technicien)</h3>
        <div className="description-content">
          {intervention.commentaireTechnicien ? (
            <div style={{ whiteSpace: "pre-wrap" }}>
              {intervention.commentaireTechnicien}
            </div>
          ) : (
            <em className="text-muted">Aucun rapport saisi pour le moment.</em>
          )}
        </div>
      </div>

      {/* Timeline / Historique (Admin only) */}
      {user?.role === "admin" && (
        <div
          className="info-card"
          style={{ borderLeft: "4px solid var(--primary-color, #3b82f6)" }}
        >
          <h3>📜 Historique</h3>
          <div className="mobile-stack-list">
            {/* Création */}
            <div className="mobile-history-item">
              <div
                style={{
                  width: "10px",
                  height: "10px",
                  borderRadius: "50%",
                  backgroundColor: "#8b5cf6",
                  flexShrink: 0,
                }}
              />
              <div>
                <strong style={{ color: "var(--text-primary)" }}>
                  Création
                </strong>
                <div
                  style={{
                    fontSize: "0.875rem",
                    color: "var(--text-secondary)",
                  }}
                >
                  {intervention.createdAt
                    ? new Date(intervention.createdAt).toLocaleString("fr-FR")
                    : "Date inconnue"}
                </div>
              </div>
            </div>

            {/* Planification (date prévue du RDV) */}
            <div className="mobile-history-item">
              <div
                style={{
                  width: "10px",
                  height: "10px",
                  borderRadius: "50%",
                  backgroundColor: "#3b82f6",
                  flexShrink: 0,
                }}
              />
              <div>
                <strong style={{ color: "var(--text-primary)" }}>
                  Rendez-vous prévu
                </strong>
                <div
                  style={{
                    fontSize: "0.875rem",
                    color: "var(--text-secondary)",
                  }}
                >
                  {new Date(intervention.datePlanifiee).toLocaleString("fr-FR")}
                </div>
              </div>
            </div>

            {/* Arrivée sur site */}
            {intervention.heureArrivee && (
              <div className="mobile-history-item">
                <div
                  style={{
                    width: "10px",
                    height: "10px",
                    borderRadius: "50%",
                    backgroundColor: "#f59e0b",
                    flexShrink: 0,
                  }}
                />
                <div>
                  <strong style={{ color: "var(--text-primary)" }}>
                    Arrivée sur site
                  </strong>
                  <div
                    style={{
                      fontSize: "0.875rem",
                      color: "var(--text-secondary)",
                    }}
                  >
                    {new Date(intervention.heureArrivee).toLocaleString(
                      "fr-FR"
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Départ du site */}
            {intervention.heureDepart && (
              <div className="mobile-history-item">
                <div
                  style={{
                    width: "10px",
                    height: "10px",
                    borderRadius: "50%",
                    backgroundColor: "#f59e0b",
                    flexShrink: 0,
                  }}
                />
                <div>
                  <strong style={{ color: "var(--text-primary)" }}>
                    Départ du site
                  </strong>
                  <div
                    style={{
                      fontSize: "0.875rem",
                      color: "var(--text-secondary)",
                    }}
                  >
                    {new Date(intervention.heureDepart).toLocaleString("fr-FR")}
                  </div>
                </div>
              </div>
            )}

            {/* Réalisation */}
            {intervention.dateRealisee && (
              <div className="mobile-history-item">
                <div
                  style={{
                    width: "10px",
                    height: "10px",
                    borderRadius: "50%",
                    backgroundColor: "#10b981",
                    flexShrink: 0,
                  }}
                />
                <div>
                  <strong style={{ color: "var(--text-primary)" }}>
                    Terminée
                  </strong>
                  <div
                    style={{
                      fontSize: "0.875rem",
                      color: "var(--text-secondary)",
                    }}
                  >
                    {new Date(intervention.dateRealisee).toLocaleString(
                      "fr-FR"
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Statut actuel */}
            {intervention.statut === "annulee" && (
              <div className="mobile-history-item">
                <div
                  style={{
                    width: "10px",
                    height: "10px",
                    borderRadius: "50%",
                    backgroundColor: "#ef4444",
                    flexShrink: 0,
                  }}
                />
                <div>
                  <strong style={{ color: "var(--text-primary)" }}>
                    Annulée
                  </strong>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Future: Carte Équipements */}
      {intervention.equipements && intervention.equipements.length > 0 && (
        <div className="info-card">
          <h3>🔧 Équipements utilisés</h3>
          <div className="equipments-list">
            {intervention.equipements.map((eq) => (
              <div key={eq.id} className="equipment-item">
                {eq.stock?.nomMateriel} - {eq.action} (x{eq.quantite})
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Photos et Fichiers joints - côte à côte */}
      <div className="mobile-card-grid" style={{ marginTop: "15px", alignItems: "stretch" }}>
        {/* Photos d'intervention */}
        <div
          style={{
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <PhotoCapture
            photos={photos}
            onPhotoAdd={(photo) => setPhotos([...photos, photo])}
            onPhotoRemove={(id) => setPhotos(photos.filter((p) => p.id !== id))}
            readOnly={
              intervention.statut === "terminee" ||
              intervention.statut === "annulee"
            }
            style={{ height: "100%", margin: 0 }}
          />
        </div>

        {/* Fichiers joints */}
        {loadedAttachments.length > 0 && (
          <div className="info-card" style={{ height: "100%", margin: 0 }}>
            <h3 style={{ marginBottom: "10px", color: "var(--primary-color)" }}>
              📎 Fichiers joints ({loadedAttachments.length})
            </h3>
            <div>
              {loadedAttachments.map((file, index) => (
                <div key={index} className="mobile-list-row" style={{ padding: "10px 15px", backgroundColor: "var(--bg-secondary)", borderRadius: "8px", marginBottom: "8px" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    <span style={{ fontSize: "20px" }}>
                      {file.name.endsWith(".pdf")
                        ? "📄"
                        : file.name.match(/\.(jpg|jpeg|png|gif)$/i)
                        ? "🖼️"
                        : file.name.match(/\.(doc|docx)$/i)
                        ? "📝"
                        : file.name.match(/\.(xls|xlsx)$/i)
                        ? "📊"
                        : "📁"}
                    </span>
                    <span
                      style={{
                        fontWeight: "500",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {file.name}
                    </span>
                  </div>
                  <a
                    href={file.url}
                    download={file.name}
                    className="btn btn-secondary"
                    style={{
                      fontSize: "12px",
                      padding: "6px 12px",
                      flexShrink: 0,
                      marginLeft: "10px",
                    }}
                  >
                    ⬇️
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InterventionDetail;

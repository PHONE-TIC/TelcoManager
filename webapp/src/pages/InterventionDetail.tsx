import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { apiService } from "../services/api.service";
import { generateInterventionPDF } from "../utils/pdfGenerator";
import { formatDateTimeLocal } from "../utils/dateUtils";
import InterventionLocation from "../components/InterventionLocation";
import PhotoCapture from "../components/PhotoCapture";
import InterventionWorkflow from "../components/InterventionWorkflow";
import { useAuth } from "../contexts/AuthContext";

interface Intervention {
  id: string;
  numero?: number;
  titre: string;
  description: string;
  datePlanifiee: string;
  dateRealisee?: string;
  statut: string;
  notes?: string;
  heureArrivee?: string;
  heureDepart?: string;
  signature?: string;
  commentaireTechnicien?: string;
  createdAt?: string;
  client: {
    id: string;
    nom: string;
    contact: string;
    telephone: string;
    rue?: string;
    codePostal?: string;
    ville?: string;
  };
  technicien?: {
    id: string;
    nom: string;
    username: string;
  };
  technicienNom?: string; // Fallback name when technicien is deleted
  equipements?: any[];
}

const InterventionDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  // Handle back navigation - return to original view if came from calendar or all
  const handleGoBack = () => {
    const fromView = (location.state as any)?.from;
    if (fromView === "calendar") {
      navigate("/interventions", { state: { viewMode: "calendar" } });
    } else if (fromView === "all") {
      navigate("/interventions", { state: { viewMode: "all" } });
    } else {
      navigate("/interventions");
    }
  };

  // Determine if user can edit based on role and intervention status
  const canEdit = (statut: string) => {
    if (user?.role === "admin") return true;
    // Technicians can only edit interventions that are 'planifiee' or 'en_cours'
    return statut === "planifiee" || statut === "en_cours";
  };

  const isClosedIntervention = (statut: string) => {
    return statut === "terminee" || statut === "annulee";
  };

  const [intervention, setIntervention] = useState<Intervention | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [photos, setPhotos] = useState<any[]>([]);

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
  const [clients, setClients] = useState<any[]>([]);
  const [techniciens, setTechniciens] = useState<any[]>([]);

  useEffect(() => {
    loadIntervention();
    loadClientsAndTechniciens();

    // Lock logic
    const lock = async () => {
      if (!id) return;
      try {
        await apiService.lockIntervention(id);
      } catch (e: any) {
        if (e.response?.status === 409) {
          alert(
            `ATTENTION: Cette intervention est actuellement modifiée par ${
              e.response.data.lockedBy || "un autre utilisateur"
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
  }, [id]);

  const loadIntervention = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const data = await apiService.getInterventionById(id!);
      setIntervention(data);
      setIntervention(data);

      // Load artifacts (photos)
      try {
        const artifacts = await apiService.getInterventionArtifacts(id!);
        const loadedPhotos = artifacts
          .filter((f: any) => f.type.startsWith("photo_"))
          .map((f: any) => ({
            id: f.filename,
            dataUrl: f.url,
            type: f.type.replace("photo_", "") as "avant" | "apres" | "autre",
            timestamp: new Date(f.createdAt),
            caption: f.filename,
          }));
        setPhotos(loadedPhotos);
      } catch (e) {
        console.warn("Failed to load artifacts", e);
      }

      if (!isEditing) {
        // Don't overwrite if editing
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
    } catch (err: any) {
      setError(err.response?.data?.message || "Erreur lors du chargement");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const loadClientsAndTechniciens = async () => {
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
  };

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
    } catch (err: any) {
      setError(err.response?.data?.message || "Erreur lors de la sauvegarde");
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
        clientId: intervention.client.id,
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
    } catch (err: any) {
      setError(
        err.response?.data?.error || "Erreur lors de la prise en charge"
      );
    }
  };

  // Quick status change (for admins)
  const handleQuickStatusChange = async (newStatus: string) => {
    if (!id) return;
    try {
      await apiService.updateInterventionStatus(id, { statut: newStatus });
      loadIntervention();
    } catch (err: any) {
      setError(
        err.response?.data?.error || "Erreur lors du changement de statut"
      );
    }
  };

  // Quick technician reassignment (for admins)
  const handleQuickReassign = async (techId: string) => {
    if (!id) return;
    try {
      await apiService.updateIntervention(id, { technicienId: techId || null });
      loadIntervention();
    } catch (err: any) {
      setError(err.response?.data?.error || "Erreur lors de la réassignation");
    }
  };

  const getStatusBadge = (statut: string) => {
    const badges: { [key: string]: { label: string; class: string } } = {
      planifiee: { label: "🔵 Planifiée", class: "badge-info" },
      en_cours: { label: "🟠 En cours", class: "badge-warning" }, // Yellow per request
      terminee: { label: "🟢 Terminée", class: "badge-success" },
      annulee: { label: "🔴 Annulée", class: "badge-danger" },
    };
    const badge = badges[statut] || { label: statut, class: "badge-gray" };
    return <span className={`badge ${badge.class} `}>{badge.label}</span>;
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
        <div className="header-actions">
          {!isEditing ? (
            <>
              {/* PDF uniquement pour interventions terminées */}
              {isClosedIntervention(intervention.statut) && (
                <button
                  onClick={() => void generateInterventionPDF(intervention)}
                  className="btn btn-secondary btn-export-pdf"
                >
                  📄 PDF
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
                  <div
                    style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}
                  >
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
                    {intervention.statut !== "annulee" && (
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
                <strong>{intervention.client.nom}</strong>
                <br />
                <small>
                  {intervention.client.contact} -{" "}
                  {intervention.client.telephone}
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
          {user?.role === "admin" && intervention.client.rue && (
            <div className="info-item">
              <label>Adresse</label>
              <div className="info-value">
                {intervention.client.rue}
                <br />
                <small>
                  {intervention.client.codePostal} {intervention.client.ville}
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
      {user?.role !== "admin" && intervention.client.rue && (
        <InterventionLocation
          clientAddress={intervention.client.rue}
          clientCity={intervention.client.ville || ""}
          clientPostalCode={intervention.client.codePostal || ""}
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
          <div
            style={{ display: "flex", flexDirection: "column", gap: "12px" }}
          >
            {/* Création */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
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
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
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
              <div
                style={{ display: "flex", alignItems: "center", gap: "12px" }}
              >
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
              <div
                style={{ display: "flex", alignItems: "center", gap: "12px" }}
              >
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
              <div
                style={{ display: "flex", alignItems: "center", gap: "12px" }}
              >
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
              <div
                style={{ display: "flex", alignItems: "center", gap: "12px" }}
              >
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
            {intervention.equipements.map((eq: any) => (
              <div key={eq.id} className="equipment-item">
                {eq.stock?.nomMateriel} - {eq.action} (x{eq.quantite})
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Photos d'intervention */}
      <PhotoCapture
        photos={photos}
        onPhotoAdd={(photo) => setPhotos([...photos, photo])}
        onPhotoRemove={(id) => setPhotos(photos.filter((p) => p.id !== id))}
        readOnly={
          intervention.statut === "terminee" ||
          intervention.statut === "annulee"
        }
      />
    </div>
  );
};

export default InterventionDetail;

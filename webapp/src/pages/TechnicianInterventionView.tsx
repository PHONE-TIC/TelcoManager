import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiService } from "../services/api.service";
import { generateInterventionPDF } from "../utils/pdfGenerator";
// formatDateTimeLocal not currently used
import { getTravelEstimate } from "../services/geolocation.service";
import type { TravelEstimate } from "../services/geolocation.service";
import PhotoCapture from "../components/PhotoCapture";
import SignaturePad from "../components/SignaturePad";
import BarcodeScanner from "../components/BarcodeScanner";
import { useAuth } from "../contexts/AuthContext";
import "./TechnicianInterventionView.css";
import type { Intervention, InterventionEquipment, Photo } from "../types";
import {
  extractInterventionTime,
  findArtifactReport,
  mapArtifactAttachments,
  mapArtifactPhotos,
  TECHNICIAN_INTERVENTION_STEPS,
} from "./technician-intervention.utils";

// HistoryIntervention compatible with global type
interface HistoryIntervention {
  id: string;
  numero: string;
  titre: string;
  datePlanifiee: string;
  statut: string;
}

interface Equipment {
  stockId?: string;
  nom: string;
  action: "install" | "retrait";
  etat?: "ok" | "hs";
  quantite: number;
}

interface VehicleStockItem {
  id: string;
  stockId: string;
  quantite: number;
  etat: "ok" | "hs";
  clientId?: string | null;
  assignedAt?: string | null;
  stock: {
    id: string;
    nomMateriel: string;
    reference?: string;
    numeroSerie?: string;
    codeBarre?: string;
  };
  client?: {
    id: string;
    nom: string;
  } | null;
}


const TechnicianInterventionView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  useAuth(); // Keep for authentication check

  const [intervention, setIntervention] = useState<Intervention | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [currentStep, setCurrentStep] = useState(0);

  // Form states
  // Form states
  // We only use the setters for these ISO strings to update them before save
  const [, setHeureArrivee] = useState("");
  const [, setHeureDepart] = useState("");

  const [commentaire, setCommentaire] = useState("");
  const [signatureTechnicien, setSignatureTechnicien] = useState<string | null>(
    null
  );
  const [signatureClient, setSignatureClient] = useState<string | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [loadedAttachments, setLoadedAttachments] = useState<
    Array<{ name: string; url: string; type: string }>
  >([]);
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [showScanner, setShowScanner] = useState(false);
  const [scanAction] = useState<"install" | "retrait">("install");
  const [clientHistory, setClientHistory] = useState<HistoryIntervention[]>([]);
  const [travelEstimate, setTravelEstimate] = useState<TravelEstimate | null>(
    null
  );
  const [loadingTravel, setLoadingTravel] = useState(false);
  const [modalPhoto, setModalPhoto] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  // New fields for Wizard Flow
  const [billing, setBilling] = useState({
    maintenance: false,
    garantie: false,
    facturable: false,
  });
  const [systemType, setSystemType] = useState("");
  const [clientRemarks, setClientRemarks] = useState("");
  const [clientSigner, setClientSigner] = useState("");

  // Time-only state (HH:mm)
  const [timeArrivee, setTimeArrivee] = useState("");
  const [timeDepart, setTimeDepart] = useState("");
  const [reportUrl, setReportUrl] = useState<string | null>(null);

  // Vehicle stock states for material assignment
  const [vehicleStock, setVehicleStock] = useState<VehicleStockItem[]>([]);
  const [showVehicleStockModal, setShowVehicleStockModal] = useState(false);
  const [vehicleStockAction, setVehicleStockAction] = useState<
    "install" | "retrait"
  >("install");
  const [selectedVehicleItem, setSelectedVehicleItem] =
    useState<VehicleStockItem | null>(null);
  const [showRetrieveConditionModal, setShowRetrieveConditionModal] =
    useState(false);
  const [loadingVehicleStock, setLoadingVehicleStock] = useState(false);

  const initialPinchDistance = useRef<number | null>(null);
  const initialZoomLevel = useRef<number>(1);

  const stopAllCameras = () => {

    // Find all video elements and stop their streams
    document.querySelectorAll("video").forEach((video) => {
      if (video.srcObject) {
        const stream = video.srcObject as MediaStream;
        stream.getTracks().forEach((track) => {
          track.stop();

        });
        video.srcObject = null;
      }
    });
    setShowScanner(false);
  };

  const loadIntervention = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await apiService.getInterventionById(id);
      setIntervention(data);

      // Pre-fill form with existing data
      if (data.heureArrivee) {
        setHeureArrivee(data.heureArrivee); // Keep full ISO for reference
        setTimeArrivee(extractInterventionTime(data.heureArrivee));
      }
      if (data.heureDepart) {
        setHeureDepart(data.heureDepart);
        setTimeDepart(extractInterventionTime(data.heureDepart));
      }
      if (data.commentaireTechnicien)
        setCommentaire(data.commentaireTechnicien);
      if (data.signature) setSignatureClient(data.signature);

      // Load client history (other interventions for this client)
      if (data.clientId) {
        try {
          const historyData = await apiService.getInterventions({
            clientId: data.clientId,
          });
          // Filter out current intervention and limit to 5 most recent
          const history = (historyData.interventions || [])
            .filter((int: HistoryIntervention) => int.id !== id)
            .sort(
              (a: HistoryIntervention, b: HistoryIntervention) =>
                new Date(b.datePlanifiee).getTime() -
                new Date(a.datePlanifiee).getTime()
            )
            .slice(0, 5);
          setClientHistory(history);
        } catch (histErr) {
          console.warn("Could not load client history:", histErr);
        }
      }

      // Load artifacts (photos) for closed interventions
      if (data.statut === "terminee" || data.statut === "annulee") {
        try {
          const artifacts = await apiService.getInterventionArtifacts(id);
          const loadedPhotos = mapArtifactPhotos(artifacts);
          setPhotos(loadedPhotos);

          const otherFiles = mapArtifactAttachments(artifacts);
          setLoadedAttachments(otherFiles);

          const report = findArtifactReport(artifacts);

          if (report) {

            setReportUrl(report.url);
          } else {

          }
        } catch (artifactErr) {
          console.warn("Could not load artifacts:", artifactErr);
        }
      }

      // Determine starting step based on status
      if (data.statut === "planifiee") {
        setCurrentStep(0); // Start at info
      } else if (data.statut === "en_cours") {
        setCurrentStep(1); // Start at heures
      }
    } catch (err) {
      setError("Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  }, [id]); // Removed currentStep dependency as it is not used directly

  useEffect(() => {
    loadIntervention();

    // Cleanup: stop all cameras when leaving the page
    return () => {

      stopAllCameras();
    };
  }, [id, loadIntervention]);

  const showMessage = (msg: string, isError = false) => {
    if (isError) {
      setError(msg);
      setSuccess("");
    } else {
      setSuccess(msg);
      setError("");
    }
    setTimeout(() => {
      setError("");
      setSuccess("");
    }, 3000);
  };

  // === ACTIONS ===
  const handleTakeCharge = async () => {
    if (!id) return;
    try {
      await apiService.updateInterventionStatus(id, {
        statut: "en_cours",
        datePriseEnCharge: new Date().toISOString(),
      });
      showMessage("Intervention prise en charge !");
      await loadIntervention();
      setCurrentStep(1); // Go to heures step
    } catch (err: unknown) {
      showMessage((err as any).response?.data?.error || "Erreur", true);
    }
  };

  const handleSaveHours = async () => {
    if (!id) return;
    if (!timeArrivee || !timeDepart) {
      alert("⚠️ Veuillez renseigner l'heure d'arrivée et de départ.");
      return false;
    }

    // Combine with today's date (or datePlanifiee if needed, assuming Today for realization)
    const today = new Date();
    const [hArr, mArr] = timeArrivee.split(":").map(Number);
    const dateArr = new Date(today);
    dateArr.setHours(hArr, mArr, 0, 0);

    const [hDep, mDep] = timeDepart.split(":").map(Number);
    const dateDep = new Date(today);
    dateDep.setHours(hDep, mDep, 0, 0);

    const isoArr = dateArr.toISOString();
    const isoDep = dateDep.toISOString();

    // Update local state ISOs for consistency
    setHeureArrivee(isoArr);
    setHeureDepart(isoDep);

    try {
      await apiService.validateInterventionHours(id, {
        heureArrivee: isoArr,
        heureDepart: isoDep,
      });
      showMessage("Heures enregistrées");
      return true;
    } catch (err: unknown) {
      showMessage((err as any).response?.data?.error || "Erreur", true);
      return false;
    }
  };

  const handleBarcodeScan = async (barcode: string) => {
    setShowScanner(false);
    try {
      const stockItem = await apiService.getStockByBarcode(barcode);
      if (stockItem) {
        setEquipments([
          ...equipments,
          {
            stockId: stockItem.id,
            nom: stockItem.nomMateriel,
            action: scanAction,
            quantite: 1,
            etat: scanAction === "retrait" ? "ok" : undefined,
          },
        ]);
        showMessage(`${stockItem.nomMateriel} ajouté`);
      }
    } catch {
      showMessage("Article non trouvé", true);
    }
  };

  const handleSaveEquipments = async () => {
    if (!id || equipments.length === 0) return;
    try {
      for (const eq of equipments) {
        await apiService.manageInterventionEquipment(id, eq);
      }
      setEquipments([]);
      showMessage("Matériel enregistré");
      // Save current step before reloading intervention
      const savedStep = currentStep;
      await loadIntervention();
      // Restore current step after reload
      setCurrentStep(savedStep);
    } catch (err: unknown) {
      showMessage((err as any).response?.data?.error || "Erreur", true);
    }
  };

  // Load technician's vehicle stock
  const loadVehicleStock = async () => {
    if (!intervention?.technicien?.id) return;
    setLoadingVehicleStock(true);
    try {
      const data = await apiService.getTechnicianStock(
        intervention.technicien.id
      );
      setVehicleStock(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Erreur chargement stock véhicule:", error);
      setVehicleStock([]);
    } finally {
      setLoadingVehicleStock(false);
    }
  };

  // Open modal for installation (assigning material to client)
  const handleOpenInstallModal = () => {
    setVehicleStockAction("install");
    loadVehicleStock();
    setShowVehicleStockModal(true);
  };

  // Open modal for retrieval (getting material back from client)
  const handleOpenRetraitModal = () => {
    setVehicleStockAction("retrait");
    loadVehicleStock();
    setShowVehicleStockModal(true);
  };

  // Handle installation: assign item to client
  const handleInstallItem = async (item: VehicleStockItem) => {
    if (!intervention?.technicien?.id || !intervention?.client?.id) return;
    try {
      await apiService.assignToClient(
        intervention.technicien.id,
        item.stockId,
        intervention.client.id
      );
      // Add to local equipments list for display
      setEquipments([
        ...equipments,
        {
          stockId: item.stockId,
          nom: item.stock.nomMateriel,
          action: "install",
          quantite: 1,
        },
      ]);
      setShowVehicleStockModal(false);
      showMessage(
        `${item.stock.nomMateriel} installé chez ${intervention.client.nom}`
      );
      loadVehicleStock(); // Refresh vehicle stock
    } catch (error: unknown) {
      console.error("Erreur installation:", error);
      showMessage(
        (error as any).response?.data?.error || "Erreur lors de l'installation",
        true
      );
    }
  };

  // Handle material selection for retrieval
  const handleSelectForRetrieval = (item: VehicleStockItem) => {
    setSelectedVehicleItem(item);
    setShowVehicleStockModal(false);
    setShowRetrieveConditionModal(true);
  };

  // Handle retrieval with condition (OK/HS)
  const handleRetrieveItem = async (etat: "ok" | "hs") => {
    if (!intervention?.technicien?.id || !selectedVehicleItem) return;
    try {
      await apiService.retrieveFromClient(
        intervention.technicien.id,
        selectedVehicleItem.stockId,
        etat
      );
      // Add to local equipments list for display
      setEquipments([
        ...equipments,
        {
          stockId: selectedVehicleItem.stockId,
          nom: selectedVehicleItem.stock.nomMateriel,
          action: "retrait",
          etat,
          quantite: 1,
        },
      ]);
      setShowRetrieveConditionModal(false);
      setSelectedVehicleItem(null);
      showMessage(
        `${selectedVehicleItem.stock.nomMateriel
        } repris (${etat.toUpperCase()})`
      );
      loadVehicleStock(); // Refresh vehicle stock
    } catch (error: unknown) {
      console.error("Erreur reprise:", error);
      showMessage(
        (error as any).response?.data?.error || "Erreur lors de la reprise",
        true
      );
    }
  };

  // Handle removing equipment from the list - reverses the action
  const handleRemoveEquipment = async (index: number) => {
    const eq = equipments[index];
    if (!eq.stockId || !intervention?.technicien?.id) {
      // No stockId - just remove from local list
      setEquipments(equipments.filter((_, idx) => idx !== index));
      return;
    }

    try {
      if (eq.action === "install") {
        // Was installed (assigned to client) - retrieve back to technician stock
        await apiService.retrieveFromClient(
          intervention.technicien.id,
          eq.stockId,
          "ok" // Return as OK since we're canceling the assignment
        );
        showMessage(`${eq.nom} retiré et remis dans votre stock`);
      } else if (eq.action === "retrait" && intervention?.client?.id) {
        // Was retrieved from client - reassign back to client
        await apiService.assignToClient(
          intervention.technicien.id,
          eq.stockId,
          intervention.client.id
        );
        showMessage(`${eq.nom} réassigné au client`);
      }

      // Remove from local list
      setEquipments(equipments.filter((_, idx) => idx !== index));
      loadVehicleStock(); // Refresh vehicle stock
    } catch (error: unknown) {
      console.error("Erreur lors de la suppression:", error);
      showMessage(
        (error as any).response?.data?.error || "Erreur lors de la suppression",
        true
      );
    }
  };

  const handleClose = async () => {
    if (!id || !intervention) return;
    if (!timeArrivee || !timeDepart) {
      alert("⚠️ Veuillez saisir les heures d'arrivée et de départ");
      setCurrentStep(1);
      return;
    }
    if (!clientSigner.trim()) {
      alert("⚠️ Le nom du signataire est obligatoire");
      setCurrentStep(5);
      return;
    }
    if (!signatureClient) {
      alert("⚠️ La signature du client est obligatoire");
      setCurrentStep(5);
      return;
    }

    setLoading(true);

    try {
      // Ensure times are saved (redundant check but safe)
      const today = new Date();
      const [hArr, mArr] = timeArrivee.split(":").map(Number);
      const dateArr = new Date(today);
      dateArr.setHours(hArr, mArr, 0, 0);

      const [hDep, mDep] = timeDepart.split(":").map(Number);
      const dateDep = new Date(today);
      dateDep.setHours(hDep, mDep, 0, 0);

      await apiService.validateInterventionHours(id, {
        heureArrivee: dateArr.toISOString(),
        heureDepart: dateDep.toISOString(),
      });

      // Save signatures
      if (signatureTechnicien) {
        await apiService.signIntervention(id, {
          type: "technicien",
          signature: signatureTechnicien,
        });
      }
      if (signatureClient) {
        await apiService.signIntervention(id, {
          type: "client",
          signature: signatureClient,
        });
      }

      // Close intervention
      await apiService.updateInterventionStatus(id, {
        statut: "terminee",
        commentaireTechnicien: commentaire,
      });

      // === UPLOAD ARTIFACTS ===
      const formData = new FormData();

      // 1. Photos
      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        const res = await fetch(photo.dataUrl);
        const blob = await res.blob();
        const ext =
          photo.type === "before"
            ? "avant"
            : photo.type === "after"
              ? "apres"
              : "autre";
        formData.append("files", blob, `photo_${ext}_${i + 1}.jpg`);
      }

      // 2. Attached Files
      for (const file of attachedFiles) {
        formData.append("files", file, file.name);
      }

      // 3. Generate PDF with EXTRA DATA
      const pdfIntervention = {
        ...intervention,
        heureArrivee: dateArr.toISOString(),
        heureDepart: dateDep.toISOString(),
        commentaireTechnicien: commentaire,
        signature: signatureClient,
        signatureTechnicien: signatureTechnicien || undefined,
        statut: "terminee" as const,
      };

      const extraData = {
        billing,
        systemType,
        clientRemarks,
        clientSigner,
      };

      const pdfBlob = await generateInterventionPDF(
        pdfIntervention,
        true,
        photos,
        extraData
      );

      if (pdfBlob && pdfBlob instanceof Blob) {
        formData.append(
          "files",
          pdfBlob,
          `Rapport_${intervention?.numero || "Intervention"}.pdf`
        );
      }

      if (photos.length > 0 || pdfBlob || attachedFiles.length > 0) {
        await apiService.uploadInterventionArtifacts(id, formData);
      }

      alert("✅ Intervention clôturée avec succès !");
      navigate("/interventions");
    } catch (err: unknown) {
      console.error("Error closing intervention:", err);
      setLoading(false);
      alert(
        "❌ Erreur: " +
        ((err as any).response?.data?.error ||
          (err as any).message ||
          "Erreur lors de la clôture")
      );
    }
  };

  const getStatusBadge = (statut: string) => {
    const badges: { [key: string]: { label: string; class: string } } = {
      planifiee: { label: "🔵 Planifiée", class: "badge-info" },
      en_cours: { label: "🟠 En cours", class: "badge-warning" },
      terminee: { label: "🟢 Terminée", class: "badge-success" },
      annulee: { label: "🔴 Annulée", class: "badge-danger" },
    };
    const badge = badges[statut] || { label: statut, class: "badge-gray" };
    return <span className={`badge ${badge.class}`}>{badge.label}</span>;
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
        <button
          onClick={() => navigate("/interventions")}
          className="btn btn-secondary"
        >
          ← Retour
        </button>
      </div>
    );
  }

  const isEnCours = intervention.statut === "en_cours";
  const isPlanifiee = intervention.statut === "planifiee";
  const isClosed =
    intervention.statut === "terminee" || intervention.statut === "annulee";

  // Check if intervention is scheduled for today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const scheduledDate = new Date(intervention.datePlanifiee);
  const isScheduledForToday =
    scheduledDate >= today && scheduledDate < tomorrow;

  // For closed interventions, show full report details
  if (isClosed) {
    const clientAddress = intervention.client?.rue
      ? `${intervention.client.rue}, ${intervention.client.codePostal || ""} ${intervention.client.ville || ""
      }`
      : "Non renseignée";

    return (
      <div className="page-container technician-view">
        <div className="tech-header">
          <button
            onClick={() => navigate("/interventions")}
            className="btn btn-back"
          >
            ← Retour
          </button>
          <div className="title-row">
            <h1>
              <span className="intervention-number">{intervention.numero}</span>
              {intervention.titre}
            </h1>
            {getStatusBadge(intervention.statut)}
          </div>
          <button
            onClick={() => {
              if (reportUrl) {
                window.open(reportUrl, "_blank");
              } else {
                void generateInterventionPDF(intervention, false, [], {
                  billing,
                  systemType,
                  clientRemarks,
                  clientSigner,
                });
              }
            }}
            className="btn btn-primary"
          >
            📄 {reportUrl ? "Voir le rapport" : "Télécharger PDF"}
          </button>
        </div>

        {/* Compte-rendu complet */}
        <div className="report-summary">
          <h2
            style={{
              marginBottom: "20px",
              borderBottom: "2px solid var(--primary-color)",
              paddingBottom: "10px",
            }}
          >
            📋 Compte-rendu d'intervention
          </h2>

          {/* Informations client */}
          <div className="info-card" style={{ marginBottom: "15px" }}>
            <h3 style={{ marginBottom: "10px", color: "var(--primary-color)" }}>
              👤 Client
            </h3>
            <p>
              <strong>Nom :</strong> {intervention.client?.nom}
            </p>
            <p>
              <strong>Contact :</strong> {intervention.client?.contact} -{" "}
              {intervention.client?.telephone}
            </p>
            <p>
              <strong>Adresse :</strong> {clientAddress}
            </p>
          </div>

          {/* Informations intervention */}
          <div className="info-card" style={{ marginBottom: "15px" }}>
            <h3 style={{ marginBottom: "10px", color: "var(--primary-color)" }}>
              📅 Dates & Horaires
            </h3>
            <p>
              <strong>Date planifiée :</strong>{" "}
              {new Date(intervention.datePlanifiee).toLocaleDateString("fr-FR")}
            </p>
            {intervention.heureArrivee && (
              <p>
                <strong>Heure d'arrivée :</strong>{" "}
                {new Date(intervention.heureArrivee).toLocaleTimeString(
                  "fr-FR",
                  { hour: "2-digit", minute: "2-digit" }
                )}
              </p>
            )}
            {intervention.heureDepart && (
              <p>
                <strong>Heure de départ :</strong>{" "}
                {new Date(intervention.heureDepart).toLocaleTimeString(
                  "fr-FR",
                  { hour: "2-digit", minute: "2-digit" }
                )}
              </p>
            )}
            <p>
              <strong>Technicien :</strong>{" "}
              {intervention.technicien?.nom || "Non assigné"}
            </p>
          </div>

          {/* Description */}
          {intervention.description && (
            <div className="info-card" style={{ marginBottom: "15px" }}>
              <h3
                style={{ marginBottom: "10px", color: "var(--primary-color)" }}
              >
                📝 Description
              </h3>
              <p style={{ whiteSpace: "pre-wrap" }}>
                {intervention.description}
              </p>
            </div>
          )}

          {/* Équipements */}
          {intervention.equipements && intervention.equipements.length > 0 && (
            <div className="info-card" style={{ marginBottom: "15px" }}>
              <h3
                style={{ marginBottom: "10px", color: "var(--primary-color)" }}
              >
                🔧 Équipements
              </h3>
              <table className="table" style={{ marginTop: "10px" }}>
                <thead>
                  <tr>
                    <th>Matériel</th>
                    <th>Action</th>
                    <th>Quantité</th>
                  </tr>
                </thead>
                <tbody>
                  {intervention.equipements.map(
                    (eq: InterventionEquipment, idx: number) => (
                      <tr key={idx}>
                        <td>{eq.stock?.nomMateriel || eq.nom || "N/A"}</td>
                        <td>
                          {eq.action === "install"
                            ? "✅ Installation"
                            : "🔄 Retrait"}
                        </td>
                        <td>{eq.quantite || 1}</td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Commentaire technicien */}
          {intervention.commentaireTechnicien && (
            <div className="info-card" style={{ marginBottom: "15px" }}>
              <h3
                style={{ marginBottom: "10px", color: "var(--primary-color)" }}
              >
                💬 Commentaire du technicien
              </h3>
              <p
                style={{
                  whiteSpace: "pre-wrap",
                  backgroundColor: "var(--bg-secondary)",
                  padding: "15px",
                  borderRadius: "8px",
                }}
              >
                {intervention.commentaireTechnicien}
              </p>
            </div>
          )}

          {/* Photos de l'intervention */}
          {photos.length > 0 && (
            <div className="info-card" style={{ marginBottom: "15px" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "15px",
                  flexWrap: "wrap",
                  gap: "10px",
                }}
              >
                <h3 style={{ margin: 0, color: "var(--primary-color)" }}>
                  📷 Photos de l'intervention ({photos.length})
                </h3>
                <button
                  onClick={() => {
                    photos.forEach((photo, index) => {
                      const link = document.createElement("a");
                      link.href = photo.dataUrl;
                      link.download = `photo_${photo.type}_${index + 1}.jpg`;
                      link.click();
                    });
                  }}
                  className="btn btn-secondary"
                  style={{ fontSize: "14px", padding: "8px 12px" }}
                >
                  ⬇️ Tout télécharger
                </button>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
                  gap: "12px",
                }}
              >
                {photos.map((photo, index) => (
                  <div
                    key={photo.id}
                    style={{
                      position: "relative",
                      borderRadius: "8px",
                      overflow: "hidden",
                      backgroundColor: "var(--bg-secondary)",
                    }}
                  >
                    <img
                      src={photo.dataUrl}
                      alt={photo.caption || "Photo"}
                      style={{
                        width: "100%",
                        height: "120px",
                        objectFit: "cover",
                        cursor: "pointer",
                        display: "block",
                      }}
                      onClick={() => {
                        setModalPhoto(photo.dataUrl);
                        setZoomLevel(1);
                      }}
                    />

                    {/* Type badge */}
                    <div
                      style={{
                        position: "absolute",
                        top: "6px",
                        left: "6px",
                        padding: "2px 8px",
                        borderRadius: "4px",
                        fontSize: "11px",
                        fontWeight: "600",
                        background:
                          photo.type === "before"
                            ? "#f59e0b"
                            : photo.type === "after"
                              ? "#10b981"
                              : "#6366f1",
                        color: "white",
                      }}
                    >
                      {photo.type === "before"
                        ? "Avant"
                        : photo.type === "after"
                          ? "Après"
                          : "Autre"}
                    </div>

                    {/* Download button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const link = document.createElement("a");
                        link.href = photo.dataUrl;
                        link.download = `photo_${photo.type}_${index + 1}.jpg`;
                        link.click();
                      }}
                      style={{
                        position: "absolute",
                        top: "6px",
                        right: "6px",
                        width: "28px",
                        height: "28px",
                        borderRadius: "4px",
                        border: "none",
                        background: "rgba(255,255,255,0.9)",
                        color: "#333",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "14px",
                      }}
                      title="Télécharger"
                    >
                      ⬇️
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Fichiers joints */}
          {loadedAttachments.length > 0 && (
            <div className="info-card" style={{ marginBottom: "15px" }}>
              <h3
                style={{ marginBottom: "10px", color: "var(--primary-color)" }}
              >
                📎 Fichiers joints ({loadedAttachments.length})
              </h3>
              <div>
                {loadedAttachments.map((file, index) => (
                  <div
                    key={index}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 15px",
                      backgroundColor: "var(--bg-secondary)",
                      borderRadius: "8px",
                      marginBottom: "8px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
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
                      <span style={{ fontWeight: "500" }}>{file.name}</span>
                    </div>
                    <a
                      href={file.url}
                      download={file.name}
                      className="btn btn-secondary"
                      style={{ fontSize: "12px", padding: "6px 12px" }}
                    >
                      ⬇️ Télécharger
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {intervention.notes && (
            <div className="info-card" style={{ marginBottom: "15px" }}>
              <h3
                style={{ marginBottom: "10px", color: "var(--primary-color)" }}
              >
                📒 Notes
              </h3>
              <p style={{ whiteSpace: "pre-wrap" }}>{intervention.notes}</p>
            </div>
          )}
        </div>

        {/* Photo Modal with Zoom - for closed interventions view */}
        {modalPhoto && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0,0,0,0.9)",
              zIndex: 9999,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            }}
            onClick={() => setModalPhoto(null)}
          >
            {/* Close button */}
            <button
              onClick={() => setModalPhoto(null)}
              style={{
                position: "absolute",
                top: "20px",
                right: "20px",
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                border: "none",
                background: "rgba(255,255,255,0.2)",
                color: "white",
                fontSize: "24px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              ✕
            </button>

            {/* Zoom controls */}
            <div
              style={{
                position: "absolute",
                bottom: "30px",
                display: "flex",
                gap: "15px",
                alignItems: "center",
                background: "rgba(0,0,0,0.6)",
                padding: "10px 20px",
                borderRadius: "30px",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setZoomLevel(Math.max(0.5, zoomLevel - 0.25))}
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  border: "none",
                  background: "rgba(255,255,255,0.2)",
                  color: "white",
                  fontSize: "20px",
                  cursor: "pointer",
                }}
              >
                −
              </button>
              <span
                style={{
                  color: "white",
                  fontSize: "14px",
                  minWidth: "50px",
                  textAlign: "center",
                }}
              >
                {Math.round(zoomLevel * 100)}%
              </span>
              <button
                onClick={() => setZoomLevel(Math.min(4, zoomLevel + 0.25))}
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  border: "none",
                  background: "rgba(255,255,255,0.2)",
                  color: "white",
                  fontSize: "20px",
                  cursor: "pointer",
                }}
              >
                +
              </button>
              <button
                onClick={() => setZoomLevel(1)}
                style={{
                  padding: "8px 16px",
                  borderRadius: "20px",
                  border: "none",
                  background: "rgba(255,255,255,0.2)",
                  color: "white",
                  fontSize: "12px",
                  cursor: "pointer",
                }}
              >
                Reset
              </button>
            </div>

            {/* Image */}
            <div
              style={{
                overflow: "auto",
                maxWidth: "90vw",
                maxHeight: "80vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={modalPhoto}
                alt="Photo agrandie"
                style={{
                  transform: `scale(${zoomLevel})`,
                  transformOrigin: "center center",
                  transition: "transform 0.1s ease",
                  maxWidth: zoomLevel === 1 ? "90vw" : "none",
                  maxHeight: zoomLevel === 1 ? "80vh" : "none",
                  objectFit: "contain",
                  touchAction: "none", // Prevent default touch behavior
                }}
                onTouchStart={(e) => {
                  if (e.touches.length === 2) {
                    const dx = e.touches[0].clientX - e.touches[1].clientX;
                    const dy = e.touches[0].clientY - e.touches[1].clientY;
                    initialPinchDistance.current = Math.sqrt(dx * dx + dy * dy);
                    initialZoomLevel.current = zoomLevel;
                  }
                }}
                onTouchMove={(e) => {
                  if (e.touches.length === 2 && initialPinchDistance.current) {
                    e.preventDefault();
                    const dx = e.touches[0].clientX - e.touches[1].clientX;
                    const dy = e.touches[0].clientY - e.touches[1].clientY;
                    const currentDistance = Math.sqrt(dx * dx + dy * dy);
                    const scale =
                      currentDistance / initialPinchDistance.current;
                    const newZoom = Math.min(
                      4,
                      Math.max(0.5, initialZoomLevel.current * scale)
                    );
                    setZoomLevel(newZoom);
                  }
                }}
                onTouchEnd={() => {
                  initialPinchDistance.current = null;
                }}
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="page-container technician-view">
      {/* Header */}
      <div className="tech-header">
        <button
          onClick={() => navigate("/interventions")}
          className="btn btn-back"
        >
          ← Retour
        </button>
        <div className="title-row">
          <h1>
            <span className="intervention-number">{intervention.numero}</span>
            {intervention.titre}
          </h1>
          {getStatusBadge(intervention.statut)}
        </div>
        {isPlanifiee && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "5px",
              alignItems: "flex-end",
            }}
          >
            <button
              onClick={handleTakeCharge}
              className={`btn ${isScheduledForToday ? "btn-success" : "btn-secondary"
                }`}
              disabled={!isScheduledForToday}
              style={
                !isScheduledForToday
                  ? { opacity: 0.6, cursor: "not-allowed" }
                  : {}
              }
            >
              {isScheduledForToday
                ? "▶️ Prendre en charge"
                : "🔒 Non disponible"}
            </button>
            {!isScheduledForToday && (
              <span
                style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}
              >
                Intervention prévue le{" "}
                {new Date(intervention.datePlanifiee).toLocaleDateString(
                  "fr-FR"
                )}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Messages */}
      {error && <div className="message error">{error}</div>}
      {success && <div className="message success">{success}</div>}

      {/* Step Tabs (only for en_cours) */}
      {isEnCours && (
        <div className="step-tabs">
          {TECHNICIAN_INTERVENTION_STEPS.map((step, index) => (
            <button
              key={step.id}
              className={`step-tab ${currentStep === index ? "active" : ""} ${index < currentStep ? "completed" : ""
                }`}
              onClick={() => {
                // Validate fields when trying to go from step 3 (Rapport) to step 4 or 5
                if (currentStep === 3 && index > 3) {
                  // Validate comment
                  if (!commentaire.trim()) {
                    alert(
                      "⚠️ Veuillez saisir un commentaire avant de continuer"
                    );
                    const textarea = document.querySelector(
                      ".form-textarea"
                    ) as HTMLTextAreaElement;
                    if (textarea) {
                      textarea.scrollIntoView({
                        behavior: "smooth",
                        block: "center",
                      });
                      setTimeout(() => textarea.focus(), 300);
                    }
                    return;
                  }
                  // Validate billing (at least one option selected)
                  if (
                    !billing.maintenance &&
                    !billing.garantie &&
                    !billing.facturable
                  ) {
                    alert(
                      "⚠️ Veuillez sélectionner au moins une option de facturation"
                    );
                    return;
                  }
                  // Validate systemType
                  if (!systemType.trim()) {
                    alert("⚠️ Veuillez sélectionner un type de système");
                    return;
                  }
                }
                setCurrentStep(index);
              }}
            >
              <span className="step-icon">{step.icon}</span>
              <span className="step-label">{step.label.split(" ")[1]}</span>
            </button>
          ))}
        </div>
      )}

      {/* Step Content */}
      <div className="step-content">
        {/* === STEP 0: INFOS === */}
        {(currentStep === 0 || isPlanifiee) && (
          <div className="step-panel">
            <div className="info-card">
              <h3>📋 Informations générales</h3>
              <div className="info-grid">
                <div className="info-item">
                  <label>Client</label>
                  <div className="info-value">
                    <strong>{intervention.client?.nom}</strong>
                  </div>
                </div>
                <div className="info-item">
                  <label>Contact</label>
                  <div className="info-value">
                    {intervention.client?.contact}
                  </div>
                </div>
                <div className="info-item">
                  <label>Téléphone</label>
                  <div className="info-value">
                    <a
                      href={`tel:${intervention.client?.telephone}`}
                      className="phone-link"
                    >
                      {intervention.client?.telephone}
                    </a>
                  </div>
                </div>
                <div className="info-item">
                  <label>Date planifiée</label>
                  <div className="info-value">
                    {new Date(intervention.datePlanifiee).toLocaleString(
                      "fr-FR"
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="info-card">
              <h3>📍 Localisation client</h3>
              <div className="address-info">
                <div className="address-line">
                  🏠 {intervention.client?.rue || "Adresse non renseignée"}
                </div>
                <div className="address-line">
                  📮 {intervention.client?.codePostal}{" "}
                  {intervention.client?.ville}
                </div>
              </div>

              {/* Travel time estimation */}
              {travelEstimate && (
                <div
                  style={{
                    marginTop: "10px",
                    padding: "10px",
                    backgroundColor: "var(--bg-secondary)",
                    borderRadius: "8px",
                    display: "flex",
                    alignItems: "center",
                    gap: "15px",
                  }}
                >
                  <span style={{ fontSize: "1.5rem" }}>⏱️</span>
                  <div>
                    <div style={{ fontWeight: "bold" }}>
                      {travelEstimate.formattedTime}
                    </div>
                    <div
                      style={{
                        fontSize: "0.85rem",
                        color: "var(--text-secondary)",
                      }}
                    >
                      {travelEstimate.formattedDistance} (estimation)
                    </div>
                  </div>
                </div>
              )}

              <div style={{ display: "flex", gap: "10px", marginTop: "15px" }}>
                <button
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                  onClick={() => {
                    const addr = encodeURIComponent(
                      `${intervention.client?.rue}, ${intervention.client?.codePostal} ${intervention.client?.ville}`
                    );
                    window.open(
                      `https://www.google.com/maps/dir/?api=1&destination=${addr}`,
                      "_blank"
                    );
                  }}
                >
                  🗺️ Google Maps
                </button>
                <button
                  className="btn btn-secondary"
                  style={{
                    flex: 1,
                    backgroundColor: "#33ccff",
                    borderColor: "#33ccff",
                    color: "#000",
                  }}
                  onClick={() => {
                    const addr = encodeURIComponent(
                      `${intervention.client?.rue}, ${intervention.client?.codePostal} ${intervention.client?.ville}`
                    );
                    window.open(
                      `https://waze.com/ul?q=${addr}&navigate=yes`,
                      "_blank"
                    );
                  }}
                >
                  🚗 Waze
                </button>
              </div>

              {/* Calculate travel time button */}
              <button
                className="btn btn-secondary"
                style={{ width: "100%", marginTop: "10px" }}
                disabled={loadingTravel}
                onClick={async () => {
                  setLoadingTravel(true);
                  try {
                    const address = `${intervention.client?.rue}, ${intervention.client?.codePostal} ${intervention.client?.ville}`;
                    const estimate = await getTravelEstimate(address);
                    setTravelEstimate(estimate);
                  } catch (err) {
                    console.error("Could not get travel estimate:", err);
                  } finally {
                    setLoadingTravel(false);
                  }
                }}
              >
                {loadingTravel
                  ? "⏳ Calcul en cours..."
                  : "⏱️ Estimer le temps de trajet"}
              </button>
            </div>

            <div className="info-card">
              <h3>📄 Description</h3>
              <p>{intervention.description || "Aucune description"}</p>
            </div>

            {intervention.notes && (
              <div className="info-card">
                <h3>📝 Notes</h3>
                <p>{intervention.notes}</p>
              </div>
            )}

            {/* Client History */}
            {clientHistory.length > 0 && (
              <div className="info-card">
                <h3>
                  📜 Historique client ({clientHistory.length} précédente
                  {clientHistory.length > 1 ? "s" : ""})
                </h3>
                <div style={{ marginTop: "10px" }}>
                  {clientHistory.map((hist: HistoryIntervention) => (
                    <div
                      key={hist.id}
                      style={{
                        padding: "10px",
                        marginBottom: "8px",
                        backgroundColor: "var(--bg-secondary)",
                        borderRadius: "6px",
                        borderLeft: `4px solid ${hist.statut === "terminee"
                          ? "var(--success-color)"
                          : hist.statut === "annulee"
                            ? "var(--danger-color)"
                            : "var(--primary-color)"
                          }`,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <strong>{hist.titre}</strong>
                        <span
                          style={{
                            fontSize: "0.75rem",
                            padding: "2px 8px",
                            borderRadius: "4px",
                            backgroundColor:
                              hist.statut === "terminee"
                                ? "var(--success-color)"
                                : hist.statut === "annulee"
                                  ? "var(--danger-color)"
                                  : "var(--primary-color)",
                            color: "white",
                          }}
                        >
                          {hist.statut === "terminee"
                            ? "Terminée"
                            : hist.statut === "annulee"
                              ? "Annulée"
                              : hist.statut}
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: "0.85rem",
                          color: "var(--text-secondary)",
                          marginTop: "4px",
                        }}
                      >
                        📅{" "}
                        {new Date(hist.datePlanifiee).toLocaleDateString(
                          "fr-FR"
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {isEnCours && (
              <button
                className="btn btn-primary btn-block"
                onClick={() => setCurrentStep(1)}
              >
                Suivant →
              </button>
            )}
          </div>
        )}

        {/* === STEP 1: HEURES === */}
        {currentStep === 1 && isEnCours && (
          <div className="step-panel">
            <div className="info-card">
              <h3>🕐 Heures d'intervention</h3>
              <div className="form-group">
                <label>Heure d'arrivée</label>
                <input
                  type="time"
                  value={timeArrivee}
                  onChange={(e) => setTimeArrivee(e.target.value)}
                  className="form-input time-input-large"
                  style={{ fontSize: "1.5rem", textAlign: "center" }}
                />
              </div>
              <div className="form-group">
                <label>Heure de départ</label>
                <input
                  type="time"
                  value={timeDepart}
                  onChange={(e) => setTimeDepart(e.target.value)}
                  className="form-input time-input-large"
                  style={{ fontSize: "1.5rem", textAlign: "center" }}
                />
              </div>
            </div>

            <div className="step-nav">
              <button
                className="btn btn-outline"
                onClick={() => setCurrentStep(0)}
              >
                ← Précédent
              </button>
              <button
                className="btn btn-primary"
                onClick={async () => {
                  const saved = await handleSaveHours();
                  if (saved) setCurrentStep(2);
                }}
              >
                Suivant →
              </button>
            </div>
          </div>
        )}

        {/* === STEP 2: MATERIEL === */}
        {currentStep === 2 && isEnCours && (
          <div className="step-panel">
            <div className="info-card">
              <h3>🔧 Matériel</h3>
              <p
                style={{
                  color: "var(--text-secondary)",
                  marginBottom: "15px",
                  fontSize: "0.9rem",
                }}
              >
                Sélectionnez le matériel depuis votre stock véhicule
              </p>
              <div className="equipment-actions">
                <button
                  className="equipment-btn install-btn"
                  onClick={handleOpenInstallModal}
                >
                  <span className="eq-btn-icon">📥</span>
                  <span className="eq-btn-text">Installation</span>
                  <span className="eq-btn-hint">Assigner au client</span>
                </button>
                <button
                  className="equipment-btn retrait-btn"
                  onClick={handleOpenRetraitModal}
                >
                  <span className="eq-btn-icon">📤</span>
                  <span className="eq-btn-text">Retrait</span>
                  <span className="eq-btn-hint">Reprendre du client</span>
                </button>
              </div>

              {equipments.length > 0 && (
                <div className="equipment-list">
                  {equipments.map((eq, i) => (
                    <div key={i} className={`equipment-item ${eq.action}`}>
                      <span>
                        {eq.action === "install" ? "📥" : "📤"} {eq.nom}
                        {eq.etat && (
                          <span
                            style={{
                              marginLeft: "8px",
                              padding: "2px 8px",
                              borderRadius: "8px",
                              fontSize: "0.75rem",
                              fontWeight: 600,
                              backgroundColor:
                                eq.etat === "ok" ? "#d1fae5" : "#fee2e2",
                              color: eq.etat === "ok" ? "#065f46" : "#991b1b",
                            }}
                          >
                            {eq.etat === "ok" ? "OK" : "HS"}
                          </span>
                        )}
                      </span>
                      <button
                        className="btn-remove"
                        onClick={() => handleRemoveEquipment(i)}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <button
                    className="btn btn-success"
                    onClick={handleSaveEquipments}
                  >
                    💾 Enregistrer le matériel
                  </button>
                </div>
              )}

              {intervention.equipements &&
                intervention.equipements.length > 0 && (
                  <div className="saved-equipment">
                    {/* Installed Equipment Section */}
                    {intervention.equipements.filter(
                      (eq: InterventionEquipment) => eq.action === "install"
                    ).length > 0 && (
                        <div style={{ marginBottom: "16px" }}>
                          <h4
                            style={{
                              color: "var(--success-color, #10b981)",
                              marginBottom: "10px",
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                            }}
                          >
                            📥 Matériel installé
                          </h4>
                          {intervention.equipements
                            .filter(
                              (eq: InterventionEquipment) =>
                                eq.action === "install"
                            )
                            .map((eq: InterventionEquipment) => (
                              <div
                                key={eq.id}
                                className="equipment-item install"
                                style={{ marginBottom: "8px" }}
                              >
                                <div
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    width: "100%",
                                  }}
                                >
                                  <span style={{ fontWeight: 600 }}>
                                    {eq.stock?.nomMateriel || eq.nom}
                                  </span>
                                  {eq.stock?.numeroSerie && (
                                    <span
                                      style={{
                                        fontSize: "0.9rem",
                                        color: "var(--primary-color)",
                                        fontFamily: "monospace",
                                        backgroundColor: "var(--bg-secondary)",
                                        padding: "2px 8px",
                                        borderRadius: "4px",
                                      }}
                                    >
                                      S/N: {eq.stock.numeroSerie}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                        </div>
                      )}

                    {/* Retrieved Equipment Section */}
                    {intervention.equipements.filter(
                      (eq: InterventionEquipment) => eq.action === "retrait"
                    ).length > 0 && (
                        <div>
                          <h4
                            style={{
                              color: "var(--warning-color, #f59e0b)",
                              marginBottom: "10px",
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                            }}
                          >
                            📤 Matériel repris
                          </h4>
                          {intervention.equipements
                            .filter(
                              (eq: InterventionEquipment) =>
                                eq.action === "retrait"
                            )
                            .map((eq: InterventionEquipment) => (
                              <div
                                key={eq.id}
                                className="equipment-item retrait"
                                style={{ marginBottom: "8px" }}
                              >
                                <div
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    flex: 1,
                                  }}
                                >
                                  <span style={{ fontWeight: 600 }}>
                                    {eq.stock?.nomMateriel || eq.nom}
                                  </span>
                                  {eq.stock?.numeroSerie && (
                                    <span
                                      style={{
                                        fontSize: "0.9rem",
                                        color: "var(--primary-color)",
                                        fontFamily: "monospace",
                                        backgroundColor: "var(--bg-secondary)",
                                        padding: "2px 8px",
                                        borderRadius: "4px",
                                      }}
                                    >
                                      S/N: {eq.stock.numeroSerie}
                                    </span>
                                  )}
                                </div>
                                {eq.etat && (
                                  <span
                                    style={{
                                      padding: "4px 10px",
                                      borderRadius: "8px",
                                      fontSize: "0.75rem",
                                      fontWeight: 600,
                                      backgroundColor:
                                        eq.etat === "ok"
                                          ? "rgba(16, 185, 129, 0.2)"
                                          : "rgba(239, 68, 68, 0.2)",
                                      color:
                                        eq.etat === "ok" ? "#10b981" : "#ef4444",
                                    }}
                                  >
                                    {eq.etat === "ok" ? "✅ OK" : "❌ HS"}
                                  </span>
                                )}
                              </div>
                            ))}
                        </div>
                      )}
                  </div>
                )}

              {/* No equipment option */}
              {equipments.length === 0 &&
                (!intervention.equipements ||
                  intervention.equipements.length === 0) && (
                  <div className="no-equipment-option">
                    <p>Aucun matériel à déclarer ?</p>
                    <button
                      className="btn btn-secondary"
                      onClick={() => setCurrentStep(3)}
                    >
                      ✓ Pas de matériel installé/repris
                    </button>
                  </div>
                )}
            </div>

            <div className="step-nav">
              <button
                className="btn btn-outline"
                onClick={() => setCurrentStep(1)}
              >
                ← Précédent
              </button>
              <button
                className="btn btn-primary"
                onClick={() => setCurrentStep(3)}
              >
                Suivant →
              </button>
            </div>
          </div>
        )}

        {/* === STEP 3: RAPPORT === */}
        {currentStep === 3 && isEnCours && (
          <div className="step-panel">
            <div className="info-card">
              <h3>📝 Rapport technicien</h3>

              {/* Added Fields */}
              {/* Added Fields */}
              <div className="billing-section">
                <label className="billing-label">
                  Facturation <span className="required">*</span>
                </label>
                <div className="billing-options">
                  <label className="billing-option">
                    <input
                      type="checkbox"
                      checked={billing.maintenance}
                      onChange={(e) =>
                        setBilling({
                          ...billing,
                          maintenance: e.target.checked,
                        })
                      }
                    />
                    Maint.
                  </label>
                  <label className="billing-option">
                    <input
                      type="checkbox"
                      checked={billing.garantie}
                      onChange={(e) =>
                        setBilling({ ...billing, garantie: e.target.checked })
                      }
                    />
                    Garantie
                  </label>
                  <label className="billing-option">
                    <input
                      type="checkbox"
                      checked={billing.facturable}
                      onChange={(e) =>
                        setBilling({ ...billing, facturable: e.target.checked })
                      }
                    />
                    Factur.
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label>
                  Type de système <span className="required">*</span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ex: Alarme, Vidéo..."
                  value={systemType}
                  onChange={(e) => setSystemType(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>
                  Commentaire <span className="required">*</span>
                </label>
                <textarea
                  value={commentaire}
                  onChange={(e) => setCommentaire(e.target.value)}
                  placeholder="Décrivez le travail effectué, les observations, les problèmes rencontrés..."
                  className={`form-textarea ${!commentaire.trim() ? "field-required" : ""
                    }`}
                  rows={6}
                />
                {!commentaire.trim() && (
                  <p className="field-hint">
                    ⚠️ Le commentaire est obligatoire pour passer à l'étape
                    suivante
                  </p>
                )}
              </div>
            </div>

            <PhotoCapture
              photos={photos}
              onPhotoAdd={(photo) => setPhotos([...photos, photo])}
              onPhotoRemove={(photoId) =>
                setPhotos(photos.filter((p) => p.id !== photoId))
              }
            />

            {/* Fichiers joints */}
            <div className="info-card file-upload-section">
              <h3>📎 Fichiers joints</h3>
              <p className="file-upload-hint">
                Ajoutez des documents, PDFs, ou autres fichiers liés à
                l'intervention
              </p>

              <input
                type="file"
                id="file-upload"
                multiple
                style={{ display: "none" }}
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  setAttachedFiles([...attachedFiles, ...files]);
                  e.target.value = ""; // Reset input
                }}
              />
              <label
                htmlFor="file-upload"
                className="btn btn-secondary file-upload-label"
              >
                📁 Ajouter des fichiers
              </label>

              {attachedFiles.length > 0 && (
                <div className="file-list">
                  {attachedFiles.map((file, index) => (
                    <div key={index} className="file-item">
                      <div className="file-info">
                        <span className="file-icon">
                          {file.type.includes("pdf")
                            ? "📄"
                            : file.type.includes("image")
                              ? "🖼️"
                              : file.type.includes("word") ||
                                file.type.includes("document")
                                ? "📝"
                                : file.type.includes("excel") ||
                                  file.type.includes("spreadsheet")
                                  ? "📊"
                                  : "📁"}
                        </span>
                        <div className="file-details">
                          <div className="file-name">{file.name}</div>
                          <div className="file-size">
                            {(file.size / 1024).toFixed(1)} Ko
                          </div>
                        </div>
                      </div>
                      <button
                        className="btn-remove-file"
                        onClick={() =>
                          setAttachedFiles(
                            attachedFiles.filter((_, i) => i !== index)
                          )
                        }
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="step-nav">
              <button
                className="btn btn-outline"
                onClick={() => setCurrentStep(2)}
              >
                ← Précédent
              </button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  // Validate comment
                  if (!commentaire.trim()) {
                    alert(
                      "⚠️ Veuillez saisir un commentaire avant de continuer"
                    );
                    // Scroll to and focus the textarea
                    const textarea = document.querySelector(
                      ".form-textarea"
                    ) as HTMLTextAreaElement;
                    if (textarea) {
                      textarea.scrollIntoView({
                        behavior: "smooth",
                        block: "center",
                      });
                      setTimeout(() => textarea.focus(), 300);
                    }
                    return;
                  }
                  // Validate billing (at least one option selected)
                  if (
                    !billing.maintenance &&
                    !billing.garantie &&
                    !billing.facturable
                  ) {
                    alert(
                      "⚠️ Veuillez sélectionner au moins une option de facturation"
                    );
                    return;
                  }
                  // Validate systemType
                  if (!systemType.trim()) {
                    alert("⚠️ Veuillez sélectionner un type de système");
                    return;
                  }
                  setCurrentStep(4);
                }}
              >
                Suivant →
              </button>
            </div>
          </div>
        )}

        {/* === STEP 4: SIGNATURE TECHNICIEN === */}
        {currentStep === 4 && isEnCours && (
          <div className="step-panel">
            <div className="info-card">
              <h3>✍️ Signature du technicien</h3>
              <p className="hint">
                Signez pour confirmer les travaux effectués
              </p>
            </div>

            <SignaturePad
              onSignatureChange={setSignatureTechnicien}
              initialSignature={signatureTechnicien || undefined}
              label="Votre signature"
            />

            <div className="step-nav">
              <button
                className="btn btn-outline"
                onClick={() => setCurrentStep(3)}
              >
                ← Précédent
              </button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  if (!signatureTechnicien) {
                    alert("⚠️ Veuillez signer avant de continuer");
                    return;
                  }
                  setCurrentStep(5);
                }}
              >
                Suivant →
              </button>
            </div>
          </div>
        )}

        {/* === STEP 5: SIGNATURE CLIENT === */}
        {currentStep === 5 && isEnCours && (
          <div className="step-panel">
            <div className="info-card">
              <h3>✍️ Signature du client</h3>

              <div className="form-group" style={{ marginBottom: "15px" }}>
                <label>Remarques Client (Optionnel)</label>
                <textarea
                  className="form-textarea"
                  rows={3}
                  placeholder="Remarques éventuelles du client..."
                  value={clientRemarks}
                  onChange={(e) => setClientRemarks(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ marginBottom: "15px" }}>
                <label>
                  Nom du signataire <span className="required">*</span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Nom Prénom"
                  value={clientSigner}
                  onChange={(e) => setClientSigner(e.target.value)}
                />
              </div>
            </div>

            <SignaturePad
              onSignatureChange={setSignatureClient}
              initialSignature={signatureClient || undefined}
              label="Signature du client (Obligatoire)"
            />

            <div className="closure-section">
              <h3>✅ Clôturer l'intervention</h3>
              <p className="hint">
                Vérifiez que toutes les informations sont correctes avant de
                clôturer.
              </p>
              <button
                className="btn btn-success btn-lg btn-block"
                type="button"
                onClick={() => {
                  // Logs removed for production
                  if (!signatureClient) {
                    alert("⚠️ La signature du client est obligatoire");
                    return;
                  }
                  handleClose();
                }}
              >
                ✅ Clôturer l'intervention
              </button>
            </div>

            <div className="step-nav">
              <button
                className="btn btn-outline"
                onClick={() => setCurrentStep(4)}
              >
                ← Précédent
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Scanner Modal */}
      {showScanner && (
        <BarcodeScanner
          onScan={handleBarcodeScan}
          onClose={() => setShowScanner(false)}
        />
      )}

      {/* Photo Modal with Zoom */}
      {modalPhoto && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.9)",
            zIndex: 9999,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={() => setModalPhoto(null)}
        >
          {/* Close button */}
          <button
            onClick={() => setModalPhoto(null)}
            style={{
              position: "absolute",
              top: "20px",
              right: "20px",
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              border: "none",
              background: "rgba(255,255,255,0.2)",
              color: "white",
              fontSize: "24px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ✕
          </button>

          {/* Zoom controls */}
          <div
            style={{
              position: "absolute",
              bottom: "30px",
              display: "flex",
              gap: "15px",
              alignItems: "center",
              background: "rgba(0,0,0,0.6)",
              padding: "10px 20px",
              borderRadius: "30px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setZoomLevel(Math.max(0.5, zoomLevel - 0.25))}
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                border: "none",
                background: "rgba(255,255,255,0.2)",
                color: "white",
                fontSize: "20px",
                cursor: "pointer",
              }}
            >
              −
            </button>
            <span
              style={{
                color: "white",
                fontSize: "14px",
                minWidth: "50px",
                textAlign: "center",
              }}
            >
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={() => setZoomLevel(Math.min(4, zoomLevel + 0.25))}
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                border: "none",
                background: "rgba(255,255,255,0.2)",
                color: "white",
                fontSize: "20px",
                cursor: "pointer",
              }}
            >
              +
            </button>
            <button
              onClick={() => setZoomLevel(1)}
              style={{
                padding: "8px 16px",
                borderRadius: "20px",
                border: "none",
                background: "rgba(255,255,255,0.2)",
                color: "white",
                fontSize: "12px",
                cursor: "pointer",
              }}
            >
              Reset
            </button>
          </div>

          {/* Image */}
          <div
            style={{
              overflow: "auto",
              maxWidth: "90vw",
              maxHeight: "80vh",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={modalPhoto}
              alt="Photo agrandie"
              style={{
                transform: `scale(${zoomLevel})`,
                transformOrigin: "center center",
                transition: "transform 0.2s ease",
                maxWidth: zoomLevel === 1 ? "90vw" : "none",
                maxHeight: zoomLevel === 1 ? "80vh" : "none",
                objectFit: "contain",
              }}
            />
          </div>
        </div>
      )}

      {/* Vehicle Stock Selection Modal */}
      {showVehicleStockModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowVehicleStockModal(false)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "20px",
          }}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: "500px",
              maxHeight: "80vh",
              backgroundColor: "var(--card-bg)",
              borderRadius: "16px",
              boxShadow: "var(--shadow-xl)",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              position: "relative",
            }}
          >
            {/* Close button - top right corner */}
            <button
              className="modal-close"
              onClick={() => setShowVehicleStockModal(false)}
              style={{
                position: "absolute",
                top: "10px",
                right: "10px",
                background: "none",
                border: "none",
                fontSize: "24px",
                cursor: "pointer",
                color: "var(--text-secondary)",
                padding: "5px 10px",
                zIndex: 10,
                borderRadius: "8px",
                transition: "background-color 0.2s",
              }}
              onMouseOver={(e) =>
                (e.currentTarget.style.backgroundColor = "var(--bg-secondary)")
              }
              onMouseOut={(e) =>
                (e.currentTarget.style.backgroundColor = "transparent")
              }
            >
              ✕
            </button>
            <div
              className="modal-header"
              style={{
                padding: "20px",
                paddingRight: "50px", // Space for close button
                borderBottom: "1px solid var(--border-color)",
                backgroundColor: "var(--bg-subtle)",
                flexShrink: 0,
              }}
            >
              <h3 style={{ margin: 0, color: "var(--text-primary)" }}>
                {vehicleStockAction === "install"
                  ? "📥 Installer du matériel"
                  : "📤 Reprendre du matériel"}
              </h3>
            </div>
            <div
              className="modal-body"
              style={{ overflowY: "auto", padding: "20px", flex: 1 }}
            >
              {loadingVehicleStock ? (
                <div style={{ textAlign: "center", padding: "40px" }}>
                  Chargement du stock véhicule...
                </div>
              ) : (
                <>
                  {vehicleStockAction === "install" ? (
                    // Installation: show items that are OK and not assigned
                    <>
                      <p
                        style={{
                          color: "var(--text-secondary)",
                          marginBottom: "15px",
                          fontSize: "0.9rem",
                        }}
                      >
                        Sélectionnez un article à installer chez{" "}
                        <strong>{intervention?.client?.nom}</strong>
                      </p>
                      {(() => {
                        const filteredItems = vehicleStock.filter(
                          (item) => item.etat === "ok" && !item.clientId
                        );
                        return filteredItems.length === 0 ? (
                          <div
                            style={{
                              textAlign: "center",
                              padding: "30px",
                              color: "var(--text-secondary)",
                            }}
                          >
                            <p>
                              "Tous les articles sont soit assignés à des
                              clients, soit en état HS."
                            </p>
                          </div>
                        ) : (
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: "10px",
                            }}
                          >
                            {filteredItems.map((item) => (
                              <div
                                key={item.id}
                                onClick={() => handleInstallItem(item)}
                                style={{
                                  padding: "15px",
                                  backgroundColor: "var(--bg-secondary)",
                                  borderRadius: "10px",
                                  cursor: "pointer",
                                  border: "2px solid transparent",
                                  transition: "all 0.2s",
                                }}
                                onMouseOver={(e) =>
                                (e.currentTarget.style.borderColor =
                                  "var(--primary-color)")
                                }
                                onMouseOut={(e) =>
                                (e.currentTarget.style.borderColor =
                                  "transparent")
                                }
                              >
                                <div style={{ fontWeight: 600 }}>
                                  {item.stock.nomMateriel}
                                </div>
                                {item.stock.reference && (
                                  <div
                                    style={{
                                      fontSize: "0.85rem",
                                      color: "var(--text-secondary)",
                                    }}
                                  >
                                    Réf: {item.stock.reference}
                                  </div>
                                )}
                                {item.stock.numeroSerie && (
                                  <div
                                    style={{
                                      fontSize: "0.85rem",
                                      color: "var(--primary-color)",
                                      fontWeight: 500,
                                    }}
                                  >
                                    🔢 S/N: {item.stock.numeroSerie}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </>
                  ) : (
                    // Retrait: show items assigned to THIS client
                    <>
                      <p
                        style={{
                          color: "var(--text-secondary)",
                          marginBottom: "15px",
                          fontSize: "0.9rem",
                        }}
                      >
                        Sélectionnez un article à reprendre chez{" "}
                        <strong>{intervention?.client?.nom}</strong>
                      </p>
                      {(() => {
                        const filteredItems = vehicleStock.filter(
                          (item) => item.clientId === intervention?.client?.id
                        );
                        return filteredItems.length === 0 ? (
                          <div
                            style={{
                              textAlign: "center",
                              padding: "30px",
                              color: "var(--text-secondary)",
                            }}
                          >
                            <p>
                              "Il n'y a pas de matériel à reprendre chez ce
                              client."
                            </p>
                          </div>
                        ) : (
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: "10px",
                            }}
                          >
                            {filteredItems.map((item) => (
                              <div
                                key={item.id}
                                onClick={() => handleSelectForRetrieval(item)}
                                style={{
                                  padding: "15px",
                                  backgroundColor: "var(--bg-secondary)",
                                  borderRadius: "10px",
                                  cursor: "pointer",
                                  border: "2px solid transparent",
                                  transition: "all 0.2s",
                                }}
                                onMouseOver={(e) =>
                                (e.currentTarget.style.borderColor =
                                  "var(--primary-color)")
                                }
                                onMouseOut={(e) =>
                                (e.currentTarget.style.borderColor =
                                  "transparent")
                                }
                              >
                                <div style={{ fontWeight: 600 }}>
                                  {item.stock.nomMateriel}
                                </div>
                                {item.stock.reference && (
                                  <div
                                    style={{
                                      fontSize: "0.85rem",
                                      color: "var(--text-secondary)",
                                    }}
                                  >
                                    Réf: {item.stock.reference}
                                  </div>
                                )}
                                {item.stock.numeroSerie && (
                                  <div
                                    style={{
                                      fontSize: "0.85rem",
                                      color: "var(--primary-color)",
                                      fontWeight: 500,
                                    }}
                                  >
                                    🔢 S/N: {item.stock.numeroSerie}
                                  </div>
                                )}
                                <div
                                  style={{
                                    fontSize: "0.8rem",
                                    marginTop: "5px",
                                    color: "var(--text-secondary)",
                                  }}
                                >
                                  📍 Installé le{" "}
                                  {item.assignedAt
                                    ? new Date(
                                      item.assignedAt
                                    ).toLocaleDateString("fr-FR")
                                    : "N/A"}
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Retrieve Condition Modal (OK/HS selection) */}
      {showRetrieveConditionModal && selectedVehicleItem && (
        <div
          className="modal-overlay"
          onClick={() => {
            setShowRetrieveConditionModal(false);
            setSelectedVehicleItem(null);
          }}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10000,
            padding: "20px",
          }}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: "400px",
              textAlign: "center",
              backgroundColor: "var(--card-bg)",
              borderRadius: "16px",
              boxShadow: "var(--shadow-xl)",
              overflow: "hidden",
            }}
          >
            <div
              className="modal-header"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "20px",
                borderBottom: "1px solid var(--border-color)",
                backgroundColor: "var(--bg-subtle)",
              }}
            >
              <h3 style={{ margin: 0, color: "var(--text-primary)" }}>
                📦 État du matériel
              </h3>
              <button
                className="modal-close"
                onClick={() => {
                  setShowRetrieveConditionModal(false);
                  setSelectedVehicleItem(null);
                }}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "24px",
                  cursor: "pointer",
                  color: "var(--text-secondary)",
                  padding: "5px",
                }}
              >
                ✕
              </button>
            </div>
            <div className="modal-body" style={{ padding: "25px" }}>
              <p style={{ marginBottom: "10px" }}>
                <strong>{selectedVehicleItem.stock.nomMateriel}</strong>
              </p>
              {selectedVehicleItem.stock.numeroSerie && (
                <p
                  style={{
                    fontSize: "0.9rem",
                    color: "var(--primary-color)",
                    marginBottom: "20px",
                  }}
                >
                  🔢 S/N: {selectedVehicleItem.stock.numeroSerie}
                </p>
              )}
              <p
                style={{ color: "var(--text-secondary)", marginBottom: "25px" }}
              >
                Dans quel état est ce matériel ?
              </p>
              <div
                style={{
                  display: "flex",
                  gap: "15px",
                  justifyContent: "center",
                }}
              >
                <button
                  onClick={() => handleRetrieveItem("ok")}
                  style={{
                    padding: "15px 30px",
                    fontSize: "1.1rem",
                    fontWeight: 600,
                    borderRadius: "12px",
                    border: "none",
                    backgroundColor: "#d1fae5",
                    color: "#065f46",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    flex: 1,
                  }}
                  onMouseOver={(e) =>
                    (e.currentTarget.style.transform = "scale(1.05)")
                  }
                  onMouseOut={(e) =>
                    (e.currentTarget.style.transform = "scale(1)")
                  }
                >
                  ✅ OK
                </button>
                <button
                  onClick={() => handleRetrieveItem("hs")}
                  style={{
                    padding: "15px 30px",
                    fontSize: "1.1rem",
                    fontWeight: 600,
                    borderRadius: "12px",
                    border: "none",
                    backgroundColor: "#fee2e2",
                    color: "#991b1b",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    flex: 1,
                  }}
                  onMouseOver={(e) =>
                    (e.currentTarget.style.transform = "scale(1.05)")
                  }
                  onMouseOut={(e) =>
                    (e.currentTarget.style.transform = "scale(1)")
                  }
                >
                  ❌ HS
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TechnicianInterventionView;

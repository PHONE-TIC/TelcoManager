import { useState } from "react";
import { apiService } from "../services/api.service";
import SignaturePad from "./SignaturePad";
import BarcodeScanner from "./BarcodeScanner";
import PhotoCapture from "./PhotoCapture";
import { generateInterventionPDF } from "../utils/pdfGenerator";
import "./InterventionWorkflow.css";

interface Photo {
  id: string;
  dataUrl: string;
  timestamp: Date;
  type: "before" | "after" | "other";
  caption?: string;
}

interface Equipment {
  id?: string;
  stockId?: string;
  nom: string;
  action: "install" | "retrait";
  etat?: "ok" | "hs";
  quantite: number;
  serialNumber?: string;
}

interface InterventionWorkflowProps {
  interventionId: string;
  statut: string;
  heureArrivee?: string;
  heureDepart?: string;
  commentaireTechnicien?: string;
  signature?: string;
  onStatusChange: () => void;
  readOnly?: boolean;
}

export default function InterventionWorkflow({
  interventionId,
  statut,
  heureArrivee: initialHeureArrivee,
  heureDepart: initialHeureDepart,
  commentaireTechnicien: initialComment,
  signature: initialSignature,
  onStatusChange,
  readOnly = false,
}: InterventionWorkflowProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Hours
  const [heureArrivee, setHeureArrivee] = useState(initialHeureArrivee || "");
  const [heureDepart, setHeureDepart] = useState(initialHeureDepart || "");

  // Comment
  const [commentaire, setCommentaire] = useState(initialComment || "");

  // Signature
  const [signature, setSignature] = useState<string | null>(
    initialSignature || null
  );

  // Photos
  const [photos, setPhotos] = useState<Photo[]>([]);

  // Equipment
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [showScanner, setShowScanner] = useState(false);
  const [scanAction, setScanAction] = useState<"install" | "retrait">(
    "install"
  );
  const [showEquipmentForm, setShowEquipmentForm] = useState(false);
  const [newEquipment, setNewEquipment] = useState<Partial<Equipment>>({
    nom: "",
    action: "install",
    quantite: 1,
  });

  const showMessage = (msg: string, isError = false) => {
    if (isError) {
      setError(msg);
      setSuccess(null);
    } else {
      setSuccess(msg);
      setError(null);
    }
    setTimeout(() => {
      setError(null);
      setSuccess(null);
    }, 3000);
  };

  // === CLOSE INTERVENTION ===
  const handleClose = async () => {
    // Validate hours
    if (!heureArrivee || !heureDepart) {
      showMessage("Veuillez saisir les heures d'arrivée et de départ", true);
      return;
    }

    setLoading(true);
    try {
      // Save hours
      await apiService.validateInterventionHours(interventionId, {
        heureArrivee: new Date(heureArrivee).toISOString(),
        heureDepart: new Date(heureDepart).toISOString(),
      });

      // Save signature if present
      if (signature) {
        await apiService.signIntervention(interventionId, {
          type: "client",
          signature,
        });
      }

      // Update status to terminee
      await apiService.updateInterventionStatus(interventionId, {
        statut: "terminee",
        commentaireTechnicien: commentaire,
      });

      // === UPLOAD ARTIFACTS (Photos + PDF) ===
      try {
        const formData = new FormData();

        // 1. Convert Photos to Blobs
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

        // 2. Generate PDF Blob
        // Note: We need a full intervention object for the PDF.
        // We'll construct a partial one with what we have + hours/comment
        // Ideally, we should fetch the latest or merge props.
        // For now, let's assumme basic info is enough or we fetch it.
        // Better approach: Let backend generate the PDF?
        // Or user requested "folder with report AND photos".
        // Since frontend has the PDF generator, we use it.

        // HACK: We need to reconstruct the intervention object for the PDF
        // We'll fetch the latest version to be sure
        const latestIntervention = await apiService.getInterventionById(
          interventionId
        );
        const pdfBlob = await generateInterventionPDF(
          {
            ...latestIntervention,
            heureArrivee: new Date(heureArrivee).toISOString(),
            heureDepart: new Date(heureDepart).toISOString(),
            commentaireTechnicien: commentaire,
            signature,
            statut: "terminee", // Ensure it says closed
          },
          true
        ); // true = return Blob

        if (pdfBlob && pdfBlob instanceof Blob) {
          formData.append(
            "files",
            pdfBlob,
            `Rapport_${latestIntervention.numero || "Intervention"}.pdf`
          );
        }

        if (photos.length > 0 || pdfBlob) {
          showMessage("Envoi des fichiers en cours...");
          await apiService.uploadInterventionArtifacts(
            interventionId,
            formData
          );
        }
      } catch (uploadError) {
        console.error("Upload failed", uploadError);
        // Don't block closure if upload fails, but warn
        showMessage("Clôture réussie, mais échec envoi fichiers", true);
        onStatusChange();
        return;
      }

      showMessage("Intervention clôturée avec succès et fichiers envoyés !");
      onStatusChange();
    } catch (err: any) {
      showMessage(
        err.response?.data?.error || "Erreur lors de la clôture",
        true
      );
    } finally {
      setLoading(false);
    }
  };

  // === HOURS ===
  const handleSaveHours = async () => {
    if (!heureArrivee || !heureDepart) {
      showMessage("Veuillez saisir les deux heures", true);
      return;
    }

    setLoading(true);
    try {
      await apiService.validateInterventionHours(interventionId, {
        heureArrivee: new Date(heureArrivee).toISOString(),
        heureDepart: new Date(heureDepart).toISOString(),
      });
      showMessage("Heures enregistrées");
    } catch (err: any) {
      showMessage(err.response?.data?.error || "Erreur", true);
    } finally {
      setLoading(false);
    }
  };

  // === EQUIPMENT ===
  const handleBarcodeScan = async (barcode: string) => {
    setShowScanner(false);

    try {
      // Try to find the item in stock
      const stockItem = await apiService.getStockByBarcode(barcode);

      if (stockItem) {
        const equipment: Equipment = {
          stockId: stockItem.id,
          nom: stockItem.nomMateriel,
          action: scanAction,
          quantite: 1,
          etat: scanAction === "retrait" ? "ok" : undefined,
        };
        setEquipments([...equipments, equipment]);
        showMessage(`${stockItem.nomMateriel} ajouté`);
      } else {
        showMessage("Article non trouvé - ajoutez-le manuellement", true);
        setShowEquipmentForm(true);
      }
    } catch {
      showMessage("Article non trouvé - ajoutez-le manuellement", true);
      setShowEquipmentForm(true);
    }
  };

  const handleAddEquipment = () => {
    if (!newEquipment.nom) {
      showMessage("Nom du matériel requis", true);
      return;
    }

    const equipment: Equipment = {
      nom: newEquipment.nom!,
      action: newEquipment.action || "install",
      quantite: newEquipment.quantite || 1,
      etat: newEquipment.etat,
      serialNumber: newEquipment.serialNumber,
    };

    setEquipments([...equipments, equipment]);
    setNewEquipment({ nom: "", action: "install", quantite: 1 });
    setShowEquipmentForm(false);
    showMessage("Matériel ajouté");
  };

  const handleRemoveEquipment = (index: number) => {
    setEquipments(equipments.filter((_, i) => i !== index));
  };

  const handleSaveEquipments = async () => {
    if (equipments.length === 0) {
      showMessage("Aucun matériel à enregistrer", true);
      return;
    }

    setLoading(true);
    try {
      for (const eq of equipments) {
        await apiService.manageInterventionEquipment(interventionId, {
          stockId: eq.stockId,
          nom: eq.nom,
          action: eq.action,
          quantite: eq.quantite,
          etat: eq.etat,
          serialNumber: eq.serialNumber,
        });
      }
      showMessage("Matériel enregistré");
      setEquipments([]);
      onStatusChange();
    } catch (err: any) {
      showMessage(err.response?.data?.error || "Erreur", true);
    } finally {
      setLoading(false);
    }
  };

  if (readOnly) return null;

  return (
    <div className="intervention-workflow">
      {/* Messages */}
      {error && <div className="workflow-message error">{error}</div>}
      {success && <div className="workflow-message success">{success}</div>}

      {/* === STATUS ACTIONS === */}
      {statut === "en_cours" && (
        <div className="workflow-section">
          <h3>🔄 Clôturer l'intervention</h3>
          <p className="workflow-hint">
            Remplissez les informations ci-dessous avant de clôturer.
          </p>
          <button
            className="btn btn-primary btn-lg"
            onClick={handleClose}
            disabled={loading || !heureArrivee || !heureDepart}
          >
            ✅ Clôturer l'intervention
          </button>
        </div>
      )}

      {/* === HOURS === */}
      {statut === "en_cours" && (
        <div className="workflow-section">
          <h3>🕐 Heures d'intervention</h3>
          <div className="hours-grid">
            <div className="form-group">
              <label>Heure d'arrivée</label>
              <input
                type="datetime-local"
                value={heureArrivee}
                onChange={(e) => setHeureArrivee(e.target.value)}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label>Heure de départ</label>
              <input
                type="datetime-local"
                value={heureDepart}
                onChange={(e) => setHeureDepart(e.target.value)}
                className="form-input"
              />
            </div>
          </div>
          <button
            className="btn btn-secondary"
            onClick={handleSaveHours}
            disabled={loading || !heureArrivee || !heureDepart}
          >
            💾 Enregistrer les heures
          </button>
        </div>
      )}

      {/* === EQUIPMENT === */}
      {statut === "en_cours" && (
        <div className="workflow-section">
          <h3>🔧 Matériel</h3>

          <div className="equipment-actions">
            <button
              className="btn btn-outline"
              onClick={() => {
                setScanAction("install");
                setShowScanner(true);
              }}
            >
              📷 Scanner Installation
            </button>
            <button
              className="btn btn-outline"
              onClick={() => {
                setScanAction("retrait");
                setShowScanner(true);
              }}
            >
              📷 Scanner Retrait
            </button>
            <button
              className="btn btn-outline"
              onClick={() => setShowEquipmentForm(true)}
            >
              ➕ Ajouter manuellement
            </button>
          </div>

          {/* Scanned/Added Equipment List */}
          {equipments.length > 0 && (
            <div className="equipment-list">
              {equipments.map((eq, index) => (
                <div key={index} className={`equipment-item ${eq.action}`}>
                  <div className="equipment-info">
                    <span className="equipment-action">
                      {eq.action === "install" ? "📥" : "📤"}
                    </span>
                    <span className="equipment-name">{eq.nom}</span>
                    <span className="equipment-qty">x{eq.quantite}</span>
                    {eq.etat && (
                      <span className={`equipment-etat ${eq.etat}`}>
                        {eq.etat.toUpperCase()}
                      </span>
                    )}
                  </div>
                  <button
                    className="btn-remove"
                    onClick={() => handleRemoveEquipment(index)}
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                className="btn btn-success"
                onClick={handleSaveEquipments}
                disabled={loading}
              >
                💾 Enregistrer le matériel ({equipments.length})
              </button>
            </div>
          )}

          {/* Manual Equipment Form */}
          {showEquipmentForm && (
            <div className="equipment-form">
              <div className="form-row">
                <input
                  type="text"
                  placeholder="Nom du matériel"
                  value={newEquipment.nom}
                  onChange={(e) =>
                    setNewEquipment({ ...newEquipment, nom: e.target.value })
                  }
                  className="form-input"
                />
              </div>
              <div className="form-row">
                <select
                  value={newEquipment.action}
                  onChange={(e) =>
                    setNewEquipment({
                      ...newEquipment,
                      action: e.target.value as any,
                    })
                  }
                  className="form-input"
                >
                  <option value="install">Installation</option>
                  <option value="retrait">Retrait</option>
                </select>
                {newEquipment.action === "retrait" && (
                  <select
                    value={newEquipment.etat || "ok"}
                    onChange={(e) =>
                      setNewEquipment({
                        ...newEquipment,
                        etat: e.target.value as any,
                      })
                    }
                    className="form-input"
                  >
                    <option value="ok">OK</option>
                    <option value="hs">HS</option>
                  </select>
                )}
                <input
                  type="number"
                  min="1"
                  value={newEquipment.quantite}
                  onChange={(e) =>
                    setNewEquipment({
                      ...newEquipment,
                      quantite: parseInt(e.target.value) || 1,
                    })
                  }
                  className="form-input qty-input"
                />
              </div>
              <div className="form-row">
                <input
                  type="text"
                  placeholder="N° de série (optionnel)"
                  value={newEquipment.serialNumber || ""}
                  onChange={(e) =>
                    setNewEquipment({
                      ...newEquipment,
                      serialNumber: e.target.value,
                    })
                  }
                  className="form-input"
                />
              </div>
              <div className="form-actions">
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowEquipmentForm(false)}
                >
                  Annuler
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleAddEquipment}
                >
                  Ajouter
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* === COMMENT === */}
      {statut === "en_cours" && (
        <div className="workflow-section">
          <h3>📝 Commentaire technicien</h3>
          <textarea
            value={commentaire}
            onChange={(e) => setCommentaire(e.target.value)}
            placeholder="Notes sur l'intervention, observations..."
            className="form-textarea"
            rows={4}
          />
        </div>
      )}

      {/* === SIGNATURE === */}
      {statut === "en_cours" && (
        <SignaturePad
          onSignatureChange={setSignature}
          initialSignature={initialSignature}
          label="Signature du client"
        />
      )}

      {/* === PHOTOS === */}
      {statut === "en_cours" && (
        <div className="workflow-section">
          <PhotoCapture
            photos={photos}
            onPhotoAdd={(p) => setPhotos([...photos, p])}
            onPhotoRemove={(id) => setPhotos(photos.filter((p) => p.id !== id))}
          />
        </div>
      )}

      {/* === SCANNERS === */}
      {showScanner && (
        <BarcodeScanner
          onScan={handleBarcodeScan}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  );
}

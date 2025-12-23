import { useState } from "react";
import { apiService } from "../services/api.service";
import SignaturePad from "./SignaturePad";
import BarcodeScanner from "./BarcodeScanner";
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
  intervention: any; // Using any to avoid complex type duplication for now, or import shared type
  photos: Photo[]; // Photos passed from parent component
  onStatusChange: () => void;
  readOnly?: boolean;
}

export default function InterventionWorkflow({
  intervention,
  photos, // Receive photos from parent (InterventionDetail)
  onStatusChange,
  readOnly = false,
}: InterventionWorkflowProps) {
  // Extract initial values from the full object
  const {
    id: interventionId,
    statut,
    heureArrivee: initialHeureArrivee,
    heureDepart: initialHeureDepart,
    commentaireTechnicien: initialComment,
    signature: initialSignature,
  } = intervention;
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

  // Photos are now passed from parent, no local state needed
  // const [photos, setPhotos] = useState<Photo[]>([]);

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
      console.log("=== UPLOAD ARTIFACTS START ===");
      console.log("Photos received:", photos.length, photos);

      try {
        const formData = new FormData();

        // 1. Convert Photos to Blobs
        console.log("Converting photos to blobs...");
        for (let i = 0; i < photos.length; i++) {
          const photo = photos[i];
          console.log(
            `Processing photo ${i + 1}:`,
            photo.type,
            photo.dataUrl?.substring(0, 50)
          );
          const res = await fetch(photo.dataUrl);
          const blob = await res.blob();
          console.log(`Photo ${i + 1} blob size:`, blob.size);
          const ext =
            photo.type === "before"
              ? "avant"
              : photo.type === "after"
              ? "apres"
              : "autre";
          formData.append("files", blob, `photo_${ext}_${i + 1}.jpg`);
        }
        console.log(
          "Photos converted. FormData entries:",
          [...formData.entries()].length
        );

        // 2. Generate PDF Blob
        // Use the passed intervention object updated with local state
        const latestIntervention = {
          ...intervention,
          heureArrivee: new Date(heureArrivee).toISOString(),
          heureDepart: new Date(heureDepart).toISOString(),
          commentaireTechnicien: commentaire,
          signature,
          statut: "terminee",
        };

        console.log(
          "Generating PDF with intervention data:",
          latestIntervention.numero
        );
        const pdfBlob = await generateInterventionPDF(
          latestIntervention,
          true,
          photos
        ); // true = return Blob
        console.log(
          "PDF generated:",
          pdfBlob ? `Blob size ${(pdfBlob as Blob).size}` : "null/void"
        );

        if (pdfBlob && pdfBlob instanceof Blob) {
          formData.append(
            "files",
            pdfBlob,
            `Rapport_${latestIntervention.numero || "Intervention"}.pdf`
          );
          console.log("PDF added to FormData");
        }

        console.log("Final FormData entries:", [...formData.entries()].length);

        if (photos.length > 0 || pdfBlob) {
          console.log("Uploading artifacts:", {
            photos: photos.length,
            hasPdf: !!pdfBlob,
            formDataSize: [...formData.entries()].length,
          });
          showMessage("Envoi des fichiers en cours...");

          try {
            console.log(
              "Calling uploadInterventionArtifacts for:",
              interventionId
            );
            const uploadResult = await apiService.uploadInterventionArtifacts(
              interventionId,
              formData
            );
            console.log("Upload successful:", uploadResult);
          } catch (e) {
            console.error("Critical upload error:", e);
            alert(
              "ERREUR CRITIQUE: L'envoi des photos a échoué ! Notez l'erreur et contactez le support.\n\n" +
                (e as any).message
            );
            // We re-throw or handle specific logic?
            // Since status is already updated, we can't revert easily.
            throw e; // Pass to outer catch
          }
        } else {
          console.log("No files to upload (photos.length=0 and no PDF)");
        }
      } catch (uploadError) {
        console.error("Upload process failed", uploadError);
        alert(
          "Attention: La clôture est validée MAIS les fichiers n'ont pas été transmis.\n" +
            (uploadError as any).message
        );
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

      {/* === PHOTOS are now in InterventionDetail, not duplicated here === */}

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

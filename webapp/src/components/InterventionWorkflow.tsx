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
  intervention: {
    id: string;
    technicienId?: string;
    statut?: string;
    heureArrivee?: string;
    heureDepart?: string;
    commentaireTechnicien?: string;
    signature?: string;
    [key: string]: any;
  };
  photos: Photo[];
  onStatusChange: () => void;
  readOnly?: boolean;
}

export default function InterventionWorkflow({
  intervention,
  photos,
  onStatusChange,
  readOnly = false,
}: InterventionWorkflowProps) {
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

  // === WIZARD STATE ===
  // === WIZARD STATE ===
  const [currentStep, setCurrentStep] = useState(1);
  // Step 1: Hours
  // Step 2: Report
  // Step 3: Equipment
  // Step 4: Technician Signature
  // Step 5: Closing (Client Signature)

  // === DATA STATE ===

  // Step 1: Hours
  const extractTime = (isoString?: string) => {
    if (!isoString) return "";
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  };

  const [timeArrivee, setTimeArrivee] = useState(
    extractTime(initialHeureArrivee)
  );
  const [timeDepart, setTimeDepart] = useState(extractTime(initialHeureDepart));

  const [isoHeureArrivee, setIsoHeureArrivee] = useState(
    initialHeureArrivee || ""
  );
  const [isoHeureDepart, setIsoHeureDepart] = useState(
    initialHeureDepart || ""
  );

  // Step 2: Report
  const [billing, setBilling] = useState({
    maintenance: false,
    garantie: false,
    facturable: false,
  });
  const [systemType, setSystemType] = useState("");
  const [commentaire, setCommentaire] = useState(initialComment || "");

  // Step 3: Equipment
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

  // Step 4: Technician Signature
  const [signatureTechnicien, setSignatureTechnicien] = useState<string | null>(
    intervention.signatureTechnicien || null
  );

  // Step 5: Closing
  const [clientRemarks, setClientRemarks] = useState("");
  const [clientSigner, setClientSigner] = useState("");
  const [signature, setSignature] = useState<string | null>(
    initialSignature || null
  );

  const showMessage = (msg: string, isError = false) => {
    if (isError) {
      setError(msg);
    } else {
      setSuccess(msg);
    }
    setTimeout(() => {
      setError(null);
      setSuccess(null);
    }, 3000);
  };

  // === HELPERS ===
  const updateIsoTimes = () => {
    if (!timeArrivee || !timeDepart) return false;
    const today = new Date();
    const [hArr, mArr] = timeArrivee.split(":").map(Number);
    const dateArr = new Date(today);
    dateArr.setHours(hArr, mArr, 0, 0);

    const [hDep, mDep] = timeDepart.split(":").map(Number);
    const dateDep = new Date(today);
    dateDep.setHours(hDep, mDep, 0, 0);

    setIsoHeureArrivee(dateArr.toISOString());
    setIsoHeureDepart(dateDep.toISOString());

    return {
      start: dateArr.toISOString(),
      end: dateDep.toISOString(),
    };
  };

  const handleStep1Next = async () => {
    if (!timeArrivee || !timeDepart) {
      showMessage("Veuillez saisir les heures.", true);
      return;
    }
    const dates = updateIsoTimes();
    if (!dates) return;

    setLoading(true);
    try {
      await apiService.validateInterventionHours(interventionId, {
        heureArrivee: dates.start,
        heureDepart: dates.end,
      });
      showMessage("Heures enregistrées");
      setCurrentStep(2);
    } catch (err: unknown) {
      showMessage("Erreur sauvegarde heures", true);
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => setCurrentStep((prev) => prev + 1);
  const prevStep = () => setCurrentStep((prev) => prev - 1);

  // === FINAL CLOSE ===
  const handleClose = async () => {
    // Final validations
    if (!clientSigner) {
      showMessage("Nom du signataire requis", true);
      return;
    }
    if (!signature) {
      showMessage("Signature client requise", true);
      return;
    }

    setLoading(true);
    try {
      // Save Technician Signature
      if (signatureTechnicien) {
        await apiService.signIntervention(interventionId, {
          type: "technicien",
          signature: signatureTechnicien,
        });
      }

      // Save Client Signature
      if (signature) {
        await apiService.signIntervention(interventionId, {
          type: "client",
          signature,
        });
      }

      // Update Status
      await apiService.updateInterventionStatus(interventionId, {
        statut: "terminee",
        commentaireTechnicien: commentaire,
      });

      // --- ARTIFACT UPLOAD ---
      console.log("=== UPLOAD ARTIFACTS START ===");
      const formData = new FormData();

      // Photos
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

      // PDF
      const latestIntervention = {
        ...intervention,
        heureArrivee: isoHeureArrivee,
        heureDepart: isoHeureDepart,
        commentaireTechnicien: commentaire,
        signature,
        signatureTechnicien, // Include in PDF data
        statut: "terminee",
      };

      const extraData = {
        billing,
        systemType,
        clientRemarks,
        clientSigner,
      };

      const pdfBlob = await generateInterventionPDF(
        latestIntervention as any,
        true,
        photos,
        extraData
      );
      if (pdfBlob && pdfBlob instanceof Blob) {
        formData.append(
          "files",
          pdfBlob,
          `Rapport_${(latestIntervention as any).numero || "Intervention"}.pdf`
        );
      }

      if (photos.length > 0 || pdfBlob) {
        showMessage("Envoi des fichiers...");
        await apiService.uploadInterventionArtifacts(interventionId, formData);
      }

      showMessage("Intervention clôturée avec succès !");
      onStatusChange();
    } catch (err: unknown) {
      showMessage((err as any).message || "Erreur de clôture", true);
    } finally {
      setLoading(false);
    }
  };

  // === EQUIPMENT HANDLERS ===
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
        showMessage("Ajouté");
      } else {
        setShowEquipmentForm(true);
      }
    } catch {
      setShowEquipmentForm(true);
    }
  };

  const handleManualAdd = () => {
    if (!newEquipment.nom) return;
    setEquipments([
      ...equipments,
      { ...newEquipment, nom: newEquipment.nom! } as Equipment,
    ]);
    setNewEquipment({ nom: "", action: "install", quantite: 1 });
    setShowEquipmentForm(false);
  };

  const handleSaveEquipments = async () => {
    setLoading(true);
    try {
      for (const eq of equipments) {
        await apiService.manageInterventionEquipment(interventionId, eq);
      }
      showMessage("Matériel enregistré");
      setEquipments([]);
    } catch (e) {
      showMessage("Erreur save matériel", true);
    } finally {
      setLoading(false);
    }
  };


  if (readOnly) return null;
  if (statut !== "en_cours") return null;

  return (
    <div className="intervention-workflow wizard-container">
      {/* Messages */}
      {error && <div className="workflow-message error">{error}</div>}
      {success && <div className="workflow-message success">{success}</div>}

      <h4 style={{ textAlign: "center", color: "var(--primary-color)" }}>
        Assistant Clôture (Admin)
      </h4>

      {/* Progress Bar */}
      <div className="wizard-progress">
        <div className={`step-dot ${currentStep >= 1 ? "active" : ""}`}>1</div>
        <div className="step-line"></div>
        <div className={`step-dot ${currentStep >= 2 ? "active" : ""}`}>2</div>
        <div className="step-line"></div>
        <div className={`step-dot ${currentStep >= 3 ? "active" : ""}`}>3</div>
        <div className="step-line"></div>
        <div className={`step-dot ${currentStep >= 4 ? "active" : ""}`}>4</div>
        <div className="step-line"></div>
        <div className={`step-dot ${currentStep >= 5 ? "active" : ""}`}>5</div>
      </div>

      <div className="wizard-content">
        {/* STEP 1: HEURES */}
        {currentStep === 1 && (
          <div className="wizard-step">
            <h3>Heures d'intervention</h3>
            <div className="form-group-row">
              <div className="form-group">
                <label>Arrivée</label>
                <input
                  type="time"
                  className="form-input time-input"
                  value={timeArrivee}
                  onChange={(e) => setTimeArrivee(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Départ</label>
                <input
                  type="time"
                  className="form-input time-input"
                  value={timeDepart}
                  onChange={(e) => setTimeDepart(e.target.value)}
                />
              </div>
            </div>
            <div className="wizard-actions">
              <button
                className="btn btn-primary"
                onClick={handleStep1Next}
                disabled={loading}
              >
                Suivant & Enregistrer ➔
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: RAPPORT */}
        {currentStep === 2 && (
          <div className="wizard-step">
            <h3>Rapport Technicien</h3>

            {/* Billing */}
            <div className="form-group-checkboxes">
              <label>Facturation :</label>
              <div className="checkbox-row">
                <label>
                  <input
                    type="checkbox"
                    checked={billing.maintenance}
                    onChange={(e) =>
                      setBilling({ ...billing, maintenance: e.target.checked })
                    }
                  />{" "}
                  Maint.
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={billing.garantie}
                    onChange={(e) =>
                      setBilling({ ...billing, garantie: e.target.checked })
                    }
                  />{" "}
                  Garant.
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={billing.facturable}
                    onChange={(e) =>
                      setBilling({ ...billing, facturable: e.target.checked })
                    }
                  />{" "}
                  Factur.
                </label>
              </div>
            </div>

            <div className="form-group">
              <label>Type de système</label>
              <input
                type="text"
                className="form-input"
                value={systemType}
                onChange={(e) => setSystemType(e.target.value)}
                placeholder="Ex: Alarme..."
              />
            </div>

            <div className="form-group">
              <label>Commentaire Technicien</label>
              <textarea
                className="form-textarea"
                rows={4}
                value={commentaire}
                onChange={(e) => setCommentaire(e.target.value)}
              />
            </div>

            <div className="wizard-actions">
              <button className="btn btn-secondary" onClick={prevStep}>
                ⬅ Retour
              </button>
              <button className="btn btn-primary" onClick={nextStep}>
                Suivant ➔
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: MATERIEL */}
        {currentStep === 3 && (
          <div className="wizard-step">
            <h3>Matériel Utilisé</h3>
            <div className="equipment-actions">
              <button
                className="btn btn-outline"
                onClick={() => {
                  setScanAction("install");
                  setShowScanner(true);
                }}
              >
                Scanner Install
              </button>
              <button
                className="btn btn-outline"
                onClick={() => {
                  setScanAction("retrait");
                  setShowScanner(true);
                }}
              >
                Scanner Retrait
              </button>
              <button
                className="btn btn-outline"
                onClick={() => setShowEquipmentForm(true)}
              >
                Manuel
              </button>
            </div>

            {equipments.length > 0 && (
              <div className="equipment-list">
                {equipments.map((eq, i) => (
                  <div key={i} className={`equipment-item ${eq.action}`}>
                    <span>{eq.action === "install" ? "IN" : "OUT"}</span>
                    <span>
                      {eq.nom} (x{eq.quantite})
                    </span>
                    <button
                      onClick={() =>
                        setEquipments(equipments.filter((_, idx) => idx !== i))
                      }
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <button
                  className="btn btn-success btn-sm"
                  onClick={handleSaveEquipments}
                  disabled={loading}
                >
                  Sauvegarder Liste
                </button>
              </div>
            )}

            {showEquipmentForm && (
              <div className="equipment-form-inline">
                <input
                  type="text"
                  placeholder="Nom"
                  className="form-input"
                  value={newEquipment.nom}
                  onChange={(e) =>
                    setNewEquipment({ ...newEquipment, nom: e.target.value })
                  }
                />
                <div className="form-row">
                  <input
                    type="number"
                    className="form-input"
                    value={newEquipment.quantite}
                    onChange={(e) =>
                      setNewEquipment({
                        ...newEquipment,
                        quantite: +e.target.value,
                      })
                    }
                  />
                  <select
                    className="form-input"
                    value={newEquipment.action}
                    onChange={(e) =>
                      setNewEquipment({
                        ...newEquipment,
                        action: e.target.value as any,
                      })
                    }
                  >
                    <option value="install">Install</option>
                    <option value="retrait">Retrait</option>
                  </select>
                </div>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={handleManualAdd}
                >
                  Ajouter
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowEquipmentForm(false)}
                >
                  Annuler
                </button>
              </div>
            )}

            <div className="wizard-actions">
              <button className="btn btn-secondary" onClick={prevStep}>
                ⬅ Retour
              </button>
              <button className="btn btn-primary" onClick={nextStep}>
                Suivant ➔
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: SIGNATURE TECHNICIEN (NEW) */}
        {currentStep === 4 && (
          <div className="wizard-step">
            <h3>Signature du Technicien</h3>
            <div className="form-group">
              <p className="hint">
                Signature du technicien (Vous ou le technicien assigné).
              </p>
            </div>
            <SignaturePad
              onSignatureChange={setSignatureTechnicien}
              initialSignature={signatureTechnicien || undefined}
              label="Signature Technicien"
            />
            <div className="wizard-actions">
              <button className="btn btn-secondary" onClick={prevStep}>
                ⬅ Retour
              </button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  if (!signatureTechnicien) {
                    showMessage("Signature technicien requise", true);
                    return;
                  }
                  nextStep();
                }}
              >
                Suivant ➔
              </button>
            </div>
          </div>
        )}

        {/* STEP 5: CLOSING (formerly 4) */}
        {currentStep === 5 && (
          <div className="wizard-step">
            <h3>Clôture & Signature Client</h3>

            <div className="form-group">
              <label>Remarques Client</label>
              <textarea
                className="form-textarea"
                rows={3}
                value={clientRemarks}
                onChange={(e) => setClientRemarks(e.target.value)}
                placeholder="RAS..."
              />
            </div>

            <div className="form-group">
              <label>Nom du signataire (Obligatoire)</label>
              <input
                type="text"
                className="form-input"
                value={clientSigner}
                onChange={(e) => setClientSigner(e.target.value)}
              />
            </div>

            <SignaturePad
              onSignatureChange={setSignature}
              initialSignature={initialSignature}
              label="Signature Client"
            />

            <div className="wizard-actions">
              <button className="btn btn-secondary" onClick={prevStep}>
                ⬅ Retour
              </button>
              <button
                className="btn btn-primary btn-lg"
                onClick={handleClose}
                disabled={loading || !signature || !clientSigner}
              >
                ✅ CLÔTURER L'INTERVENTION
              </button>
            </div>
          </div>
        )}
      </div>

      {/* SCANNERS */}
      {showScanner && (
        <BarcodeScanner
          onScan={handleBarcodeScan}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  );
}

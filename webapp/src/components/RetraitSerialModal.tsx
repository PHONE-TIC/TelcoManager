import { useState, useEffect } from "react";
import { apiService } from "../services/api.service";
import { AppIcon } from "./AppIcon";
import AutocompleteInput from "./AutocompleteInput";
import {
  STOCK_CATEGORIES,
  STOCK_SUPPLIERS,
  generateReferencePreview,
} from "../constants/stock.constants";

interface RetraitSerialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (equipment: {
    nom: string;
    action: "retrait";
    quantite: number;
    etat: "ok" | "hs";
    marque?: string;
    modele?: string;
    serialNumber?: string;
    stockId?: string;
    notes?: string;
    reference?: string;
    categorie?: string;
    fournisseur?: string;
  }) => void;
  clientName?: string;
  interventionId?: string;
}

export default function RetraitSerialModal({
  isOpen,
  onClose,
  onConfirm,
  clientName,
  interventionId,
}: RetraitSerialModalProps) {
  // Wizard steps: 'search' | 'known_result' | 'unknown_form'
  const [step, setStep] = useState<"search" | "known_result" | "unknown_form">("search");
  const [serialNumber, setSerialNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // States for known item
  const [knownItem, setKnownItem] = useState<{
    id: string;
    nomMateriel: string;
    reference: string;
    marque: string;
    modele: string;
  } | null>(null);

  // States for unknown item form
  const [marque, setMarque] = useState("");
  const [modele, setModele] = useState("");
  const [categorie, setCategorie] = useState("");
  const [fournisseur, setFournisseur] = useState("");
  const [notes, setNotes] = useState("");

  // Common retrieval state
  const [etat, setEtat] = useState<"ok" | "hs" | null>(null);

  // Autocomplete lists
  const [allBrands, setAllBrands] = useState<string[]>([]);
  const [modelsForBrand, setModelsForBrand] = useState<string[]>([]);

  // Fetch autocomplete brands on load
  useEffect(() => {
    if (isOpen) {
      void loadAutocompleteBrands();
    }
  }, [isOpen]);

  // Load models when brand changes
  useEffect(() => {
    if (marque) {
      void loadAutocompleteModels(marque);
    } else {
      setModelsForBrand([]);
    }
  }, [marque]);

  const loadAutocompleteBrands = async () => {
    try {
      const data = await apiService.getStockAutocomplete();
      if (data && data.marques) {
        setAllBrands(data.marques);
      }
    } catch (err) {
      console.error("Failed to load autocomplete brands", err);
    }
  };

  const loadAutocompleteModels = async (selectedBrand: string) => {
    try {
      const data = await apiService.getStockAutocomplete(selectedBrand);
      if (data && data.modeles) {
        setModelsForBrand(data.modeles);
      }
    } catch (err) {
      console.error("Failed to load autocomplete models", err);
    }
  };

  // Reference preview (actual number is determined server-side)
  const referencePreview = generateReferencePreview(marque, categorie);

  const resetState = () => {
    setStep("search");
    setSerialNumber("");
    setLoading(false);
    setError(null);
    setKnownItem(null);
    setMarque("");
    setModele("");
    setCategorie("");
    setFournisseur("");
    setNotes("");
    setEtat(null);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleSearchSerial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serialNumber.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const item = await apiService.getStockBySerial(serialNumber.trim());
      if (item) {
        setKnownItem(item);
        setStep("known_result");
      } else {
        setStep("unknown_form");
      }
    } catch (err: any) {
      // 404 means unrecognized serial
      setStep("unknown_form");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmRetrait = async () => {
    if (!etat) {
      setError("Veuillez sélectionner l'état du matériel (OK ou HS)");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (step === "known_result" && knownItem) {
        if (interventionId) {
          try {
            await apiService.manageInterventionEquipment(interventionId, {
              stockId: knownItem.id,
              action: "retrait",
              serialNumber: serialNumber.trim().toUpperCase(),
              etat: etat,
              dryRun: true,
            });
          } catch (err: any) {
            const serverMsg = err.response?.data?.error || err.response?.data?.message || "Erreur de validation du matériel";
            setError(serverMsg);
            setLoading(false);
            return;
          }
        }

        onConfirm({
          nom: knownItem.nomMateriel,
          action: "retrait",
          quantite: 1,
          etat: etat,
          marque: knownItem.marque,
          modele: knownItem.modele,
          serialNumber: serialNumber.trim().toUpperCase(),
          stockId: knownItem.id,
        });
        handleClose();
      } else if (step === "unknown_form") {
        if (!marque.trim()) {
          setError("Veuillez saisir une marque");
          setLoading(false);
          return;
        }
        if (!modele.trim()) {
          setError("Veuillez saisir un modèle");
          setLoading(false);
          return;
        }
        if (!categorie) {
          setError("Veuillez sélectionner une catégorie");
          setLoading(false);
          return;
        }
        if (!fournisseur) {
          setError("Veuillez sélectionner un fournisseur");
          setLoading(false);
          return;
        }

        if (interventionId && serialNumber.trim()) {
          try {
            await apiService.manageInterventionEquipment(interventionId, {
              action: "retrait",
              serialNumber: serialNumber.trim().toUpperCase(),
              etat: etat,
              marque: marque.trim().toUpperCase(),
              modele: modele.trim().toUpperCase(),
              nom: `${marque.trim()} ${modele.trim()}`.toUpperCase(),
              categorie: categorie,
              fournisseur: fournisseur,
              dryRun: true,
            });
          } catch (err: any) {
            const serverMsg = err.response?.data?.error || err.response?.data?.message || "Erreur de validation du matériel";
            setError(serverMsg);
            setLoading(false);
            return;
          }
        }

        const nomGenere = `${marque} ${modele}`.trim().toUpperCase();

        onConfirm({
          nom: nomGenere,
          action: "retrait",
          quantite: 1,
          etat: etat,
          marque: marque.trim().toUpperCase(),
          modele: modele.trim().toUpperCase(),
          serialNumber: serialNumber.trim().toUpperCase(),
          notes: notes || undefined,
          categorie,
          fournisseur,
        });
        handleClose();
      }
    } catch (err: any) {
      setError("Une erreur est survenue lors de la validation.");
    } finally {
      setLoading(false);
    }
  };

  // Shared input style (matching StockForm premium style)
  const fieldInputStyle = {
    width: "100%",
    padding: "10px 14px",
    borderRadius: "8px",
    border: "1px solid var(--border-color)",
    backgroundColor: "var(--bg-secondary)",
    color: "var(--text-primary)",
  };

  const fieldLabelStyle = {
    display: "block" as const,
    marginBottom: "6px",
    fontWeight: 600,
    fontSize: "0.8rem",
    color: "var(--text-secondary)",
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10000,
        padding: "20px",
        backdropFilter: "blur(4px)",
      }}
      onClick={handleClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "520px",
          backgroundColor: "var(--card-bg, #1e293b)",
          borderRadius: "16px",
          boxShadow: "var(--shadow-xl)",
          overflow: "hidden",
          border: "1px solid var(--border-color, #334155)",
          display: "flex",
          flexDirection: "column",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "20px",
            borderBottom: "1px solid var(--border-color, #334155)",
            backgroundColor: "var(--bg-subtle, #0f172a)",
          }}
        >
          <h3 style={{ margin: 0, color: "var(--text-primary, #f8fafc)", fontSize: "1.2rem", fontWeight: 600 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "10px" }}>
              <AppIcon name="return" size={20} /> Retrait de matériel
            </span>
          </h3>
          <button
            onClick={handleClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--text-secondary, #94a3b8)",
              padding: "5px",
            }}
          >
            <AppIcon name="close" size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "24px", maxHeight: "80vh", overflowY: "auto" }}>
          {error && (
            <div
              style={{
                marginBottom: "20px",
                padding: "12px 16px",
                backgroundColor: "rgba(239, 68, 68, 0.15)",
                border: "1px solid #ef4444",
                borderRadius: "8px",
                color: "#f87171",
                fontSize: "0.9rem",
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <AppIcon name="warning" size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: Search by Serial */}
          {step === "search" && (
            <form onSubmit={handleSearchSerial} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", margin: 0, lineHeight: 1.5 }}>
                Saisissez le numéro de série du matériel à retirer chez <strong>{clientName || "le client"}</strong>.
              </p>

              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontWeight: 600,
                    fontSize: "0.85rem",
                    color: "var(--text-secondary)",
                  }}
                >
                  Numéro de série (S/N) *
                </label>
                <input
                  type="text"
                  required
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value.toUpperCase())}
                  placeholder="Ex: FCW1234ABCD"
                  className="form-input-premium"
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    borderRadius: "8px",
                    fontSize: "1.1rem",
                    fontFamily: "monospace",
                    backgroundColor: "var(--bg-secondary, #0f172a)",
                    color: "var(--text-primary, #f8fafc)",
                    border: "1px solid var(--border-color, #334155)",
                    outline: "none",
                  }}
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={loading || !serialNumber.trim()}
                style={{
                  width: "100%",
                  padding: "14px",
                  borderRadius: "10px",
                  border: "none",
                  backgroundColor: "var(--primary-color, #3b82f6)",
                  color: "#ffffff",
                  fontSize: "1rem",
                  fontWeight: 600,
                  cursor: loading || !serialNumber.trim() ? "not-allowed" : "pointer",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  gap: "10px",
                  opacity: loading ? 0.7 : 1,
                  transition: "all 0.2s",
                }}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                    Recherche en cours...
                  </>
                ) : (
                  <>
                    <AppIcon name="search" size={18} /> Vérifier le numéro de série
                  </>
                )}
              </button>
            </form>
          )}

          {/* STEP 2A: Known Equipment Form */}
          {step === "known_result" && knownItem && (
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              <div
                style={{
                  padding: "16px",
                  backgroundColor: "rgba(16, 185, 129, 0.1)",
                  border: "1px solid #10b981",
                  borderRadius: "10px",
                  color: "#34d399",
                  fontSize: "0.95rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <AppIcon name="download" size={18} />
                <span>Matériel identifié avec succès !</span>
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                  backgroundColor: "var(--bg-secondary)",
                  padding: "20px",
                  borderRadius: "10px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "8px" }}>
                  <span style={{ color: "var(--text-secondary)" }}>S/N :</span>
                  <strong style={{ fontFamily: "monospace", color: "var(--primary-color)" }}>{serialNumber}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "8px" }}>
                  <span style={{ color: "var(--text-secondary)" }}>Nom :</span>
                  <strong style={{ color: "var(--text-primary)" }}>{knownItem.nomMateriel}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "8px" }}>
                  <span style={{ color: "var(--text-secondary)" }}>Marque :</span>
                  <strong style={{ color: "var(--text-primary)" }}>{knownItem.marque}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "8px" }}>
                  <span style={{ color: "var(--text-secondary)" }}>Modèle :</span>
                  <strong style={{ color: "var(--text-primary)" }}>{knownItem.modele}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text-secondary)" }}>Référence :</span>
                  <strong style={{ fontFamily: "monospace", color: "#10b981" }}>{knownItem.reference}</strong>
                </div>
              </div>

              {/* State Selection */}
              <div>
                <label style={{ display: "block", marginBottom: "12px", fontWeight: 600, color: "var(--text-secondary)" }}>
                  État du matériel retiré *
                </label>
                <div style={{ display: "flex", gap: "16px" }}>
                  <button
                    type="button"
                    onClick={() => setEtat("ok")}
                    style={{
                      flex: 1,
                      padding: "16px",
                      borderRadius: "12px",
                      border: etat === "ok" ? "2px solid #10b981" : "2px solid transparent",
                      backgroundColor: etat === "ok" ? "rgba(16, 185, 129, 0.2)" : "var(--bg-secondary)",
                      color: etat === "ok" ? "#34d399" : "var(--text-secondary)",
                      fontWeight: 600,
                      cursor: "pointer",
                      transition: "all 0.2s",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <AppIcon name="download" size={16} /> Fonctionnel (OK)
                  </button>
                  <button
                    type="button"
                    onClick={() => setEtat("hs")}
                    style={{
                      flex: 1,
                      padding: "16px",
                      borderRadius: "12px",
                      border: etat === "hs" ? "2px solid #ef4444" : "2px solid transparent",
                      backgroundColor: etat === "hs" ? "rgba(239, 68, 68, 0.2)" : "var(--bg-secondary)",
                      color: etat === "hs" ? "#f87171" : "var(--text-secondary)",
                      fontWeight: 600,
                      cursor: "pointer",
                      transition: "all 0.2s",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <AppIcon name="warning" size={16} /> Hors Service (HS)
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: "flex", gap: "12px", marginTop: "10px" }}>
                <button
                  type="button"
                  onClick={() => setStep("search")}
                  style={{
                    padding: "14px 20px",
                    borderRadius: "10px",
                    border: "1.5px solid var(--border-color)",
                    backgroundColor: "transparent",
                    color: "var(--text-primary)",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Retour
                </button>
                <button
                  type="button"
                  onClick={handleConfirmRetrait}
                  disabled={!etat}
                  style={{
                    flex: 1,
                    padding: "14px",
                    borderRadius: "10px",
                    border: "none",
                    backgroundColor: "var(--primary-color)",
                    color: "white",
                    fontWeight: 600,
                    cursor: !etat ? "not-allowed" : "pointer",
                    opacity: !etat ? 0.6 : 1,
                  }}
                >
                  Confirmer le retrait
                </button>
              </div>
            </div>
          )}

          {/* STEP 2B: Unknown Equipment Form */}
          {step === "unknown_form" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div
                style={{
                  padding: "14px 16px",
                  backgroundColor: "rgba(245, 158, 11, 0.1)",
                  border: "1px solid #f59e0b",
                  borderRadius: "10px",
                  color: "#fbbf24",
                  fontSize: "0.9rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <AppIcon name="warning" size={18} />
                <span>Numéro de série inconnu. Renseignement manuel requis.</span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {/* Brand input (Autocomplete) */}
                <AutocompleteInput
                  label="Marque *"
                  value={marque}
                  onChange={(val) => setMarque(val.toUpperCase())}
                  suggestions={allBrands}
                  required
                  placeholder="Ex: CISCO, YEALINK..."
                />

                {/* Model input (Autocomplete) */}
                <AutocompleteInput
                  label="Modèle *"
                  value={modele}
                  onChange={(val) => setModele(val.toUpperCase())}
                  suggestions={modelsForBrand}
                  required
                  placeholder="Ex: T46S, SPA504G..."
                />

                {/* Référence (générée) */}
                <div>
                  <label style={fieldLabelStyle}>
                    Référence (générée)
                  </label>
                  <input
                    type="text"
                    disabled
                    value={referencePreview}
                    className="form-input-premium"
                    placeholder="Remplissez Marque et Catégorie"
                    style={{
                      ...fieldInputStyle,
                      backgroundColor: "rgba(255,255,255,0.05)",
                      color: referencePreview ? "#10b981" : "var(--text-secondary)",
                      fontFamily: "monospace",
                      fontWeight: 600,
                    }}
                  />
                </div>

                {/* Catégorie */}
                <div>
                  <label style={fieldLabelStyle}>
                    Catégorie *
                  </label>
                  <select
                    value={categorie}
                    onChange={(e) => setCategorie(e.target.value)}
                    className="form-input-premium"
                    style={{ ...fieldInputStyle, cursor: "pointer" }}
                  >
                    <option value="">Sélectionner une catégorie</option>
                    {STOCK_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Fournisseur */}
                <div>
                  <label style={fieldLabelStyle}>
                    Fournisseur *
                  </label>
                  <select
                    value={fournisseur}
                    onChange={(e) => setFournisseur(e.target.value)}
                    className="form-input-premium"
                    style={{ ...fieldInputStyle, cursor: "pointer" }}
                  >
                    <option value="">Sélectionner un fournisseur</option>
                    {STOCK_SUPPLIERS.map((sup) => (
                      <option key={sup} value={sup}>
                        {sup}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Notes */}
                <div>
                  <label style={fieldLabelStyle}>
                    Notes / Commentaires
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    placeholder="Détails supplémentaires..."
                    className="form-input-premium"
                    style={fieldInputStyle}
                  />
                </div>
              </div>

              {/* State Selection */}
              <div>
                <label style={{ display: "block", marginBottom: "12px", fontWeight: 600, color: "var(--text-secondary)" }}>
                  État du matériel retiré *
                </label>
                <div style={{ display: "flex", gap: "16px" }}>
                  <button
                    type="button"
                    onClick={() => setEtat("ok")}
                    style={{
                      flex: 1,
                      padding: "14px",
                      borderRadius: "10px",
                      border: etat === "ok" ? "2px solid #10b981" : "2px solid transparent",
                      backgroundColor: etat === "ok" ? "rgba(16, 185, 129, 0.2)" : "var(--bg-secondary)",
                      color: etat === "ok" ? "#34d399" : "var(--text-secondary)",
                      fontWeight: 600,
                      cursor: "pointer",
                      transition: "all 0.2s",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <AppIcon name="download" size={16} /> Fonctionnel (OK)
                  </button>
                  <button
                    type="button"
                    onClick={() => setEtat("hs")}
                    style={{
                      flex: 1,
                      padding: "14px",
                      borderRadius: "10px",
                      border: etat === "hs" ? "2px solid #ef4444" : "2px solid transparent",
                      backgroundColor: etat === "hs" ? "rgba(239, 68, 68, 0.2)" : "var(--bg-secondary)",
                      color: etat === "hs" ? "#f87171" : "var(--text-secondary)",
                      fontWeight: 600,
                      cursor: "pointer",
                      transition: "all 0.2s",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <AppIcon name="warning" size={16} /> Hors Service (HS)
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: "flex", gap: "12px", marginTop: "10px" }}>
                <button
                  type="button"
                  onClick={() => setStep("search")}
                  style={{
                    padding: "14px 20px",
                    borderRadius: "10px",
                    border: "1.5px solid var(--border-color)",
                    backgroundColor: "transparent",
                    color: "var(--text-primary)",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Retour
                </button>
                <button
                  type="button"
                  onClick={handleConfirmRetrait}
                  disabled={!marque.trim() || !modele.trim() || !etat}
                  style={{
                    flex: 1,
                    padding: "14px",
                    borderRadius: "10px",
                    border: "none",
                    backgroundColor: "var(--primary-color)",
                    color: "white",
                    fontWeight: 600,
                    cursor: !marque.trim() || !modele.trim() || !etat ? "not-allowed" : "pointer",
                    opacity: !marque.trim() || !modele.trim() || !etat ? 0.6 : 1,
                  }}
                >
                  Confirmer le retrait
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

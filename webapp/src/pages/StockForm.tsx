import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiService } from "../services/api.service";
import type { Stock } from "../types";

function StockForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = !!id;

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingCategories, setExistingCategories] = useState<string[]>([]);
  const [serialNumbersCount, setSerialNumbersCount] = useState(0);
  const [formData, setFormData] = useState({
    marque: "",
    modele: "",
    reference: "",
    numeroSerie: "",
    codeBarre: "",
    categorie: "",
    fournisseur: "",
    quantite: 1,
    lowStockThreshold: 5,
    notes: "",
    statut: "courant",
  });

  // Génération de la prévisualisation de la référence
  const generateReferencePreview = (
    marque: string,
    categorie: string
  ): string => {
    if (!marque || !categorie) return "";
    const cleanStr = (str: string): string => {
      return str
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Supprimer les accents
        .replace(/[^a-zA-Z]/g, "") // Garder uniquement les lettres
        .toUpperCase()
        .substring(0, 3)
        .padEnd(3, "X");
    };
    return `${cleanStr(marque)}${cleanStr(categorie)}XXXXX`;
  };

  // Parse serial numbers from comma or newline separated input
  const parseSerialNumbers = (input: string): string[] => {
    return input
      .split(/[,\n]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  };

  // Handle serial numbers change with auto-quantity update
  const handleSerialNumbersChange = (value: string) => {
    const serialNumbers = parseSerialNumbers(value);
    const count = serialNumbers.length;
    setSerialNumbersCount(count);

    setFormData((prev) => ({
      ...prev,
      numeroSerie: value,
      // Auto-update quantity only for new items (not editing) and only if > 0 serial numbers
      quantite: !isEditing && count > 0 ? count : prev.quantite,
    }));
  };

  useEffect(() => {
    loadCategories();
    if (isEditing) {
      loadStock();
    }
  }, [id]);

  const loadCategories = async () => {
    try {
      const data = await apiService.getStock({ limit: 500 });
      const cats = [
        ...new Set(data.stock.map((item: Stock) => item.categorie)),
      ].sort() as string[];
      setExistingCategories(cats);
    } catch (err) {
      console.error("Erreur chargement catégories:", err);
    }
  };

  const loadStock = async () => {
    try {
      const item = await apiService.getStockById(id!);
      setFormData({
        marque: item.marque || "",
        modele: item.modele || "",
        reference: item.reference || "",
        numeroSerie: item.numeroSerie || "",
        codeBarre: item.codeBarre || "",
        categorie: item.categorie || "",
        fournisseur: item.fournisseur || "",
        quantite: item.quantite || 1,
        lowStockThreshold: item.lowStockThreshold ?? 5,
        notes: item.notes || "",
        statut: item.statut || "courant",
      });
    } catch (err) {
      console.error("Erreur chargement stock:", err);
      setError("Article non trouvé");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      if (isEditing) {
        await apiService.updateStock(id!, formData);
      } else {
        await apiService.createStock(formData);
      }
      navigate("/stock");
    } catch (err: unknown) {
      console.error("Erreur sauvegarde:", err);
      const axiosError = err as {
        response?: { data?: { error?: string; message?: string } };
      };
      const errorMessage =
        axiosError.response?.data?.error ||
        axiosError.response?.data?.message ||
        "Erreur lors de la sauvegarde. Vérifiez les champs obligatoires.";
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const inputStyle = {
    width: "100%",
    padding: "12px 16px",
    border: "1.5px solid rgba(255, 255, 255, 0.3)",
    borderRadius: "8px",
    fontSize: "1rem",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    color: "var(--text-primary)",
    transition: "all 0.2s",
    outline: "none",
  };

  const labelStyle = {
    display: "block",
    marginBottom: "6px",
    fontWeight: 600,
    fontSize: "0.875rem",
    color: "var(--text-secondary)",
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <button
          onClick={() => navigate("/stock")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "16px",
            padding: "8px 16px",
            borderRadius: "8px",
            border: "1.5px solid rgba(255,255,255,0.3)",
            backgroundColor: "rgba(255,255,255,0.05)",
            color: "var(--text-primary)",
            cursor: "pointer",
            transition: "all 0.2s",
          }}
        >
          ← Retour au stock
        </button>
        <h1 className="text-2xl font-bold text-gray-800">
          {isEditing ? "✏️ Modifier le matériel" : "📦 Nouveau matériel"}
        </h1>
        <p className="text-gray-500">
          {isEditing
            ? "Modifiez les informations du matériel"
            : "Ajoutez un nouveau matériel au stock"}
        </p>
      </div>

      {/* Form */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "20px",
            }}
          >
            {/* Marque */}
            <div>
              <label style={labelStyle}>Marque *</label>
              <input
                type="text"
                value={formData.marque}
                onChange={(e) => handleChange("marque", e.target.value)}
                placeholder="Ex: Yealink, Cisco, Ubiquiti..."
                style={inputStyle}
                required={!isEditing}
              />
            </div>

            {/* Modèle */}
            <div>
              <label style={labelStyle}>Modèle</label>
              <input
                type="text"
                value={formData.modele}
                onChange={(e) => handleChange("modele", e.target.value)}
                placeholder="Ex: T46U, SG350-28, UAP-AC-PRO..."
                style={inputStyle}
              />
            </div>

            {/* Référence (générée automatiquement) */}
            <div>
              <label style={labelStyle}>
                Référence
                {!isEditing && (
                  <span
                    style={{
                      marginLeft: "8px",
                      padding: "2px 8px",
                      borderRadius: "12px",
                      fontSize: "0.7rem",
                      fontWeight: 500,
                      backgroundColor: "#dbeafe",
                      color: "#1e40af",
                    }}
                  >
                    Générée automatiquement
                  </span>
                )}
              </label>
              {isEditing ? (
                <div
                  style={{
                    ...inputStyle,
                    backgroundColor: "rgba(255, 255, 255, 0.02)",
                    color: "#10b981",
                    fontFamily: "monospace",
                    fontSize: "1.1rem",
                    fontWeight: 600,
                  }}
                >
                  {formData.reference || "—"}
                </div>
              ) : (
                <div
                  style={{
                    ...inputStyle,
                    backgroundColor: "rgba(255, 255, 255, 0.02)",
                    color:
                      formData.marque && formData.categorie
                        ? "#10b981"
                        : "var(--text-secondary)",
                    fontFamily: "monospace",
                    fontSize: "1.1rem",
                    fontWeight: 600,
                  }}
                >
                  {formData.marque && formData.categorie
                    ? generateReferencePreview(
                        formData.marque,
                        formData.categorie
                      )
                    : "Remplissez Marque et Catégorie"}
                </div>
              )}
            </div>

            {/* Numéro de série - Multiple entries */}
            <div>
              <label style={labelStyle}>
                Numéro(s) de série
                {!isEditing && serialNumbersCount > 0 && (
                  <span
                    style={{
                      marginLeft: "8px",
                      padding: "2px 8px",
                      borderRadius: "12px",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      backgroundColor: "#dbeafe",
                      color: "#1e40af",
                    }}
                  >
                    {serialNumbersCount} détecté
                    {serialNumbersCount > 1 ? "s" : ""}
                  </span>
                )}
              </label>
              <textarea
                value={formData.numeroSerie}
                onChange={(e) => handleSerialNumbersChange(e.target.value)}
                placeholder={
                  isEditing
                    ? "Ex: FCW1234ABCD"
                    : "Un numéro par ligne ou séparés par des virgules\nEx: SN001, SN002, SN003"
                }
                rows={isEditing ? 1 : 3}
                style={{
                  ...inputStyle,
                  resize: "vertical",
                  minHeight: isEditing ? "44px" : "80px",
                }}
              />
              {!isEditing && (
                <p
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--text-secondary)",
                    marginTop: "4px",
                  }}
                >
                  💡 La quantité s'ajuste automatiquement au nombre de numéros
                  de série
                </p>
              )}
            </div>

            {/* Catégorie */}
            <div>
              <label style={labelStyle}>Catégorie *</label>
              <input
                type="text"
                value={formData.categorie}
                onChange={(e) => handleChange("categorie", e.target.value)}
                placeholder="Ex: Réseau, Sécurité, Téléphonie..."
                list="categories"
                style={inputStyle}
                required
              />
              <datalist id="categories">
                {existingCategories.map((cat, i) => (
                  <option key={i} value={cat} />
                ))}
              </datalist>
            </div>

            {/* Fournisseur */}
            <div>
              <label style={labelStyle}>Fournisseur</label>
              <select
                value={formData.fournisseur}
                onChange={(e) => handleChange("fournisseur", e.target.value)}
                className="form-input-premium"
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  borderRadius: "8px",
                  fontSize: "1rem",
                  cursor: "pointer",
                }}
              >
                <option value="">Sélectionner un fournisseur</option>
                {[
                  "Amazon",
                  "CDiscount",
                  "Effiprod",
                  "EMG",
                  "Francofa",
                  "Initio",
                  "IP&Go",
                  "Itancia",
                  "Networth Télécom",
                  "Office Easy",
                  "OneDirect",
                  "Rexel",
                  "Unyc",
                  "Zicom",
                ].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Quantité */}
            <div>
              <label style={labelStyle}>Quantité *</label>
              <input
                type="number"
                min="0"
                value={formData.quantite}
                onChange={(e) =>
                  handleChange("quantite", parseInt(e.target.value) || 0)
                }
                style={inputStyle}
                required
              />
            </div>

            {/* Statut */}
            <div>
              <label style={labelStyle}>Statut</label>
              <select
                value={formData.statut}
                onChange={(e) => handleChange("statut", e.target.value)}
                className="form-input-premium"
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  borderRadius: "8px",
                  fontSize: "1rem",
                  cursor: "pointer",
                }}
              >
                <option value="courant">📦 En stock</option>
                <option value="hs">⚠️ Hors service</option>
              </select>
            </div>

            {/* Notes */}
            <div style={{ gridColumn: "span 2" }}>
              <label style={labelStyle}>Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleChange("notes", e.target.value)}
                placeholder="Informations supplémentaires..."
                rows={4}
                style={inputStyle}
              />
            </div>
          </div>

          {/* Buttons */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "12px",
              marginTop: "32px",
              paddingTop: "24px",
              borderTop: "1px solid var(--border-color)",
            }}
          >
            <button
              type="button"
              onClick={() => navigate("/stock")}
              style={{
                padding: "12px 24px",
                borderRadius: "8px",
                border: "1.5px solid rgba(255, 255, 255, 0.4)",
                backgroundColor: "transparent",
                color: "var(--text-primary)",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{
                padding: "12px 24px",
                borderRadius: "8px",
                border: "none",
                backgroundColor: "var(--primary-color)",
                color: "white",
                fontWeight: 600,
                cursor: saving ? "not-allowed" : "pointer",
                opacity: saving ? 0.7 : 1,
                transition: "all 0.2s",
              }}
            >
              {saving
                ? "⏳ Enregistrement..."
                : isEditing
                ? "💾 Enregistrer"
                : "➕ Créer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default StockForm;

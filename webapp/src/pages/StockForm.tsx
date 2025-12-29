import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiService } from "../services/api.service";

function StockForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = !!id;

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    const uppercaseValue = value.toUpperCase();
    const serialNumbers = parseSerialNumbers(uppercaseValue);
    const count = serialNumbers.length;
    setSerialNumbersCount(count);

    setFormData((prev) => ({
      ...prev,
      numeroSerie: uppercaseValue,
      // Auto-update quantity only for new items (not editing) and only if > 0 serial numbers
      quantite: !isEditing && count > 0 ? count : prev.quantite,
    }));
  };

  useEffect(() => {
    if (isEditing) {
      loadStock();
    }
  }, [id, isEditing]);

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

  // Liste des champs obligatoires (pour un nouvel article)
  const requiredFields = [
    { key: "marque", label: "Marque" },
    { key: "modele", label: "Modèle" },
    { key: "numeroSerie", label: "Numéro de série" },
    { key: "categorie", label: "Catégorie" },
    { key: "fournisseur", label: "Fournisseur" },
  ];

  // État pour les erreurs de validation par champ
  const [fieldErrors, setFieldErrors] = useState<Record<string, boolean>>({});

  // Validation du formulaire
  const validateForm = (): boolean => {
    const errors: Record<string, boolean> = {};
    let isValid = true;

    for (const field of requiredFields) {
      const value = formData[field.key as keyof typeof formData];
      const isEmpty = value === "" || value === null || value === undefined;
      if (isEmpty) {
        errors[field.key] = true;
        isValid = false;
      }
    }

    setFieldErrors(errors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Valider le formulaire avant soumission
    if (!validateForm()) {
      const missingFields = requiredFields
        .filter(
          (f) =>
            fieldErrors[f.key] ||
            formData[f.key as keyof typeof formData] === ""
        )
        .map((f) => f.label);
      setError(
        `Veuillez remplir tous les champs obligatoires : ${missingFields.join(
          ", "
        )}`
      );
      return;
    }

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

  // Champs qui doivent être en majuscules
  const uppercaseFields = ["marque", "modele", "numeroSerie"];

  const handleChange = (field: string, value: string | number) => {
    // Convertir en majuscules pour les champs concernés
    const finalValue =
      uppercaseFields.includes(field) && typeof value === "string"
        ? value.toUpperCase()
        : value;
    setFormData((prev) => ({ ...prev, [field]: finalValue }));
    // Effacer l'erreur du champ quand l'utilisateur commence à taper
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: false }));
    }
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

  const errorInputStyle = {
    ...inputStyle,
    border: "2px solid var(--error-color, #dc2626)",
    backgroundColor: "var(--error-bg, rgba(220, 38, 38, 0.15))",
  };

  // Helper pour obtenir le style d'un champ en fonction de son état d'erreur
  const getInputStyle = (fieldName: string) => {
    return fieldErrors[fieldName] ? errorInputStyle : inputStyle;
  };

  const labelStyle = {
    display: "block",
    marginBottom: "6px",
    fontWeight: 600,
    fontSize: "0.875rem",
    color: "var(--text-secondary)",
  };

  const errorLabelStyle = {
    ...labelStyle,
    color: "var(--error-color, #dc2626)",
  };

  // Helper pour obtenir le style du label
  const getLabelStyle = (fieldName: string) => {
    return fieldErrors[fieldName] ? errorLabelStyle : labelStyle;
  };

  // Style pour les messages d'erreur sous les champs
  const fieldErrorStyle = {
    color: "var(--error-color, #dc2626)",
    fontSize: "0.75rem",
    marginTop: "4px",
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
          <div
            style={{
              marginBottom: "24px",
              padding: "16px",
              backgroundColor: "var(--error-bg)",
              border: "1px solid var(--error-color)",
              borderRadius: "8px",
              color: "var(--error-color)",
              fontWeight: 500,
            }}
          >
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
              <label style={getLabelStyle("marque")}>Marque *</label>
              <input
                type="text"
                value={formData.marque}
                onChange={(e) => handleChange("marque", e.target.value)}
                placeholder="Ex: YEALINK, CISCO, UBIQUITI..."
                style={getInputStyle("marque")}
              />
              {fieldErrors.marque && (
                <p style={fieldErrorStyle}>⚠️ Ce champ est obligatoire</p>
              )}
            </div>

            {/* Modèle */}
            <div>
              <label style={getLabelStyle("modele")}>Modèle *</label>
              <input
                type="text"
                value={formData.modele}
                onChange={(e) => handleChange("modele", e.target.value)}
                placeholder="Ex: T46U, SG350-28, UAP-AC-PRO..."
                style={getInputStyle("modele")}
              />
              {fieldErrors.modele && (
                <p style={fieldErrorStyle}>⚠️ Ce champ est obligatoire</p>
              )}
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
              <label style={getLabelStyle("numeroSerie")}>
                Numéro(s) de série *
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
                  ...getInputStyle("numeroSerie"),
                  resize: "vertical",
                  minHeight: isEditing ? "44px" : "80px",
                }}
              />
              {fieldErrors.numeroSerie && (
                <p style={fieldErrorStyle}>⚠️ Ce champ est obligatoire</p>
              )}
              {!isEditing && !fieldErrors.numeroSerie && (
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
              <label style={getLabelStyle("categorie")}>Catégorie *</label>
              <select
                value={formData.categorie}
                onChange={(e) => handleChange("categorie", e.target.value)}
                className="form-input-premium"
                style={{
                  ...getInputStyle("categorie"),
                  cursor: "pointer",
                }}
              >
                <option value="">Sélectionner une catégorie</option>
                {[
                  "Téléphone IP",
                  "Téléphone analogique",
                  "Borne DECT IP",
                  "Borne DECT Analogique",
                  "Téléphone IP DECT",
                  "Accessoires DECT",
                  "Accessoires Téléphone Fixe",
                  "Répéteur DECT",
                  "PBX Analogique",
                  "PBX IP",
                  "Accessoires PBX",
                  "Routeur",
                  "Accessoires routeur",
                  "Onduleur",
                  "Accessoires Onduleur",
                  "SBC-PC",
                  "Cartes SIM",
                ].map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              {fieldErrors.categorie && (
                <p style={fieldErrorStyle}>⚠️ Ce champ est obligatoire</p>
              )}
            </div>

            {/* Fournisseur */}
            <div>
              <label style={getLabelStyle("fournisseur")}>Fournisseur *</label>
              <select
                value={formData.fournisseur}
                onChange={(e) => handleChange("fournisseur", e.target.value)}
                className="form-input-premium"
                style={{
                  ...getInputStyle("fournisseur"),
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
              {fieldErrors.fournisseur && (
                <p style={fieldErrorStyle}>⚠️ Ce champ est obligatoire</p>
              )}
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

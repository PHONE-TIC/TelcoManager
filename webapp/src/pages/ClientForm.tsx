import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiService } from "../services/api.service";

function ClientForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = !!id;

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    nom: "",
    sousLieu: "",
    rue: "",
    codePostal: "",
    ville: "",
    contact: "",
    telephone: "",
    email: "",
    notes: "",
  });

  // Liste des champs obligatoires
  const requiredFields = [
    { key: "nom", label: "Nom / Entreprise" },
    { key: "rue", label: "Rue" },
    { key: "codePostal", label: "Code postal" },
    { key: "ville", label: "Ville" },
    { key: "contact", label: "Nom du contact" },
    { key: "telephone", label: "Téléphone" },
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

  useEffect(() => {
    const loadClient = async () => {
      try {
        const client = await apiService.getClientById(id!);
        setFormData({
          nom: client.nom || "",
          sousLieu: client.sousLieu || "",
          rue: client.rue || "",
          codePostal: client.codePostal || "",
          ville: client.ville || "",
          contact: client.contact || "",
          telephone: client.telephone || "",
          email: client.email || "",
          notes: client.notes || "",
        });
      } catch (err) {
        console.error("Erreur chargement client:", err);
        setError("Client non trouvé");
      } finally {
        setLoading(false);
      }
    };

    if (isEditing) {
      loadClient();
    }
  }, [id, isEditing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Valider le formulaire avant soumission
    if (!validateForm()) {
      const missingFields = requiredFields
        .filter((f) => formData[f.key as keyof typeof formData] === "")
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
        await apiService.updateClient(id!, formData);
      } else {
        await apiService.createClient(formData);
      }
      navigate("/clients");
    } catch (err) {
      console.error("Erreur sauvegarde:", err);
      setError(
        "Erreur lors de la sauvegarde. Vérifiez les champs obligatoires."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
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
    <div
      className="page-container"
      style={{ maxWidth: "700px", margin: "0 auto" }}
    >
      {/* Header */}
      <div
        className="bg-white p-6 rounded-lg shadow-sm"
        style={{ marginBottom: "24px" }}
      >
        <button
          onClick={() => navigate("/clients")}
          className="btn btn-back"
          style={{ marginBottom: "12px" }}
        >
          ← Retour aux clients
        </button>
        <h1
          style={{
            fontSize: "1.75rem",
            fontWeight: 700,
            color: "var(--text-primary)",
          }}
        >
          {isEditing ? "✏️ Modifier le client" : "➕ Nouveau client"}
        </h1>
        <p style={{ color: "var(--text-secondary)", marginTop: "4px" }}>
          {isEditing
            ? "Modifiez les informations du client"
            : "Renseignez les informations du nouveau client"}
        </p>
      </div>

      {/* Form */}
      <div className="bg-white p-6 rounded-lg shadow-sm">
        {error && (
          <div
            style={{
              padding: "16px",
              marginBottom: "20px",
              borderRadius: "8px",
              backgroundColor: "var(--error-bg)",
              color: "var(--error-color)",
              border: "1px solid var(--error-color)",
              fontWeight: 500,
            }}
          >
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ display: "grid", gap: "20px" }}>
            {/* Nom */}
            <div>
              <label style={getLabelStyle("nom")}>Nom / Entreprise *</label>
              <input
                type="text"
                value={formData.nom}
                onChange={(e) => handleChange("nom", e.target.value)}
                placeholder="Ex: SARL Dupont"
                style={getInputStyle("nom")}
              />
              {fieldErrors.nom && (
                <p style={fieldErrorStyle}>⚠️ Ce champ est obligatoire</p>
              )}
            </div>

            {/* Sous-lieu */}
            <div>
              <label style={labelStyle}>Sous-lieu (optionnel)</label>
              <input
                type="text"
                value={formData.sousLieu}
                onChange={(e) => handleChange("sousLieu", e.target.value)}
                placeholder="Ex: Bâtiment A, Étage 2"
                style={inputStyle}
              />
            </div>

            {/* Adresse */}
            <div>
              <label style={getLabelStyle("rue")}>Rue *</label>
              <input
                type="text"
                value={formData.rue}
                onChange={(e) => handleChange("rue", e.target.value)}
                placeholder="Ex: 12 rue de la Paix"
                style={getInputStyle("rue")}
              />
              {fieldErrors.rue && (
                <p style={fieldErrorStyle}>⚠️ Ce champ est obligatoire</p>
              )}
            </div>

            {/* Code postal + Ville */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 2fr",
                gap: "12px",
              }}
            >
              <div>
                <label style={getLabelStyle("codePostal")}>Code postal *</label>
                <input
                  type="text"
                  value={formData.codePostal}
                  onChange={(e) => handleChange("codePostal", e.target.value)}
                  placeholder="75001"
                  style={getInputStyle("codePostal")}
                />
                {fieldErrors.codePostal && (
                  <p style={fieldErrorStyle}>⚠️ Ce champ est obligatoire</p>
                )}
              </div>
              <div>
                <label style={getLabelStyle("ville")}>Ville *</label>
                <input
                  type="text"
                  value={formData.ville}
                  onChange={(e) => handleChange("ville", e.target.value)}
                  placeholder="Paris"
                  style={getInputStyle("ville")}
                />
                {fieldErrors.ville && (
                  <p style={fieldErrorStyle}>⚠️ Ce champ est obligatoire</p>
                )}
              </div>
            </div>

            {/* Contact */}
            <div>
              <label style={getLabelStyle("contact")}>Nom du contact *</label>
              <input
                type="text"
                value={formData.contact}
                onChange={(e) => handleChange("contact", e.target.value)}
                placeholder="Ex: Jean Dupont"
                style={getInputStyle("contact")}
              />
              {fieldErrors.contact && (
                <p style={fieldErrorStyle}>⚠️ Ce champ est obligatoire</p>
              )}
            </div>

            {/* Téléphone */}
            <div>
              <label style={getLabelStyle("telephone")}>Téléphone *</label>
              <input
                type="tel"
                value={formData.telephone}
                onChange={(e) => handleChange("telephone", e.target.value)}
                placeholder="Ex: 06 12 34 56 78"
                style={getInputStyle("telephone")}
              />
              {fieldErrors.telephone && (
                <p style={fieldErrorStyle}>⚠️ Ce champ est obligatoire</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label style={labelStyle}>Email (optionnel)</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleChange("email", e.target.value)}
                placeholder="Ex: contact@entreprise.fr"
                style={inputStyle}
              />
            </div>

            {/* Notes */}
            <div>
              <label style={labelStyle}>Notes / Commentaires (optionnel)</label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleChange("notes", e.target.value)}
                placeholder="Informations complémentaires sur ce client..."
                rows={4}
                style={{
                  ...inputStyle,
                  resize: "vertical",
                  minHeight: "100px",
                }}
              />
            </div>
          </div>

          {/* Buttons */}
          <div
            style={{
              display: "flex",
              gap: "12px",
              marginTop: "32px",
              justifyContent: "flex-end",
            }}
          >
            <button
              type="button"
              onClick={() => navigate("/clients")}
              className="btn btn-secondary"
              disabled={saving}
            >
              Annuler
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving}
              style={{ minWidth: "150px" }}
            >
              {saving
                ? "⏳ Enregistrement..."
                : isEditing
                ? "✓ Enregistrer"
                : "+ Créer le client"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ClientForm;

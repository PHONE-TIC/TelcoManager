import React, { useState } from "react";
import { apiService } from "../services/api.service";
import { AppIcon } from "./AppIcon";
import type { Client } from "../types";

interface QuickCreateClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (client: Client) => void;
}

export const QuickCreateClientModal: React.FC<QuickCreateClientModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [formData, setFormData] = useState({
    nom: "",
    contact: "",
    telephone: "",
    email: "",
    rue: "",
    codePostal: "",
    ville: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.nom.trim()) newErrors.nom = "Le nom du client est obligatoire.";
    if (!formData.contact.trim()) newErrors.contact = "Le contact est obligatoire.";
    if (!formData.telephone.trim()) newErrors.telephone = "Le téléphone est obligatoire.";
    if (!formData.rue.trim()) newErrors.rue = "L'adresse est obligatoire.";
    if (!formData.codePostal.trim()) newErrors.codePostal = "Le code postal est obligatoire.";
    if (!formData.ville.trim()) newErrors.ville = "La ville est obligatoire.";
    
    if (formData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "L'adresse e-mail n'est pas valide.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy[field];
        return copy;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setIsSubmitting(true);
      const newClient = await apiService.createClient(formData);
      onSuccess(newClient);
      setFormData({
        nom: "",
        contact: "",
        telephone: "",
        email: "",
        rue: "",
        codePostal: "",
        ville: "",
      });
      onClose();
    } catch (error) {
      console.error("Erreur lors de la création rapide du client:", error);
      setErrors({ submit: "Une erreur est survenue lors de la création du client." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay fade-in" style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0, 0, 0, 0.6)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1100,
      padding: "20px",
      backdropFilter: "blur(4px)",
    }}>
      <div className="modal-content" style={{
        backgroundColor: "var(--bg-color, #ffffff)",
        color: "var(--text-color, #1f2937)",
        borderRadius: "12px",
        width: "100%",
        maxWidth: "600px",
        boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
        border: "1px solid var(--border-color)",
        overflow: "hidden",
      }}>
        <div style={{
          padding: "20px 25px",
          borderBottom: "1px solid var(--border-color)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: "var(--bg-secondary)",
        }}>
          <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: "600", display: "flex", alignItems: "center", gap: "8px" }}>
            <AppIcon name="user" size={20} /> Ajout Rapide de Client
          </h3>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--text-secondary)",
              padding: "4px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.25rem",
              fontWeight: "bold",
            }}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: "25px" }}>
          {errors.submit && (
            <div style={{
              backgroundColor: "rgba(239, 68, 68, 0.1)",
              border: "1px solid #ef4444",
              borderRadius: "6px",
              color: "#ef4444",
              padding: "10px 15px",
              fontSize: "0.875rem",
              marginBottom: "20px",
              fontWeight: "600",
            }}>
              {errors.submit}
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "15px" }}>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: "600" }}>Nom de l'entreprise ou Client *</label>
              <input
                type="text"
                className="form-input"
                style={errors.nom ? { borderColor: "#ef4444" } : undefined}
                value={formData.nom}
                onChange={(e) => handleChange("nom", e.target.value)}
                placeholder="Ex: SARL Durand"
              />
              {errors.nom && (
                <div style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: "4px", fontWeight: "600" }}>{errors.nom}</div>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: "600" }}>Personne de contact *</label>
                <input
                  type="text"
                  className="form-input"
                  style={errors.contact ? { borderColor: "#ef4444" } : undefined}
                  value={formData.contact}
                  onChange={(e) => handleChange("contact", e.target.value)}
                  placeholder="Ex: Jean Martin"
                />
                {errors.contact && (
                  <div style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: "4px", fontWeight: "600" }}>{errors.contact}</div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: "600" }}>Téléphone *</label>
                <input
                  type="text"
                  className="form-input"
                  style={errors.telephone ? { borderColor: "#ef4444" } : undefined}
                  value={formData.telephone}
                  onChange={(e) => handleChange("telephone", e.target.value)}
                  placeholder="Ex: 06 12 34 56 78"
                />
                {errors.telephone && (
                  <div style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: "4px", fontWeight: "600" }}>{errors.telephone}</div>
                )}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: "600" }}>Adresse e-mail</label>
              <input
                type="text"
                className="form-input"
                style={errors.email ? { borderColor: "#ef4444" } : undefined}
                value={formData.email}
                onChange={(e) => handleChange("email", e.target.value)}
                placeholder="Ex: contact@durand.fr"
              />
              {errors.email && (
                <div style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: "4px", fontWeight: "600" }}>{errors.email}</div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: "600" }}>Adresse (Rue) *</label>
              <input
                type="text"
                className="form-input"
                style={errors.rue ? { borderColor: "#ef4444" } : undefined}
                value={formData.rue}
                onChange={(e) => handleChange("rue", e.target.value)}
                placeholder="Ex: 15 Rue de la Gare"
              />
              {errors.rue && (
                <div style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: "4px", fontWeight: "600" }}>{errors.rue}</div>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "15px" }}>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: "600" }}>Code Postal *</label>
                <input
                  type="text"
                  className="form-input"
                  style={errors.codePostal ? { borderColor: "#ef4444" } : undefined}
                  value={formData.codePostal}
                  onChange={(e) => handleChange("codePostal", e.target.value)}
                  placeholder="Ex: 76000"
                />
                {errors.codePostal && (
                  <div style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: "4px", fontWeight: "600" }}>{errors.codePostal}</div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: "600" }}>Ville *</label>
                <input
                  type="text"
                  className="form-input"
                  style={errors.ville ? { borderColor: "#ef4444" } : undefined}
                  value={formData.ville}
                  onChange={(e) => handleChange("ville", e.target.value)}
                  placeholder="Ex: Rouen"
                />
                {errors.ville && (
                  <div style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: "4px", fontWeight: "600" }}>{errors.ville}</div>
                )}
              </div>
            </div>
          </div>

          <div style={{
            marginTop: "30px",
            display: "flex",
            justifyContent: "flex-end",
            gap: "12px",
          }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Annuler
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
              style={{ display: "flex", alignItems: "center", gap: "6px" }}
            >
              {isSubmitting ? "Création..." : "Créer le client"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

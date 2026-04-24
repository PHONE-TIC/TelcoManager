import { useState, useEffect, useCallback } from "react";
import { apiService } from "../services/api.service";
import { AppIcon } from "./AppIcon";

interface SerialTransferModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

interface StockItem {
  id: string;
  nomMateriel: string;
  reference: string;
  numeroSerie: string;
  categorie: string;
  quantite: number;
}

interface Technician {
  id: string;
  nom: string;
}

interface ApiError {
  response?: {
    data?: {
      error?: string;
    };
  };
}

function SerialTransferModal({ onClose, onSuccess }: SerialTransferModalProps) {
  const [techniciens, setTechniciens] = useState<Technician[]>([]);
  const [selectedTechnicien, setSelectedTechnicien] = useState("");
  const [serialInput, setSerialInput] = useState("");
  const [suggestions, setSuggestions] = useState<StockItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<StockItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    loadTechniciens();
  }, []);

  const loadTechniciens = async () => {
    try {
      const data = await apiService.getTechniciens({
        role: "technicien",
        active: true,
      });
      setTechniciens(data.techniciens || []);
    } catch (err) {
      console.error("Erreur chargement techniciens:", err);
    }
  };

  // Debounced search for serial numbers
  const searchBySerial = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }

    setSearching(true);
    try {
      // Search stock items containing the serial (partial match)
      const data = await apiService.getStock({
        search: query,
        statut: "courant",
        limit: 10,
      });
      const matches = (data.stock || []).filter(
        (item: StockItem) =>
          item.numeroSerie &&
          item.numeroSerie.toLowerCase().includes(query.toLowerCase())
      );
      setSuggestions(matches);
    } catch (err) {
      console.error("Erreur recherche:", err);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (serialInput && !selectedItem) {
        searchBySerial(serialInput);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [serialInput, selectedItem, searchBySerial]);

  const handleSerialInputChange = (value: string) => {
    setSerialInput(value);
    setSelectedItem(null);
    setShowSuggestions(true);
  };

  const handleSelectSuggestion = (item: StockItem) => {
    setSelectedItem(item);
    setSerialInput(item.numeroSerie);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedTechnicien) {
      setError("Veuillez sélectionner un technicien");
      return;
    }
    if (!selectedItem) {
      setError("Veuillez sélectionner un article valide");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await apiService.transferStockToTechnician(selectedItem.id, {
        technicienId: selectedTechnicien,
        quantite: 1,
        reason: `Transfert par N° série: ${selectedItem.numeroSerie}`,
      });
      onSuccess();
    } catch (err: unknown) {
      setError((err as ApiError).response?.data?.error || "Erreur lors du transfert");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: "100%",
    padding: "12px",
    borderRadius: "8px",
    border: "1px solid var(--border-color)",
    backgroundColor: "var(--bg-secondary)",
    color: "var(--text-primary)",
    fontSize: "1rem",
    outline: "none",
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <div
        style={{
          backgroundColor: "var(--bg-primary)",
          borderRadius: "16px",
          padding: "24px",
          width: "100%",
          maxWidth: "min(560px, 100%)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          border: "1px solid var(--border-color)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "20px",
          }}
        >
          <h2
            style={{
              fontSize: "1.25rem",
              fontWeight: 600,
              color: "var(--text-primary)",
            }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}><AppIcon name="vehicle" size={18} /> Transférer vers Technicien</span>
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: "1.5rem",
              cursor: "pointer",
              color: "var(--text-secondary)",
            }}
          >
            ×
          </button>
        </div>

        {error && (
          <div
            style={{
              padding: "12px",
              backgroundColor: "#fee2e2",
              border: "1px solid #fecaca",
              borderRadius: "8px",
              color: "#991b1b",
              marginBottom: "16px",
              fontSize: "0.9rem",
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Technician Dropdown */}
          <div style={{ marginBottom: "16px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "6px",
                fontWeight: 500,
                color: "var(--text-primary)",
              }}
            >
              Technicien *
            </label>
            <select
              value={selectedTechnicien}
              onChange={(e) => setSelectedTechnicien(e.target.value)}
              style={{ ...inputStyle, cursor: "pointer" }}
              required
            >
              <option value="">-- Sélectionner un technicien --</option>
              {techniciens.map((tech) => (
                <option key={tech.id} value={tech.id}>
                  {tech.nom}
                </option>
              ))}
            </select>
          </div>

          {/* Serial Number Input with Autocomplete */}
          <div style={{ marginBottom: "16px", position: "relative" }}>
            <label
              style={{
                display: "block",
                marginBottom: "6px",
                fontWeight: 500,
                color: "var(--text-primary)",
              }}
            >
              Numéro de série *
            </label>
            <div style={{ position: "relative" }}>
              <input
                type="text"
                value={serialInput}
                onChange={(e) => handleSerialInputChange(e.target.value)}
                onFocus={() => setShowSuggestions(true)}
                placeholder="Tapez le numéro de série..."
                style={inputStyle}
                autoComplete="off"
              />
              {searching && (
                <span
                  style={{
                    position: "absolute",
                    right: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "var(--text-secondary)",
                  }}
                >
                  <AppIcon name="clock" size={16} />
                </span>
              )}
            </div>

            {/* Suggestions Dropdown */}
            {showSuggestions && suggestions.length > 0 && !selectedItem && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  right: 0,
                  backgroundColor: "var(--bg-primary)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "8px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                  zIndex: 10,
                  maxHeight: "200px",
                  overflowY: "auto",
                }}
              >
                {suggestions.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleSelectSuggestion(item)}
                    style={{
                      padding: "12px",
                      cursor: "pointer",
                      borderBottom: "1px solid var(--border-color)",
                      transition: "background 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor =
                        "var(--bg-secondary)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                    }}
                  >
                    <div
                      style={{ fontWeight: 600, color: "var(--text-primary)" }}
                    >
                      {item.nomMateriel}
                    </div>
                    <div
                      style={{
                        fontSize: "0.85rem",
                        color: "var(--primary-color)",
                      }}
                    >
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}><AppIcon name="label" size={14} /> {item.numeroSerie}</span>
                    </div>
                    <div
                      style={{
                        fontSize: "0.8rem",
                        color: "var(--text-secondary)",
                      }}
                    >
                      Réf: {item.reference} | {item.categorie}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Selected Item Preview */}
          {selectedItem && (
            <div
              style={{
                marginBottom: "20px",
                padding: "16px",
                backgroundColor: "rgba(16, 185, 129, 0.1)",
                border: "1.5px solid #10b981",
                borderRadius: "12px",
              }}
            >
              <div
                style={{
                  fontSize: "0.8rem",
                  color: "#10b981",
                  fontWeight: 600,
                  marginBottom: "8px",
                }}
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}><AppIcon name="check-circle" size={16} /> Article sélectionné</span>
              </div>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: "1.1rem",
                  color: "var(--text-primary)",
                }}
              >
                {selectedItem.nomMateriel}
              </div>
              <div
                style={{
                  fontSize: "0.9rem",
                  color: "var(--primary-color)",
                  fontWeight: 500,
                }}
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}><AppIcon name="label" size={14} /> S/N: {selectedItem.numeroSerie}</span>
              </div>
              <div
                style={{
                  fontSize: "0.85rem",
                  color: "var(--text-secondary)",
                  marginTop: "4px",
                }}
              >
                Réf: {selectedItem.reference} • {selectedItem.categorie}
              </div>
            </div>
          )}

          <div
            style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "10px 20px",
                borderRadius: "8px",
                border: "1px solid var(--border-color)",
                backgroundColor: "transparent",
                color: "var(--text-primary)",
                cursor: "pointer",
              }}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading || !selectedItem}
              style={{
                padding: "10px 20px",
                borderRadius: "8px",
                border: "none",
                background: selectedItem
                  ? "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)"
                  : "#9ca3af",
                color: "white",
                fontWeight: 600,
                cursor: loading || !selectedItem ? "not-allowed" : "pointer",
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? "Transfert..." : "Transférer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default SerialTransferModal;

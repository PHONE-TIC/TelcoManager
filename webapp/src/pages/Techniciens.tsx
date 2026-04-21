import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiService } from "../services/api.service";
import TableResponsive from "../components/TableResponsive";
import UserAvatar from "../components/UserAvatar";
import type { Technicien } from "../types";
import "./screen-harmonization.css";

interface TechnicienWithCounts extends Technicien {
  _count?: {
    interventions?: number;
  };
}

function Techniciens() {
  const navigate = useNavigate();
  const [techniciens, setTechniciens] = useState<TechnicienWithCounts[]>([]);
  const [loading, setLoading] = useState(true);

  const [roleFilter, setRoleFilter] = useState<
    "all" | "admin" | "gestionnaire" | "technicien"
  >("all");

  useEffect(() => {
    loadTechniciens();
  }, []);

  const loadTechniciens = async () => {
    try {
      const data = await apiService.getTechniciens();
      setTechniciens(data.techniciens);
    } catch (error) {
      console.error("Erreur lors du chargement des techniciens:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (
      !confirm(
        "Êtes-vous sûr de vouloir supprimer cet utilisateur ? Cette action est irréversible."
      )
    )
      return;

    try {
      await apiService.deleteTechnicien(id);
      loadTechniciens();
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
      alert(
        "Impossible de supprimer un utilisateur ayant des interventions associées. Essayez de le désactiver."
      );
    }
  };

  // Filter technicians based on search and role
  const filteredTechniciens = techniciens.filter((tech) => {
    const matchesRole = roleFilter === "all" || tech.role === roleFilter;
    return matchesRole;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 harmonized-page">
      <div className="harmonized-header-with-stats">
        <div className="harmonized-header">
        <div className="harmonized-header-copy">
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700 }}>
            Utilisateurs
          </h1>
          <p style={{ color: "var(--text-secondary)" }}>
            Administration des comptes (Admins & Techniciens)
          </p>
        </div>
        <button
          onClick={() => navigate("/techniciens/new")}
          className="harmonized-primary-action"
        >
          + Nouvel utilisateur
        </button>
      </div>

      </div>

      <div className="harmonized-surface">
        <div className="harmonized-toolbar">
          {/* Role filter dropdown */}
          <select
            className="harmonized-select"
            value={roleFilter}
            onChange={(e) =>
              setRoleFilter(
                e.target.value as "all" | "admin" | "gestionnaire" | "technicien"
              )
            }
            style={{ cursor: "pointer", minWidth: "160px" }}
          >
            <option value="all">🏷️ Tous les rôles</option>
            <option value="admin">👑 Administrateurs</option>
            <option value="gestionnaire">📋 Gestionnaires</option>
            <option value="technicien">🔧 Techniciens</option>
          </select>
        </div>

        <TableResponsive
          data={filteredTechniciens}
          columns={[
            {
              key: "nom",
              label: "Utilisateur / Identité",
              render: (tech) => (
                <div className="flex items-center gap-3">
                  <UserAvatar name={tech.nom} size="sm" />
                  <div className="flex flex-col">
                    <span className="font-bold text-gray-800">{tech.nom}</span>
                    <span className="text-xs text-gray-500">
                      {tech.username}
                    </span>
                  </div>
                </div>
              ),
            },
            {
              key: "role",
              label: "Rôle & Accès",
              render: (tech) => (
                <span
                  className={`px-2 py-1 rounded-full text-xs font-semibold ${
                    tech.role === "admin"
                      ? "bg-purple-100 text-purple-800"
                      : tech.role === "gestionnaire"
                      ? "bg-red-100 text-red-900"
                      : "bg-blue-100 text-blue-800"
                  }`}
                >
                  {tech.role === "admin"
                    ? "Administrateur"
                    : tech.role === "gestionnaire"
                    ? "Gestionnaire"
                    : "Technicien"}
                </span>
              ),
            },
            {
              key: "active",
              label: "Statut",
              render: (tech) => (
                <span
                  className={`px-2 py-1 rounded-full text-xs font-semibold flex items-center w-fit gap-1 ${
                    tech.active
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      tech.active ? "bg-green-500" : "bg-gray-500"
                    }`}
                  ></span>
                  {tech.active ? "Actif" : "Inactif"}
                </span>
              ),
            },
            {
              key: "interventions",
              label: "Activité",
              render: (tech) => (
                <div className="flex items-center gap-2">
                  <span className="text-gray-600 font-medium">
                    {tech._count?.interventions || 0}
                  </span>
                  <span className="text-xs text-gray-400">interventions</span>
                </div>
              ),
            },
          ]}
          actions={(tech) => (
            <div style={{ display: "flex", gap: "4px" }}>
              <button
                style={{
                  padding: "8px",
                  borderRadius: "8px",
                  border: "1.5px solid rgba(255,255,255,0.25)",
                  backgroundColor: "rgba(255,255,255,0.05)",
                  color: "var(--text-primary)",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/techniciens/${tech.id}`);
                }}
                title="Voir détails"
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor =
                    "var(--primary-color)";
                  e.currentTarget.style.color = "white";
                  e.currentTarget.style.borderColor = "var(--primary-color)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor =
                    "rgba(255,255,255,0.05)";
                  e.currentTarget.style.color = "var(--text-primary)";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.25)";
                }}
              >
                👁️
              </button>
              <button
                style={{
                  padding: "8px",
                  borderRadius: "8px",
                  border: "1.5px solid rgba(255,255,255,0.25)",
                  backgroundColor: "rgba(255,255,255,0.05)",
                  color: "var(--text-primary)",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/techniciens/${tech.id}/edit`);
                }}
                title="Modifier"
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#3b82f6";
                  e.currentTarget.style.color = "white";
                  e.currentTarget.style.borderColor = "#3b82f6";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor =
                    "rgba(255,255,255,0.05)";
                  e.currentTarget.style.color = "var(--text-primary)";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.25)";
                }}
              >
                ✏️
              </button>
              <button
                style={{
                  padding: "8px",
                  borderRadius: "8px",
                  border: "1.5px solid rgba(255,255,255,0.25)",
                  backgroundColor: "rgba(255,255,255,0.05)",
                  color: "var(--text-primary)",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                onClick={(e) => handleDelete(e, tech.id)}
                title="Supprimer"
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#ef4444";
                  e.currentTarget.style.color = "white";
                  e.currentTarget.style.borderColor = "#ef4444";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor =
                    "rgba(255,255,255,0.05)";
                  e.currentTarget.style.color = "var(--text-primary)";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.25)";
                }}
              >
                🗑️
              </button>
            </div>
          )}
        />
      </div>
    </div>
  );
}

export default Techniciens;

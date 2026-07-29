import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiService } from "../services/api.service";
import { AppIcon } from "../components/AppIcon";
import UserAvatar from "../components/UserAvatar";
import {
  Button,
  DataTable,
  FilterBar,
  Workspace,
} from "../components/ui";
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
    <div className="harmonized-page">
      <Workspace
        title="Utilisateurs"
        meta={`${filteredTechniciens.length} ${filteredTechniciens.length > 1 ? "comptes" : "compte"}`}
        actions={
          <Button variant="primary" onClick={() => navigate("/techniciens/new")}>
            Nouvel utilisateur
          </Button>
        }
        filters={
          <FilterBar
            options={[
              { value: "all", label: "Tous les rôles" },
              { value: "admin", label: "Administrateurs" },
              { value: "gestionnaire", label: "Gestionnaires" },
              { value: "technicien", label: "Techniciens" },
            ]}
            value={roleFilter}
            onChange={(v) => setRoleFilter(v as typeof roleFilter)}
            resultCount={{
              shown: filteredTechniciens.length,
              total: techniciens.length,
            }}
          />
        }
      >
        <DataTable
          rows={filteredTechniciens}
          rowKey={(t) => t.id}
          onRowClick={(t) => navigate(`/techniciens/${t.id}`)}
          emptyLabel="Aucun utilisateur pour ce rôle."
          defaultSort={{ key: "nom" }}
          columns={[
            {
              key: "nom",
              header: "Utilisateur",
              sortValue: (t) => t.nom,
              render: (t) => (
                <span className="ui-cell-avatar">
                  <UserAvatar name={t.nom} size="sm" />
                  <span className="ui-row__main">
                    <span className="ui-row__title">{t.nom}</span>
                    <span className="ui-row__meta">{t.username}</span>
                  </span>
                </span>
              ),
            },
            {
              key: "role",
              header: "Rôle",
              width: "150px",
              sortValue: (t) => t.role,
              render: (t) =>
                t.role === "admin"
                  ? "Administrateur"
                  : t.role === "gestionnaire"
                    ? "Gestionnaire"
                    : "Technicien",
            },
            {
              key: "active",
              header: "Compte",
              width: "116px",
              sortValue: (t) => (t.active ? 0 : 1),
              render: (t) => (
                <span className="ui-state" data-tone={t.active ? "done" : "off"}>
                  {t.active ? "Actif" : "Inactif"}
                </span>
              ),
            },
            {
              key: "interventions",
              header: "Interventions",
              width: "128px",
              hideOnNarrow: true,
              align: "end",
              sortValue: (t) =>
                t.role === "technicien" ? (t._count?.interventions ?? 0) : null,
              render: (t) =>
                t.role === "technicien" ? (t._count?.interventions ?? 0) : "—",
            },
            {
              key: "actions",
              header: "",
              width: "104px",
              align: "end",
              render: (t) => (
                <span className="ui-actions" onClick={(e) => e.stopPropagation()}>
                  <Button
                    size="sm"
                    variant="quiet"
                    title="Modifier"
                    onClick={() => navigate(`/techniciens/${t.id}/edit`)}
                  >
                    <AppIcon name="edit" size={15} />
                  </Button>
                  <Button
                    size="sm"
                    variant="quiet"
                    title="Supprimer"
                    onClick={(e) => handleDelete(e, t.id)}
                  >
                    <AppIcon name="trash" size={15} />
                  </Button>
                </span>
              ),
            },
          ]}
        />
      </Workspace>
    </div>
  );
}

export default Techniciens;

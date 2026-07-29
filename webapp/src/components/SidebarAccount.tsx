import { useMemo } from "react";
import { useAuth } from "../contexts/useAuth";
import { useTheme } from "../contexts/useTheme";
import { NotificationCenter } from "./NotificationCenter";
import { AppIcon } from "./AppIcon";
import "./sidebaraccount.css";

/**
 * Pied de la barre latérale : compte connecté, notifications et thème.
 *
 * Ces commandes occupaient une barre supérieure entière alors qu'on les touche
 * quelques fois par jour. Les ranger au pied de la colonne rend toute la
 * hauteur de l'écran au travail lui-même.
 */

function initiales(nom: string) {
  return nom
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

const LIBELLES_ROLE: Record<string, string> = {
  admin: "Administrateur",
  gestionnaire: "Gestionnaire",
  technicien: "Technicien",
};

export function SidebarAccount() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const sigle = useMemo(() => (user?.nom ? initiales(user.nom) : "?"), [user]);

  if (!user) return null;

  return (
    <div className="sb-account">
      <div className="sb-account__outils">
        <NotificationCenter />
        <button
          type="button"
          className="sb-account__bouton"
          onClick={toggleTheme}
          aria-label={theme === "dark" ? "Passer au thème clair" : "Passer au thème sombre"}
          title={theme === "dark" ? "Thème clair" : "Thème sombre"}
        >
          <AppIcon name={theme === "dark" ? "sun" : "moon"} size={16} />
        </button>
      </div>

      <details className="sb-account__menu">
        <summary className="sb-account__declencheur">
          <span className="sb-account__avatar" aria-hidden="true">
            {sigle}
          </span>
          <span className="sb-account__identite">
            <span className="sb-account__nom">{user.nom}</span>
            <span className="sb-account__role">
              {LIBELLES_ROLE[user.role] ?? user.role}
            </span>
          </span>
        </summary>

        <div className="sb-account__panneau">
          <button type="button" className="sb-account__deconnexion" onClick={logout}>
            Déconnexion
          </button>
        </div>
      </details>
    </div>
  );
}

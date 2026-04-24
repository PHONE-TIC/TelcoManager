import { Suspense, useMemo } from "react";
import { useAuth } from "../contexts/useAuth";
import { useTheme } from "../contexts/useTheme";
import GlobalSearch from "./GlobalSearch";
import { NotificationCenter } from "./NotificationCenter";
import logo from "../assets/logo.png";
import { AppIcon } from "./AppIcon";

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function SearchAndNotifications() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const canSearch = !!user && (user.role === "admin" || user.role === "gestionnaire");
  const initials = useMemo(() => (user?.nom ? getInitials(user.nom) : "?"), [user?.nom]);

  if (!user) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <div className="search-notifications-bar">
        <div className="search-notifications-bar__left">
          <div className="topbar-brand-cluster">
            <img src={logo} alt="Phone & Tic" className="topbar-brand-logo" />
            <div className="topbar-brand-block">
              <div className="topbar-brand">TelcoManager</div>
              <div className="topbar-tagline">Gestion Stock &amp; Terrain</div>
            </div>
          </div>
        </div>

        <div className="search-notifications-bar__center">
          {canSearch ? (
            <div className="search-notifications-bar__search">
              <GlobalSearch />
            </div>
          ) : null}
        </div>

        <div className="search-notifications-bar__right">
          <button
            type="button"
            className={`theme-switch ${theme === "dark" ? "is-dark" : "is-light"}`}
            onClick={toggleTheme}
            aria-label={theme === "dark" ? "Activer le mode clair" : "Activer le mode sombre"}
            title={theme === "dark" ? "Mode clair" : "Mode sombre"}
          >
            <span className="theme-switch__track">
              <span className="theme-switch__icon theme-switch__icon--sun" aria-hidden="true"><AppIcon name="sun" size={20} /></span>
              <span className="theme-switch__icon theme-switch__icon--moon" aria-hidden="true"><AppIcon name="moon" size={20} /></span>
              <span className="theme-switch__thumb" aria-hidden="true" />
            </span>
          </button>

          <div className="search-notifications-bar__notification">
            <NotificationCenter />
          </div>

          <details className="account-menu">
            <summary className="account-menu__trigger" aria-label="Compte connecté">
              <span className="account-menu__avatar" aria-hidden="true">{initials}</span>
              <span className="account-menu__identity">
                <span className="account-menu__name">{user.nom}</span>
                <span className="account-menu__role">{user.role}</span>
              </span>
              <span className="account-menu__chevron" aria-hidden="true">▾</span>
            </summary>

            <div className="account-menu__panel">
              <div className="account-menu__panel-header">
                <span className="account-menu__avatar account-menu__avatar--large" aria-hidden="true">{initials}</span>
                <div>
                  <div className="account-menu__panel-name">{user.nom}</div>
                  <div className="account-menu__panel-role">{user.role}</div>
                </div>
              </div>
              <button type="button" className="account-menu__logout" onClick={logout}>
                Déconnexion
              </button>
            </div>
          </details>
        </div>
      </div>
    </Suspense>
  );
}

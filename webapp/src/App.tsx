import { Suspense, lazy, useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  useLocation,
  Navigate,
} from "react-router-dom";
const Login = lazy(() => import("./pages/Login"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Clients = lazy(() => import("./pages/Clients"));
const ClientDetail = lazy(() => import("./pages/ClientDetail"));
const ClientForm = lazy(() => import("./pages/ClientForm"));
const Techniciens = lazy(() => import("./pages/Techniciens"));
const UserForm = lazy(() => import("./pages/UserForm"));
const Interventions = lazy(() => import("./pages/Interventions"));
const InterventionDetail = lazy(() => import("./pages/InterventionDetail"));
const TechnicianInterventionView = lazy(
  () => import("./pages/TechnicianInterventionView")
);
const TechnicianDetail = lazy(() => import("./pages/TechnicianDetail"));
const Stock = lazy(() => import("./pages/Stock"));
const StockTransfer = lazy(() => import("./pages/StockTransfer"));
const StockForm = lazy(() => import("./pages/StockForm"));
const StockDetail = lazy(() => import("./pages/StockDetail"));
const StockLabels = lazy(() => import("./pages/StockLabels"));
const Inventaire = lazy(() => import("./pages/Inventaire"));
const TechnicianStock = lazy(() => import("./pages/TechnicianStock"));
const Reports = lazy(() => import("./pages/Reports"));
const IpLinksSupervision = lazy(() => import("./pages/IpLinksSupervision"));
const IpLinkDetail = lazy(() => import("./pages/IpLinkDetail"));
const PwaInstallButton = lazy(() =>
  import("./components/PwaInstall").then((module) => ({
    default: module.PwaInstallButton,
  }))
);
const PwaInstallPopup = lazy(() =>
  import("./components/PwaInstall").then((module) => ({
    default: module.PwaInstallPopup,
  }))
);
const ReloadPrompt = lazy(() => import("./components/ReloadPrompt"));
import { AuthProvider } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { LockProvider } from "./contexts/LockContext";
import { useAuth } from "./contexts/useAuth";
import { useNavCounts } from "./hooks/useNavCounts";
import MobileNav from "./components/MobileNav";
import MobileHeader from "./components/MobileHeader";
import { NotificationToastOverlay } from "./components/NotificationToastOverlay";
import { SearchAndNotifications } from "./components/SearchAndNotifications";
import { IpLinksNotificationWatcher } from "./components/IpLinksNotificationWatcher";
import { useNotifications } from "./hooks/useNotifications";
import { NotificationCenterProvider } from "./contexts/NotificationCenterContext";
import { AppIcon } from "./components/AppIcon";
import { useOfflineSync } from "./hooks/useOfflineSync";



function Navigation({
  sidebarCollapsed,
  setSidebarCollapsed,
}: {
  sidebarCollapsed: boolean;
  setSidebarCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const location = useLocation();
  const { user } = useAuth();
  const compteurs = useNavCounts();
  const { isSupported, isEnabled, requestPermission } = useNotifications();

  const isActive = (path: string) => {
    if (path === "/") {
      return location.pathname === "/" ? "active" : "";
    }
    return location.pathname.startsWith(path) ? "active" : "";
  };

  if (!user) return null;

  // Navigation groupée par domaine métier. Une liste plate de huit entrées
  // ne dit rien de ce qui relève de l'exploitation quotidienne, du référentiel
  // ou de l'administration — trois usages aux fréquences très différentes.
  const navGroups = [
    {
      titre: "Exploitation",
      items: [
        {
          path: "/",
          icon: <AppIcon name="dashboard" />,
          label: "Tableau de bord",
          roles: ["admin", "gestionnaire"],
        },
        {
          path: "/interventions",
          icon: <AppIcon name="interventions" />,
          label: "Interventions",
          roles: ["admin", "gestionnaire", "technicien"],
          count: compteurs.interventions,
        },
        {
          path: "/supervision-liens-ip",
          icon: <AppIcon name="ip-links" />,
          label: "Liens IP",
          roles: ["admin", "gestionnaire"],
        },
      ],
    },
    {
      titre: "Référentiel",
      items: [
        {
          path: "/clients",
          icon: <AppIcon name="clients" />,
          label: "Clients",
          roles: ["admin", "gestionnaire"],
          count: compteurs.clients,
        },
        {
          path: "/stock",
          icon: <AppIcon name="stock" />,
          label: "Stock",
          roles: ["admin", "gestionnaire"],
          count: compteurs.stock,
        },
        {
          path: "/inventaire",
          icon: <AppIcon name="inventory" />,
          label: "Inventaire",
          roles: ["admin", "gestionnaire"],
        },
        {
          path: "/mon-stock",
          icon: <AppIcon name="vehicle" />,
          label: "Mon stock",
          roles: ["technicien"],
        },
      ],
    },
    {
      titre: "Administration",
      items: [
        {
          path: "/techniciens",
          icon: <AppIcon name="users" />,
          label: "Utilisateurs",
          roles: ["admin"],
        },
        {
          path: "/rapports",
          icon: <AppIcon name="reports" />,
          label: "Rapports",
          roles: ["admin"],
        },
      ],
    },
  ];

  // Un groupe dont aucune entrée n'est accessible disparaît : un technicien ne
  // doit pas voir un intitulé « Administration » suivi du vide.
  const groupesVisibles = navGroups
    .map((g) => ({
      ...g,
      items: g.items.filter(
        (item) => !item.roles || (user?.role && item.roles.includes(user.role))
      ),
    }))
    .filter((g) => g.items.length > 0);

  return (
    <div className={`sidebar ${sidebarCollapsed ? "sidebar--collapsed" : ""}`}>
      <nav className="sidebar-nav-shell" aria-label="Navigation principale">
        {groupesVisibles.map((groupe) => (
          <div className="nav-group" key={groupe.titre}>
            {/* L'intitulé disparaît en mode réduit, où seules les icônes
                restent : il n'y aurait pas la place de le lire. */}
            <p className="nav-group__titre">{groupe.titre}</p>
            <ul className="nav-menu">
              {groupe.items.map((item) => (
                <li className="nav-item" key={item.path}>
                  <Link
                    to={item.path}
                    className={`nav-link ${isActive(item.path)}`}
                    title={item.label}
                    aria-label={item.label}
                    aria-current={isActive(item.path) ? "page" : undefined}
                  >
                    <span className="nav-link-content">
                      <span className="nav-link-icon" aria-hidden="true">
                        {item.icon}
                      </span>
                      <span className="nav-link-label">{item.label}</span>
                    </span>
                    {typeof item.count === "number" ? (
                      <span className="nav-link-count">{item.count}</span>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
      <div className="sidebar-footer">
        {/* PWA Install button for desktop */}
        <Suspense fallback={null}>
          <div className="sidebar-footer__block">
            <PwaInstallButton />
          </div>
        </Suspense>
        {/* Notification toggle for technicians */}
        {isSupported && user?.role === "technicien" && (
          <button
            onClick={() => {
              if (!isEnabled) {
                requestPermission();
              }
            }}
            className={`btn ${isEnabled ? "btn-success" : "btn-secondary"}`}
            style={{ width: "100%", marginBottom: "10px" }}
          >
            {isEnabled
              ? "Notifications activées"
              : "Activer les notifications"}
          </button>
        )}
        <button
          type="button"
          className="sidebar-collapse-toggle sidebar-collapse-toggle--footer"
          onClick={() => setSidebarCollapsed((prev) => !prev)}
          aria-label={sidebarCollapsed ? "Agrandir le menu" : "Réduire le menu"}
          title={sidebarCollapsed ? "Agrandir le menu" : "Réduire le menu"}
        >
          {sidebarCollapsed ? "»" : "«"}
        </button>
      </div>
    </div>
  );
}

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  return user ? <>{children}</> : <Navigate to="/login" />;
}

// Manager route - allows admin and managers
function ManagerRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (user.role !== "admin" && user.role !== "gestionnaire") {
    return <Navigate to="/interventions" replace />;
  }

  return <>{children}</>;
}

// Admin-only route - strict admin access
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" />;
  }

  // Technicians and Managers cannot access admin pages (Users, Reports)
  if (user.role !== "admin") {
    return <Navigate to="/" replace />; // Redirect manager to dashboard, tech to interventions
  }

  return <>{children}</>;
}

// Wrapper to select view based on user role
function InterventionDetailWrapper() {
  const { user } = useAuth();

  // Technicians get the multi-step wizard view
  if (user?.role === "technicien") {
    return <TechnicianInterventionView />;
  }

  // Admins and Managers get the full detail view
  return <InterventionDetail />;
}

function RouteLoadingFallback() {
  return (
    <div style={{ padding: "24px", textAlign: "center" }}>Chargement...</div>
  );
}

function AppContent() {
  const { user } = useAuth();
  const location = useLocation();
  const pageTransitionKey = `${location.pathname}${location.search}${location.hash}`;
  const hasDesktopTopbar = !!user;
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("sidebar-collapsed") === "true";
  });

  const { syncMessage } = useOfflineSync();

  useEffect(() => {
    document.documentElement.classList.toggle("sidebar-collapsed", sidebarCollapsed);
    window.localStorage.setItem("sidebar-collapsed", String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  // Clean screen-filling container for the login page when unauthenticated
  if (!user) {
    return (
      <div className="app-container app-container--login" style={{ display: "block", height: "auto", minHeight: "100vh", overflow: "visible" }}>
        <Suspense fallback={<RouteLoadingFallback />}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Suspense>
      </div>
    );
  }

  return (
    <div className={`app-container ${hasDesktopTopbar ? "app-container--with-topbar" : ""}`}>
      {syncMessage && (
        <div 
          style={{
            position: "fixed",
            top: "24px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 9999,
            backgroundColor: "rgba(249, 115, 22, 0.85)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            color: "#ffffff",
            padding: "12px 24px",
            borderRadius: "50px",
            boxShadow: "0 10px 25px -5px rgba(249, 115, 22, 0.4), 0 8px 10px -6px rgba(249, 115, 22, 0.4)",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            fontWeight: 500,
            fontSize: "14px",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            animation: "pulse 2s infinite"
          }}
        >
          <span style={{ display: "inline-block" }}>🔄</span>
          <span>{syncMessage}</span>
        </div>
      )}
      {user && (
        <>
          <MobileNav />
          <MobileHeader />
          <IpLinksNotificationWatcher />
          <NotificationToastOverlay />
        </>
      )}
      {hasDesktopTopbar ? (
        <div className="app-topbar">
          <div className="app-topbar__inner">
            <SearchAndNotifications />
          </div>
        </div>
      ) : null}
      {user && (
        <Navigation sidebarCollapsed={sidebarCollapsed} setSidebarCollapsed={setSidebarCollapsed} />
      )}
      <div className={`main-content ${hasDesktopTopbar ? "main-content--with-topbar" : ""} ${user?.role === "technicien" ? "main-content--technician" : ""}`}>
        <div key={pageTransitionKey} className="fade-in app-route-shell">
          <Suspense fallback={<RouteLoadingFallback />}>
            <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/"
              element={
                <ManagerRoute>
                  <Dashboard />
                </ManagerRoute>
              }
            />
            <Route
              path="/clients"
              element={
                <ManagerRoute>
                  <Clients />
                </ManagerRoute>
              }
            />
            <Route
              path="/clients/new"
              element={
                <ManagerRoute>
                  <ClientForm />
                </ManagerRoute>
              }
            />
            <Route
              path="/clients/:id/edit"
              element={
                <ManagerRoute>
                  <ClientForm />
                </ManagerRoute>
              }
            />
            <Route
              path="/clients/:id"
              element={
                <ManagerRoute>
                  <ClientDetail />
                </ManagerRoute>
              }
            />
            <Route
              path="/techniciens"
              element={
                <AdminRoute>
                  <Techniciens />
                </AdminRoute>
              }
            />
            <Route
              path="/techniciens/new"
              element={
                <AdminRoute>
                  <UserForm />
                </AdminRoute>
              }
            />
            <Route
              path="/techniciens/:id/edit"
              element={
                <AdminRoute>
                  <UserForm />
                </AdminRoute>
              }
            />
            <Route
              path="/techniciens/:id"
              element={
                <AdminRoute>
                  <TechnicianDetail />
                </AdminRoute>
              }
            />
            <Route
              path="/interventions"
              element={
                <PrivateRoute>
                  <Interventions />
                </PrivateRoute>
              }
            />
            <Route
              path="/interventions/:id"
              element={
                <PrivateRoute>
                  <InterventionDetailWrapper />
                </PrivateRoute>
              }
            />
            <Route
              path="/stock"
              element={
                <ManagerRoute>
                  <Stock />
                </ManagerRoute>
              }
            />
            <Route
              path="/stock/:id"
              element={
                <ManagerRoute>
                  <StockDetail />
                </ManagerRoute>
              }
            />
            <Route
              path="/stock/transfer"
              element={
                <ManagerRoute>
                  <StockTransfer />
                </ManagerRoute>
              }
            />
            <Route
              path="/stock/labels"
              element={
                <ManagerRoute>
                  <StockLabels />
                </ManagerRoute>
              }
            />
            <Route
              path="/stock/new"
              element={
                <ManagerRoute>
                  <StockForm />
                </ManagerRoute>
              }
            />
            <Route
              path="/stock/:id/edit"
              element={
                <ManagerRoute>
                  <StockForm />
                </ManagerRoute>
              }
            />
            <Route
              path="/inventaire"
              element={
                <ManagerRoute>
                  <Inventaire />
                </ManagerRoute>
              }
            />
            <Route
              path="/rapports"
              element={
                <AdminRoute>
                  <Reports />
                </AdminRoute>
              }
            />
            <Route
              path="/supervision-liens-ip"
              element={
                <ManagerRoute>
                  <IpLinksSupervision />
                </ManagerRoute>
              }
            />
            <Route
              path="/supervision-liens-ip/:reference"
              element={
                <ManagerRoute>
                  <IpLinkDetail />
                </ManagerRoute>
              }
            />
            <Route
              path="/mon-stock"
              element={
                <PrivateRoute>
                  <TechnicianStock />
                </PrivateRoute>
              }
            />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </Suspense>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <ThemeProvider>
        <AuthProvider>
          <LockProvider>
            <NotificationCenterProvider>
              <AppContent />
              <Suspense fallback={null}>
                <ReloadPrompt />
                <PwaInstallPopup />
              </Suspense>
            </NotificationCenterProvider>
          </LockProvider>
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;

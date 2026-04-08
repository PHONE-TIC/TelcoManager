import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  useLocation,
  Navigate,
} from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Clients from "./pages/Clients";
import ClientDetail from "./pages/ClientDetail";
import ClientForm from "./pages/ClientForm";
import Techniciens from "./pages/Techniciens";
import UserForm from "./pages/UserForm";
import Interventions from "./pages/Interventions";
import InterventionDetail from "./pages/InterventionDetail";
import TechnicianInterventionView from "./pages/TechnicianInterventionView";
import TechnicianDetail from "./pages/TechnicianDetail";
import Stock from "./pages/Stock";
import StockTransfer from "./pages/StockTransfer";
import StockForm from "./pages/StockForm";
import StockDetail from "./pages/StockDetail";
import StockLabels from "./pages/StockLabels";
import Inventaire from "./pages/Inventaire";
import TechnicianStock from "./pages/TechnicianStock";
import Reports from "./pages/Reports";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ThemeProvider, useTheme } from "./contexts/ThemeContext";
import GlobalSearch from "./components/GlobalSearch";
import MobileNav from "./components/MobileNav";
import MobileHeader from "./components/MobileHeader";
import { useNotifications } from "./hooks/useNotifications";

import logo from "./assets/logo.png";
import ReloadPrompt from "./components/ReloadPrompt";
import { PwaInstallButton, PwaInstallPopup } from "./components/PwaInstall";

function Navigation() {
  const location = useLocation();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { isSupported, isEnabled, requestPermission } = useNotifications();

  const isActive = (path: string) => {
    if (path === "/") {
      return location.pathname === "/" ? "active" : "";
    }
    return location.pathname.startsWith(path) ? "active" : "";
  };

  if (!user) return null;

  // Define navigation items with role-based access
  const navItems = [
    {
      path: "/",
      icon: "📊",
      label: "Tableau de bord",
      roles: ["admin", "gestionnaire"],
    },
    {
      path: "/interventions",
      icon: "📅",
      label: "Interventions",
      roles: ["admin", "gestionnaire", "technicien"],
    },
    {
      path: "/clients",
      icon: "👥",
      label: "Clients",
      roles: ["admin", "gestionnaire"],
    },
    {
      path: "/techniciens",
      icon: "🛡️",
      label: "Utilisateurs",
      roles: ["admin"],
    },
    {
      path: "/stock",
      icon: "📦",
      label: "Stock",
      roles: ["admin", "gestionnaire"],
    },
    {
      path: "/inventaire",
      icon: "🔍",
      label: "Inventaire",
      roles: ["admin", "gestionnaire"],
    },
    { path: "/rapports", icon: "📈", label: "Rapports", roles: ["admin"] }, // Rapports only for Admin
    {
      path: "/mon-stock",
      icon: "🚗",
      label: "Mon Stock",
      roles: ["technicien"],
    },
  ];

  // Filter based on user role
  const filteredNavItems = navItems.filter((item) => {
    if (item.roles && user?.role && !item.roles.includes(user.role))
      return false;
    return true;
  });

  return (
    <div className="sidebar">
      <div
        className="sidebar-logo-container"
        style={{
          textAlign: "center",
          marginBottom: "30px",
          paddingBottom: "20px",
          borderBottom: "1px solid var(--border-color)",
        }}
      >
        <img
          src={logo}
          alt="Phone & Tic"
          style={{ maxWidth: "180px", height: "auto" }}
        />
        <div
          style={{
            marginTop: "12px",
            fontSize: "1.25rem",
            fontWeight: "bold",
            color: "var(--primary-color)",
            letterSpacing: "-0.5px",
          }}
        >
          TelcoManager
        </div>
        <div
          style={{
            fontSize: "0.75rem",
            color: "var(--text-secondary)",
            textTransform: "uppercase",
            letterSpacing: "1px",
            marginTop: "4px",
          }}
        >
          Gestion Stock & Terrain
        </div>
      </div>
      {(user.role === "admin" || user.role === "gestionnaire") && (
        <div style={{ padding: "0 16px", marginBottom: "20px" }}>
          <GlobalSearch />
        </div>
      )}
      <div
        style={{
          marginBottom: "20px",
          fontSize: "0.875rem",
          color: "var(--text-secondary)",
          paddingLeft: "16px",
        }}
      >
        👤 {user.nom} ({user.role})
      </div>
      <nav>
        <ul className="nav-menu">
          {filteredNavItems.map((item) => (
            <li className="nav-item" key={item.path}>
              <Link
                to={item.path}
                className={`nav-link ${isActive(item.path)}`}
              >
                {item.icon} {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div style={{ marginTop: "auto", paddingTop: "20px" }}>
        {/* PWA Install button for desktop */}
        <div style={{ marginBottom: "10px" }}>
          <PwaInstallButton />
        </div>
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
              ? "🔔 Notifications activées"
              : "🔕 Activer les notifications"}
          </button>
        )}
        <button
          onClick={toggleTheme}
          className="btn btn-secondary"
          style={{ width: "100%", marginBottom: "10px" }}
        >
          {theme === "dark" ? "☀️ Mode Clair" : "🌙 Mode Sombre"}
        </button>
        <button
          onClick={logout}
          className="btn btn-secondary"
          style={{ width: "100%" }}
        >
          🚪 Déconnexion
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

function AppContent() {
  const { user } = useAuth();
  const location = useLocation();
  const pageTransitionKey = `${location.pathname}${location.search}${location.hash}`;

  return (
    <div className="app-container">
      {user && (
        <>
          <MobileNav />
          <MobileHeader />
          <Navigation />
        </>
      )}
      <div className="main-content">
        <div key={pageTransitionKey} className="fade-in">
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
              path="/mon-stock"
              element={
                <PrivateRoute>
                  <TechnicianStock />
                </PrivateRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
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
          <AppContent />
          <ReloadPrompt />
          <PwaInstallPopup />
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;

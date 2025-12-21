import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import Techniciens from './pages/Techniciens';
import Interventions from './pages/Interventions';
import InterventionDetail from './pages/InterventionDetail';
import TechnicianDetail from './pages/TechnicianDetail';
import Stock from './pages/Stock';
import Inventaire from './pages/Inventaire';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import GlobalSearch from './components/GlobalSearch';

import logo from './assets/logo.png';

function Navigation() {
    const location = useLocation();
    const { user, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();

    const isActive = (path: string) => location.pathname === path ? 'active' : '';

    if (!user) return null;

    return (
        <div className="sidebar">
            <div className="sidebar-logo-container" style={{ textAlign: 'center', marginBottom: '30px', paddingBottom: '20px', borderBottom: '1px solid var(--border-color)' }}>
                <img src={logo} alt="Phone & Tic" style={{ maxWidth: '180px', height: 'auto' }} />
                <div style={{ marginTop: '12px', fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--primary-color)', letterSpacing: '-0.5px' }}>
                    TelcoManager
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '4px' }}>
                    Gestion Stock & Terrain
                </div>
            </div>
            <div style={{ padding: '0 16px', marginBottom: '20px' }}>
                <GlobalSearch />
            </div>
            <div style={{ marginBottom: '20px', fontSize: '0.875rem', color: 'var(--text-secondary)', paddingLeft: '16px' }}>
                👤 {user.nom} ({user.role})
            </div>
            <nav>
                <ul className="nav-menu">
                    <li className="nav-item">
                        <Link to="/" className={`nav-link ${isActive('/')}`}>
                            📊 Dashboard
                        </Link>
                    </li>
                    <li className="nav-item">
                        <Link to="/clients" className={`nav-link ${isActive('/clients')}`}>
                            👥 Clients
                        </Link>
                    </li>
                    <li className="nav-item">
                        <Link to="/techniciens" className={`nav-link ${isActive('/techniciens')}`}>
                            🔧 Techniciens
                        </Link>
                    </li>
                    <li className="nav-item">
                        <Link to="/interventions" className={`nav-link ${isActive('/interventions')}`}>
                            📅 Interventions
                        </Link>
                    </li>
                    <li className="nav-item">
                        <Link to="/stock" className={`nav-link ${isActive('/stock')}`}>
                            📦 Stock
                        </Link>
                    </li>
                    <li className="nav-item">
                        <Link to="/inventaire" className={`nav-link ${isActive('/inventaire')}`}>
                            🔍 Inventaire
                        </Link>
                    </li>
                </ul>
            </nav>
            <div style={{ marginTop: 'auto', paddingTop: '20px' }}>
                <button
                    onClick={toggleTheme}
                    className="btn btn-secondary"
                    style={{ width: '100%', marginBottom: '10px' }}
                >
                    {theme === 'dark' ? '☀️ Mode Clair' : '🌙 Mode Sombre'}
                </button>
                <button
                    onClick={logout}
                    className="btn btn-secondary"
                    style={{ width: '100%' }}
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

function AppContent() {
    const { user } = useAuth();
    const location = useLocation();

    return (
        <div className="app-container">
            {user && <Navigation />}
            <div className="main-content">
                <div key={location.pathname} className="fade-in">
                    <Routes>
                        <Route path="/login" element={<Login />} />
                        <Route
                            path="/"
                            element={
                                <PrivateRoute>
                                    <Dashboard />
                                </PrivateRoute>
                            }
                        />
                        <Route
                            path="/clients"
                            element={
                                <PrivateRoute>
                                    <Clients />
                                </PrivateRoute>
                            }
                        />
                        <Route
                            path="/techniciens"
                            element={
                                <PrivateRoute>
                                    <Techniciens />
                                </PrivateRoute>
                            }
                        />
                        <Route
                            path="/techniciens/:id"
                            element={
                                <PrivateRoute>
                                    <TechnicianDetail />
                                </PrivateRoute>
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
                                    <InterventionDetail />
                                </PrivateRoute>
                            }
                        />
                        <Route
                            path="/stock"
                            element={
                                <PrivateRoute>
                                    <Stock />
                                </PrivateRoute>
                            }
                        />
                        <Route
                            path="/inventaire"
                            element={
                                <PrivateRoute>
                                    <Inventaire />
                                </PrivateRoute>
                            }
                        />
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
                </AuthProvider>
            </ThemeProvider>
        </Router>
    );
}

export default App;

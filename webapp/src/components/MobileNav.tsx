import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../hooks/useNotifications';
import './MobileNav.css';

interface MobileNavProps {
    onNavigate?: () => void;
}

export default function MobileNav({ onNavigate }: MobileNavProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isClosing, setIsClosing] = useState(false);
    const location = useLocation();
    const { theme, toggleTheme } = useTheme();
    const { user, logout } = useAuth();
    const { isSupported, isEnabled, requestPermission } = useNotifications();

    const toggleMenu = () => {
        if (isOpen) {
            closeMenu();
        } else {
            setIsOpen(true);
        }
    };

    const closeMenu = () => {
        setIsClosing(true);
        // Wait for animation to complete before hiding
        setTimeout(() => {
            setIsOpen(false);
            setIsClosing(false);
        }, 250); // Match animation duration
    };

    const handleLinkClick = () => {
        closeMenu();
        onNavigate?.();
    };

    const navLinks = [
        { path: '/', icon: '📊', label: 'Tableau de bord', roles: ['admin', 'gestionnaire'] },
        { path: '/interventions', icon: '📅', label: 'Interventions', roles: ['admin', 'gestionnaire', 'technicien'] },
        { path: '/clients', icon: '👥', label: 'Clients', roles: ['admin', 'gestionnaire'] },
        { path: '/techniciens', icon: '🛡️', label: 'Utilisateurs', roles: ['admin'] },
        { path: '/stock', icon: '📦', label: 'Stock', roles: ['admin', 'gestionnaire'] },
        { path: '/inventaire', icon: '🔍', label: 'Inventaire', roles: ['admin', 'gestionnaire'] },
        { path: '/rapports', icon: '📈', label: 'Rapports', roles: ['admin'] },
        { path: '/mon-stock', icon: '🚗', label: 'Mon Stock', roles: ['technicien'] },
    ];

    // Filter links based on user role
    const filteredLinks = navLinks.filter(link => {
        if (link.roles && user?.role && !link.roles.includes(user.role)) return false;
        return true;
    });

    return (
        <>
            <button
                className="hamburger-btn"
                onClick={toggleMenu}
                aria-label="Menu"
                aria-expanded={isOpen}
            >
                <span className="hamburger-icon">
                    <span></span>
                    <span></span>
                    <span></span>
                </span>
            </button>

            {isOpen && (
                <>
                    <div
                        className={`drawer-overlay ${isClosing ? 'closing' : ''}`}
                        onClick={closeMenu}
                    />
                    <nav className={`mobile-drawer ${isClosing ? 'closing' : ''}`}>
                        <div className="drawer-header">
                            <div className="drawer-branding">
                                <h2 className="drawer-title">TelcoManager</h2>
                                <span className="drawer-subtitle">Gestion Stock & Terrain</span>
                            </div>
                            <button
                                className="close-btn"
                                onClick={closeMenu}
                                aria-label="Fermer le menu"
                            >
                                ✕
                            </button>
                        </div>

                        <ul className="drawer-links">
                            {filteredLinks.map((link) => (
                                <li key={link.path}>
                                    <Link
                                        to={link.path}
                                        className={location.pathname === link.path ? 'active' : ''}
                                        onClick={handleLinkClick}
                                    >
                                        <span className="link-icon">{link.icon}</span>
                                        <span className="link-label">{link.label}</span>
                                    </Link>
                                </li>
                            ))}
                        </ul>

                        <div className="drawer-footer">
                            <div className="drawer-user-info">
                                <span className="user-icon">👤</span>
                                <div className="user-details">
                                    <span className="user-name">{user?.nom}</span>
                                    <span className="user-role">({user?.role})</span>
                                </div>
                            </div>

                            {/* Notification toggle for technicians */}
                            {isSupported && user?.role === 'technicien' && (
                                <button
                                    className={`notification-toggle-drawer ${isEnabled ? 'enabled' : ''}`}
                                    onClick={() => {
                                        if (!isEnabled) {
                                            requestPermission();
                                        }
                                    }}
                                    aria-label="Notifications"
                                >
                                    <span className="notification-icon">{isEnabled ? '🔔' : '🔕'}</span>
                                    <span className="notification-label">
                                        {isEnabled ? 'Notifications activées' : 'Activer les notifications'}
                                    </span>
                                </button>
                            )}

                            <button
                                className="theme-toggle-drawer"
                                onClick={toggleTheme}
                                aria-label="Changer le thème"
                            >
                                <span className="theme-icon">{theme === 'light' ? '🌙' : '☀️'}</span>
                                <span className="theme-label">
                                    {theme === 'light' ? 'Mode Sombre' : 'Mode Clair'}
                                </span>
                            </button>

                            <button
                                className="logout-btn-drawer"
                                onClick={() => {
                                    logout();
                                    closeMenu();
                                }}
                                aria-label="Se déconnecter"
                            >
                                <span className="logout-icon">🚪</span>
                                <span className="logout-label">Déconnexion</span>
                            </button>
                        </div>
                    </nav>
                </>
            )}
        </>
    );
}

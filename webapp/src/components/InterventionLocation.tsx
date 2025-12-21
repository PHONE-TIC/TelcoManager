import { useState } from 'react';
import './InterventionLocation.css';

interface InterventionLocationProps {
    clientAddress: string;
    clientCity: string;
    clientPostalCode: string;
    onLocationCapture?: (lat: number, lng: number) => void;
}

export default function InterventionLocation({
    clientAddress,
    clientCity,
    clientPostalCode,
    onLocationCapture
}: InterventionLocationProps) {
    const [currentPosition, setCurrentPosition] = useState<{ lat: number; lng: number } | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fullAddress = `${clientAddress}, ${clientPostalCode} ${clientCity}`;
    const encodedAddress = encodeURIComponent(fullAddress);

    const getCurrentPosition = () => {
        if (!navigator.geolocation) {
            setError('Géolocalisation non supportée');
            return;
        }

        setLoading(true);
        setError(null);

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const pos = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                setCurrentPosition(pos);
                setLoading(false);

                if (onLocationCapture) {
                    onLocationCapture(pos.lat, pos.lng);
                }

                if (navigator.vibrate) {
                    navigator.vibrate(100);
                }
            },
            (err) => {
                console.error('Geolocation error:', err);
                setError('Impossible d\'obtenir la position');
                setLoading(false);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    };

    const openNavigation = () => {
        const url = `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`;
        window.open(url, '_blank');
    };

    const openInMaps = () => {
        const url = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
        window.open(url, '_blank');
    };

    return (
        <div className="intervention-location">
            <div className="location-header">
                <h3>📍 Localisation Client</h3>
            </div>

            <div className="client-address-info">
                <div className="address-line">
                    <span className="address-icon">🏠</span>
                    <span>{clientAddress}</span>
                </div>
                <div className="address-line">
                    <span className="address-icon">📮</span>
                    <span>{clientPostalCode} {clientCity}</span>
                </div>
            </div>

            {error && (
                <div className="location-error">
                    <span>⚠️</span> {error}
                </div>
            )}

            <div className="location-actions">
                <button
                    className="location-btn navigate-btn"
                    onClick={openNavigation}
                >
                    <span className="btn-icon">🧭</span>
                    <span className="btn-text">Naviguer</span>
                </button>

                <button
                    className="location-btn map-btn"
                    onClick={openInMaps}
                >
                    <span className="btn-icon">🗺️</span>
                    <span className="btn-text">Voir carte</span>
                </button>

                <button
                    className="location-btn position-btn"
                    onClick={getCurrentPosition}
                    disabled={loading}
                >
                    <span className="btn-icon">{loading ? '⏳' : '📡'}</span>
                    <span className="btn-text">{loading ? 'Localisation...' : 'Ma position'}</span>
                </button>
            </div>

            {currentPosition && (
                <div className="current-position">
                    <p className="position-label">📍 Votre position actuelle</p>
                    <div className="position-coords">
                        <span>{currentPosition.lat.toFixed(5)}, {currentPosition.lng.toFixed(5)}</span>
                    </div>
                </div>
            )}

            <div className="map-preview-container">
                <iframe
                    title="Client Location"
                    width="100%"
                    height="180"
                    style={{ border: 0, borderRadius: '12px' }}
                    loading="lazy"
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=-180,-85,180,85&layer=mapnik`}
                    allowFullScreen
                />
                <div className="map-overlay" onClick={openInMaps}>
                    <span>🔍 Agrandir la carte</span>
                </div>
            </div>
        </div>
    );
}

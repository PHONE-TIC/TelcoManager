import { useState } from 'react';
import { AppIcon } from './AppIcon';
import './InterventionLocation.css';

interface InterventionLocationProps {
    clientAddress: string;
    clientCity: string;
    clientPostalCode: string;
    onLocationCapture?: (lat: number, lng: number) => void;
    hideNavigationButtons?: boolean;
    travelTime?: string | null;
}

export default function InterventionLocation({
    clientAddress,
    clientCity,
    clientPostalCode,
    onLocationCapture,
    hideNavigationButtons,
    travelTime
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
                <h3 style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}><AppIcon name="location" size={18} />Localisation Client</h3>
            </div>

            <div className="client-address-info">
                <div className="address-line" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center' }}>
                    <span className="address-icon" style={{ flexShrink: 0 }}><AppIcon name="home" size={18} /></span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>{clientAddress}, {clientPostalCode} {clientCity}</span>
                    {travelTime && (
                        <span style={{ marginLeft: '10px', flexShrink: 0, backgroundColor: '#e0f2fe', color: '#0369a1', padding: '4px 8px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            🚗 {travelTime}
                        </span>
                    )}
                </div>
            </div>

            {error && (
                <div className="location-error">
                    <span><AppIcon name="warning" size={16} /></span> {error}
                </div>
            )}

            <div className="location-actions">
                {!hideNavigationButtons && (
                    <>
                        <button
                            className="location-btn navigate-btn"
                            onClick={openNavigation}
                        >
                            <span className="btn-icon"><AppIcon name="navigation" size={18} /></span>
                            <span className="btn-text">Naviguer</span>
                        </button>

                        <button
                            className="location-btn map-btn"
                            onClick={openInMaps}
                        >
                            <span className="btn-icon"><AppIcon name="map" size={18} /></span>
                            <span className="btn-text">Voir carte</span>
                        </button>
                    </>
                )}

                <button
                    className="location-btn position-btn"
                    onClick={getCurrentPosition}
                    disabled={loading}
                >
                    <span className="btn-icon">{loading ? <AppIcon name="clock" size={18} /> : <AppIcon name="signal" size={18} />}</span>
                    <span className="btn-text">{loading ? 'Localisation...' : 'Ma position'}</span>
                </button>
            </div>

            {currentPosition && (
                <div className="current-position">
                    <p className="position-label" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}><AppIcon name="location" size={16} />Votre position actuelle</p>
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
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}><AppIcon name="search" size={16} />Agrandir la carte</span>
                </div>
            </div>
        </div>
    );
}

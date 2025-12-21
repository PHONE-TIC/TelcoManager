import { useState, useEffect } from 'react';
import './LocationPicker.css';

interface LocationPickerProps {
    onLocationSelect: (lat: number, lng: number) => void;
    initialLat?: number;
    initialLng?: number;
    clientAddress?: string;
}

export default function LocationPicker({
    onLocationSelect,
    initialLat,
    initialLng,
    clientAddress
}: LocationPickerProps) {
    const [latitude, setLatitude] = useState<number | null>(initialLat || null);
    const [longitude, setLongitude] = useState<number | null>(initialLng || null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (initialLat && initialLng) {
            setLatitude(initialLat);
            setLongitude(initialLng);
        }
    }, [initialLat, initialLng]);

    const getCurrentPosition = () => {
        if (!navigator.geolocation) {
            setError('La géolocalisation n\'est pas supportée par votre navigateur');
            return;
        }

        setLoading(true);
        setError(null);

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                setLatitude(lat);
                setLongitude(lng);
                onLocationSelect(lat, lng);
                setLoading(false);
            },
            (err) => {
                setError('Impossible d\'obtenir votre position. Vérifiez les permissions.');
                setLoading(false);
                console.error('Geolocation error:', err);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    };

    const openInMaps = () => {
        if (latitude && longitude) {
            // Try to open in native maps app, fallback to Google Maps web
            const url = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
            window.open(url, '_blank');
        }
    };

    const openNavigation = () => {
        if (latitude && longitude) {
            // Open navigation with destination
            const url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
            window.open(url, '_blank');
        }
    };

    return (
        <div className="location-picker">
            <div className="location-header">
                <h3>📍 Localisation</h3>
                {clientAddress && (
                    <p className="client-address">{clientAddress}</p>
                )}
            </div>

            {error && (
                <div className="location-error">
                    <p>{error}</p>
                </div>
            )}

            <div className="location-actions">
                <button
                    className="btn btn-primary"
                    onClick={getCurrentPosition}
                    disabled={loading}
                >
                    {loading ? '📡 Localisation...' : '📍 Obtenir ma position'}
                </button>

                {latitude && longitude && (
                    <>
                        <button
                            className="btn btn-secondary"
                            onClick={openInMaps}
                        >
                            🗺️ Voir sur la carte
                        </button>
                        <button
                            className="btn btn-success"
                            onClick={openNavigation}
                        >
                            🧭 Naviguer
                        </button>
                    </>
                )}
            </div>

            {latitude && longitude && (
                <div className="location-info">
                    <div className="location-coords">
                        <div className="coord-item">
                            <span className="coord-label">Latitude:</span>
                            <span className="coord-value">{latitude.toFixed(6)}</span>
                        </div>
                        <div className="coord-item">
                            <span className="coord-label">Longitude:</span>
                            <span className="coord-value">{longitude.toFixed(6)}</span>
                        </div>
                    </div>

                    {/* Simple map preview using static map */}
                    <div className="map-preview">
                        <iframe
                            title="Location Map"
                            width="100%"
                            height="200"
                            style={{ border: 0, borderRadius: '8px' }}
                            loading="lazy"
                            src={`https://www.openstreetmap.org/export/embed.html?bbox=${longitude - 0.01},${latitude - 0.01},${longitude + 0.01},${latitude + 0.01}&layer=mapnik&marker=${latitude},${longitude}`}
                        />
                    </div>

                    <div className="location-accuracy">
                        <small>
                            💡 Astuce : Assurez-vous d'être à l'extérieur pour une meilleure précision
                        </small>
                    </div>
                </div>
            )}
        </div>
    );
}

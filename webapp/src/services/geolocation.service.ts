/**
 * Geolocation and Travel Time Service
 * Provides estimated travel time to destinations
 */

// Get current position
export const getCurrentPosition = (): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
        if (!('geolocation' in navigator)) {
            reject(new Error('Geolocation not supported'));
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => resolve(position),
            (error) => reject(error),
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 60000, // Cache position for 1 minute
            }
        );
    });
};

// Geocode an address to coordinates using OpenStreetMap Nominatim (free)
export const geocodeAddress = async (address: string): Promise<{ lat: number; lng: number } | null> => {
    try {
        const encoded = encodeURIComponent(address);
        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encoded}&limit=1`,
            {
                headers: {
                    'Accept-Language': 'fr',
                    'User-Agent': 'TelcoManager/1.0',
                },
            }
        );

        if (!response.ok) {
            throw new Error('Geocoding failed');
        }

        const data = await response.json();
        if (data && data.length > 0) {
            return {
                lat: parseFloat(data[0].lat),
                lng: parseFloat(data[0].lon),
            };
        }
        return null;
    } catch (error) {
        console.error('Geocoding error:', error);
        return null;
    }
};

// Calculate distance between two points using Haversine formula
export const calculateDistance = (
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
): number => {
    const R = 6371; // Earth's radius in km
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

const toRad = (deg: number): number => deg * (Math.PI / 180);

// Estimate travel time based on distance
// Uses average speed of 40 km/h for city driving
export const estimateTravelTime = (distanceKm: number): number => {
    const averageSpeedKmH = 40; // Average city driving speed
    return Math.ceil((distanceKm / averageSpeedKmH) * 60); // Returns minutes
};

// Format travel time for display
export const formatTravelTime = (minutes: number): string => {
    if (minutes < 60) {
        return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0
        ? `${hours}h ${remainingMinutes}min`
        : `${hours}h`;
};

// Get estimated travel time to a destination address
export interface TravelEstimate {
    distanceKm: number;
    timeMinutes: number;
    formattedTime: string;
    formattedDistance: string;
}

export const getTravelEstimate = async (
    destinationAddress: string
): Promise<TravelEstimate | null> => {
    try {
        // Get current position
        const position = await getCurrentPosition();
        const currentLat = position.coords.latitude;
        const currentLng = position.coords.longitude;

        // Geocode destination
        const destCoords = await geocodeAddress(destinationAddress);
        if (!destCoords) {
            console.warn('Could not geocode destination address');
            return null;
        }

        // Calculate distance
        const distanceKm = calculateDistance(
            currentLat,
            currentLng,
            destCoords.lat,
            destCoords.lng
        );

        // Estimate time
        const timeMinutes = estimateTravelTime(distanceKm);

        return {
            distanceKm,
            timeMinutes,
            formattedTime: formatTravelTime(timeMinutes),
            formattedDistance: distanceKm < 1
                ? `${Math.round(distanceKm * 1000)} m`
                : `${distanceKm.toFixed(1)} km`,
        };
    } catch (error) {
        console.error('Error getting travel estimate:', error);
        return null;
    }
};

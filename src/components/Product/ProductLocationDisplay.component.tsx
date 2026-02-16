import { useState } from 'react';
import { useLocationStore } from '@/stores/locationStore';
import { useQuery } from '@apollo/client';
import { FETCH_ALL_LOCATIONS_QUERY } from '@/utils/gql/GQL_QUERIES';

const ProductLocationDisplay = () => {
    const { selectedLocation, setSelectedLocation } = useLocationStore();
    const [isDetecting, setIsDetecting] = useState(false);
    const [geoError, setGeoError] = useState<string | null>(null);
    const isClient = typeof window !== 'undefined';
    const { data } = useQuery(FETCH_ALL_LOCATIONS_QUERY);

    // ... (rest of logic) ...

    const locations = data?.productLocations?.nodes || [];

    const handleDetectLocation = () => {
        // ... same logic ...
        setIsDetecting(true);
        setGeoError(null);

        if (!navigator.geolocation) {
            setGeoError('Geolocation is not supported');
            setIsDetecting(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                try {
                    const { latitude, longitude } = position.coords;
                    // ... fetch logic ...
                    const response = await fetch(
                        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10`
                    );
                    const data = await response.json();
                    const detectedCity = data.address?.city || data.address?.town || data.address?.suburb || data.address?.state;

                    if (detectedCity) {
                        const match = locations.find((loc: any) =>
                            loc.name.toLowerCase().includes(detectedCity.toLowerCase()) ||
                            detectedCity.toLowerCase().includes(loc.name.toLowerCase())
                        );

                        if (match) {
                            setSelectedLocation({ name: match.name, slug: match.slug });
                        } else {
                            setGeoError(`Location "${detectedCity}" not in delivery zones.`);
                        }
                    } else {
                        setGeoError('Could not determine city.');
                    }
                } catch {
                    setGeoError('Failed to fetch address.');
                } finally {
                    setIsDetecting(false);
                }
            },
            () => {
                setGeoError('Location access denied.');
                setIsDetecting(false);
            },
            { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        );
    };

    return (
        <div>
            <div className="flex items-center gap-2 mb-1">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gray-500">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                </svg>
                <span className="text-xs text-gray-600">
                    Deliver to: <span className="text-gray-600">{isClient && selectedLocation ? selectedLocation.name : 'Select Location'}</span>
                </span>

                {(!isClient || !selectedLocation) && !isDetecting && (
                    <button
                        onClick={handleDetectLocation}
                        className="text-xs text-gray-600 hover:underline ml-2 font-medium"
                    >
                        Auto-detect
                    </button>
                )}
                {isClient && selectedLocation && !isDetecting && (
                    <button
                        onClick={() => window.dispatchEvent(new Event('open-location-picker'))}
                        className="text-xs text-gray-600 underline ml-2 font-medium"
                    >
                        change location
                    </button>
                )}
                {isDetecting && (
                    <span className="text-xs text-gray-400 ml-2 animate-pulse">detecting...</span>
                )}
            </div>
            {geoError && (
                <p className="text-[10px] text-red-500 ml-7">{geoError}</p>
            )}
        </div>
    );
};

export default ProductLocationDisplay;

import { useState, useEffect } from 'react';
import { useLocationStore } from '@/stores/locationStore';
import { useQuery } from '@apollo/client';
import { FETCH_ALL_LOCATIONS_QUERY } from '@/utils/gql/GQL_QUERIES';

const ProductLocationDisplay = () => {
    const { selectedLocation, setSelectedLocation } = useLocationStore();
    const [isDetecting, setIsDetecting] = useState(false);
    const [geoError, setGeoError] = useState<string | null>(null);
    const { data } = useQuery(FETCH_ALL_LOCATIONS_QUERY);

    // Auto-detect on first load if no location is selected? 
    // The user requested "fetch the users current location"
    // We should probably only do it if they click or if it's not set. 
    // But the prompt said "after the payment information ... show the location ... fetch the users current location"
    // Let's stick to showing what's selected, and offering a way to change/detect.

    const locations = data?.productLocations?.nodes || [];

    const handleDetectLocation = () => {
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
                } catch (error) {
                    setGeoError('Failed to fetch address.');
                } finally {
                    setIsDetecting(false);
                }
            },
            (error) => {
                setGeoError('Location access denied.');
                setIsDetecting(false);
            },
            { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        );
    };

    return (
        <div className="py-3 border-b border-gray-100 mb-2">
            <div className="flex items-center gap-2 mb-1">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gray-500">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                </svg>
                <span className="text-sm text-gray-600">
                    Deliver to: <span className="font-bold text-gray-900">{selectedLocation ? selectedLocation.name : 'Select Location'}</span>
                </span>

                {!selectedLocation && !isDetecting && (
                    <button
                        onClick={handleDetectLocation}
                        className="text-xs text-blue-600 hover:underline ml-2 font-medium"
                    >
                        Auto-detect
                    </button>
                )}
                {selectedLocation && !isDetecting && (
                    <button
                        onClick={handleDetectLocation}
                        className="text-xs text-blue-600 hover:underline ml-auto font-medium"
                    >
                        Change
                    </button>
                )}
                {isDetecting && (
                    <span className="text-xs text-gray-400 ml-2 animate-pulse">Detecting...</span>
                )}
            </div>
            {geoError && (
                <p className="text-[10px] text-red-500 ml-7">{geoError}</p>
            )}
        </div>
    );
};

export default ProductLocationDisplay;

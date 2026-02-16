import { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@apollo/client';
import { FETCH_ALL_LOCATIONS_QUERY } from '@/utils/gql/GQL_QUERIES';
import { useLocationStore } from '@/stores/locationStore';

const LocationPicker = ({ variant = 'default' }: { variant?: 'default' | 'headless' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [mounted] = useState(() => typeof window !== 'undefined');
    const [isDetecting, setIsDetecting] = useState(false);
    const [geoError, setGeoError] = useState<string | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const { selectedLocation, setSelectedLocation } = useLocationStore();
    const { data, loading } = useQuery(FETCH_ALL_LOCATIONS_QUERY);

    const locations = useMemo(() => data?.productLocations?.nodes || [], [data]);

    // Set default location if none selected and data is loaded
    useEffect(() => {
        if (!selectedLocation && locations.length > 0) {
            setSelectedLocation({ name: locations[0].name, slug: locations[0].slug });
        }
    }, [locations, selectedLocation, setSelectedLocation]);

    // Close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        const handleOpenEvent = () => setIsOpen(true);

        document.addEventListener('mousedown', handleClickOutside);

        // Only headless instance listens to the global event to avoid duplicates
        if (variant === 'headless') {
            window.addEventListener('open-location-picker', handleOpenEvent);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            if (variant === 'headless') {
                window.removeEventListener('open-location-picker', handleOpenEvent);
            }
        };
    }, [variant]); // Add variant dependency

    const handleDetectLocation = () => {
        setIsDetecting(true);
        setGeoError(null);

        if (!navigator.geolocation) {
            setGeoError('Geolocation is not supported by your browser');
            setIsDetecting(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                try {
                    const { latitude, longitude } = position.coords;
                    // Use OSM Nominatim for free reverse geocoding
                    const response = await fetch(
                        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10`
                    );
                    const data = await response.json();

                    const detectedCity = data.address?.city || data.address?.town || data.address?.suburb || data.address?.state;

                    if (detectedCity) {
                        // Find closest match in our locations
                        const match = locations.find((loc: any) =>
                            loc.name.toLowerCase().includes(detectedCity.toLowerCase()) ||
                            detectedCity.toLowerCase().includes(loc.name.toLowerCase())
                        );

                        if (match) {
                            setSelectedLocation({ name: match.name, slug: match.slug });
                            setIsOpen(false);
                        } else {
                            // If no direct match, we could potentially set it as a "custom" location
                            // block or just inform the user. For now, let's just use the name if it's high quality.
                            setGeoError(`Detected "${detectedCity}" but it's not in our delivery areas yet.`);
                        }
                    } else {
                        setGeoError('Could not determine your city.');
                    }
                } catch {
                    setGeoError('Failed to fetch address details.');
                } finally {
                    setIsDetecting(false);
                }
            },
            (error) => {
                setGeoError(error.message);
                setIsDetecting(false);
            },
            { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        );
    };

    const modalContent = isOpen && mounted && createPortal(
        <div className="fixed inset-0 z-[99999] isolate pointer-events-auto flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setIsOpen(false)}>
            <div
                className="bg-white rounded-xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-100"
                onClick={e => e.stopPropagation()}
                onMouseDown={e => e.stopPropagation()}
                onTouchStart={e => e.stopPropagation()}
            >
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Select Delivery Location</h3>
                    <button type="button" onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-200/50 touch-manipulation">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="p-4 border-b border-gray-100">
                    <button
                        type="button"
                        onClick={handleDetectLocation}
                        disabled={isDetecting}
                        className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all shadow-sm active:scale-[0.98] group touch-manipulation"
                    >
                        {isDetecting ? (
                            <span className="text-xs font-bold">...</span>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                            </svg>
                        )}
                        <span className="font-semibold">Use My Current Location</span>
                    </button>

                    {geoError && (
                        <p className="mt-3 text-[11px] text-red-600 font-medium bg-red-50 p-2.5 rounded-lg text-center border border-red-100">
                            {geoError}
                        </p>
                    )}
                </div>

                <div className="bg-gray-50 px-4 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                    Available Regions
                </div>

                <div className="max-h-[300px] overflow-y-auto custom-scrollbar bg-gray-50/30">
                    {loading ? (
                        <div className="py-8 text-center text-gray-500 flex flex-col items-center gap-2">
                            <span className="text-xs">Loading areas...</span>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {locations.map((loc: any) => (
                                <button
                                    key={loc.id}
                                    type="button"
                                    onClick={() => {
                                        setSelectedLocation({ name: loc.name, slug: loc.slug });
                                        setIsOpen(false);
                                    }}
                                    className={`w-full flex items-center justify-between px-5 py-3.5 text-left transition-all touch-manipulation ${selectedLocation?.slug === loc.slug
                                        ? 'bg-blue-50 text-blue-700 font-bold'
                                        : 'bg-white text-gray-700 hover:bg-gray-50 font-medium'
                                        }`}
                                >
                                    <span className="text-sm">{loc.name}</span>
                                    {selectedLocation?.slug === loc.slug && (
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-blue-600">
                                            <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
                                        </svg>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );

    if (variant === 'headless') return <>{modalContent}</>;

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2.5 group p-1 transition-colors"
                aria-label="Select Location"
            >
                <div>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-[#0C6DC9] group-hover:text-[#0a59a4]">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                    </svg>
                </div>
                <div className="flex flex-col items-start text-left">
                    <span className="text-[10px] uppercase text-gray-500 font-bold leading-tight">Deliver to</span>
                    <span className="text-sm font-bold text-[#0C6DC9] group-hover:text-[#0a59a4] truncate max-w-[120px]">
                        {selectedLocation ? selectedLocation.name : 'Select Location'}
                    </span>
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className={`w-3 h-3 text-[#0C6DC9]/80 transition-transform ${isOpen ? 'rotate-180' : ''}`}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                </svg>
            </button>

            {modalContent}
        </div>
    );
};

export default LocationPicker;

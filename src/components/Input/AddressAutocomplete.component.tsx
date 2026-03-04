import { useState, useEffect, useRef } from 'react';
import { useFormContext } from 'react-hook-form';
import { api } from '@/utils/api';
import { ENDPOINTS } from '@/utils/endpoints';

interface AddressAutocompleteProps {
    label?: string;
    name?: string;
    placeholder?: string;
    autoLocateOnMount?: boolean;
}

export default function AddressAutocomplete({
    label,
    name = 'address1',
    placeholder = 'Enter address',
    autoLocateOnMount = false,
}: AddressAutocompleteProps) {
    const { register, setValue, watch } = useFormContext();
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isLocating, setIsLocating] = useState(false);
    const [geoError, setGeoError] = useState<string | null>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const hasAutoTriggeredLocation = useRef(false);

    const inputValue = watch(name);

    // Close suggestions when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Fetch suggestions as user types
    useEffect(() => {
        const fetchSuggestions = async () => {
            if (!inputValue || inputValue.length < 3 || !showSuggestions) {
                setSuggestions([]);
                return;
            }

            setIsLoading(true);
            try {
                const res: any = await api.get(`${ENDPOINTS.PLACES.AUTOCOMPLETE}?input=${encodeURIComponent(inputValue)}`);
                if (res?.predictions) {
                    setSuggestions(res.predictions);
                }
            } catch (err) {
                console.error('[AddressAutocomplete] Error:', err);
            } finally {
                setIsLoading(false);
            }
        };

        const timeoutId = setTimeout(fetchSuggestions, 300);
        return () => clearTimeout(timeoutId);
    }, [inputValue, showSuggestions]);

    const handleSelect = async (suggestion: any) => {
        setValue(name, suggestion.description);
        setSuggestions([]);
        setShowSuggestions(false);

        // Fetch details to auto-fill other fields
        try {
            const res: any = await api.get(`${ENDPOINTS.PLACES.DETAILS}?place_id=${suggestion.place_id}`);
            if (res?.result?.address_components) {
                const components = res.result.address_components;

                // Extract address components
                const getComponent = (types: string[]) =>
                    components.find((c: any) => types.every(t => c.types.includes(t)))?.long_name || '';

                const city = getComponent(['locality']) || getComponent(['administrative_area_level_2']);
                const state = getComponent(['administrative_area_level_1']);
                const postcode = getComponent(['postal_code']);

                if (city) setValue('city', city);
                if (state) {
                    const { normalizeGhanaRegionName } = await import('@/utils/constants/REGIONS');
                    setValue('state', normalizeGhanaRegionName(state), { shouldValidate: true });
                }
                if (postcode) setValue('postcode', postcode);
            }
        } catch (err) {
            console.error('[AddressAutocomplete] Error fetching details:', err);
        }
    };

    const fillFromAddressComponents = async (formattedAddress: string, components: any[]) => {
        setValue(name, formattedAddress || '');

        const getComponent = (types: string[]) =>
            components.find((c: any) => types.every((t) => c.types.includes(t)))?.long_name || '';

        const city = getComponent(['locality']) || getComponent(['administrative_area_level_2']);
        const state = getComponent(['administrative_area_level_1']);
        const postcode = getComponent(['postal_code']);

        if (city) setValue('city', city);
        if (state) {
            const { normalizeGhanaRegionName } = await import('@/utils/constants/REGIONS');
            setValue('state', normalizeGhanaRegionName(state), { shouldValidate: true });
        }
        if (postcode) setValue('postcode', postcode);
    };

    const handleUseCurrentLocation = async () => {
        setGeoError(null);
        if (!navigator.geolocation) {
            setGeoError('Geolocation is not supported by this browser.');
            return;
        }

        setIsLocating(true);
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                try {
                    const res: any = await api.get(
                        `${ENDPOINTS.PLACES.REVERSE_GEOCODE}?lat=${encodeURIComponent(latitude)}&lng=${encodeURIComponent(longitude)}`
                    );

                    const firstResult = res?.results?.[0];
                    if (!firstResult) {
                        setGeoError('Could not resolve your current address.');
                        return;
                    }

                    await fillFromAddressComponents(
                        firstResult.formatted_address || '',
                        firstResult.address_components || []
                    );
                } catch (err) {
                    console.error('[AddressAutocomplete] Error reverse geocoding:', err);
                    setGeoError('Failed to fetch your current address.');
                } finally {
                    setIsLocating(false);
                }
            },
            (error) => {
                if (error.code === error.PERMISSION_DENIED) {
                    setGeoError('Location permission denied.');
                } else if (error.code === error.POSITION_UNAVAILABLE) {
                    setGeoError('Location unavailable.');
                } else if (error.code === error.TIMEOUT) {
                    setGeoError('Location request timed out.');
                } else {
                    setGeoError('Failed to fetch current location.');
                }
                setIsLocating(false);
            },
            {
                enableHighAccuracy: true,
                timeout: 12000,
                maximumAge: 60000,
            }
        );
    };

    // Auto-trigger location lookup once on mount for checkout.
    // Users can still manually retry via the button.
    useEffect(() => {
        if (!autoLocateOnMount) return;
        if (hasAutoTriggeredLocation.current) return;
        if (name !== 'address1') return;
        if (inputValue && String(inputValue).trim().length > 0) return;

        hasAutoTriggeredLocation.current = true;
        const timer = setTimeout(() => {
            handleUseCurrentLocation();
        }, 50);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [autoLocateOnMount, name, inputValue]);

    return (
        <div className="w-full relative" ref={wrapperRef}>
            {label && (
                <div className="mb-1 flex items-center justify-between gap-2">
                    <label htmlFor={name} className="block text-xs font-bold text-gray-700">
                        {label}
                    </label>
                    <button
                        type="button"
                        onClick={handleUseCurrentLocation}
                        disabled={isLocating}
                        className="text-[10px] font-bold text-blue-600 hover:text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLocating ? 'Locating...' : 'Use current location'}
                    </button>
                </div>
            )}
            <input
                id={name}
                {...register(name)}
                type="text"
                autoComplete="off"
                onFocus={() => setShowSuggestions(true)}
                placeholder={placeholder}
                className="bg-white border border-gray-300 text-gray-900 text-sm rounded focus:ring-blue-500 focus:border-blue-500 block w-full p-1.5"
            />

            {showSuggestions && (suggestions.length > 0 || isLoading) && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded shadow-lg max-h-60 overflow-y-auto">
                    {isLoading && (
                        <div className="p-2 text-xs text-gray-500">Searching...</div>
                    )}
                    {suggestions.map((suggestion) => (
                        <div
                            key={suggestion.place_id}
                            onClick={() => handleSelect(suggestion)}
                            className="p-2 text-sm hover:bg-gray-100 cursor-pointer border-b border-gray-50 last:border-0"
                        >
                            <div className="font-semibold text-xs">{suggestion.structured_formatting?.main_text}</div>
                            <div className="text-[10px] text-gray-500">{suggestion.structured_formatting?.secondary_text}</div>
                        </div>
                    ))}
                </div>
            )}
            {geoError && <p className="mt-1 text-[10px] text-red-600">{geoError}</p>}
        </div>
    );
}

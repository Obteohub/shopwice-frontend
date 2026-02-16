import React from 'react';
import usePlacesAutocomplete, {
    getGeocode,
} from 'use-places-autocomplete';
import { useFormContext } from 'react-hook-form';
import { useJsApiLoader } from '@react-google-maps/api';
import { useQuery } from '@apollo/client';
import { GET_ALLOWED_COUNTRIES } from '../../utils/gql/GQL_QUERIES';

interface IAddressAutocompleteProps {
    label: string;
    name: string;
}

const libraries: ("places")[] = ["places"];

const AddressAutocompleteInput = ({ label, name }: IAddressAutocompleteProps) => {
    // Fetch allowed countries for restriction
    const { data: countriesData } = useQuery(GET_ALLOWED_COUNTRIES);
    const allowedCountries = countriesData?.wooCommerce?.countries || [];
    // Default to 'gh' if no countries found, otherwise use the code of the first allowed country or a list if possible
    // use-places-autocomplete expects a string or array of strings (max 5)
    const countryRestriction = allowedCountries.length > 0
        ? allowedCountries.slice(0, 5).map((c: any) => c.code.toLowerCase())
        : 'gh';

    const {
        ready,
        value,
        suggestions: { status, data },
        setValue,
        clearSuggestions,
    } = usePlacesAutocomplete({
        requestOptions: {
            componentRestrictions: { country: countryRestriction },
        },
        debounce: 300,
    });

    const { register, setValue: setFormValue } = useFormContext();

    const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        setValue(e.target.value);
        setFormValue(name, e.target.value);
    };

    const handleSelect =
        ({ description }: { description: string }) =>
            () => {
                setValue(description, false);
                clearSuggestions();
                setFormValue(name, description);

                getGeocode({ address: description }).then((results) => {
                    const cityComponent = results[0]?.address_components.find(
                        (component) => component.types.includes('locality') || component.types.includes('administrative_area_level_2')
                    );

                    if (cityComponent) {
                        setFormValue('city', cityComponent.long_name);
                    }

                    const stateComponent = results[0]?.address_components.find(
                        (component) => component.types.includes('administrative_area_level_1')
                    );

                    if (stateComponent) {
                        setFormValue('state', stateComponent.long_name);
                    }
                });
            };

    const handleUseCurrentLocation = () => {
        if (!navigator.geolocation) {
            alert("Geolocation is not supported by your browser");
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                // Reverse geocode
                getGeocode({ location: { lat: latitude, lng: longitude } })
                    .then((results) => {
                        if (results[0]) {
                            const address = results[0].formatted_address;
                            setValue(address, false);
                            clearSuggestions();
                            setFormValue(name, address);

                            // Parse city (similar to handleSelect)
                            const cityComponent = results[0].address_components.find(
                                (component) => component.types.includes('locality') || component.types.includes('administrative_area_level_2')
                            );

                            if (cityComponent) {
                                setFormValue('city', cityComponent.long_name);
                            }

                            const stateComponent = results[0].address_components.find(
                                (component) => component.types.includes('administrative_area_level_1')
                            );

                            if (stateComponent) {
                                setFormValue('state', stateComponent.long_name);
                            }
                        }
                    })
                    .catch((error) => {
                        console.error('Error finding address:', error);
                        alert("Found location but failed to find address: " + error.message);
                    });
            },
            (error) => {
                console.error('Geolocation error:', error);
                let msg = "Unable to retrieve your location";
                if (error.code === 1) msg = "Location permission denied. Please allow access in browser settings.";
                if (error.code === 2) msg = "Location unavailable. Ensure GPS is on.";
                if (error.code === 3) msg = "Location request timed out.";
                alert(msg);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    };

    return (
        <div className="w-full relative">
            <label htmlFor={name} className="block mb-1 text-xs font-bold text-gray-700">
                {label}
            </label>
            <div className="relative">
                <input
                    {...register(name)}
                    value={value}
                    onChange={handleInput}
                    disabled={!ready}
                    className="bg-white border border-gray-300 text-gray-900 text-sm rounded focus:ring-blue-500 focus:border-blue-500 block w-full p-1.5 pr-8 placeholder-gray-400"
                    placeholder={label}
                    autoComplete="off"
                />
                <button
                    type="button"
                    onClick={handleUseCurrentLocation}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-blue-600"
                    title="Use my current location"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                </button>
            </div>

            {status === 'OK' && (
                <ul className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded shadow-lg max-h-60 overflow-y-auto">
                    {data.map(({ place_id, description }) => (
                        <li
                            key={place_id}
                            onClick={handleSelect({ description })}
                            className="px-3 py-2 cursor-pointer hover:bg-gray-100 text-sm text-gray-700"
                        >
                            {description}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

const AddressAutocomplete = (props: IAddressAutocompleteProps) => {
    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
        libraries,
    });

    if (!isLoaded) {
        return (
            <div className="w-full">
                <label className="block mb-1 text-xs font-bold text-gray-700">{props.label}</label>
                <input disabled className="bg-gray-100 border border-gray-300 text-gray-500 text-sm rounded block w-full p-1.5" placeholder="Loading..." />
            </div>
        );
    }

    return <AddressAutocompleteInput {...props} />;
};

export default AddressAutocomplete;

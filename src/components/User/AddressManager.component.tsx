import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { useForm, FormProvider } from 'react-hook-form';
import { UPDATE_CUSTOMER } from '../../utils/gql/GQL_MUTATIONS';
import { GET_ALLOWED_COUNTRIES } from '../../utils/gql/GQL_QUERIES';
import { InputField } from '../Input/InputField.component';
import LoadingSpinner from '../LoadingSpinner/LoadingSpinner.component';
import Button from '../UI/Button.component';
import { useLoadScript } from '@react-google-maps/api';
import usePlacesAutocomplete, { getGeocode } from 'use-places-autocomplete';

interface IAddressData {
    shipping: {
        firstName: string;
        lastName: string;
        address1: string;
        city: string;
        postcode: string;
        country: string;
        state: string;
    }
    billing: {
        firstName: string;
        lastName: string;
        address1: string;
        city: string;
        postcode: string;
        country: string;
        state: string;
        email?: string;
        phone?: string;
    }
}

const libraries: ("places")[] = ["places"];

const AddressAutocomplete = ({ onSelect, defaultValue }: { onSelect: (address: any) => void, defaultValue: string }) => {
    const {
        ready,
        value,
        suggestions: { status, data },
        setValue,
        clearSuggestions,
    } = usePlacesAutocomplete({
        requestOptions: {
            componentRestrictions: { country: 'gh' },
        },
        defaultValue,
        debounce: 300,
    });

    const handleSelect = async (address: any) => {
        setValue(address.description, false);
        clearSuggestions();

        try {
            const results = await getGeocode({ address: address.description });
            // content is "address1", "city", "postcode"
            const addressComponents = results[0].address_components;

            let city = '';
            let postcode = '';
            // Basic parsing logic (can be refined)
            addressComponents.forEach((component) => {
                if (component.types.includes('locality')) {
                    city = component.long_name;
                }
                if (component.types.includes('postal_code')) {
                    postcode = component.long_name;
                }
            });

            onSelect({
                address1: address.description.split(',')[0], // Simple split, or use results[0].formatted_address
                city,
                postcode
            });
        } catch (error) {
            console.error("Error: ", error);
        }
    };

    return (
        <div className="relative">
            <label className="block mb-1 text-xs font-bold text-gray-700">Address Search</label>
            <input
                value={value}
                onChange={(e) => setValue(e.target.value)}
                disabled={!ready}
                className="bg-white border text-gray-900 text-sm rounded focus:ring-blue-500 focus:border-blue-500 block w-full p-2 border-gray-300"
                placeholder="Start typing your address..."
            />
            {status === "OK" && (
                <ul className="absolute z-10 w-full bg-white border border-gray-300 rounded mt-1 shadow-lg max-h-60 overflow-auto">
                    {data.map(({ place_id, description }) => (
                        <li
                            key={place_id}
                            onClick={() => handleSelect({ description })}
                            className="p-2 hover:bg-gray-100 cursor-pointer text-sm"
                        >
                            {description}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

const AddressManager = ({ customer }: { customer: any }) => {
    const { isLoaded } = useLoadScript({
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string,
        libraries,
    });
    const [editingType, setEditingType] = useState<'shipping' | 'billing' | null>(null);

    const shipping = customer?.shipping || {};
    const billing = customer?.billing || {};

    useQuery(GET_ALLOWED_COUNTRIES);

    const methods = useForm<IAddressData>({
        defaultValues: {
            shipping: {
                firstName: shipping.firstName || '',
                lastName: shipping.lastName || '',
                address1: shipping.address1 || '', // will be populated
                city: shipping.city || '',
                postcode: shipping.postcode || '',
                country: 'GH',
                state: shipping.state || ''
            },
            billing: {
                firstName: billing.firstName || '',
                lastName: billing.lastName || '',
                address1: billing.address1 || '',
                city: billing.city || '',
                postcode: billing.postcode || '',
                country: 'GH',
                state: billing.state || '',
                email: billing.email || '',
                phone: billing.phone || ''
            }
        }
    });

    const [updateCustomer, { loading }] = useMutation(UPDATE_CUSTOMER);

    const onSubmit = async (data: IAddressData) => {
        const input: any = {};
        if (editingType === 'shipping') {
            input.shipping = {
                ...data.shipping,
                country: 'GH'
            };
        } else if (editingType === 'billing') {
            input.billing = {
                ...data.billing,
                country: 'GH',
                email: data.billing.email
            };
        }

        try {
            await updateCustomer({ variables: { input } });
            setEditingType(null);
        } catch (error) {
            console.error(error);
            alert("Failed to update address");
        }
    };

    if (!isLoaded) return <LoadingSpinner />;

    if (!editingType) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Shipping Address Card */}
                <div className="bg-white p-6 rounded-lg border border-gray-200">
                    <div className="flex justify-between items-start mb-4">
                        <h3 className="text-lg font-normal text-gray-900">Shipping Address</h3>
                        <button onClick={() => setEditingType('shipping')} className="text-blue-600 hover:text-blue-800 text-sm font-medium">Edit</button>
                    </div>
                    <div className="text-gray-600 space-y-1">
                        <p className="font-normal text-gray-900">{shipping.firstName} {shipping.lastName}</p>
                        <p>{shipping.address1}</p>
                        <p>{shipping.city} {shipping.postcode}</p>
                        <p>{shipping.country}</p>
                    </div>
                </div>

                {/* Billing Address Card */}
                <div className="bg-white p-6 rounded-lg border border-gray-200">
                    <div className="flex justify-between items-start mb-4">
                        <h3 className="text-lg font-normal text-gray-900">Billing Address</h3>
                        <button onClick={() => setEditingType('billing')} className="text-blue-600 hover:text-blue-800 text-sm font-medium">Edit</button>
                    </div>
                    <div className="text-gray-600 space-y-1">
                        <p className="font-normal text-gray-900">{billing.firstName} {billing.lastName}</p>
                        <p>{billing.address1}</p>
                        <p>{billing.city} {billing.postcode}</p>
                        <p>{billing.country}</p>
                        <p className="text-sm pt-2">{billing.email}</p>
                        <p className="text-sm">{billing.phone}</p>
                    </div>
                </div>
            </div>
        );
    }

    const type = editingType;
    const title = type === 'shipping' ? 'Shipping' : 'Billing';

    return (
        <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Edit {title} Address</h3>
            <FormProvider {...methods}>
                <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <InputField inputName={`${type}.firstName`} inputLabel="First Name" type="text" customValidation={{ required: true }} />
                        <InputField inputName={`${type}.lastName`} inputLabel="Last Name" type="text" customValidation={{ required: true }} />
                    </div>

                    {/* Autocomplete Input */}
                    <AddressAutocomplete
                        defaultValue={methods.getValues(`${type}.address1`)}
                        onSelect={(addr) => {
                            methods.setValue(`${type}.address1`, addr.address1);
                            methods.setValue(`${type}.city`, addr.city);
                            // methods.setValue(`${type}.postcode`, addr.postcode); // Postcode often redundant in Ghana or user might want to fill manual
                        }}
                    />

                    {/* Hidden/Populated Real Address Input - allowing manual override */}
                    <InputField inputName={`${type}.address1`} inputLabel="Address Details (House #, etc)" type="text" customValidation={{ required: true }} />
                    <div className="grid grid-cols-2 gap-4">
                        <InputField inputName={`${type}.city`} inputLabel="City" type="text" customValidation={{ required: true }} />
                        <InputField inputName={`${type}.postcode`} inputLabel="Postcode/ZIP" type="text" customValidation={{ required: true }} />
                    </div>

                    <div>
                        <label className="block mb-1 text-xs font-bold text-gray-700">Country</label>
                        <select
                            {...methods.register(`${type}.country`)}
                            className="bg-white border border-gray-300 text-gray-900 text-sm rounded focus:ring-blue-500 focus:border-blue-500 block w-full p-2"
                        >
                            <option value="GH">Ghana</option>
                        </select>
                    </div>

                    {type === 'billing' && (
                        <>
                            <InputField inputName="billing.email" inputLabel="Email Address" type="email" customValidation={{ required: true }} />
                            <InputField inputName="billing.phone" inputLabel="Phone Number" type="tel" customValidation={{ required: true }} />
                        </>
                    )}

                    <div className="flex justify-end gap-3 mt-4">
                        <button
                            type="button"
                            onClick={() => setEditingType(null)}
                            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                        >
                            Cancel
                        </button>
                        <Button variant="primary" buttonDisabled={loading}>
                            {loading ? <LoadingSpinner /> : 'Save Changes'}
                        </Button>
                    </div>
                </form>
            </FormProvider>
        </div>
    );
};

export default AddressManager;

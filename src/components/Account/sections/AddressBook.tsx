import { useState } from 'react';
import { useAddresses, Address } from '../hooks/useAddresses';
import AddressBookSkeleton from '../skeletons/AddressBookSkeleton';
import { useForm, FormProvider } from 'react-hook-form';
import { InputField } from '../../Input/InputField.component';
import Button from '../../UI/Button.component';
import LoadingSpinner from '../../LoadingSpinner/LoadingSpinner.component';

const AddressCard = ({
    type,
    address,
    onUpdate
}: {
    type: 'billing' | 'shipping',
    address: Address,
    onUpdate: (type: 'billing' | 'shipping', data: Address) => Promise<any>
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const methods = useForm<Address>({ defaultValues: address });

    const onSubmit = async (data: Address) => {
        setIsSaving(true);
        const result = await onUpdate(type, data);
        if (result.success) {
            setIsEditing(false);
        }
        setIsSaving(false);
    };

    if (isEditing) {
        return (
            <div className="border border-blue-200 rounded-xl p-6 bg-blue-50/10 shadow-sm animate-fade-in">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-gray-900 capitalize">{type} Address</h3>
                    <button onClick={() => setIsEditing(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <FormProvider {...methods}>
                    <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <InputField inputName="first_name" inputLabel="First Name" customValidation={{ required: true }} />
                            <InputField inputName="last_name" inputLabel="Last Name" customValidation={{ required: true }} />
                        </div>
                        <InputField inputName="company" inputLabel="Company (Optional)" />
                        <InputField inputName="address_1" inputLabel="Address Line 1" customValidation={{ required: true }} />
                        <InputField inputName="address_2" inputLabel="Address Line 2 (Optional)" />
                        <div className="grid grid-cols-2 gap-4">
                            <InputField inputName="city" inputLabel="City" customValidation={{ required: true }} />
                            <InputField inputName="state" inputLabel="State / Region" customValidation={{ required: true }} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <InputField inputName="postcode" inputLabel="Postcode / ZIP" customValidation={{ required: true }} />
                            <InputField inputName="country" inputLabel="Country" customValidation={{ required: true }} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <InputField inputName="email" inputLabel="Email" type="email" />
                            <InputField inputName="phone" inputLabel="Phone" type="tel" />
                        </div>

                        <div className="pt-4 flex gap-3">
                            <Button variant="primary" type="submit" buttonDisabled={isSaving} className="px-8 py-2.5">
                                {isSaving ? <LoadingSpinner size="sm" color="white" /> : 'Save Changes'}
                            </Button>
                            <button
                                type="button"
                                onClick={() => setIsEditing(false)}
                                className="px-6 py-2.5 text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors"
                                disabled={isSaving}
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </FormProvider>
            </div>
        );
    }

    return (
        <div className="border border-gray-100 rounded-xl p-6 bg-white hover:shadow-md transition-all group">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h3 className="text-lg font-bold text-gray-900 capitalize">{type} Address</h3>
                    {type === 'billing' && (
                        <span className="text-[10px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded font-bold mt-1 inline-block uppercase tracking-wider">Default</span>
                    )}
                </div>
                <button
                    onClick={() => setIsEditing(true)}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                    title="Edit Address"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                </button>
            </div>

            <div className="space-y-1 text-sm text-gray-600">
                <p className="font-bold text-gray-900">{address.first_name} {address.last_name}</p>
                {address.company && <p>{address.company}</p>}
                <p>{address.address_1}</p>
                {address.address_2 && <p>{address.address_2}</p>}
                <p>{address.city}, {address.state} {address.postcode}</p>
                <p>{address.country}</p>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-50 flex gap-4">
                <div className="flex items-center gap-2 text-xs text-gray-400">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    {address.email || 'No email provided'}
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    {address.phone || 'No phone provided'}
                </div>
            </div>
        </div>
    );
};

const AddressBook = () => {
    const { billing, shipping, isLoading, isError, updateAddress } = useAddresses();

    if (isLoading) return <AddressBookSkeleton />;

    if (isError) {
        return (
            <div className="p-8 text-center">
                <p className="text-red-500 mb-4">Error loading addresses.</p>
                <Button handleButtonClick={() => window.location.reload()}>Retry</Button>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Address Book</h2>
                    <p className="text-sm text-gray-500 mt-1">Manage your delivery and billing locations</p>
                </div>
                <Button variant="primary" className="text-xs font-bold py-2.5 px-6">Add New Address</Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {billing && <AddressCard type="billing" address={billing} onUpdate={updateAddress} />}
                {shipping && <AddressCard type="shipping" address={shipping} onUpdate={updateAddress} />}
            </div>

            {!billing && !shipping && (
                <div className="py-20 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-6 shadow-sm mx-auto">
                        <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">No addresses saved</h3>
                    <p className="text-gray-500 mt-2 mb-8 max-w-xs mx-auto text-sm">
                        Add your primary shipping and billing addresses for a faster checkout.
                    </p>
                    <Button variant="primary" className="px-8 py-3 font-bold">Add Your First Address</Button>
                </div>
            )}
        </div>
    );
};

export default AddressBook;

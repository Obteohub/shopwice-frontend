import { useState } from 'react';
import { useProfile, UserProfile } from '../hooks/useProfile';
import AccountManagementSkeleton from '../skeletons/AccountManagementSkeleton';
import { useForm, FormProvider } from 'react-hook-form';
import { InputField } from '../../Input/InputField.component';
import Button from '../../UI/Button.component';
import LoadingSpinner from '../../LoadingSpinner/LoadingSpinner.component';
import Link from 'next/link';

const PersonalInfoForm = ({ profile, onUpdate }: { profile: UserProfile, onUpdate: (data: any) => Promise<any> }) => {
    const [isSaving, setIsSaving] = useState(false);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);
    const methods = useForm<UserProfile>({
        defaultValues: {
            first_name: profile.first_name,
            last_name: profile.last_name,
            display_name: profile.display_name,
            email: profile.email,
        }
    });

    const onSubmit = async (data: any) => {
        setIsSaving(true);
        setFeedback(null);
        const result = await onUpdate(data);
        if (result.success) {
            setFeedback({ type: 'success', message: 'Profile updated successfully!' });
            setTimeout(() => setFeedback(null), 3000);
        } else {
            setFeedback({ type: 'error', message: 'Failed to update profile.' });
        }
        setIsSaving(false);
    };

    return (
        <div className="space-y-6">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 inline-block px-3 py-1 bg-gray-50 rounded">Personal Information</h3>
            <FormProvider {...methods}>
                <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <InputField inputName="first_name" inputLabel="First Name" customValidation={{ required: true }} />
                        <InputField inputName="last_name" inputLabel="Last Name" customValidation={{ required: true }} />
                        <InputField inputName="display_name" inputLabel="Public Display Name" customValidation={{ required: true }} />
                        <InputField inputName="email" inputLabel="Email Address" type="email" customValidation={{ required: true }} />
                    </div>

                    {feedback && (
                        <div className={`p-4 rounded-lg text-sm font-medium ${feedback.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                            {feedback.message}
                        </div>
                    )}

                    <Button variant="primary" type="submit" buttonDisabled={isSaving} className="px-8 py-3">
                        {isSaving ? <LoadingSpinner size="sm" color="white" /> : 'Update Personal Info'}
                    </Button>
                </form>
            </FormProvider>
        </div>
    );
};

const PasswordForm = ({ onUpdate }: { onUpdate: (data: any) => Promise<any> }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);
    const methods = useForm({ defaultValues: { current_password: '', new_password: '', confirm_password: '' } });

    const onSubmit = async (data: any) => {
        if (data.new_password !== data.confirm_password) {
            setFeedback({ type: 'error', message: 'Passwords do not match.' });
            return;
        }
        setIsSaving(true);
        setFeedback(null);
        const result = await onUpdate({ password: data.new_password });
        if (result.success) {
            setFeedback({ type: 'success', message: 'Password changed successfully!' });
            methods.reset();
            setTimeout(() => {
                setFeedback(null);
                setIsExpanded(false);
            }, 3000);
        } else {
            setFeedback({ type: 'error', message: 'Failed to change password.' });
        }
        setIsSaving(false);
    };

    return (
        <div className="pt-10 border-t border-gray-100 space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 inline-block px-3 py-1 bg-gray-50 rounded">Security</h3>
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors uppercase tracking-widest"
                >
                    {isExpanded ? 'Cancel Change' : 'Change Password'}
                </button>
            </div>

            {isExpanded && (
                <FormProvider {...methods}>
                    <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-6 max-w-md animate-fade-in">
                        <InputField inputName="current_password" inputLabel="Current Password" type="password" customValidation={{ required: true }} />
                        <InputField inputName="new_password" inputLabel="New Password" type="password" customValidation={{ required: true, minLength: 8 }} />
                        <InputField inputName="confirm_password" inputLabel="Confirm New Password" type="password" customValidation={{ required: true }} />

                        {feedback && (
                            <div className={`p-4 rounded-lg text-sm font-medium ${feedback.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                                {feedback.message}
                            </div>
                        )}

                        <Button variant="primary" type="submit" buttonDisabled={isSaving} className="px-8 py-3">
                            {isSaving ? <LoadingSpinner size="sm" color="white" /> : 'Update Password'}
                        </Button>
                        <p className="text-xs text-gray-500 mt-2">
                            Lost your password? <Link href="/forgot-password" className="text-blue-600 hover:underline">Reset it via email</Link>
                        </p>
                    </form>
                </FormProvider>
            )}
        </div>
    );
};

const DangerZone = ({ onDelete }: { onDelete: () => Promise<any> }) => {
    const [showConfirm, setShowConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async () => {
        setIsDeleting(true);
        await onDelete();
        // Redirect to home or logout
        window.location.href = '/';
    };

    return (
        <div className="pt-10 border-t border-red-50 space-y-6">
            <h3 className="text-xs font-bold text-red-400 uppercase tracking-widest mb-4 inline-block px-3 py-1 bg-red-50 rounded">Danger Zone</h3>

            {!showConfirm ? (
                <div className="p-6 bg-red-50/10 rounded-xl border border-dashed border-red-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="max-w-md">
                        <h4 className="text-sm font-bold text-red-600">Delete Account</h4>
                        <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                            Once you delete your account, there is no going back. All your orders, history, and saved data will be permanently removed.
                        </p>
                    </div>
                    <button
                        onClick={() => setShowConfirm(true)}
                        className="px-6 py-2.5 text-xs font-bold text-red-600 hover:bg-red-50 border border-red-200 rounded-lg transition-all flex-shrink-0"
                    >
                        Delete Permanently
                    </button>
                </div>
            ) : (
                <div className="p-6 bg-red-600 rounded-xl text-white animate-scale-up">
                    <h4 className="text-lg font-bold mb-2">Are you absolutely sure?</h4>
                    <p className="text-sm text-red-100 mb-6 leading-relaxed">
                        This action is permanent and cannot be undone. You will lose access to all your coupons, points, and order tracking.
                    </p>
                    <div className="flex gap-4">
                        <button
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="px-6 py-2.5 bg-white text-red-600 font-bold rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                        >
                            {isDeleting ? <LoadingSpinner size="sm" color="black" /> : 'Yes, Delete My Account'}
                        </button>
                        <button
                            onClick={() => setShowConfirm(false)}
                            disabled={isDeleting}
                            className="px-6 py-2.5 bg-red-700 text-white font-bold rounded-lg hover:bg-red-800 transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

const AccountManagement = () => {
    const { profile, isLoading, isError, error, updateProfile, deleteAccount } = useProfile();

    if (isLoading) return <AccountManagementSkeleton />;

    if (isError || !profile) {
        // Provide specific error messages based on error type
        let errorMessage = 'Failed to load profile settings.';
        
        if (error?.status === 401) {
            errorMessage = 'You are not authenticated. Please log in to view your profile.';
        } else if (error?.status === 403) {
            errorMessage = 'You do not have permission to view your profile.';
        } else if (error?.status === 404) {
            errorMessage = 'Profile not found.';
        } else if (error?.status === 500) {
            errorMessage = 'Server error. Please try again later.';
        }

        return (
            <div className="p-8 text-center">
                <div className="text-red-500 mb-4">
                    <p className="text-lg font-semibold">{errorMessage}</p>
                    {process.env.NODE_ENV === 'development' && error && (
                        <p className="text-sm mt-2 text-gray-600">
                            Error: {error.message}
                        </p>
                    )}
                </div>
                <Button 
                    handleButtonClick={() => window.location.reload()} 
                    className="mt-4"
                >
                    Retry
                </Button>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-10">Account Settings</h2>

            <div className="space-y-12">
                <PersonalInfoForm profile={profile} onUpdate={updateProfile} />
                <PasswordForm onUpdate={updateProfile} />
                <DangerZone onDelete={deleteAccount} />
            </div>
        </div>
    );
};

export default AccountManagement;

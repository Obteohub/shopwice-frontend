import { useState } from 'react';
import { useMutation } from '@apollo/client';
import { useForm, FormProvider } from 'react-hook-form';
import { RESET_USER_PASSWORD } from '../../utils/gql/GQL_MUTATIONS';
import { InputField } from '../Input/InputField.component';
import LoadingSpinner from '../LoadingSpinner/LoadingSpinner.component';
import Button from '../UI/Button.component';
import Link from 'next/link';
import { useRouter } from 'next/router';

interface IResetPasswordData {
    password: string;
    passwordConfirm: string;
}

const ResetPasswordForm = () => {
    const router = useRouter();
    const { key, login } = router.query;
    const methods = useForm<IResetPasswordData>();
    const [resetPassword, { loading, error }] = useMutation(RESET_USER_PASSWORD);
    const [resetSuccess, setResetSuccess] = useState(false);

    const onSubmit = async (data: IResetPasswordData) => {
        if (data.password !== data.passwordConfirm) {
            methods.setError('passwordConfirm', { type: 'manual', message: 'Passwords do not match' });
            return;
        }

        try {
            const response = await resetPassword({
                variables: {
                    key: key as string,
                    login: login as string,
                    password: data.password
                },
            });

            if (response.data?.resetUserPassword?.user) {
                setResetSuccess(true);
            }
        } catch (error: unknown) {
            console.error('Reset password error:', error);
        }
    };

    if (resetSuccess) {
        return (
            <div className="text-center max-w-md mx-auto p-6 bg-white rounded-lg shadow-sm border border-gray-100">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Password Reset!</h2>
                <p className="text-gray-600 mb-6">
                    Your password has been successfully updated. You can now log in with your new password.
                </p>
                <Link href="/login">
                    <a className="inline-block bg-blue-600 text-white px-6 py-2 rounded-md font-medium hover:bg-blue-700 transition-colors">Go to Login</a>
                </Link>
            </div>
        );
    }

    if (!key || !login) {
        return (
            <div className="text-center p-6">
                <h2 className="text-xl font-bold text-red-600">Invalid Link</h2>
                <p className="text-gray-600 mt-2">This password reset link is invalid or expired.</p>
                <div className="mt-4">
                    <Link href="/forgot-password"><a className="text-blue-600 hover:underline">Request a new link</a></Link>
                </div>
            </div>
        )
    }

    return (
        <div className="w-full max-w-md mx-auto bg-white p-8 rounded-xl shadow-lg border border-gray-100">
            <div className="text-center mb-8">
                <h1 className="text-2xl font-bold text-gray-900">Set New Password</h1>
                <p className="text-gray-500 mt-2 text-sm">Please enter your new password below.</p>
            </div>

            <FormProvider {...methods}>
                <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-6">
                    <InputField
                        inputName="password"
                        inputLabel="New Password"
                        type="password"
                        customValidation={{ required: true, minLength: 6 }}
                    />

                    <InputField
                        inputName="passwordConfirm"
                        inputLabel="Confirm Password"
                        type="password"
                        customValidation={{ required: true }}
                    />

                    {error && (
                        <div className="bg-red-50 text-red-600 p-3 rounded text-sm text-center border border-red-100">
                            {error.message || "Failed to reset password. Link may be expired."}
                        </div>
                    )}

                    <Button variant="primary" buttonDisabled={loading} className="w-full py-3 flex justify-center">
                        {loading ? <LoadingSpinner /> : 'Reset Password'}
                    </Button>
                </form>
            </FormProvider>
        </div>
    );
};

export default ResetPasswordForm;

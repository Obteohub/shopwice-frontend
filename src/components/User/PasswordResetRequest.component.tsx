import { useState } from 'react';
import { useMutation } from '@apollo/client';
import { useForm, FormProvider } from 'react-hook-form';
import { SEND_PASSWORD_RESET_EMAIL } from '../../utils/gql/GQL_MUTATIONS';
import { InputField } from '../Input/InputField.component';
import LoadingSpinner from '../LoadingSpinner/LoadingSpinner.component';
import Button from '../UI/Button.component';
import Link from 'next/link';

interface IResetData {
    username: string;
}

const PasswordResetRequest = () => {
    const methods = useForm<IResetData>();
    const [sendResetEmail, { loading, error }] = useMutation(SEND_PASSWORD_RESET_EMAIL);
    const [requestSent, setRequestSent] = useState(false);

    const onSubmit = async (data: IResetData) => {
        try {
            await sendResetEmail({
                variables: { username: data.username },
            });
            // We set success even if it "fails" silently for security in some systems, 
            // but GQL usually throws if user not found depending on plugin settings.
            // We'll assume success if no error thrown.
            setRequestSent(true);
        } catch (error: unknown) {
            console.error('Reset password error:', error);
            // Optional: Don't reveal if user exists or not, but for better UX we might show error
        }
    };

    if (requestSent) {
        return (
            <div className="text-center max-w-md mx-auto p-6 bg-white rounded-lg shadow-sm border border-gray-100">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Check your email</h2>
                <p className="text-gray-600 mb-6">
                    If an account exists for <b>{methods.getValues('username')}</b>, we have sent a password reset link.
                </p>
                <Link href="/login" className="text-blue-600 hover:text-blue-800 font-medium text-sm">
                    Return to Login
                </Link>
            </div>
        );
    }

    return (
        <div className="w-full max-w-md mx-auto bg-white p-8 rounded-xl shadow-lg border border-gray-100">
            <div className="text-center mb-8">
                <h1 className="text-2xl font-bold text-gray-900">Forgot Password?</h1>
                <p className="text-gray-500 mt-2 text-sm">Enter your email and we&apos;ll send you instructions to reset your password.</p>
            </div>

            <FormProvider {...methods}>
                <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-6">
                    <InputField
                        inputName="username"
                        inputLabel="Username or Email"
                        type="text"
                        customValidation={{ required: true }}
                    />

                    {error && (
                        <div className="bg-red-50 text-red-600 p-3 rounded text-sm text-center border border-red-100">
                            User not found or email sending failed.
                        </div>
                    )}

                    <Button variant="primary" buttonDisabled={loading} className="w-full py-3 flex justify-center">
                        {loading ? <LoadingSpinner /> : 'Send Reset Link'}
                    </Button>
                </form>
            </FormProvider>

            <div className="mt-6 text-center">
                <Link href="/login" className="text-sm text-gray-500 hover:text-gray-900 flex items-center justify-center gap-1 transition-colors">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                    Back to Login
                </Link>
            </div>
        </div>
    );
};

export default PasswordResetRequest;

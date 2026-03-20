import Link from 'next/link';
import { useState } from 'react';
import Button from '../UI/Button.component';
import { api, ApiError } from '@/utils/api';
import { ENDPOINTS } from '@/utils/endpoints';

const getFriendlyError = (error: unknown) => {
    if (error instanceof ApiError) {
        const data = error.data as Record<string, unknown> | undefined;
        const messageFromData =
            typeof data?.error === 'string'
                ? data.error
                : typeof data?.message === 'string'
                    ? data.message
                    : '';
        return messageFromData || error.message || 'Unable to send reset instructions right now.';
    }

    if (error instanceof Error) return error.message;
    return 'Unable to send reset instructions right now.';
};

export default function PasswordResetRequest() {
    const [email, setEmail] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim()) {
            setError('Enter your email address.');
            return;
        }

        setIsSubmitting(true);
        setError('');

        try {
            await api.post(ENDPOINTS.AUTH.FORGOT_PASSWORD, {
                email: email.trim(),
            });
            setSubmitted(true);
        } catch (err) {
            setError(getFriendlyError(err));
        } finally {
            setIsSubmitting(false);
        }
    };

    if (submitted) {
        return (
            <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-200">
                <div className="rounded-xl border border-green-200 bg-green-50 p-4">
                    <h2 className="text-xl font-semibold text-gray-900">Check your email</h2>
                    <p className="mt-2 text-sm leading-6 text-gray-700">
                        If an account exists for <span className="font-medium">{email}</span>, you will receive password reset instructions shortly.
                    </p>
                </div>
                <div className="mt-6 flex items-center justify-between gap-4 text-sm">
                    <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500">
                        Back to login
                    </Link>
                    <button
                        type="button"
                        className="font-medium text-gray-600 hover:text-gray-900"
                        onClick={() => {
                            setSubmitted(false);
                            setEmail('');
                        }}
                    >
                        Try another email
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-200">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Reset password</h1>
            <p className="mt-2 text-sm leading-6 text-gray-600">
                Enter the email address linked to your account and we&apos;ll send you a password reset link.
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div>
                    <label htmlFor="reset-email" className="block text-sm font-medium text-gray-700">
                        Email address
                    </label>
                    <input
                        id="reset-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2.5 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        placeholder="you@example.com"
                        autoComplete="email"
                        required
                    />
                </div>

                {error ? (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                        {error}
                    </div>
                ) : null}

                <Button className="w-full" type="submit" buttonDisabled={isSubmitting}>
                    {isSubmitting ? 'Sending...' : 'Send Reset Link'}
                </Button>
            </form>

            <div className="mt-6 text-sm text-gray-600">
                Remembered your password?{' '}
                <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500">
                    Sign in
                </Link>
            </div>
        </div>
    );
}

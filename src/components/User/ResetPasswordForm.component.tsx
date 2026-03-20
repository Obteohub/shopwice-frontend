import Link from 'next/link';
import { useRouter } from 'next/router';
import { useMemo, useState } from 'react';
import Button from '../UI/Button.component';
import { api, ApiError } from '@/utils/api';
import { ENDPOINTS } from '@/utils/endpoints';

const readQueryValue = (value: string | string[] | undefined) => {
    if (Array.isArray(value)) return value[0] || '';
    return value || '';
};

const getFriendlyError = (error: unknown) => {
    if (error instanceof ApiError) {
        const data = error.data as Record<string, unknown> | undefined;
        const messageFromData =
            typeof data?.error === 'string'
                ? data.error
                : typeof data?.message === 'string'
                    ? data.message
                    : '';
        return messageFromData || error.message || 'Unable to reset your password right now.';
    }

    if (error instanceof Error) return error.message;
    return 'Unable to reset your password right now.';
};

export default function ResetPasswordForm() {
    const router = useRouter();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const resetKey = useMemo(
        () => readQueryValue(router.query.key) || readQueryValue(router.query.rp_key),
        [router.query.key, router.query.rp_key],
    );
    const resetLogin = useMemo(
        () => readQueryValue(router.query.login) || readQueryValue(router.query.rp_login),
        [router.query.login, router.query.rp_login],
    );

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');

        if (!resetKey || !resetLogin) {
            setError('This reset link is incomplete. Request a new password reset email.');
            return;
        }

        if (password.length < 8) {
            setError('Use at least 8 characters for your new password.');
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        setIsSubmitting(true);

        try {
            const response = await api.post<{ success?: boolean; message?: string }>(
                ENDPOINTS.AUTH.RESET_PASSWORD,
                {
                    login: resetLogin,
                    key: resetKey,
                    password,
                    confirmPassword,
                    rp_login: resetLogin,
                    rp_key: resetKey,
                },
            );

            const message = String(response?.message || '').trim();
            if (/stubbed|requires email server config/i.test(message)) {
                setError('The reset-password API is not fully configured on the backend yet. Request a new reset link later or contact support.');
                return;
            }

            setSuccessMessage(message || 'Your password has been reset. You can now sign in.');
            setPassword('');
            setConfirmPassword('');
        } catch (err) {
            setError(getFriendlyError(err));
        } finally {
            setIsSubmitting(false);
        }
    };

    if (successMessage) {
        return (
            <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-200">
                <div className="rounded-xl border border-green-200 bg-green-50 p-4">
                    <h1 className="text-xl font-semibold text-gray-900">Password updated</h1>
                    <p className="mt-2 text-sm leading-6 text-gray-700">{successMessage}</p>
                </div>
                <Link
                    href="/login"
                    className="mt-6 inline-flex text-sm font-medium text-blue-600 hover:text-blue-500"
                >
                    Continue to login
                </Link>
            </div>
        );
    }

    return (
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-200">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Create a new password</h1>
            <p className="mt-2 text-sm leading-6 text-gray-600">
                Choose a strong password for your account.
            </p>

            {!resetKey || !resetLogin ? (
                <div className="mt-6 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
                    This reset link is missing the required token. Request a new password reset email.
                </div>
            ) : null}

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div>
                    <label htmlFor="new-password" className="block text-sm font-medium text-gray-700">
                        New password
                    </label>
                    <input
                        id="new-password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2.5 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        autoComplete="new-password"
                        required
                    />
                </div>

                <div>
                    <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700">
                        Confirm new password
                    </label>
                    <input
                        id="confirm-password"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2.5 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        autoComplete="new-password"
                        required
                    />
                </div>

                {error ? (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                        {error}
                    </div>
                ) : null}

                <Button
                    className="w-full"
                    type="submit"
                    buttonDisabled={isSubmitting || !resetKey || !resetLogin}
                >
                    {isSubmitting ? 'Updating...' : 'Update Password'}
                </Button>
            </form>

            <div className="mt-6 flex items-center justify-between gap-4 text-sm text-gray-600">
                <Link href="/forgot-password" className="font-medium text-blue-600 hover:text-blue-500">
                    Request a new reset link
                </Link>
                <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500">
                    Back to login
                </Link>
            </div>
        </div>
    );
}

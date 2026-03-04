import { useState } from 'react';
import Button from '../UI/Button.component';

export default function PasswordResetRequest() {
    const [email, setEmail] = useState('');
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // TODO: Implement REST API password reset
        setSubmitted(true);
    };

    if (submitted) {
        return (
            <div className="max-w-md mx-auto p-6">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h2 className="text-xl font-semibold mb-2">Check Your Email</h2>
                    <p className="text-gray-700">
                        If an account exists with {email}, you will receive password reset instructions.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-md mx-auto p-6">
            <h1 className="text-2xl font-bold mb-4">Reset Password</h1>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-gray-700">
                    Password reset is being migrated to REST API and will be available soon.
                </p>
            </div>
            <form onSubmit={handleSubmit}>
                <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">Email Address</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full border rounded px-3 py-2"
                        required
                        disabled
                    />
                </div>
                <Button className="w-full" buttonDisabled>
                    Send Reset Link (Coming Soon)
                </Button>
            </form>
        </div>
    );
}

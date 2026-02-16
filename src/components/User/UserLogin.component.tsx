import { useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { useRouter } from 'next/router';
import Image from 'next/image';
import Link from 'next/link';
import { login } from '@/utils/auth';
import { InputField } from '../Input/InputField.component';
import Button from '../UI/Button.component';
import LoadingSpinner from '../LoadingSpinner/LoadingSpinner.component';

interface ILoginData {
  username: string;
  password: string;
}

const UserLogin = () => {
  const methods = useForm<ILoginData>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const onSubmit = async (data: ILoginData) => {
    setLoading(true);
    setError(null);
    try {
      const result = await login(data.username, data.password);
      if (result.success && result.status === 'SUCCESS') {
        router.push('/my-account');
      } else {
        throw new Error('Failed to login');
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('An unknown error occurred.');
      }
      console.error('Login error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-140px)] bg-white">
      {/* Left Side - Lifestyle Image (Hidden on Mobile) */}
      <div className="hidden lg:block lg:w-1/2 relative bg-gray-900">
        <Image
          src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80"
          layout="fill"
          objectFit="cover"
          alt="Lifestyle"
          className="opacity-70"
          priority
        />
        <div className="absolute inset-0 flex items-center justify-center p-12">
          <div className="text-white max-w-lg">
            <h2 className="text-4xl font-bold mb-6">Welcome Back</h2>
            <p className="text-lg text-gray-200">Shop the world&apos;s best brands with confidence. Your premium shopping experience awaits.</p>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 lg:p-24 bg-white">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center lg:text-left">
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Log in</h1>
            <p className="mt-2 text-sm text-gray-600">
              New here?{' '}
              <Link href="/register" className="font-medium text-blue-600 hover:text-blue-500">
                Create an account
              </Link>
            </p>
          </div>

          <FormProvider {...methods}>
            <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-6">
              <InputField
                inputName="username"
                inputLabel="Email address"
                type="text"
                customValidation={{ required: true }}
              />

              <div>
                <InputField
                  inputName="password"
                  inputLabel="Password"
                  type="password"
                  customValidation={{ required: true }}
                />
                <div className="flex items-center justify-end mt-1">
                  <Link href="/forgot-password" className="text-sm font-medium text-blue-600 hover:text-blue-500">
                    Forgot your password?
                  </Link>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
                  {error}
                </div>
              )}

              <Button variant="primary" buttonDisabled={loading} className="w-full py-3 text-base flex justify-center">
                {loading ? <LoadingSpinner /> : 'Sign in'}
              </Button>
            </form>
          </FormProvider>
        </div>
      </div>
    </div>
  );
};

export default UserLogin;

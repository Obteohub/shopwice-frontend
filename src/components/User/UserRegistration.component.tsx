import { useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { InputField } from '../Input/InputField.component';
import LoadingSpinner from '../LoadingSpinner/LoadingSpinner.component';
import Button from '../UI/Button.component';
import Link from 'next/link';
import Image from 'next/image';
import { register } from '@/utils/auth';

interface IRegistrationData {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  confirmPassword?: string;
}

const UserRegistration = () => {
  const methods = useForm<IRegistrationData>();
  const [registrationCompleted, setRegistrationCompleted] = useState(false);

  const onSubmit = async (data: IRegistrationData) => {
    try {
      // Remove confirmPassword from the variables sent to the server
      const { confirmPassword: removedPassword, ...mutationData } = data;
      void removedPassword;

      // Use the register function from auth.ts which uses GraphQL
      const result = await register(mutationData);

      if (result.success) {
        setRegistrationCompleted(true);
      } else {
        throw new Error('Failed to register customer');
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      // Manually set form error
      methods.setError('root' as any, {
        type: 'manual',
        message: error.message || 'An error occurred during registration'
      });
    }
  };

  if (registrationCompleted) {
    return (
      <div className="flex min-h-[calc(100vh-140px)] bg-white items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Account Created!</h2>
          <p className="text-gray-600 mb-8">You have successfully registered. Please log in to start shopping.</p>
          <Link href="/login">
            <a className="inline-block bg-blue-600 text-white px-8 py-3 rounded-md font-medium hover:bg-blue-700 transition-colors">
              Log In Now
            </a>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-140px)] bg-white">
      {/* Left Side (Desktop) - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 lg:p-24 bg-white">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center lg:text-left">
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Create Account</h1>
            <p className="mt-2 text-sm text-gray-600">
              Already have an account?{' '}
              <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500">
                Log in
              </Link>
            </p>
          </div>

          <FormProvider {...methods}>
            <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <InputField
                  inputName="firstName"
                  inputLabel="First Name"
                  type="text"
                  customValidation={{ required: true }}
                />
                <InputField
                  inputName="lastName"
                  inputLabel="Last Name"
                  type="text"
                  customValidation={{ required: true }}
                />
              </div>

              <InputField
                inputName="username"
                inputLabel="Username"
                type="text"
                customValidation={{ required: true }}
              />
              <InputField
                inputName="email"
                inputLabel="Email"
                type="email"
                customValidation={{ required: true }}
              />
              <InputField
                inputName="password"
                inputLabel="Password"
                type="password"
                customValidation={{
                  required: "Password is required",
                  minLength: {
                    value: 6,
                    message: "Password must be at least 6 characters"
                  }
                }}
              />
              <InputField
                inputName="confirmPassword"
                inputLabel="Confirm Password"
                type="password"
                customValidation={{
                  required: "Confirm Password is required",
                  validate: (val: string) => {
                    if (methods.watch('password') != val) {
                      return "Your passwords do not match";
                    }
                  }
                }}
              />

              {methods.formState.errors.root && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
                  {methods.formState.errors.root.message}
                </div>
              )}

              <div className="pt-2">
                <Button variant="primary" buttonDisabled={methods.formState.isSubmitting} className="w-full py-3 text-base flex justify-center">
                  {methods.formState.isSubmitting ? <LoadingSpinner /> : 'Create Account'}
                </Button>
              </div>
            </form>
          </FormProvider>
          <p className="text-xs text-gray-500 text-center mt-4">By registering, you agree to our Terms of Service and Privacy Policy.</p>
        </div>
      </div>

      {/* Right Side - Lifestyle Image (Hidden on Mobile) */}
      <div className="hidden lg:block lg:w-1/2 relative bg-gray-900">
        <Image
          src="https://images.unsplash.com/photo-1483985988355-763728e1935b?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80"
          layout="fill"
          objectFit="cover"
          alt="Fashion"
          className="opacity-70"
          priority
        />
        <div className="absolute inset-0 flex items-center justify-center p-12">
          <div className="text-white max-w-lg text-right">
            <h2 className="text-4xl font-bold mb-6">Join the Community</h2>
            <p className="text-lg text-gray-200">Get exclusive access to new arrivals, sales, and special offers. Join thousands of happy customers.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserRegistration;

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

export default function withAuth(Component: any) {
  return function AuthenticatedComponent(props: any) {
    const router = useRouter();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      // Check if user is authenticated
      const authData = localStorage.getItem('auth-data');

      if (!authData) {
        router.push('/login');
        return;
      }

      try {
        const parsed = JSON.parse(authData);
        if (parsed.authToken) {
          setIsAuthenticated(true);
        } else {
          router.push('/login');
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[withAuth] Invalid auth-data payload, redirecting to login.', error);
        }
        router.push('/login');
      } finally {
        setLoading(false);
      }
    }, [router]);

    if (loading) {
      return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
    }

    if (!isAuthenticated) {
      return null;
    }

    return <Component {...props} />;
  };
}

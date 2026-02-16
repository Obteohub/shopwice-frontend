import { useRouter } from 'next/router';
import { useEffect, ComponentType } from 'react';
import { useQuery } from '@apollo/client';
import { GET_CURRENT_USER } from '../../utils/gql/GQL_QUERIES';
import LoadingSpinner from '../LoadingSpinner/LoadingSpinner.component';

const withAuth = <P extends object>(WrappedComponent: ComponentType<P>) => {
  const Wrapper = (props: P) => {
    const router = useRouter();
    const { data, loading, error } = useQuery(GET_CURRENT_USER, {
      errorPolicy: 'all',
      fetchPolicy: 'cache-first',
      nextFetchPolicy: 'cache-and-network',
      returnPartialData: true,
    });

    const hasCustomer = Boolean(data?.customer);

    useEffect(() => {
      if (!loading && (error || !hasCustomer)) {
        router.push('/login');
      }
    }, [loading, error, hasCustomer, router]);

    // Show loading while checking authentication
    if (loading) {
      return (
        <div className="flex justify-center items-center min-h-screen">
          <LoadingSpinner />
        </div>
      );
    }

    // If no customer data, don't render the component
    if (!hasCustomer) {
      return null;
    }

    return <WrappedComponent {...props} />;
  };

  return Wrapper;
};

export default withAuth;

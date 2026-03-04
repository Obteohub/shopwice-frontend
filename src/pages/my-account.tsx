import { useRouter } from 'next/router';
import { lazy, Suspense } from 'react';
import Layout from '@/components/Layout/Layout.component';
import AccountLayout from '@/components/Account/AccountLayout';
import withAuth from '@/components/User/withAuth.component';
import type { NextPage } from 'next';

// Lazy load sections
const Orders = lazy(() => import('@/components/Account/sections/Orders'));
const Wishlist = lazy(() => import('@/components/Account/sections/Wishlist'));
const Reviews = lazy(() => import('@/components/Account/sections/Reviews'));
const AddressBook = lazy(() => import('@/components/Account/sections/AddressBook'));
const PaymentMethods = lazy(() => import('@/components/Account/sections/PaymentMethods'));
const Notifications = lazy(() => import('@/components/Account/sections/Notifications'));
const AccountManagement = lazy(() => import('@/components/Account/sections/AccountManagement'));

const CustomerAccountPage: NextPage = () => {
  const router = useRouter();
  const activeTab = (router.query.tab as string) || 'orders';

  const renderSection = () => {
    switch (activeTab) {
      case 'orders':
        return <Orders />;
      case 'wishlist':
        return <Wishlist />;
      case 'reviews':
        return <Reviews />;
      case 'address-book':
        return <AddressBook />;
      case 'payment-methods':
        return <PaymentMethods />;
      case 'notifications':
        return <Notifications />;
      case 'account-management':
        return <AccountManagement />;
      default:
        return <Orders />;
    }
  };

  return (
    <Layout title="My Account" fullWidth={true}>
      <AccountLayout>
        <Suspense
          fallback={<div className="p-6 text-sm text-gray-500">Loading account section...</div>}
        >
          {renderSection()}
        </Suspense>
      </AccountLayout>
    </Layout>
  );
};

export default withAuth(CustomerAccountPage);

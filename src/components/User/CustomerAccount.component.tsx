
import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { GET_CURRENT_USER, GET_CUSTOMER_DASHBOARD_DATA } from '../../utils/gql/GQL_QUERIES';
import { UPDATE_CUSTOMER } from '../../utils/gql/GQL_MUTATIONS';
import LoadingSpinner from '../LoadingSpinner/LoadingSpinner.component';
import dynamic from 'next/dynamic';

const AddressManager = dynamic(() => import('./AddressManager.component'), {
  loading: () => <LoadingSpinner />,
  ssr: false
});
import { useRouter } from 'next/router';
import { useForm, FormProvider } from 'react-hook-form';
import { InputField } from '../Input/InputField.component';
import Button from '../UI/Button.component';
import Link from 'next/link';

const CustomerAccount = () => {
  const router = useRouter();
  const { tab } = router.query;
  const activeTab = (tab as string) || 'profile';

  const setActiveTab = (newTab: string) => {
    router.push(
      {
        pathname: router.pathname,
        query: { ...router.query, tab: newTab },
      },
      undefined,
      { shallow: true }
    );
  };
  const {
    loading: currentUserLoading,
    data: currentUserData,
  } = useQuery(GET_CURRENT_USER, {
    fetchPolicy: 'cache-first',
    nextFetchPolicy: 'cache-and-network',
    returnPartialData: true,
  });

  const needsDashboardData = activeTab !== 'profile';
  const {
    loading: dashboardLoading,
    error: dashboardError,
    data: dashboardData,
    refetch,
  } = useQuery(GET_CUSTOMER_DASHBOARD_DATA, {
    fetchPolicy: 'cache-first',
    nextFetchPolicy: 'cache-and-network',
    returnPartialData: true,
    skip: !needsDashboardData,
  });

  const customer = dashboardData?.customer || currentUserData?.customer;
  const isGuest = !customer || !customer.username;

  // Handle Loading State
  if ((needsDashboardData && dashboardLoading && !dashboardData) || (currentUserLoading && !currentUserData)) {
    return <div className="p-8 flex justify-center"><LoadingSpinner /></div>;
  }

  if (dashboardError) {
    return (
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Unable to load account</h2>
        <p className="text-sm text-gray-600 mb-4">{dashboardError.message}</p>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-semibold"
        >
          Retry
        </button>
      </div>
    );
  }

  // Handle Auth State
  // If no customer, we are in Guest Mode

  const handleLogout = async () => {
    // Determine which logout to use based solely on the imported utility
    const { logout } = await import('../../utils/auth');
    await logout();
  };

  const renderProfileHeader = () => (
    <div className="flex flex-row gap-6 items-center justify-start px-6 py-6 bg-white mb-2 shadow-sm border-b border-gray-100">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 font-bold text-2xl overflow-hidden flex-shrink-0 border border-gray-200">
        {customer?.avatar?.url ? (
          <img src={customer.avatar.url} alt="Profile" className="w-full h-full object-cover" />
        ) : (
          <svg className="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
          </svg>
        )}
      </div>

      {isGuest ? (
        <div className="flex gap-4 items-center">
          <Link href="/login" className="px-6 py-2 bg-blue-600 text-white font-medium rounded-full shadow-sm hover:bg-blue-700 transition-colors">
            Login
          </Link>
          <Link href="/register" className="px-6 py-2 bg-white text-gray-800 border border-gray-300 font-medium rounded-full shadow-sm hover:bg-gray-50 transition-colors">
            Register
          </Link>
        </div>
      ) : (
        <div className="text-left">
          <h2 className="text-xl font-bold text-gray-900">{customer?.firstName} {customer?.lastName}</h2>
          <p className="text-sm font-medium text-gray-700">@{customer?.username}</p>
          <p className="text-sm text-gray-500">{customer?.email}</p>
        </div>
      )}
    </div>
  );

  const SectionHeader = ({ title }: { title: string }) => (
    <h3 className="text-lg font-bold text-gray-900 px-4 py-3 bg-gray-50 border-b border-gray-200 mt-4 first:mt-0">
      {title}
    </h3>
  );

  const MenuItem = ({ icon, label, onClick, link }: { icon: any, label: string, onClick?: () => void, link?: string }) => {
    const content = (
      <div className="flex items-center justify-between px-4 py-4 bg-white border-b border-gray-100 hover:bg-gray-50 cursor-pointer" onClick={onClick}>
        <div className="flex items-center gap-3">
          <span className="text-gray-400">{icon}</span>
          <span className="text-gray-700 font-medium text-sm">{label}</span>
        </div>
        <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    );

    if (link) {
      return <Link href={link}>{content}</Link>;
    }
    return content;
  };

  // Icons
  const Icons = {
    Order: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>,
    Heart: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>,
    Star: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>,
    Map: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
    CreditCard: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>,
    User: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>,
    Bell: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>,
    Logout: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
  };

  // Main Render
  if (activeTab === 'profile') {
    return (
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden pb-8">
        <h1 className="text-[22px] font-bold text-[#2c3338] mb-4 capitalize tracking-tight px-6 pt-6">
          My Customer Dashboard
        </h1>
        {renderProfileHeader()}

        <SectionHeader title="My Shopping" />
        <MenuItem
          icon={Icons.Order}
          label="My Orders"
          onClick={() => isGuest ? router.push('/login') : setActiveTab('orders')}
        />
        <MenuItem
          icon={Icons.Heart}
          label="Wishlist"
          onClick={() => router.push('/wishlist')}
        />
        <MenuItem
          icon={Icons.Star}
          label="My Reviews"
          onClick={() => isGuest ? router.push('/login') : setActiveTab('reviews')}
        />

        <SectionHeader title="Account Settings" />
        <MenuItem
          icon={Icons.Map}
          label="Address Book"
          onClick={() => isGuest ? router.push('/login') : setActiveTab('addresses')}
        />
        <MenuItem
          icon={Icons.CreditCard}
          label="Payment Methods"
          onClick={() => isGuest ? router.push('/login') : setActiveTab('payment')}
        />
        <MenuItem
          icon={Icons.Bell}
          label="Notifications"
          onClick={() => { }}
        />
        <MenuItem
          icon={Icons.User}
          label="Edit Profile"
          onClick={() => isGuest ? router.push('/login') : setActiveTab('account')}
        />

        {!isGuest && (
          <div className="mt-6 px-4">
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors font-medium border border-red-100"
            >
              {Icons.Logout}
              Log Out
            </button>
          </div>
        )}
      </div>
    );
  }

  // ... Render other tabs (Orders, Addresses, etc) similar to before but with a "Back to Profile" button
  const BackToProfile = () => (
    <button
      onClick={() => setActiveTab('profile')}
      className="text-sm text-blue-600 hover:underline mb-4"
    >
      ← Back to Profile
    </button>
  );

  return (
    <div className="max-w-4xl mx-auto bg-white min-h-[500px] p-4 md:p-6">


      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          <BackToProfile />
          <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
          <p className="text-gray-600">
            Hello <span className="font-semibold text-gray-900">{customer?.firstName || customer?.username || 'User'}</span>,
            welcome to your account dashboard. From here you can view your <button onClick={() => setActiveTab('orders')} className="text-blue-600 hover:underline">recent orders</button>,
            manage your <button onClick={() => setActiveTab('addresses')} className="text-blue-600 hover:underline">shipping and billing addresses</button>,
            and <button onClick={() => setActiveTab('account')} className="text-blue-600 hover:underline">edit your password and account details</button>.
          </p>

          {/* Quick Stats or Recent Order */}
          {customer?.orders?.nodes && customer.orders.nodes[0] && (
            <div className="bg-blue-50 p-4 rounded-md border border-blue-100 mt-4">
              <h3 className="font-semibold text-blue-900 mb-2">Recent Order</h3>
              <div className="flex justify-between items-center text-sm">
                <span className="text-blue-800">#{customer.orders.nodes[0].orderNumber}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${customer.orders.nodes[0].status === 'COMPLETED' ? 'bg-green-100 text-green-800' : 'bg-white text-blue-800'
                  }`}>
                  {customer.orders.nodes[0].status?.toLowerCase()}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'orders' && (
        <div className="space-y-6">
          <BackToProfile />
          <h2 className="text-2xl font-bold text-gray-900">Order History</h2>
          {customer?.orders?.nodes && customer.orders.nodes.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase">Order</th>
                    <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                    <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                    <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase">Total</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {customer.orders.nodes.map((order: any) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm font-medium text-blue-600">#{order.orderNumber}</td>
                      <td className="py-3 px-4 text-sm text-gray-700">{new Date(order.date).toLocaleDateString()}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                                    ${order.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                            order.status === 'PROCESSING' ? 'bg-blue-100 text-blue-800' :
                              order.status === 'CANCELLED' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                          {(order.status || 'unknown').toLowerCase().replace('-', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm font-semibold text-gray-900">{order.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500">No orders found.</p>
          )}
        </div>
      )}

      {activeTab === 'addresses' && (
        <div className="space-y-6">
          <BackToProfile />
          <h2 className="text-2xl font-bold text-gray-900">Addresses</h2>
          <AddressManager customer={customer} />
        </div>
      )}

      {activeTab === 'account' && (
        <div className="space-y-6">
          <BackToProfile />
          <AccountDetailsForm customer={customer} />
        </div>
      )}

      {activeTab === 'reviews' && (
        <div className="space-y-4">
          <BackToProfile />
          <h2 className="text-2xl font-bold text-gray-900">My Reviews</h2>
          <p className="text-sm text-gray-600">Your reviews will appear here once available.</p>
        </div>
      )}

      {activeTab === 'payment' && (
        <div className="space-y-4">
          <BackToProfile />
          <h2 className="text-2xl font-bold text-gray-900">Payment Methods</h2>
          <p className="text-sm text-gray-600">Payment methods management is coming soon.</p>
        </div>
      )}

      {activeTab === 'notifications' && (
        <div className="space-y-4">
          <BackToProfile />
          <h2 className="text-2xl font-bold text-gray-900">Notifications</h2>
          <p className="text-sm text-gray-600">Notification preferences are coming soon.</p>
        </div>
      )}
    </div>
  );
};

interface IAccountDetails {
  firstName: string;
  lastName: string;
  email: string;
  password?: string;
  confirmPassword?: string;
}

const AccountDetailsForm = ({ customer }: { customer: any }) => {
  if (!customer) return <div className="p-4 text-center">Please log in to edit account details.</div>;

  const methods = useForm<IAccountDetails>({
    defaultValues: {
      firstName: customer.firstName || '',
      lastName: customer.lastName || '',
      email: customer.email || '',
      password: '',
      confirmPassword: ''
    }
  });
  const [updateCustomer, { loading }] = useMutation(UPDATE_CUSTOMER);

  const onSubmit = async (data: any) => {
    if (data.password && data.password !== data.confirmPassword) {
      alert("Passwords do not match!");
      return;
    }

    const inputData: any = {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email
    };

    if (data.password) {
      inputData.password = data.password;
    }

    try {
      await updateCustomer({
        variables: { input: inputData }
      });
      alert('Account details updated!');
      // Optional: clear password fields
      methods.setValue('password', '');
      methods.setValue('confirmPassword', '');
    } catch (e) {
      console.error(e);
      alert('Failed to update details.');
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Account Details</h2>
      <FormProvider {...methods}>
        <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-4 max-w-lg">
          <div className="grid grid-cols-2 gap-4">
            <InputField inputName="firstName" inputLabel="First Name" type="text" customValidation={{ required: true }} />
            <InputField inputName="lastName" inputLabel="Last Name" type="text" customValidation={{ required: true }} />
          </div>
          <InputField inputName="email" inputLabel="Email Address" type="email" customValidation={{ required: true }} />

          <div className="pt-2 border-t border-gray-100 mt-4">
            <h3 className="text-lg font-medium text-gray-900 mb-3">Password Change</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputField inputName="password" inputLabel="New Password (leave blank to keep)" type="password" />
              <InputField inputName="confirmPassword" inputLabel="Confirm New Password" type="password" />
            </div>
          </div>

          <div className="pt-4">
            <Button variant="primary" buttonDisabled={loading}>
              {loading ? <LoadingSpinner /> : 'Save Changes'}
            </Button>
          </div>
        </form>
      </FormProvider>
    </div>
  );
};

export default CustomerAccount;

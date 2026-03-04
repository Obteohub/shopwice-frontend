import Button from '../UI/Button.component';

export default function CustomerAccount() {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">My Account</h1>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-2">Account Dashboard</h2>
        <p className="text-gray-700 mb-4">
          User profile features are being migrated to our new REST API.
        </p>
        <p className="text-gray-600 text-sm">
          Features coming soon: Order history, account details, saved addresses, and more.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold mb-2">Orders</h3>
          <p className="text-sm text-gray-600">View your order history</p>
          <p className="text-xs text-gray-500 mt-2">Coming soon</p>
        </div>

        <div className="border rounded-lg p-4">
          <h3 className="font-semibold mb-2">Addresses</h3>
          <p className="text-sm text-gray-600">Manage shipping addresses</p>
          <p className="text-xs text-gray-500 mt-2">Coming soon</p>
        </div>

        <div className="border rounded-lg p-4">
          <h3 className="font-semibold mb-2">Account Details</h3>
          <p className="text-sm text-gray-600">Update your information</p>
          <p className="text-xs text-gray-500 mt-2">Coming soon</p>
        </div>

        <div className="border rounded-lg p-4">
          <h3 className="font-semibold mb-2">Password</h3>
          <p className="text-sm text-gray-600">Change your password</p>
          <p className="text-xs text-gray-500 mt-2">Coming soon</p>
        </div>
      </div>

      <div className="mt-6">
        <Button
          href="/"
          variant="primary"
          className="w-full md:w-auto"
        >
          Continue Shopping
        </Button>
      </div>
    </div>
  );
}

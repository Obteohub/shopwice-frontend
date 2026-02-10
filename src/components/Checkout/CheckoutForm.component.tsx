/*eslint complexity: ["error", 20]*/
// Imports
import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';

// Components
import Billing from './Billing.component';
import CheckoutOrderReview from './CheckoutOrderReview.component';
import LoadingSpinner from '../LoadingSpinner/LoadingSpinner.component';
import Button from '../UI/Button.component';

import { useCartStore } from '@/stores/cartStore';
import { useLocationStore } from '@/stores/locationStore';

// Utils
import {
  getFormattedCart,
  createCheckoutData,
  ICheckoutDataProps,
} from '@/utils/functions/functions';
import { getStoreApiHeaders } from '@/utils/wc-store-api/nonceManager';

export interface IBilling {
  firstName: string;
  lastName: string;
  address1: string;
  city: string;
  postcode: string;
  email: string;
  phone: string;
}

export interface IShipping {
  firstName: string;
  lastName: string;
  address1: string;
  city: string;
  postcode: string;
  email: string;
  phone: string;
}

export interface ICheckoutData {
  clientMutationId: string;
  billing: IBilling;
  shipping: IShipping;
  shipToDifferentAddress: boolean;
  paymentMethod: string;
  isPaid: boolean;
  transactionId: string;
}

const CheckoutForm = () => {
  const { cart: storeCart, clearWooCommerceSession, syncWithWooCommerce } = useCartStore();
  const [orderData, setOrderData] = useState<ICheckoutData | null>(null);
  const [requestError, setRequestError] = useState<any>(null);
  const [orderCompleted, setOrderCompleted] = useState<boolean>(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isUpdatingCustomer, setIsUpdatingCustomer] = useState<boolean>(false);
  const [isUpdatingShipping, setIsUpdatingShipping] = useState<boolean>(false);
  const [checkoutLoading, setCheckoutLoading] = useState<boolean>(false);

  const [availableGateways, setAvailableGateways] = useState<any[]>([]);
  const [cartData, setCartData] = useState<any>(null);

  // Checkout Steps: 1: Address, 2: Shipping, 3: Payment
  const [step, setStep] = useState<number>(1);
  const [selectedShippingRate, setSelectedShippingRate] = useState<string>('');

  const fetchCheckoutState = async () => {
    try {
      const headers = await getStoreApiHeaders();
      const response = await fetch('/api/wc-store/cart', {
        headers
      });
      const data = await response.json();
      if (response.ok) {
        setCartData(data);
        // Sync with store if it has the expected structure
        // If data follows Store API format, we might need a converter.
        // For now, let's keep it in local cartData for rendering.
      }
    } catch (error) {
      console.error('Error fetching checkout state:', error);
    }
  };

  const fetchGateways = async () => {
    try {
      const headers = await getStoreApiHeaders();
      const response = await fetch('/api/wc-store/checkout', {
        headers
      });
      const data = await response.json();
      if (response.ok) {
        // Store API returns payment methods/gateways in the checkout response
        setAvailableGateways(data.payment_methods || []);
        if (data.payment_methods?.length > 0 && !selectedPaymentMethod) {
          setSelectedPaymentMethod(data.payment_methods[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching payment gateways:', error);
    }
  };

  const getAuthHeaders = async () => {
    const headers = await getStoreApiHeaders();
    if (typeof window !== 'undefined') {
      const authData = JSON.parse(localStorage.getItem('auth-data') || 'null');
      if (authData?.authToken) {
        headers['Authorization'] = `Bearer ${authData.authToken}`;
      }
    }
    return headers;
  };

  useEffect(() => {
    fetchCheckoutState();
    fetchGateways();
  }, []);

  // Step 1 Handler: Address Submission
  const handleAddressSubmit = async (submitData: ICheckoutDataProps) => {
    setIsUpdatingCustomer(true);
    setRequestError(null);

    try {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/wc-store/cart/update-customer', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          shipping_address: {
            first_name: submitData.firstName,
            last_name: submitData.lastName,
            address_1: submitData.address1,
            address_2: submitData.address2,
            city: submitData.city,
            postcode: submitData.postcode || '00000',
            country: submitData.country || 'GH',
          },
          billing_address: {
            first_name: submitData.firstName,
            last_name: submitData.lastName,
            address_1: submitData.address1,
            address_2: submitData.address2,
            city: submitData.city,
            postcode: submitData.postcode || '00000',
            country: submitData.country || 'GH',
            email: submitData.email,
            phone: submitData.phone,
          }
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update address');
      }

      setCartData(data); // Middleware returns updated cart state
      setOrderData(submitData as any); // Save for final checkout
      setStep(2);
    } catch (error: any) {
      setRequestError(error);
    } finally {
      setIsUpdatingCustomer(false);
    }
  };

  // Step 2 Handler: Shipping Selection
  const handleShippingSubmit = async () => {
    if (!selectedShippingRate) return;

    setIsUpdatingShipping(true);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/wc-store/cart/select-shipping-rate', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          rate_id: selectedShippingRate
        })
      });

      const data = await response.json();
      setCartData(data);
      setStep(3);
    } catch (error: any) {
      setRequestError(error);
    } finally {
      setIsUpdatingShipping(false);
    }
  };

  // Step 3 Handler: Final Order Placement
  const handlePaymentSubmit = async () => {
    if (!selectedPaymentMethod) return;

    setCheckoutLoading(true);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/wc-store/checkout', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          payment_method: selectedPaymentMethod,
          billing_address: cartData.billing_address,
          shipping_address: cartData.shipping_address,
          // Add any extra data required by middleware
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Checkout failed');
      }

      if (data.redirect_url) {
        window.location.href = data.redirect_url;
        return;
      }

      clearWooCommerceSession();
      setOrderCompleted(true);
    } catch (error: any) {
      setRequestError(error);
    } finally {
      setCheckoutLoading(false);
    }
  };

  // Get Allowed Countries - Static for now or we could fetch from /api/checkout/fields
  const allowedCountries = [{ code: 'GH', name: 'Ghana' }];
  const defaultCountry = 'GH';


  const availableShippingMethods = cartData?.shipping_rates?.[0]?.shipping_rates?.map((rate: any) => ({
    id: rate.rate_id,
    label: rate.name,
    cost: (parseInt(rate.price) / 100).toFixed(2),
    company: rate.method_id
  })) || [];

  // Transform REST cart data for OrderReview component
  const transformedCart = cartData ? {
    contents: {
      nodes: cartData.items?.map((item: any) => ({
        key: item.key,
        product: {
          node: {
            name: item.name,
            image: { sourceUrl: item.images?.[0]?.src },
            stockStatus: 'IN_STOCK'
          }
        },
        variation: item.variation && item.variation.length > 0 ? {
          node: {
            name: item.name,
            image: { sourceUrl: item.images?.[0]?.src },
            attributes: {
              nodes: item.variation.map((v: any) => ({ name: v.attribute, value: v.value }))
            }
          }
        } : null,
        quantity: item.quantity?.value,
        subtotal: `₵${(parseInt(item.totals?.line_subtotal) / 100).toFixed(2)}`,
        total: `₵${(parseInt(item.totals?.line_total) / 100).toFixed(2)}`
      }))
    },
    subtotal: `₵${(parseInt(cartData.totals?.total_items) / 100).toFixed(2)}`,
    total: `₵${(parseInt(cartData.totals?.total_price) / 100).toFixed(2)}`,
    shippingTotal: `₵${(parseInt(cartData.totals?.total_shipping) / 100).toFixed(2)}`
  } : null;

  // Get Location from Store
  const { selectedLocation } = useLocationStore();

  return (
    <>
      {storeCart && !orderCompleted ? (
        <div className="w-full px-0 lg:px-2 py-1">
          {requestError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative mb-4 text-xs animate-shake">
              <strong className="font-bold">Error: </strong>
              <span className="block sm:inline">{requestError.message || "An unexpected error occurred. Please try again."}</span>
            </div>
          )}

          <div className="flex flex-col-reverse lg:flex-row gap-2">
            <div className="flex-grow lg:w-2/3">
              {/* Steps Indicator */}
              <div className="flex items-center justify-between mb-4 bg-white p-2 rounded border border-gray-100 shadow-sm">
                <div className={`flex items-center gap-2 ${step >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>1</span>
                  <span className="text-xs font-bold uppercase tracking-wider">Address</span>
                </div>
                <div className="h-px bg-gray-200 flex-grow mx-4"></div>
                <div className={`flex items-center gap-2 ${step >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>2</span>
                  <span className="text-xs font-bold uppercase tracking-wider">Shipping</span>
                </div>
                <div className="h-px bg-gray-200 flex-grow mx-4"></div>
                <div className={`flex items-center gap-2 ${step >= 3 ? 'text-blue-600' : 'text-gray-400'}`}>
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>3</span>
                  <span className="text-xs font-bold uppercase tracking-wider">Payment</span>
                </div>
              </div>

              {/* Step 1: Address */}
              {step === 1 && (
                <div className="bg-white rounded border border-gray-200 p-2 animate-fade-in text-[#2c3338]">
                  <h3 className="text-sm font-bold text-[#2c3338] mb-2 uppercase tracking-wide">Billing & Shipping</h3>
                  <Billing
                    handleFormSubmit={handleAddressSubmit}
                    isLoading={isUpdatingCustomer}
                    buttonLabel="Next: Shipping"
                    initialCity={selectedLocation?.name}
                  />
                </div>
              )}

              {/* Step 2: Shipping Method */}
              {step === 2 && (
                <div className="bg-white rounded border border-gray-200 p-2 animate-fade-in">
                  <h3 className="text-sm font-bold text-[#2c3338] mb-2 uppercase tracking-wide">Shipping Method</h3>

                  {availableShippingMethods.length === 0 ? (
                    <div className="p-2 bg-yellow-50 text-yellow-800 rounded border border-yellow-200 mb-2 text-xs">
                      No shipping methods available. Check address.
                    </div>
                  ) : (
                    <div className="grid gap-1 mb-3">
                      {availableShippingMethods.map((rate: any) => (
                        <label
                          key={rate.id}
                          className={`
                                                relative flex items-center p-2 border rounded cursor-pointer transition-all duration-200
                                                ${selectedShippingRate === rate.id
                              ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                              : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'}
                                            `}
                        >
                          <input
                            type="radio"
                            name="shipping_method"
                            value={rate.id}
                            onChange={(e) => setSelectedShippingRate(e.target.value)}
                            className="w-3 h-3 text-blue-600 border-gray-300 focus:ring-blue-500"
                          />
                          <div className="ml-2 flex-grow">
                            <span className="block font-medium text-gray-900 text-xs">{rate.label}</span>
                            {rate.company && <span className="block text-[10px] text-gray-500">{rate.company}</span>}
                          </div>
                          <div className="font-bold text-gray-900 text-xs">
                            {rate.cost ? `₵${rate.cost}` : 'Free'}
                          </div>
                        </label>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <button
                      onClick={() => setStep(1)}
                      className="text-gray-500 hover:text-gray-900 text-xs font-medium flex items-center gap-1 transition-colors"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                      Back
                    </button>
                    <Button
                      className="px-4 py-1 text-xs"
                      handleButtonClick={handleShippingSubmit}
                      buttonDisabled={!selectedShippingRate || isUpdatingShipping}
                    >
                      {isUpdatingShipping ? <LoadingSpinner color="white" size="sm" /> : 'Next'}
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 3: Payment */}
              {step === 3 && (
                <div className="bg-white rounded border border-gray-200 p-2 animate-fade-in">
                  <h3 className="text-sm font-bold text-[#2c3338] mb-2 uppercase tracking-wide">Payment</h3>

                  <div className="space-y-2 mb-3">
                    {availableGateways.length === 0 ? (
                      <label className="p-2 border border-blue-500 bg-blue-50 rounded flex items-start gap-2 ring-1 ring-blue-500 cursor-default">
                        <div className="flex-shrink-0 mt-0.5">
                          <input type="radio" checked readOnly className="w-3 h-3 text-blue-600" aria-label="Cash on Delivery" />
                        </div>
                        <div>
                          <span className="block font-bold text-gray-900 text-xs">Cash on Delivery</span>
                          <p className="mt-0.5 text-[10px] text-gray-600">Pay safely with cash when your order is delivered.</p>
                        </div>
                      </label>
                    ) : (
                      availableGateways.map((gateway: any) => (
                        <label
                          key={gateway.id}
                          className={`
                                    relative flex items-start p-2 border rounded cursor-pointer transition-all duration-200 gap-2
                                    ${selectedPaymentMethod === gateway.id
                              ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                              : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'}
                                `}
                        >
                          <div className="flex-shrink-0 mt-0.5">
                            <input
                              type="radio"
                              name="payment_method"
                              value={gateway.id}
                              checked={selectedPaymentMethod === gateway.id}
                              onChange={() => setSelectedPaymentMethod(gateway.id)}
                              className="w-3 h-3 text-blue-600 border-gray-300 focus:ring-blue-500"
                            />
                          </div>
                          <div className="flex-grow">
                            <span className="block font-bold text-gray-900 text-xs">{gateway.title}</span>
                            <p className="mt-0.5 text-[10px] text-gray-600">{gateway.description}</p>
                          </div>
                          {gateway.icon && (
                            <img src={gateway.icon} alt={gateway.title} className="h-4 object-contain" />
                          )}
                        </label>
                      ))
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <button
                      onClick={() => setStep(2)}
                      className="text-gray-500 hover:text-gray-900 text-xs font-medium flex items-center gap-1 transition-colors"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                      Back
                    </button>
                    <Button
                      className="bg-green-600 hover:bg-green-700 w-full sm:w-auto px-6 py-2 text-sm font-bold"
                      handleButtonClick={handlePaymentSubmit}
                      buttonDisabled={checkoutLoading}
                    >
                      {checkoutLoading ? <LoadingSpinner color="white" size="sm" /> : 'Place Order'}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Summary (Sticky) */}
            <div className="lg:w-1/3">
              <div className="sticky top-16">
                <CheckoutOrderReview cart={transformedCart} />

                {/* Trust Badges - Ultra Compact */}
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <div className="bg-gray-50 p-1.5 rounded text-center border border-gray-100">
                    <div className="text-sm mb-0">🛡️</div>
                    <div className="text-[9px] font-bold text-gray-700 uppercase tracking-wide">Secure</div>
                  </div>
                  <div className="bg-gray-50 p-1.5 rounded text-center border border-gray-100">
                    <div className="text-sm mb-0">🚚</div>
                    <div className="text-[9px] font-bold text-gray-700 uppercase tracking-wide">Fast</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      ) : (
        <>
          {!storeCart && !orderCompleted && (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                <svg className="w-12 h-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Your cart is empty</h1>
              <p className="text-gray-500 mb-8">Looks like you haven't added any products to your cart yet.</p>
              <Button href="/" className="bg-blue-600">Start Shopping</Button>
            </div>
          )}
          {orderCompleted && (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 animate-fade-in">
              <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
                <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Order Recieved!</h1>
              <p className="text-lg text-gray-600 mb-8">Thank you for your purchase. We've emailed you the receipt.</p>
              <div className="flex gap-4">
                <Button href="/my-account" variant="secondary">View Order</Button>
                <Button href="/" variant="primary">Continue Shopping</Button>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
};

export default CheckoutForm;

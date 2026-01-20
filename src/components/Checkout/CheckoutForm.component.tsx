/*eslint complexity: ["error", 20]*/
// Imports
import { useState, useEffect } from 'react';
import { useQuery, useMutation, ApolloError } from '@apollo/client';
import { v4 as uuidv4 } from 'uuid';

// Components
import Billing from './Billing.component';
import CheckoutOrderReview from './CheckoutOrderReview.component';
import LoadingSpinner from '../LoadingSpinner/LoadingSpinner.component';
import Button from '../UI/Button.component';

// GraphQL
import { GET_CART, GET_PAYMENT_GATEWAYS, GET_ALLOWED_COUNTRIES } from '@/utils/gql/GQL_QUERIES';
import { CHECKOUT_MUTATION, UPDATE_CUSTOMER, UPDATE_SHIPPING_METHOD } from '@/utils/gql/GQL_MUTATIONS';
import { useCartStore } from '@/stores/cartStore';

// Utils
import {
  getFormattedCart,
  createCheckoutData,
  ICheckoutDataProps,
} from '@/utils/functions/functions';

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
  const { cart, clearWooCommerceSession, syncWithWooCommerce } = useCartStore();
  const [orderData, setOrderData] = useState<ICheckoutData | null>(null);
  const [requestError, setRequestError] = useState<ApolloError | null>(null);
  const [orderCompleted, setOrderCompleted] = useState<boolean>(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('');

  // Get Payment Gateways
  const { data: gatewaysData } = useQuery(GET_PAYMENT_GATEWAYS);
  const availableGateways = gatewaysData?.paymentGateways?.nodes || [];

  // Set default payment method
  useEffect(() => {
    if (availableGateways.length > 0 && !selectedPaymentMethod) {
      // Filter out disabled ones if API doesn't already, but typically nodes are enabled ones
      setSelectedPaymentMethod(availableGateways[0].id);
    }
  }, [availableGateways, selectedPaymentMethod]);

  // Checkout Steps: 1: Address, 2: Shipping, 3: Payment
  const [step, setStep] = useState<number>(1);
  const [selectedShippingRate, setSelectedShippingRate] = useState<string>('');

  // Get cart data query
  const { data, refetch } = useQuery(GET_CART, {
    notifyOnNetworkStatusChange: true,
  });

  useEffect(() => {
    if (data) {
      const updatedCart = getFormattedCart(data);
      // Only update if we actually got a cart back. 
      // Do NOT clear session here, as it cleans itself up elsewhere or persists.
      // Clearing it causes reload issues.
      if (updatedCart) {
        syncWithWooCommerce(updatedCart);
      }
    }
  }, [data, syncWithWooCommerce]);

  // Mutations
  const [updateCustomer, { loading: isUpdatingCustomer, data: updateCustomerData }] = useMutation(UPDATE_CUSTOMER, {
    onError: (error) => {
      setRequestError(error);
    }
  });

  useEffect(() => {
    if (updateCustomerData) {
      refetch();
      setStep(2);
    }
  }, [updateCustomerData, refetch]);

  const [updateShippingMethod, { loading: isUpdatingShipping }] = useMutation(UPDATE_SHIPPING_METHOD, {
    onCompleted: () => {
      refetch();
      setStep(3);
    },
    onError: (error) => {
      setRequestError(error);
    }
  });

  const [checkout, { loading: checkoutLoading, error: checkoutError, data: checkoutData }] = useMutation(CHECKOUT_MUTATION);

  useEffect(() => {
    if (checkoutData) {
      // Order success
      // router.push('/order-received'); 
      // Logic handled in component or redirect
      const result = checkoutData?.checkout;
      if (result?.redirect) {
        window.location.href = result.redirect;
        return; // Stop further execution if redirecting
      }
      clearWooCommerceSession();
      setOrderCompleted(true);
      refetch();
    }
  }, [checkoutData, clearWooCommerceSession, refetch]);

  useEffect(() => {
    if (checkoutError) {
      setRequestError(checkoutError); // Pass the full ApolloError object
    }
  }, [checkoutError]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  // Get Allowed Countries
  const { data: countriesData } = useQuery(GET_ALLOWED_COUNTRIES);
  const allowedCountries = countriesData?.wooCommerce?.countries || [];
  const defaultCountry = allowedCountries.length > 0 ? allowedCountries[0].code : 'GH';

  // Step 1 Handler: Address Submission
  const handleAddressSubmit = (submitData: ICheckoutDataProps) => {
    const checkOutData = createCheckoutData(submitData);
    setOrderData(checkOutData);
    setRequestError(null);

    // Update Customer in WooCommerce to trigger shipping calculation
    updateCustomer({
      variables: {
        input: {
          clientMutationId: uuidv4(),
          shipping: {
            firstName: submitData.firstName,
            lastName: submitData.lastName,
            address1: submitData.address1,
            address2: submitData.address2,
            city: submitData.city,
            postcode: submitData.postcode || '00000',
            country: submitData.country || defaultCountry,
          },
          billing: {
            firstName: submitData.firstName,
            lastName: submitData.lastName,
            address1: submitData.address1,
            address2: submitData.address2,
            city: submitData.city,
            postcode: submitData.postcode || '00000',
            country: submitData.country || defaultCountry,
            email: submitData.email,
            phone: submitData.phone,
          }
        }
      }
    });
  };

  // Step 2 Handler: Shipping Selection
  const handleShippingSubmit = () => {
    if (!selectedShippingRate) {
      // Show error or alert?
      return;
    }
    updateShippingMethod({
      variables: {
        input: {
          clientMutationId: uuidv4(),
          shippingMethods: [selectedShippingRate]
        }
      }
    });
  };

  // Step 3 Handler: Final Order Placement
  const handlePaymentSubmit = () => {
    // Ensure we have orderData
    if (orderData && selectedPaymentMethod) {
      const finalOrderData = {
        ...orderData,
        paymentMethod: selectedPaymentMethod,
      };
      checkout({
        variables: {
          input: finalOrderData
        }
      });
    }
  };

  const availableShippingMethods = data?.cart?.availableShippingMethods?.[0]?.rates || [];

  return (
    <>
      {cart && !orderCompleted ? (
        <div className="w-full px-0 lg:px-2 py-1">
          <div className="flex flex-col-reverse lg:flex-row gap-2">
            {/* Left Column: Flow */}
            <div className="flex-grow lg:w-2/3">
              {/* Steps Indicator - Ultra Compact */}
              <div className="flex items-center justify-between mb-2">
                {['Address', 'Shipping', 'Payment'].map((label, index) => {
                  const stepNum = index + 1;
                  const isActive = step >= stepNum;
                  const isCurrent = step === stepNum;
                  return (
                    <div key={stepNum} className="flex items-center">
                      <div className={`
                                        flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold mr-1
                                        ${isCurrent ? 'bg-blue-600 text-white' : isActive ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'}
                                    `}>
                        {isActive && !isCurrent ? (
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : stepNum}
                      </div>
                      <span className={`text-xs font-medium ${isCurrent ? 'text-gray-900' : 'text-gray-500'}`}>
                        {label}
                      </span>
                      {index < 2 && <div className="mx-1 h-[1px] w-4 bg-gray-200 hidden sm:block"></div>}
                    </div>
                  );
                })}
              </div>

              {/* Error display */}
              {requestError && (
                <div className="mb-2 p-2 bg-red-50 border border-red-200 text-red-600 rounded-sm text-xs">
                  <span className="font-bold mr-1">Error:</span>
                  <span>{requestError.message}</span>
                </div>
              )}

              {/* Step 1: Address */}
              {step === 1 && (
                <div className="bg-white rounded border border-gray-200 p-2 animate-fade-in text-[#2c3338]">
                  <h3 className="text-sm font-bold text-[#2c3338] mb-2 uppercase tracking-wide">Billing & Shipping</h3>
                  <Billing
                    handleFormSubmit={handleAddressSubmit}
                    isLoading={isUpdatingCustomer}
                    buttonLabel="Next: Shipping"
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
                      {isUpdatingShipping ? '...' : 'Next'}
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
                      <div className="p-2 border border-blue-500 bg-blue-50 rounded flex items-start gap-2 ring-1 ring-blue-500">
                        <div className="flex-shrink-0 mt-0.5">
                          <input type="radio" checked readOnly className="w-3 h-3 text-blue-600" />
                        </div>
                        <div>
                          <span className="block font-bold text-gray-900 text-xs">Cash on Delivery</span>
                          <p className="mt-0.5 text-[10px] text-gray-600">Pay safely with cash when your order is delivered.</p>
                        </div>
                      </div>
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
                      {checkoutLoading ? 'Processing...' : 'Place Order'}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Summary (Sticky) */}
            <div className="lg:w-1/3">
              <div className="sticky top-16">
                <CheckoutOrderReview cart={data?.cart} />

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
          {!cart && !orderCompleted && (
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

/*eslint complexity: ["error", 20]*/
// Imports
import { useState, useEffect, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useQuery, useMutation } from '@apollo/client';

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
import { GET_CART, GET_PAYMENT_GATEWAYS } from '@/utils/gql/GQL_QUERIES';
import { UPDATE_CUSTOMER, UPDATE_SHIPPING_METHOD, CHECKOUT_MUTATION } from '@/utils/gql/GQL_MUTATIONS';

const StepIndicator = ({ step }: { step: number }) => (
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
);

const ShippingMethodStep = ({
  availableShippingMethods,
  selectedShippingRate,
  onSelectShippingRate,
  onBack,
  onNext,
  isUpdating,
}: {
  availableShippingMethods: Array<{ id: string; label: string; cost?: string; company?: string }>;
  selectedShippingRate: string;
  onSelectShippingRate: (value: string) => void;
  onBack: () => void;
  onNext: () => void;
  isUpdating: boolean;
}) => (
  <div className="bg-white rounded border border-gray-200 p-2 animate-fade-in">
    <h3 className="text-sm font-bold text-[#2c3338] mb-2 uppercase tracking-wide">Shipping Method</h3>
    {availableShippingMethods.length === 0 ? (
      <div className="p-2 bg-yellow-50 text-yellow-800 rounded border border-yellow-200 mb-2 text-xs">
        No shipping methods available. Check address.
      </div>
    ) : (
      <div className="grid gap-1 mb-3">
        {availableShippingMethods.map((rate) => (
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
              onChange={(e) => onSelectShippingRate(e.target.value)}
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
        onClick={onBack}
        className="text-gray-500 hover:text-gray-900 text-xs font-medium flex items-center gap-1 transition-colors"
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        Back
      </button>
      <Button
        className="px-4 py-1 text-xs"
        handleButtonClick={onNext}
        buttonDisabled={!selectedShippingRate || isUpdating}
      >
        {isUpdating ? <LoadingSpinner color="white" size="sm" /> : 'Next'}
      </Button>
    </div>
  </div>
);

const PaymentStep = ({
  availableGateways,
  selectedPaymentMethod,
  onSelectPaymentMethod,
  onBack,
  onSubmit,
  isLoading,
}: {
  availableGateways: any[];
  selectedPaymentMethod: string;
  onSelectPaymentMethod: (id: string) => void;
  onBack: () => void;
  onSubmit: () => void;
  isLoading: boolean;
}) => (
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
                onChange={() => onSelectPaymentMethod(gateway.id)}
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
        onClick={onBack}
        className="text-gray-500 hover:text-gray-900 text-xs font-medium flex items-center gap-1 transition-colors"
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        Back
      </button>
      <Button
        className="bg-green-600 hover:bg-green-700 w-full sm:w-auto px-6 py-2 text-sm font-bold"
        handleButtonClick={onSubmit}
        buttonDisabled={isLoading}
      >
        {isLoading ? <LoadingSpinner color="white" size="sm" /> : 'Place Order'}
      </Button>
    </div>
  </div>
);

const EmptyCartState = () => (
  <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4">
    <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
      <svg className="w-12 h-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
      </svg>
    </div>
    <h1 className="text-2xl font-bold text-gray-900 mb-2">Your cart is empty</h1>
    <p className="text-gray-500 mb-8">Looks like you haven&apos;t added any products to your cart yet.</p>
    <Button href="/" className="bg-blue-600">Start Shopping</Button>
  </div>
);

const OrderCompleteState = () => (
  <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 animate-fade-in">
    <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
      <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    </div>
    <h1 className="text-3xl font-bold text-gray-900 mb-2">Order Recieved!</h1>
    <p className="text-lg text-gray-600 mb-8">Thank you for your purchase. We&apos;ve emailed you the receipt.</p>
    <div className="flex gap-4">
      <Button href="/my-account" variant="secondary">View Order</Button>
      <Button href="/" variant="primary">Continue Shopping</Button>
    </div>
  </div>
);

const CheckoutForm = () => {
  const { cart: storeCart, clearWooCommerceSession, syncWithWooCommerce } = useCartStore();
  const [orderData, setOrderData] = useState<ICheckoutDataProps | null>(null);
  const [requestError, setRequestError] = useState<any>(null);
  const [orderCompleted, setOrderCompleted] = useState<boolean>(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('');
  const [isUpdatingCustomer, setIsUpdatingCustomer] = useState<boolean>(false);
  const [isUpdatingShipping, setIsUpdatingShipping] = useState<boolean>(false);
  const [checkoutLoading, setCheckoutLoading] = useState<boolean>(false);

  const [availableGateways, setAvailableGateways] = useState<any[]>([]);
  const [cartData, setCartData] = useState<any>(null);

  // Checkout Steps: 1: Address, 2: Shipping, 3: Payment
  const [step, setStep] = useState<number>(1);
  const [selectedShippingRate, setSelectedShippingRate] = useState<string>('');

  const { data: cartQueryData, refetch: refetchCart } = useQuery(GET_CART, {
    fetchPolicy: 'network-only',
    onCompleted: (data) => {
      if (data?.cart) {
        setCartData(data.cart);
        const formattedCart = getFormattedCart({ cart: data.cart });
        syncWithWooCommerce(formattedCart);
      } else {
        setCartData(null);
      }
    },
    onError: (error) => {
      setRequestError(error);
    }
  });

  useQuery(GET_PAYMENT_GATEWAYS, {
    fetchPolicy: 'network-only',
    onCompleted: (data) => {
      const gateways = data?.paymentGateways?.nodes || [];
      setAvailableGateways(gateways);
      if (!selectedPaymentMethod && gateways.length > 0) {
        setSelectedPaymentMethod(gateways[0].id);
      }
    },
    onError: (error) => {
      setRequestError(error);
    }
  });

  useEffect(() => {
    if (cartQueryData?.cart) {
      setCartData(cartQueryData.cart);
      const formattedCart = getFormattedCart({ cart: cartQueryData.cart });
      syncWithWooCommerce(formattedCart);
    }
  }, [cartQueryData, syncWithWooCommerce]);

  const [updateCustomer] = useMutation(UPDATE_CUSTOMER, {
    onCompleted: (data) => {
      if (data?.updateCustomer?.customer?.id) {
        refetchCart();
      }
    },
    onError: (error) => {
      setRequestError(error);
    }
  });

  const [updateShippingMethod] = useMutation(UPDATE_SHIPPING_METHOD, {
    onCompleted: () => {
      refetchCart();
    },
    onError: (error) => {
      setRequestError(error);
    }
  });

  const [checkoutOrder] = useMutation(CHECKOUT_MUTATION, {
    onCompleted: (data) => {
      if (data?.checkout?.redirect) {
        window.location.href = data.checkout.redirect;
        return;
      }
      clearWooCommerceSession();
      setOrderCompleted(true);
    },
    onError: (error) => {
      setRequestError(error);
    }
  });

  // Step 1 Handler: Address Submission
  const handleAddressSubmit = async (submitData: ICheckoutDataProps) => {
    setIsUpdatingCustomer(true);
    setRequestError(null);

    try {
      await updateCustomer({
        variables: {
          input: {
            clientMutationId: uuidv4(),
            billing: {
              firstName: submitData.firstName,
              lastName: submitData.lastName,
              address1: submitData.address1,
              address2: submitData.address2,
              city: submitData.city,
              country: submitData.country || 'GH',
              state: submitData.state,
              postcode: submitData.postcode || '00000',
              email: submitData.email,
              phone: submitData.phone,
              company: submitData.company
            },
            shipping: {
              firstName: submitData.firstName,
              lastName: submitData.lastName,
              address1: submitData.address1,
              address2: submitData.address2,
              city: submitData.city,
              country: submitData.country || 'GH',
              state: submitData.state,
              postcode: submitData.postcode || '00000',
              email: submitData.email,
              phone: submitData.phone,
              company: submitData.company
            }
          }
        }
      });

      setOrderData(submitData);
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
      await updateShippingMethod({
        variables: {
          input: {
            clientMutationId: uuidv4(),
            shippingMethods: [selectedShippingRate]
          }
        }
      });
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
    if (!orderData) return;

    setCheckoutLoading(true);
    try {
      const checkoutInput = createCheckoutData({
        ...orderData,
        paymentMethod: selectedPaymentMethod
      });

      await checkoutOrder({
        variables: {
          input: checkoutInput
        }
      });
    } catch (error: any) {
      setRequestError(error);
    } finally {
      setCheckoutLoading(false);
    }
  };

  const availableShippingMethods = useMemo(() => {
    return cartData?.availableShippingMethods?.flatMap((method: any) =>
      method.rates?.map((rate: any) => ({
        id: rate.id,
        label: rate.label,
        cost: rate.cost,
        company: rate.methodId
      })) || []
    ) || [];
  }, [cartData?.availableShippingMethods]);

  useEffect(() => {
    if (!selectedShippingRate && availableShippingMethods.length > 0) {
      setSelectedShippingRate(availableShippingMethods[0].id);
    }
  }, [availableShippingMethods, selectedShippingRate]);

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
              <StepIndicator step={step} />
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
              {step === 2 && (
                <ShippingMethodStep
                  availableShippingMethods={availableShippingMethods}
                  selectedShippingRate={selectedShippingRate}
                  onSelectShippingRate={setSelectedShippingRate}
                  onBack={() => setStep(1)}
                  onNext={handleShippingSubmit}
                  isUpdating={isUpdatingShipping}
                />
              )}
              {step === 3 && (
                <PaymentStep
                  availableGateways={availableGateways}
                  selectedPaymentMethod={selectedPaymentMethod}
                  onSelectPaymentMethod={setSelectedPaymentMethod}
                  onBack={() => setStep(2)}
                  onSubmit={handlePaymentSubmit}
                  isLoading={checkoutLoading}
                />
              )}
            </div>
            <div className="lg:w-1/3">
              <div className="sticky top-16">
                <CheckoutOrderReview cart={cartData} />
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
          {!storeCart && !orderCompleted && <EmptyCartState />}
          {orderCompleted && <OrderCompleteState />}
        </>
      )}
    </>
  );
};

export default CheckoutForm;

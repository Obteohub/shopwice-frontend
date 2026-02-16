
import React, { useState } from 'react';

const PaymentInfo = () => {
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

    return (
        <>
            {/* Payment Information */}
            <div>
                <div className="flex items-center gap-1">
                    <div className="text-xs text-gray-600 leading-relaxed">
                        Payment: Pay On Delivery.
                    </div>
                    <button
                        onClick={() => setIsPaymentModalOpen(true)}
                        className="text-gray-600 text-xs font-semibold hover:underline focus:outline-none flex-shrink-0"
                        aria-label="Learn more about payment"
                    >
                        Learn more
                    </button>
                </div>
            </div>

            {/* Payment Information Modal */}
            {isPaymentModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setIsPaymentModalOpen(false)}>
                    <div className="bg-white rounded-2xl max-w-md w-full max-h-[80vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-2xl">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-bold text-gray-900">Payment Information</h3>
                                <button
                                    onClick={() => setIsPaymentModalOpen(false)}
                                    className="text-gray-400 hover:text-gray-600 transition-colors"
                                    aria-label="Close modal"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        <div className="px-6 py-5 space-y-4">
                            <div>
                                <h4 className="font-semibold text-gray-900 mb-3">Available Payment Methods</h4>
                                <div className="space-y-3">
                                    <div className="flex items-start gap-3">
                                        <div className="text-2xl">💵</div>
                                        <div>
                                            <p className="font-medium text-sm text-gray-900">Cash on Delivery</p>
                                            <p className="text-xs text-gray-600">Pay with cash when your order arrives</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <div className="text-2xl">💳</div>
                                        <div>
                                            <p className="font-medium text-sm text-gray-900">Mobile Money</p>
                                            <p className="text-xs text-gray-600">Pay on delivery via MTN, Vodafone, or AirtelTigo</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <div className="text-2xl">📱</div>
                                        <div>
                                            <p className="font-medium text-sm text-gray-900">Card and MOMO Online Payment</p>
                                            <p className="text-xs text-gray-600">Pay with debit/credit card and MOMO online before delivery</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-green-50 border border-green-100 rounded-lg p-4">
                                <p className="text-xs text-green-900">
                                    <strong>Secure Payment:</strong> All payment methods are safe and secure. You only pay when you receive your order.
                                </p>
                            </div>

                            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                                <p className="text-xs text-blue-900 leading-relaxed">
                                    <strong>Please Be Ready:</strong> Ensure you are available and your payment is prepared before the rider arrives. Keeping the dispatch rider waiting causes delays for other customers&apos; orders. Help us serve everyone efficiently by being ready to receive your package immediately.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default PaymentInfo;

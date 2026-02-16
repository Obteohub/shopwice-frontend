
import React from 'react';
import Link from 'next/link';
import Button from '@/components/UI/Button.component';

interface CartSummaryProps {
    subtotal: string;
    total: string;
    totalProductsCount: number;
}

const CartSummary: React.FC<CartSummaryProps> = ({ subtotal, total, totalProductsCount }) => {
    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sticky top-24">
            <h2 className="text-lg font-bold text-gray-900 mb-4 pb-4 border-b border-gray-100">Order Summary</h2>

            <div className="space-y-3 mb-6">
                <div className="flex justify-between items-center text-gray-600">
                    <span>Subtotal ({totalProductsCount} items)</span>
                    <span className="font-medium text-gray-900">{subtotal}</span>
                </div>

                <div className="flex justify-between items-center text-gray-600">
                    <span>Shipping</span>
                    <span className="text-sm text-green-600">Calculated at checkout</span>
                </div>

                <div className="flex justify-between items-center text-lg font-bold text-gray-900 border-t border-gray-100 pt-4 mt-4">
                    <span>Total</span>
                    <span>{total}</span>
                </div>
            </div>

            <Link href="/checkout" className="block w-full">
                <Button className="w-full py-4 text-base font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all rounded-lg">
                    Proceed to Checkout
                </Button>
            </Link>

            <div className="mt-6 text-xs text-center text-gray-500 flex flex-col gap-2">
                <p>Secure Checkout - 256-bit SSL Encryption</p>
                <div className="flex justify-center gap-2 opacity-50 grayscale">
                    {/* Payment icons could go here */}
                </div>
            </div>
        </div>
    );
};

export default CartSummary;

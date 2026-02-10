import React from 'react';
import CheckoutCartItem from './CheckoutCartItem.component';
import { IProductRootObject } from '@/utils/functions/functions';

interface ICheckoutOrderReviewProps {
    cart: any;
}

const CheckoutOrderReview = ({ cart }: ICheckoutOrderReviewProps) => {

    if (!cart?.contents?.nodes) return null;

    const cartItems = cart.contents.nodes;
    const cartSubtotal = cart.subtotal || cart.total;
    const cartTotal = cart.total;
    const shippingTotal = cart.shippingTotal;

    return (
        <div className="bg-white rounded-md shadow-sm border border-gray-200 p-3 mb-2">
            <h2 className="text-base font-bold text-gray-900 mb-2 pb-1 border-b border-gray-100">Your Order</h2>

            <div className="mb-2 max-h-96 overflow-y-auto pr-1 custom-scrollbar">
                {cartItems.map((item: IProductRootObject) => (
                    <CheckoutCartItem key={item.key} item={item} />
                ))}
            </div>

            <div className="space-y-1 pt-2 border-t border-gray-100 text-sm">
                <div className="flex justify-between text-gray-600">
                    <span>Subtotal</span>
                    <span className="font-medium text-gray-900">{cartSubtotal || '₵0.00'}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                    <span>Shipping</span>
                    {shippingTotal && shippingTotal !== '₵0.00' && shippingTotal !== '₵0' ? (
                        <span className="font-medium text-gray-900">{shippingTotal}</span>
                    ) : (
                        <span className="text-xs text-gray-500">Address needed</span>
                    )}
                </div>
                <div className="flex justify-between items-center text-base font-bold text-gray-900 pt-2 border-t border-gray-100 mt-2">
                    <span>Total</span>
                    <span>{cartTotal || '₵0.00'}</span>
                </div>
            </div>
        </div>
    );
};

export default CheckoutOrderReview;

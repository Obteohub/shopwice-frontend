
import React from 'react';
import Link from 'next/link';

const EmptyCart: React.FC = () => {
    return (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-lg border border-gray-100 shadow-sm min-h-[400px]">
            <div className="w-24 h-24 mb-6 text-gray-200">
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1}
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                    />
                </svg>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-2">Your Cart is Empty</h2>
            <p className="text-gray-500 mb-8 max-w-sm text-center">
                It looks like you haven&apos;t added any items to your cart yet.
            </p>

            <Link
                href="/products"
                className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-full hover:bg-blue-700 transition shadow-md hover:shadow-lg"
            >
                Start Shopping
            </Link>
        </div>
    );
};

export default EmptyCart;

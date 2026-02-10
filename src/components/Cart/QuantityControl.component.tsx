
import React from 'react';

interface QuantityControlProps {
    quantity: number;
    onDecrease: () => void;
    onIncrease: () => void;
    loading?: boolean;
}

const QuantityControl: React.FC<QuantityControlProps> = ({
    quantity,
    onDecrease,
    onIncrease,
    loading = false,
}) => {
    return (
        <div className="flex items-center border border-gray-300 rounded-md bg-white">
            <button
                onClick={onDecrease}
                disabled={quantity <= 1 || loading}
                className="px-3 py-1 text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium border-r border-gray-300"
                aria-label="Decrease quantity"
            >
                &minus;
            </button>
            <div className="w-12 text-center text-sm font-medium text-gray-900">
                {quantity}
            </div>
            <button
                onClick={onIncrease}
                disabled={loading}
                className="px-3 py-1 text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium border-l border-gray-300"
                aria-label="Increase quantity"
            >
                &#43;
            </button>
        </div>
    );
};

export default QuantityControl;

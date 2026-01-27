import { Fragment } from 'react';

interface ComparePriceModalProps {
    isOpen: boolean;
    onClose: () => void;
    newPrice: string;
    refurbPrice: string;
    productName: string;
    savings: string;
}

const ComparePriceModal = ({ isOpen, onClose, newPrice, refurbPrice, productName, savings }: ComparePriceModalProps) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div
                className="fixed inset-0"
                onClick={onClose}
            ></div>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative animate-in zoom-in-95 duration-200 z-10 font-sans">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                <div className="p-6">
                    <div className="text-center mb-6">
                        <h3 className="text-xl font-bold text-gray-900">Why Pay More?</h3>
                        <p className="text-sm text-gray-600 mt-1 px-4">
                            Save <span className="font-bold text-green-600">GH₵{savings}</span> on {productName}
                        </p>
                    </div>

                    <div className="border rounded-xl overflow-hidden border-gray-200 mb-6">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                    <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-1/3">Feature</th>
                                    <th className="py-3 px-4 text-left text-xs font-bold text-gray-900 w-1/3">Brand New</th>
                                    <th className="py-3 px-4 text-left text-xs font-bold text-gray-900 bg-green-50 w-1/3">Refurbished</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                <tr>
                                    <td className="py-3 px-4 text-gray-600 font-medium">Condition</td>
                                    <td className="py-3 px-4 text-left text-gray-900 text-xs">Sealed in Box</td>
                                    <td className="py-3 px-4 text-left text-gray-900 bg-green-50/30 text-xs">Fresh in Box </td>
                                </tr>
                                <tr>
                                    <td className="py-3 px-4 text-gray-600 font-medium">Performance</td>
                                    <td className="py-3 px-4 text-left text-gray-900 text-xs">100%</td>
                                    <td className="py-3 px-4 text-left text-gray-900 bg-green-50/30 text-xs">100%</td>
                                </tr>
                                <tr>
                                    <td className="py-3 px-4 text-gray-600 font-medium">Battery Health</td>
                                    <td className="py-3 px-4 text-left text-gray-900 text-xs">100%</td>
                                    <td className="py-3 px-4 text-left text-gray-900 bg-green-50/30 text-xs">100%</td>
                                </tr>
                                <tr>
                                    <td className="py-3 px-4 text-gray-600 font-medium">Warranty</td>
                                    <td className="py-3 px-4 text-left text-gray-900 text-xs">12 Months</td>
                                    <td className="py-3 px-4 text-left text-gray-900 bg-green-50/30 text-xs">3 Months</td>
                                </tr>

                                <tr className="bg-gray-50/50">
                                    <td className="py-3 px-4 text-gray-900 font-bold">Price</td>
                                    <td className="py-3 px-4 text-left text-gray-400 font-medium text-xs line-through decoration-red-500/50 decoration-2">{newPrice}</td>
                                    <td className="py-3 px-4 text-left text-gray-900 font-extrabold text-sm bg-green-50/30">{refurbPrice}</td>
                                </tr>
                                <tr className="bg-green-100">
                                    <td colSpan={3} className="py-3 px-4 text-center text-green-800 font-bold text-sm">
                                        Value: <span className="font-extrabold">Save GH₵{savings}</span>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <button
                        onClick={onClose}
                        className="w-full bg-gray-900 hover:bg-gray-800 text-white font-bold py-3.5 rounded-xl transition-all text-sm tracking-wide shadow-lg shadow-gray-200"
                    >
                        Continue Shopping
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ComparePriceModal;

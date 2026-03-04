const PaymentMethodsSkeleton = () => {
    return (
        <div className="p-8 space-y-8 animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>

            <div className="space-y-4">
                <h3 className="h-4 bg-gray-100 rounded w-1/6"></h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[1, 2].map((i) => (
                        <div key={i} className="border border-gray-100 rounded-xl p-6 space-y-4">
                            <div className="flex gap-4 items-center">
                                <div className="w-12 h-8 bg-gray-100 rounded"></div>
                                <div className="space-y-2 flex-grow">
                                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                                    <div className="h-3 bg-gray-100 rounded w-1/4"></div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="space-y-4 pt-8">
                <h3 className="h-4 bg-gray-100 rounded w-1/6"></h3>
                <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="border border-gray-100 rounded-lg p-4 flex justify-between">
                            <div className="h-4 bg-gray-100 rounded w-1/3"></div>
                            <div className="h-4 bg-gray-100 rounded w-4"></div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default PaymentMethodsSkeleton;

const OrdersSkeleton = () => {
    return (
        <div className="p-8 space-y-8 animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>

            {/* Search/Filter Bar Skeleton */}
            <div className="flex space-x-4">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-10 bg-gray-100 rounded-full w-24"></div>
                ))}
            </div>

            {/* Order Cards Skeletons */}
            {[1, 2, 3].map((i) => (
                <div key={i} className="border border-gray-100 rounded-xl p-6 space-y-4">
                    <div className="flex justify-between items-start">
                        <div className="space-y-2">
                            <div className="h-4 bg-gray-200 rounded w-32"></div>
                            <div className="h-3 bg-gray-100 rounded w-24"></div>
                        </div>
                        <div className="h-6 bg-gray-100 rounded-full w-20"></div>
                    </div>

                    <div className="flex space-x-4 items-center pt-4">
                        <div className="flex space-x-2">
                            {[1, 2, 3].map((j) => (
                                <div key={j} className="w-12 h-12 bg-gray-100 rounded-lg"></div>
                            ))}
                        </div>
                        <div className="flex-grow"></div>
                        <div className="h-10 bg-gray-200 rounded-lg w-32"></div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default OrdersSkeleton;

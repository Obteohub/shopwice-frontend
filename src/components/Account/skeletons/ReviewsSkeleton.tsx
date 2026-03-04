const ReviewsSkeleton = () => {
    return (
        <div className="p-8 space-y-8 animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>

            {/* Summary Bar Skeleton */}
            <div className="grid grid-cols-3 gap-4 mb-10">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-gray-50 rounded-xl p-6 space-y-2 border border-gray-100">
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                        <div className="h-6 bg-gray-200 rounded w-1/4"></div>
                    </div>
                ))}
            </div>

            {/* Review Cards Skeletons */}
            {[1, 2].map((i) => (
                <div key={i} className="border border-gray-100 rounded-xl p-6 space-y-4">
                    <div className="flex justify-between items-start">
                        <div className="flex gap-4">
                            <div className="w-12 h-12 bg-gray-100 rounded-lg"></div>
                            <div className="space-y-2">
                                <div className="h-4 bg-gray-200 rounded w-32"></div>
                                <div className="h-3 bg-gray-100 rounded w-24"></div>
                            </div>
                        </div>
                        <div className="h-6 bg-gray-100 rounded-full w-20"></div>
                    </div>
                    <div className="space-y-2 pt-2">
                        <div className="h-3 bg-gray-100 rounded w-full"></div>
                        <div className="h-3 bg-gray-100 rounded w-5/6"></div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default ReviewsSkeleton;

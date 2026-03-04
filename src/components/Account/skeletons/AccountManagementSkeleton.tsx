const AccountManagementSkeleton = () => {
    return (
        <div className="p-8 space-y-12 animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-10"></div>

            {/* Personal Info Skeleton */}
            <div className="space-y-6">
                <div className="h-4 bg-gray-100 rounded w-1/6"></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-12 bg-gray-50 rounded-lg"></div>
                    ))}
                </div>
                <div className="h-10 bg-gray-200 rounded-lg w-32"></div>
            </div>

            {/* Security Section Skeleton */}
            <div className="space-y-6 pt-12 border-t border-gray-50">
                <div className="h-4 bg-gray-100 rounded w-1/6"></div>
                <div className="space-y-4">
                    <div className="h-12 bg-gray-50 rounded-lg"></div>
                    <div className="h-12 bg-gray-50 rounded-lg"></div>
                </div>
                <div className="h-10 bg-gray-200 rounded-lg w-32"></div>
            </div>

            {/* Danger Zone Skeleton */}
            <div className="space-y-4 pt-12 border-t border-red-50">
                <div className="h-4 bg-red-50 rounded w-1/6"></div>
                <div className="h-16 bg-red-50/10 rounded-xl border border-dashed border-red-100"></div>
            </div>
        </div>
    );
};

export default AccountManagementSkeleton;

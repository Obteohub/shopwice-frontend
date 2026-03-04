const NotificationsSkeleton = () => {
    return (
        <div className="p-8 space-y-8 animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-10"></div>

            {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-4 pt-6 first:pt-0 border-t first:border-0 border-gray-50">
                    <div className="h-4 bg-gray-200 rounded w-1/6 mb-6"></div>

                    <div className="space-y-4">
                        {[1, 2, 3].map((j) => (
                            <div key={j} className="flex justify-between items-center">
                                <div className="space-y-2 flex-grow">
                                    <div className="h-4 bg-gray-100 rounded w-1/4"></div>
                                    <div className="h-3 bg-gray-50 rounded w-1/2"></div>
                                </div>
                                <div className="w-10 h-6 bg-gray-100 rounded-full"></div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default NotificationsSkeleton;

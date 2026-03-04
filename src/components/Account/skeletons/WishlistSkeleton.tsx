const WishlistSkeleton = () => {
    return (
        <div className="p-8 space-y-8 animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>

            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                    <div key={i} className="border border-gray-100 rounded-xl p-2 space-y-3">
                        <div className="aspect-square bg-gray-100 rounded-lg w-full"></div>
                        <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto"></div>
                        <div className="h-3 bg-gray-100 rounded w-1/2 mx-auto"></div>
                        <div className="h-10 bg-gray-200 rounded-lg w-full mt-4"></div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default WishlistSkeleton;

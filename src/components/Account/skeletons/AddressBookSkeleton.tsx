const AddressBookSkeleton = () => {
    return (
        <div className="p-8 space-y-8 animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[1, 2].map((i) => (
                    <div key={i} className="border border-gray-100 rounded-xl p-6 space-y-4">
                        <div className="flex justify-between items-center">
                            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                            <div className="h-6 bg-gray-100 rounded-full w-12"></div>
                        </div>
                        <div className="space-y-2">
                            <div className="h-3 bg-gray-100 rounded w-3/4"></div>
                            <div className="h-3 bg-gray-100 rounded w-full"></div>
                            <div className="h-3 bg-gray-100 rounded w-1/2"></div>
                        </div>
                        <div className="pt-4 flex gap-4">
                            <div className="h-8 bg-gray-200 rounded w-20"></div>
                            <div className="h-8 bg-gray-100 rounded w-20"></div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AddressBookSkeleton;

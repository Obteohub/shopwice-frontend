import { useState, useEffect } from 'react';
import { useQuery } from '@apollo/client';
import Link from 'next/link';
import { FETCH_ALL_CATEGORIES_QUERY } from '@/utils/gql/GQL_QUERIES';
import LoadingSpinner from '@/components/LoadingSpinner/LoadingSpinner.component';

interface Category {
    id: string;
    name: string;
    slug: string;
    children?: {
        nodes: Category[];
    };
}

const DesktopSideMenu = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<any>(null);
    const [viewStack, setViewStack] = useState<Category[]>([]);

    useEffect(() => {
        if (isOpen && !data) {
            setLoading(true);
            const CACHE_KEY = 'shopwice_menu_cache';
            const cachedData = localStorage.getItem(CACHE_KEY);

            if (cachedData) {
                try {
                    const parsedData = JSON.parse(cachedData);
                    setData(parsedData);
                    setLoading(false);
                } catch (e) {
                    console.error("Error parsing menu cache", e);
                    localStorage.removeItem(CACHE_KEY);
                }
            }

            // Only fetch if no cache found (or cache invalid)
            if (!cachedData) {
                fetch(process.env.NEXT_PUBLIC_GRAPHQL_URL as string, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'omit',
                    cache: 'force-cache',
                    body: JSON.stringify({
                        query: require('graphql').print(FETCH_ALL_CATEGORIES_QUERY)
                    }),
                })
                    .then(res => res.json())
                    .then(json => {
                        if (json.errors) throw new Error(json.errors[0].message);
                        setData(json.data);
                        localStorage.setItem(CACHE_KEY, JSON.stringify(json.data));
                        setLoading(false);
                    })
                    .catch(err => {
                        console.error('DesktopSideMenu Fetch Error:', err);
                        setLoading(false);
                    });
            } else {
                // cache hit, ensure loading is off
                setLoading(false);
            }
        }
    }, [isOpen, data]);

    // Reset view stack when menu closes
    useEffect(() => {
        if (!isOpen) {
            const timer = setTimeout(() => setViewStack([]), 300);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    // Prevent body scroll when menu is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen]);

    if (!isOpen && viewStack.length === 0) return null;

    const currentCategory = viewStack.length > 0 ? viewStack[viewStack.length - 1] : null;
    const categoriesToShow = currentCategory
        ? currentCategory.children?.nodes
        : data?.productCategories?.nodes?.filter((cat: any) =>
            cat.name.toLowerCase() !== 'uncategorized' && cat.slug !== 'uncategorized'
        );

    const handleCategoryClick = (category: Category) => {
        if (category.children && category.children.nodes.length > 0) {
            setViewStack([...viewStack, category]);
        } else {
            onClose();
        }
    };

    const handleBack = () => {
        setViewStack(viewStack.slice(0, -1));
    };

    return (
        <div className={`fixed inset-0 z-[150] flex transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            {/* Overlay */}
            <div className={`fixed inset-0 bg-black bg-opacity-60 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`} onClick={onClose}></div>

            {/* Sidebar */}
            <div className={`relative w-[380px] h-full bg-white shadow-2xl flex flex-col font-sans transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                {/* Header */}
                <div className="flex items-center space-x-4 p-5 bg-[#232f3e] text-white">
                    {viewStack.length > 0 ? (
                        <button onClick={handleBack} className="flex items-center text-white hover:text-gray-300 font-bold">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-5 h-5 mr-1">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                            </svg>
                            MAIN MENU
                        </button>
                    ) : (
                        <div className="flex items-center space-x-3">
                            <div className="p-1.5 bg-white/20 rounded-full">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                                </svg>
                            </div>
                            <span className="font-bold text-lg">Hello, Sign In</span>
                        </div>
                    )}
                    <button onClick={onClose} aria-label="Close menu" className="absolute right-[-45px] top-4 text-white hover:text-gray-300 p-1">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="flex justify-center items-center h-40">
                            <LoadingSpinner color="blue" />
                        </div>
                    ) : (
                        <div className="py-2">
                            {currentCategory ? (
                                <div className="px-6 py-4 border-b border-gray-100">
                                    <h3 className="font-bold text-[#2c3338] uppercase text-[15px] tracking-tight">
                                        {currentCategory.name}
                                    </h3>
                                </div>
                            ) : (
                                <div className="px-6 py-4 border-b border-gray-100">
                                    <h3 className="font-bold text-[#2c3338] uppercase text-[15px] tracking-tight">
                                        Shop By Category
                                    </h3>
                                </div>
                            )}

                            <ul className="py-2">
                                {categoriesToShow?.map((cat: Category) => (
                                    <li key={cat.id}>
                                        {cat.children && cat.children.nodes.length > 0 ? (
                                            <button
                                                onClick={() => handleCategoryClick(cat)}
                                                className="w-full flex items-center justify-between px-8 py-3.5 text-left text-gray-700 hover:bg-gray-100 group transition-colors"
                                            >
                                                <span className="text-[14px] text-gray-700 group-hover:text-gray-900 transition-colors">{cat.name}</span>
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-gray-400 group-hover:text-gray-600">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                                                </svg>
                                            </button>
                                        ) : (
                                            <Link
                                                href={`/product-category/${cat.slug}`}
                                                onClick={onClose}
                                                className="block px-8 py-3 text-[14px] text-gray-700 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                                            >
                                                {cat.name}
                                            </Link>
                                        )}
                                    </li>
                                ))}
                            </ul>

                            {/* Help & Settings Section at Root */}
                            {!currentCategory && (
                                <div className="mt-4 pt-4 border-t border-gray-100">
                                    <div className="px-6 py-4">
                                        <h3 className="font-bold text-[#2c3338] uppercase text-[15px] tracking-tight">Help & Settings</h3>
                                    </div>
                                    <ul className="py-2">
                                        <li>
                                            <Link href="/my-account" onClick={onClose} className="block px-8 py-3 text-[14px] text-gray-700 hover:text-gray-900 hover:bg-gray-100 transition-colors">
                                                Your Account
                                            </Link>
                                        </li>
                                        <li>
                                            <Link href="/cart" onClick={onClose} className="block px-8 py-3 text-[14px] text-gray-700 hover:text-gray-900 hover:bg-gray-100 transition-colors">
                                                My Basket
                                            </Link>
                                        </li>
                                        <li>
                                            <Link href="/products" onClick={onClose} className="block px-8 py-3 text-[14px] text-gray-700 hover:text-gray-900 hover:bg-gray-100 transition-colors">
                                                All Products
                                            </Link>
                                        </li>
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DesktopSideMenu;

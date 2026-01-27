
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Image from 'next/image';
import { print } from 'graphql';
import { SEARCH_PRODUCTS_QUERY } from '../../utils/gql/GQL_QUERIES';
import { paddedPrice } from '../../utils/functions/functions';

const NativeSearchBox = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const [debouncedTerm, setDebouncedTerm] = useState(searchTerm);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<any>(null);
    const [data, setData] = useState<any>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    // Debounce logic
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedTerm(searchTerm);
        }, 500);
        return () => clearTimeout(handler);
    }, [searchTerm]);

    // Execute search when debounced term changes
    useEffect(() => {
        const fetchProducts = async () => {
            if (debouncedTerm.length <= 2) {
                setData(null);
                return;
            }

            setLoading(true);
            setError(null);

            try {
                const response = await fetch(process.env.NEXT_PUBLIC_GRAPHQL_URL as string, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    credentials: 'omit', // IMPORTANT: Skip cookies/auth headers to avoid 500 errors from bad sessions
                    body: JSON.stringify({
                        query: print(SEARCH_PRODUCTS_QUERY),
                        variables: { search: debouncedTerm }
                    }),
                });

                const json = await response.json();

                if (json.errors) {
                    throw new Error(json.errors[0].message || 'GraphQL Error');
                }

                setData(json.data);
                // console.log('Search Data:', json.data);

            } catch (err: any) {
                console.error('Search Error:', err);
                setError({ message: err.message, networkError: err });
            } finally {
                setLoading(false);
            }
        };

        fetchProducts();
    }, [debouncedTerm]);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsFocused(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchTerm.trim()) {
            setIsFocused(false);
            router.push(`/search?q=${encodeURIComponent(searchTerm)}`);
        }
    };

    const results = data?.products?.nodes || [];

    return (
        <div ref={wrapperRef} className="w-full relative">
            <form onSubmit={handleSearchSubmit} className="relative flex w-full">
                <input
                    type="text"
                    placeholder="Search for products..."
                    className="w-full rounded-full border border-gray-200 bg-gray-50 py-3 pl-6 pr-12 text-sm text-gray-900 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                    value={searchTerm}
                    onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setIsFocused(true);
                    }}
                    onFocus={() => setIsFocused(true)}
                />
                <button
                    type="submit"
                    className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full bg-orange-500 p-2 text-gray-900 hover:bg-orange-600 transition-colors"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                        className="h-5 w-5"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                    </svg>
                </button>
            </form>

            {/* Dropdown Results */}
            {isFocused && searchTerm.length > 2 && (
                <div className="absolute top-full left-0 mt-2 w-full rounded-xl border border-gray-100 bg-white shadow-xl z-[9999] overflow-hidden">
                    {loading && (
                        <div className="p-4 text-center text-gray-500 text-sm">Searching...</div>
                    )}

                    {error && (
                        <div className="p-4 text-center text-red-500 text-xs text-left overflow-auto max-h-40">
                            <strong>Error:</strong> {error.message}
                            {error.networkError && (
                                <details className="mt-2">
                                    <summary>Network Details</summary>
                                    <pre>{JSON.stringify(error.networkError, null, 2)}</pre>
                                </details>
                            )}
                            {error.graphQLErrors && error.graphQLErrors.length > 0 && (
                                <details className="mt-2">
                                    <summary>GraphQL Errors</summary>
                                    <pre>{JSON.stringify(error.graphQLErrors, null, 2)}</pre>
                                </details>
                            )}
                        </div>
                    )}

                    {!loading && !error && results.length === 0 && (
                        <div className="p-4 text-center text-gray-500 text-sm">No products found.</div>
                    )}

                    {!loading && !error && results.length > 0 && (
                        <ul className="divide-y divide-gray-50 max-h-[400px] overflow-y-auto">
                            {results.map((product: any) => {
                                const imageUrl = product.image?.sourceUrl || process.env.NEXT_PUBLIC_PLACEHOLDER_SMALL_IMAGE_URL || '';
                                return (
                                    <li key={product.id || product.databaseId || Math.random()}>
                                        <Link href={`/product/${product.slug}`} onClick={() => setIsFocused(false)}>
                                            <div className="flex items-center gap-4 p-3 hover:bg-gray-50 transition-colors">
                                                <div className="h-12 w-12 flex-shrink-0 relative rounded-md overflow-hidden bg-gray-100 border border-gray-200">
                                                    {imageUrl ? (
                                                        <Image
                                                            src={imageUrl}
                                                            alt={product.name || 'Product'}
                                                            fill
                                                            className="object-cover"
                                                            sizes="48px"
                                                        />
                                                    ) : (
                                                        <div className="h-full w-full flex items-center justify-center text-[8px] text-gray-400">No Img</div>
                                                    )}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-sm text-gray-900 line-clamp-1">{product.name}</span>
                                                    <div className="flex items-center gap-2">
                                                        {product.onSale ? (
                                                            <>
                                                                <span className="text-xs font-bold text-red-600">
                                                                    {paddedPrice(product.salePrice ?? '', 'GH₵')}
                                                                </span>
                                                                <span className="text-[10px] text-gray-400 line-through">
                                                                    {paddedPrice(product.regularPrice ?? '', 'GH₵')}
                                                                </span>
                                                            </>
                                                        ) : (
                                                            <span className="text-xs font-bold text-gray-900">
                                                                {paddedPrice(product.price ?? '', 'GH₵')}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
};

export default NativeSearchBox;

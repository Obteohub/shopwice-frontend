import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Layout from '@/components/Layout/Layout.component';
import ProductList from '@/components/Product/ProductList.component';
import LoadingSpinner from '@/components/LoadingSpinner/LoadingSpinner.component';
import { SEARCH_PRODUCTS_QUERY } from '@/utils/gql/GQL_QUERIES';
import { GetServerSideProps } from 'next';
import client from '@/utils/apollo/ApolloClient';

export const runtime = 'experimental-edge';

interface SearchPageProps {
    products: any[];
    pageInfo: any;
    searchTerm: string;
    error?: string;
}

const SearchPage = ({ products, pageInfo, searchTerm, error: serverError }: SearchPageProps) => {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const handleStart = (url: string) => {
            // Only show loading if the search term changes (query param 'q')
            if (url !== router.asPath) {
                setLoading(true);
            }
        };
        const handleComplete = () => setLoading(false);

        router.events.on('routeChangeStart', handleStart);
        router.events.on('routeChangeComplete', handleComplete);
        router.events.on('routeChangeError', handleComplete);

        return () => {
            router.events.off('routeChangeStart', handleStart);
            router.events.off('routeChangeComplete', handleComplete);
            router.events.off('routeChangeError', handleComplete);
        };
    }, [router]);

    // Keep router for navigation, but use props for data

    // We can still use state if we want to support client-side updates without reload, 
    // but ProductList handles pagination/filtering internally now.
    // However, if the user changes the search term in the URL, the page will reload (SSR).

    // If there's an error from SSR, show it.

    return (
        <Layout title={`Search: ${searchTerm}`} fullWidth={true}>
            <Head>
                <title>{`Search Results for "${searchTerm}" | Shopwice`}</title>
            </Head>

            <div className="pt-1 pb-1">
                <div className="container mx-auto px-4 py-4">
                    <h1 className="text-xl font-bold mb-4">
                        Search Results for <span className="text-orange-600">{`"${searchTerm}"`}</span>
                    </h1>
                </div>

                {loading ? (
                    <div className="flex justify-center items-center min-h-[400px]">
                        <LoadingSpinner color="orange" size="lg" />
                    </div>
                ) : (
                    <>
                        {serverError && (
                            <div className="text-center py-10">
                                <p className="text-red-500">Error loading search results. Please try again.</p>
                                <p className="text-sm text-gray-500 mt-2">{serverError}</p>
                            </div>
                        )}

                        {!serverError && products.length === 0 && searchTerm && (
                            <div className="text-center py-10">
                                <p className="text-gray-600 text-lg">{`No products found matching "${searchTerm}"`}</p>
                                <p className="text-gray-500 mt-2">Try checking your spelling or using different keywords.</p>
                            </div>
                        )}

                        {!serverError && products.length > 0 && (
                            <div className="pt-1 pb-1">
                                <ProductList
                                    products={products}
                                    pageInfo={pageInfo}
                                    query={SEARCH_PRODUCTS_QUERY}
                                    queryVariables={{ search: searchTerm }}
                                    // Removed useDirectFetch to use Apollo Client
                                    context={{}}
                                />
                            </div>
                        )}
                    </>
                )}
            </div>
        </Layout>
    );
};

export const getServerSideProps: GetServerSideProps = async (context) => {
    const searchTerm = context.query.q as string || '';

    if (!searchTerm) {
        return {
            props: {
                products: [],
                pageInfo: null,
                searchTerm: ''
            }
        };
    }

    try {
        const { data } = await client.query({
            query: SEARCH_PRODUCTS_QUERY,
            variables: { search: searchTerm, first: 24 },
            fetchPolicy: 'network-only'
        });

        return {
            props: {
                products: data?.products?.nodes || [],
                pageInfo: data?.products?.pageInfo || null,
                searchTerm
            }
        };
    } catch (error: any) {
        console.error('Search SSR Error:', error);
        return {
            props: {
                products: [],
                pageInfo: null,
                searchTerm,
                error: error.message || 'An error occurred'
            }
        };
    }
};

export default SearchPage;

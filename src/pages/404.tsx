import Link from 'next/link';
import Layout from '@/components/Layout/Layout.component';
import client from '@/utils/apollo/ApolloClient';
import { GET_404_PAGE_PRODUCTS } from '@/utils/gql/GQL_QUERIES';
import ProductCard from '@/components/Product/ProductCard.component';
import { Product } from '@/types/product';



interface Custom404Props {
    bestSellers: Product[];
    newest: Product[];
    topRated: Product[];
}

export default function Custom404({ bestSellers, newest, topRated }: Custom404Props) {
    return (
        <Layout title="Page Not Found" fullWidth={false}>
            <div className="flex flex-col items-center justify-center min-h-[50vh] px-4 text-center border-b border-gray-100 pb-12">
                <h1 className="text-[150px] leading-none font-bold text-gray-100 select-none">404</h1>
                <h2 className="text-3xl md:text-4xl font-bold text-gray-800 -mt-8 mb-4">
                    Oops! Page Not Found
                </h2>
                <p className="text-gray-500 max-w-md mx-auto mb-8">
                    The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
                </p>
                <Link
                    href="/"
                    className="px-8 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 transform hover:-translate-y-0.5"
                >
                    Go Back Home
                </Link>
            </div>

            <div className="py-12 space-y-16">
                {/* Best Sellers */}
                {bestSellers?.length > 0 && (
                    <section>
                        <h3 className="text-xl font-bold text-gray-900 mb-6 uppercase tracking-tight border-l-4 border-blue-600 pl-3">
                            Best Sellers
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
                            {bestSellers.map((product, index) => (
                                <ProductCard key={product.databaseId || product.slug || index} {...product} />
                            ))}
                        </div>
                    </section>
                )}

                {/* New Arrivals */}
                {newest?.length > 0 && (
                    <section>
                        <h3 className="text-xl font-bold text-gray-900 mb-6 uppercase tracking-tight border-l-4 border-green-500 pl-3">
                            New Arrivals
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
                            {newest.map((product, index) => (
                                <ProductCard key={product.databaseId || product.slug || index} {...product} />
                            ))}
                        </div>
                    </section>
                )}

                {/* Top Rated */}
                {topRated?.length > 0 && (
                    <section>
                        <h3 className="text-xl font-bold text-gray-900 mb-6 uppercase tracking-tight border-l-4 border-yellow-500 pl-3">
                            Top Rated Products
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
                            {topRated.map((product, index) => (
                                <ProductCard key={product.databaseId || product.slug || index} {...product} />
                            ))}
                        </div>
                    </section>
                )}
            </div>
        </Layout>
    );
}

export async function getStaticProps() {
    try {
        const { data } = await client.query({
            query: GET_404_PAGE_PRODUCTS,
        });

        return {
            props: {
                bestSellers: data?.bestSellers?.nodes || [],
                newest: data?.newest?.nodes || [],
                topRated: data?.topRated?.nodes || [],
            },
        };
    } catch (error) {
        console.error('Error fetching 404 page products:', error);
        return {
            props: {
                bestSellers: [],
                newest: [],
                topRated: [],
            },
        };
    }
}

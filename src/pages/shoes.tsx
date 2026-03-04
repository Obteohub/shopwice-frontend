
import React from 'react';
import Layout from '@/components/Layout/Layout.component';
import ProductList from '@/components/Product/ProductList.component';
import { api } from '@/utils/api';
import { ENDPOINTS } from '@/utils/endpoints';
import BackButton from '@/components/UI/BackButton.component';
import { sanitizeHtml } from '@/utils/sanitizeHtml';

interface ShoesPageProps {
    category: any;
    products: any[];
    pageInfo: {
        hasNextPage: boolean;
        endCursor: string | null;
    };
    slug: string;
}

const ShoesPage = ({ category, products, pageInfo, slug }: ShoesPageProps) => {
    return (
        <Layout title={category?.name || 'Shoes'} fullWidth={true}>
            <div className="px-2 md:px-4 pt-1 pb-1">
                <BackButton />
                <h1 className="text-[22px] font-bold text-[#2c3338] mb-1 capitalize tracking-tight">
                    {category?.name?.toLowerCase() || 'Shoes'}
                </h1>
                {category?.description && (
                    <div
                        className="mb-10 text-gray-500 max-w-3xl"
                        dangerouslySetInnerHTML={{ __html: sanitizeHtml(category.description) }}
                    />
                )}
                <ProductList
                    products={products}
                    pageInfo={pageInfo}
                    slug={slug}
                    categoryId={category?.id ? Number(category.id) : undefined}
                    totalCount={category?.count}
                />
            </div>
        </Layout>
    );
};

export default ShoesPage;

export const getStaticProps = async () => {
    const slug = 'shoes';

    try {
        // Step 1: Resolve slug to category
        const categories: any = await api.get(ENDPOINTS.CATEGORIES);
        const category = categories.find((c: any) => c.slug === slug);

        if (!category) {
            return {
                props: {
                    category: { name: 'Shoes' },
                    products: [],
                    pageInfo: { hasNextPage: false, endCursor: null },
                    slug: 'shoes'
                },
                revalidate: 60,
            };
        }

        // Step 2: Fetch products by category
        const products: any = await api.get(ENDPOINTS.PRODUCTS, {
            params: {
                category: category.id,
                per_page: 24
            },
        });

        return {
            props: {
                category,
                products: products || [],
                pageInfo: { hasNextPage: (products || []).length === 24, endCursor: null },
                slug,
            },
            revalidate: 60,
        };
    } catch (error) {
        console.error('Error fetching shoes data:', error);
        return {
            props: {
                category: { name: 'Shoes' },
                products: [],
                pageInfo: { hasNextPage: false, endCursor: null },
                slug: 'shoes'
            }
        };
    }
};

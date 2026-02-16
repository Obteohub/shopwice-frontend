import React, { useEffect, useState } from 'react';
import { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import TaxonomyListingPage from '@/components/Product/TaxonomyListingPage.component';
import client from '@/utils/apollo/ApolloClient';
import { GET_CATEGORY_NODE_BY_SLUG, GET_CATEGORY_PRODUCTS_BY_ID, GET_CATEGORY_PRODUCTS_BY_ID_WITH_ATTRIBUTE } from '@/utils/gql/GQL_QUERIES';
import { useLazyQuery } from '@apollo/client';
import { Product } from '@/types/product';



// ----- TypeScript Types -----
interface CategoryNode {
    databaseId: number;
    name: string;
    description?: string;
    count: number;
}

interface PageInfo {
    hasNextPage: boolean;
    endCursor: string | null;
}

interface CategoryPageProps {
    category: CategoryNode | null;
    products: Product[];
    pageInfo: PageInfo;
    slug: string;
    attr?: string;
    term?: string;
    categoryId?: number;
    isError?: boolean;
}

// ----- Component -----
const CategoryPage = ({ category: initialCategory, products: initialProducts, pageInfo: initialPageInfo, slug, attr, term, categoryId: initialCategoryId, isError }: CategoryPageProps) => {
    const [category, setCategory] = useState<CategoryNode | null>(initialCategory);
    const [products, setProducts] = useState<Product[]>(initialProducts);
    const [pageInfo, setPageInfo] = useState<PageInfo>(initialPageInfo);
    const [categoryId, setCategoryId] = useState<number | undefined>(initialCategoryId);
    const [loading, setLoading] = useState(!!isError);
    const router = useRouter();

    // Handle navigation loading state
    useEffect(() => {
        const handleStart = (url: string) => {
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

    // Sync state with props when navigating between categories
    useEffect(() => {
        setCategory(initialCategory);
        setProducts(initialProducts);
        setPageInfo(initialPageInfo);
        setCategoryId(initialCategoryId);
        setLoading(!!isError);
    }, [initialCategory, initialProducts, initialPageInfo, initialCategoryId, isError]);

    const attrTaxonomyMap: Record<string, string> = {
        pa_condition: 'PA_CONDITION',
    };
    const attrTax = attr ? attrTaxonomyMap[attr.toLowerCase()] : undefined;
    const hasAttrFilter = Boolean(attrTax && term);

    const [getCategory] = useLazyQuery(GET_CATEGORY_NODE_BY_SLUG, { fetchPolicy: 'network-only' });
    const [getProducts] = useLazyQuery(hasAttrFilter ? GET_CATEGORY_PRODUCTS_BY_ID_WITH_ATTRIBUTE : GET_CATEGORY_PRODUCTS_BY_ID, { fetchPolicy: 'network-only' });

    useEffect(() => {
        if (isError && slug) {
            const fetchData = async () => {
                try {
                    setLoading(true);
                    console.log('CSR Fallback: Fetching category...');
                    const { data: catData } = await getCategory();
                    const allCategories = catData?.productCategories?.nodes || [];
                    const normalizedSlug = slug.toLowerCase();
                    const catNode = allCategories.find((node: any) => node.slug?.toLowerCase() === normalizedSlug)
                        || allCategories.find((node: any) => node.name?.toLowerCase() === normalizedSlug.replace(/-/g, ' '));

                    if (catNode) {
                        setCategory(catNode);
                        setCategoryId(catNode.databaseId);

                        console.log('CSR Fallback: Fetching products...');
                        const variables = hasAttrFilter
                            ? { categoryId: catNode.databaseId, attrTax, attrTerm: [term], first: 24 }
                            : { categoryId: catNode.databaseId, first: 24 };

                        const { data: prodData } = await getProducts({ variables });
                        setProducts(prodData?.products?.nodes || []);
                        setPageInfo(prodData?.products?.pageInfo || { hasNextPage: false, endCursor: null });
                    }
                } catch (err) {
                    console.error('CSR Fallback Error:', err);
                } finally {
                    setLoading(false);
                }
            };
            fetchData();
        }
    }, [isError, slug, attrTax, term, hasAttrFilter, getCategory, getProducts]);

    const totalCount = category?.count || products.length;

    if (loading && products.length === 0) {
        return (
            <TaxonomyListingPage
                title={'Loading...'}
                products={[]}
                pageInfo={{ hasNextPage: false, endCursor: null }}
                slug={slug}
                query={hasAttrFilter ? GET_CATEGORY_PRODUCTS_BY_ID_WITH_ATTRIBUTE : GET_CATEGORY_PRODUCTS_BY_ID}
                queryVariables={{}}
                emptyMessage="Loading category data..."
                totalCount={0}
                loading={true}
            />
        );
    }

    return (
        <TaxonomyListingPage
            title={category?.name || 'Category'}
            description={category?.description}
            products={products}
            pageInfo={pageInfo}
            slug={slug}
            query={hasAttrFilter ? GET_CATEGORY_PRODUCTS_BY_ID_WITH_ATTRIBUTE : GET_CATEGORY_PRODUCTS_BY_ID}
            queryVariables={hasAttrFilter
                ? { categoryId, attrTax, attrTerm: [term], first: 24 }
                : { categoryId, first: 24 }}
            emptyMessage="No products found in this category"
            totalCount={totalCount}
            fetchAllForSort={true}
            loading={loading}
        />
    );
};

export default CategoryPage;

// ----- getServerSideProps -----
export const getServerSideProps: GetServerSideProps = async ({ params, res, query }) => {
    const slug = params?.slug as string;
    const attr = (query?.attr as string | undefined) || '';
    const term = (query?.term as string | undefined) || '';

    const attrTaxonomyMap: Record<string, string> = {
        pa_condition: 'PA_CONDITION',
    };

    const attrTax = attrTaxonomyMap[attr.toLowerCase()];
    const hasAttrFilter = Boolean(attrTax && term);

    if (!slug) return { notFound: true };

    try {
        // Cache control: 1 minute, background refresh
        res.setHeader(
            'Cache-Control',
            'public, s-maxage=60, stale-while-revalidate=59'
        );

        const { data: categoryData } = await client.query({
            query: GET_CATEGORY_NODE_BY_SLUG,
            fetchPolicy: 'network-only',
        });

        const allCategories = categoryData?.productCategories?.nodes || [];
        const normalizedSlug = slug.toLowerCase();
        let categoryNode = allCategories.find((node: any) => node.slug?.toLowerCase() === normalizedSlug)
            || allCategories.find((node: any) => node.name?.toLowerCase() === normalizedSlug.replace(/-/g, ' '));

        if (!categoryNode) {
            return {
                props: {
                    category: {
                        databaseId: 0,
                        name: slug.replace(/-/g, ' '),
                        description: null,
                        count: 0,
                    },
                    products: [],
                    pageInfo: { hasNextPage: false, endCursor: null },
                    slug,
                    attr,
                    term,
                },
            };
        }

        const categoryId = categoryNode.databaseId;

        const { data: productsData } = await client.query({
            query: hasAttrFilter ? GET_CATEGORY_PRODUCTS_BY_ID_WITH_ATTRIBUTE : GET_CATEGORY_PRODUCTS_BY_ID,
            variables: hasAttrFilter
                ? { categoryId, attrTax, attrTerm: [term], first: 24 }
                : { categoryId, first: 24 },
            fetchPolicy: 'network-only',
        });

        const products = productsData?.products?.nodes || [];
        const pageInfo = productsData?.products?.pageInfo || { hasNextPage: false, endCursor: null };

        return {
            props: {
                category: {
                    databaseId: categoryNode.databaseId,
                    name: categoryNode.name,
                    description: categoryNode.description || null,
                    count: categoryNode.count || 0,
                },
                products,
                pageInfo,
                slug,
                attr,
                term,
                categoryId,
            },
        };
    } catch (error) {
        console.error('Error fetching category SSR:', error);
        // Fallback to CSR
        return {
            props: {
                category: null,
                products: [],
                pageInfo: { hasNextPage: false, endCursor: null },
                slug,
                attr,
                term,
                isError: true,
            },
        };
    }
};

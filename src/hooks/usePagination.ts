import { useState, useEffect, useCallback } from 'react';
import client from '@/utils/apollo/ApolloClient';
import { GET_CATEGORY_DATA_BY_SLUG } from '@/utils/gql/GQL_QUERIES';
import { Product } from '@/types/product';
import { DocumentNode } from '@apollo/client';
import { print } from 'graphql';

interface UsePaginationProps {
    initialProducts: Product[];
    initialHasNextPage: boolean;
    initialEndCursor: string | null;
    slug: string;
    query?: DocumentNode;
    queryVariables?: Record<string, any>;
    context?: any;
}

export const usePagination = ({
    initialProducts,
    initialHasNextPage,
    initialEndCursor,
    slug,
    query,
    queryVariables = {},
    context = {},
}: UsePaginationProps) => {
    const [products, setProducts] = useState<Product[]>(initialProducts);
    const [hasNextPage, setHasNextPage] = useState(initialHasNextPage);
    const [endCursor, setEndCursor] = useState<string | null>(initialEndCursor);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    // Stack of cursors for Previous navigation: [null, "cursor1", "cursor2"]
    // Page 1 uses null. Page 2 uses cursor1.
    const [cursorStack, setCursorStack] = useState<(string | null)[]>([null]);
    const [currentIndex, setCurrentIndex] = useState(0);

    // Reset when slug/initial props change
    useEffect(() => {
        setProducts(initialProducts);
        setHasNextPage(initialHasNextPage);
        setEndCursor(initialEndCursor);
        setCursorStack([null]);
        setCurrentIndex(0);
        setError(null);
        setIsLoading(false);
    }, [initialProducts, initialHasNextPage, initialEndCursor, slug]);

    const fetchPage = useCallback(async (afterCursor: string | null) => {
        setIsLoading(true);
        setError(null);

        // Scroll to top of results
        const resultsHeader = document.getElementById('results-header');
        if (resultsHeader) {
            resultsHeader.scrollIntoView({ behavior: 'smooth' });
        } else {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }

        try {
            const activeQuery = query || GET_CATEGORY_DATA_BY_SLUG;
            const activeVariables = {
                first: 24,
                ...queryVariables,
                after: afterCursor,
                ...(slug && !('slug' in queryVariables) ? { slug } : {}),
                ...(slug && !('id' in queryVariables) && !('categoryId' in queryVariables) ? { id: slug } : {}),
            };

            let data;

            if (context?.useDirectFetch) {
                const fetchOptions = context?.fetchOptions || {};
                const response = await fetch(process.env.NEXT_PUBLIC_GRAPHQL_URL as string, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'omit',
                    cache: 'no-store',
                    ...fetchOptions,
                    body: JSON.stringify({
                        query: print(activeQuery),
                        variables: activeVariables
                    }),
                });

                const json = await response.json();
                if (json.errors) throw new Error(json.errors[0].message);
                data = json.data;
            } else {
                const result = await client.query({
                    query: activeQuery,
                    variables: activeVariables,
                    context: context,
                    fetchPolicy: 'network-only',
                });
                data = result.data;
            }

            let newProducts: Product[] = [];
            let newPageInfo = { hasNextPage: false, endCursor: null };

            // Parse response (same logic as before)
            if (data?.productBrand?.products) {
                newProducts = data.productBrand.products.nodes;
                newPageInfo = data.productBrand.products.pageInfo;
            } else if (data?.productLocation?.products) {
                newProducts = data.productLocation.products.nodes;
                newPageInfo = data.productLocation.products.pageInfo;
            } else if (data?.products) {
                newProducts = data.products.nodes;
                newPageInfo = data.products.pageInfo;
            }

            setProducts(newProducts);
            setHasNextPage(newPageInfo.hasNextPage);
            setEndCursor(newPageInfo.endCursor);

        } catch (err: any) {
            console.error('Pagination Error:', err);
            setError(err);
        } finally {
            setIsLoading(false);
        }
    }, [query, queryVariables, slug, context]);

    const loadNext = () => {
        if (!hasNextPage || isLoading) return;

        // Push current endCursor to stack relative to current index
        // We are moving TO index + 1
        // The cursor for index + 1 is the current `endCursor`

        // Wait, logic check:
        // Stack: [null] (Page 1). Current Index: 0.
        // We have `endCursor` 'A' from Page 1 data.
        // Click Next.
        // We want to fetch with `after: 'A'`.
        // New Stack should be [null, 'A']. New Index: 1.

        const newStack = [...cursorStack.slice(0, currentIndex + 1), endCursor];
        setCursorStack(newStack);
        setCurrentIndex(currentIndex + 1);

        fetchPage(endCursor);
    };

    const loadPrevious = () => {
        if (currentIndex === 0 || isLoading) return;

        const prevIndex = currentIndex - 1;
        const prevCursor = cursorStack[prevIndex];

        setCurrentIndex(prevIndex);
        fetchPage(prevCursor);
    };

    return {
        products,
        hasNextPage,
        hasPreviousPage: currentIndex > 0,
        isLoading,
        error,
        loadNext,
        loadPrevious,
        currentPage: currentIndex + 1,
    };
};

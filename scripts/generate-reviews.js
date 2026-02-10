const fs = require('fs');

async function generateReviews() {
    const fetch = (await import('node-fetch')).default;

    try {
        console.log('Fetching reviews...');

        const reviewsResponse = await fetch(
            'https://api.shopwice.com/api/reviews?per_page=10',
            {
                headers: {
                    'User-Agent':
                        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            }
        );

        if (!reviewsResponse.ok) {
            throw new Error(`Reviews API failed: ${reviewsResponse.status}`);
        }

        const reviewsData = await reviewsResponse.json();
        if (!Array.isArray(reviewsData) || reviewsData.length === 0) {
            console.warn('No reviews found.');
            return;
        }

        const productIds = [...new Set(reviewsData.map(r => r.product_id))];
        console.log(`Found ${productIds.length} unique product IDs.`);

        const gqlQuery = `
            query GetProductConditions($include: [ID]) {
                products(where: { include: $include }, first: 100) {
                    nodes {
                        databaseId
                        ... on SimpleProduct {
                            attributes {
                                nodes {
                                    name
                                    options
                                }
                            }
                        }
                        ... on VariableProduct {
                            attributes {
                                nodes {
                                    name
                                    options
                                }
                            }
                        }
                    }
                }
            }
        `;

        console.log('Fetching product details via GraphQL...');

        const gqlResponse = await fetch('https://shopwice.com/graphql', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent':
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            },
            body: JSON.stringify({
                query: gqlQuery,
                variables: {
                    include: productIds.slice(0, 50)
                }
            })
        });

        if (!gqlResponse.ok) {
            throw new Error(`GraphQL request failed: ${gqlResponse.status}`);
        }

        const gqlJson = await gqlResponse.json();

        if (gqlJson.errors) {
            throw new Error(
                `GraphQL errors: ${JSON.stringify(gqlJson.errors)}`
            );
        }

        const products = gqlJson?.data?.products?.nodes || [];
        if (products.length === 0) {
            console.warn('No products returned from GraphQL.');
            return;
        }

        const refurbishedProductIds = new Set(
            products
                .filter(product =>
                    product.attributes?.nodes?.some(attr =>
                        attr.options?.some(opt =>
                            String(opt)
                                .toLowerCase()
                                .includes('refurbish')
                        )
                    )
                )
                .map(p => p.databaseId)
        );

        const refurbishedReviews = reviewsData.filter(r =>
            refurbishedProductIds.has(r.product_id)
        );

        const sortedReviews = refurbishedReviews
            .sort(
                (a, b) =>
                    new Date(b.date_created).getTime() -
                    new Date(a.date_created).getTime()
            )
            .slice(0, 10);

        console.log(
            `Filtered down to ${sortedReviews.length} refurbished reviews.`
        );

        const output = {
            reviews: sortedReviews,
            timestamp: Date.now()
        };

        const dir = 'src/data';
        fs.mkdirSync(dir, { recursive: true });

        fs.writeFileSync(
            `${dir}/refurbishedReviews.json`,
            JSON.stringify(output, null, 2)
        );

        console.log(
            '✅ Success! Reviews saved to src/data/refurbishedReviews.json'
        );
    } catch (error) {
        console.error('❌ Error generating reviews:', error.message);
    }
}

generateReviews();

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

        if (productIds.length === 0) {
            console.log('No products to fetch.');
            return;
        }

        console.log('Fetching product details via REST API...');

        // Fetch products by ID using REST API
        // Note: WC REST API uses 'include' param for IDs
        const productsResponse = await fetch(
            `https://api.shopwice.com/api/products?include=${productIds.join(',')}&per_page=50`,
            {
                headers: {
                    'User-Agent':
                        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            }
        );

        if (!productsResponse.ok) {
            throw new Error(`Products REST API failed: ${productsResponse.status}`);
        }

        const products = await productsResponse.json();

        if (!Array.isArray(products) || products.length === 0) {
            console.warn('No products returned from REST API.');
            return;
        }

        const refurbishedProductIds = new Set(
            products
                .filter(product =>
                    product.attributes?.some(attr =>
                        attr.options?.some(opt =>
                            String(opt)
                                .toLowerCase()
                                .includes('refurbish')
                        )
                    ) ||
                    product.categories?.some(cat =>
                        cat.name.toLowerCase().includes('refurbish') ||
                        cat.slug.toLowerCase().includes('refurbish')
                    )
                )
                .map(p => p.id)
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
        try {
            await fs.promises.mkdir(dir, { recursive: true });
            await fs.promises.writeFile(
                `${dir}/refurbishedReviews.json`,
                JSON.stringify(output, null, 2)
            );
            console.log(
                '✅ Success! Reviews saved to src/data/refurbishedReviews.json'
            );
        } catch (err) {
            console.error('Error writing file:', err);
        }
    } catch (error) {
        console.error('❌ Error generating reviews:', error.message);
    }
}

generateReviews();

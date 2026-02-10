const fetch = require('node-fetch');

async function testProxy() {
    const slug = 'electronics';
    const query = `
      query CategoryData($slug: String!, $id: ID!, $first: Int = 5) {
        productCategory(id: $id, idType: SLUG) {
          id
          name
          description
          count
        }
        products(
          first: $first,
          where: {
            taxQuery: {
              taxArray: [
                {
                  taxonomy: PRODUCTCATEGORY,
                  field: SLUG,
                  terms: [$slug]
                }
              ]
            }
          }
        ) {
          nodes {
            databaseId
            name
            slug
            averageRating
            reviewCount
            onSale
            image {
              sourceUrl
            }
          }
        }
      }
    `;

    try {
        const response = await fetch('http://localhost:3000/api/graphql', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                query,
                variables: { slug, id: slug },
            }),
        });

        const body = await response.json();
        console.log(JSON.stringify(body, null, 2));
    } catch (e) {
        console.error('Error:', e.message);
    }
}

testProxy();

const http = require('http');

const query = `
  query CategoryData($slug: String!, $id: ID!, $first: Int = 1) {
    productCategory(id: $id, idType: SLUG) {
      name
      count
    }
    products(first: $first, where: { taxQuery: { taxArray: [{ taxonomy: PRODUCTCATEGORY, field: SLUG, terms: [$slug] }] } }) {
      nodes {
        databaseId
        name
        image {
          sourceUrl
        }
        reviewCount
      }
    }
  }
`;

const data = JSON.stringify({
    query,
    variables: { slug: 'electronics', id: 'electronics' },
});

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/graphql',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length,
    },
};

const req = http.request(options, (res) => {
    let body = '';
    res.on('data', (chunk) => body += chunk);
    res.on('end', () => {
        const json = JSON.parse(body);
        const node = json.data.products.nodes[0];
        console.log('Category name:', json.data.productCategory?.name);
        console.log('Product databaseId:', node?.databaseId);
        console.log('Product image sourceUrl:', node?.image?.sourceUrl);
        console.log('Product reviewCount:', node?.reviewCount);
    });
});

req.write(data);
req.end();

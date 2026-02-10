const http = require('http');

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
        console.log(body);
    });
});

req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
});

req.write(data);
req.end();

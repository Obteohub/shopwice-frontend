const http = require('http');

const query = `
  query CategoryData($slug: String!, $id: ID!, $first: Int = 1) {
    productCategory(id: $id, idType: SLUG) {
      name
    }
    products(first: $first, where: { taxQuery: { taxArray: [{ taxonomy: PRODUCTCATEGORY, field: SLUG, terms: [$slug] }] } }) {
      nodes {
        databaseId
        name
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

req.write(data);
req.end();

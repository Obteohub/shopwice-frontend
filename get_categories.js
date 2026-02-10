const http = require('http');

const query = `
  query Categories {
    productCategories(first: 20) {
      nodes {
        name
        slug
      }
    }
  }
`;

const data = JSON.stringify({ query });

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

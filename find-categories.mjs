
import { ApolloClient, InMemoryCache, HttpLink, gql } from '@apollo/client/core/index.js';

const fetch = global.fetch;

const client = new ApolloClient({
  link: new HttpLink({ uri: 'https://api.shopwice.com/graphql', fetch }),
  cache: new InMemoryCache(),
});

const LIST_CATEGORIES = gql`
  query ListCategories {
    productCategories(first: 10, where: { hideEmpty: true, orderby: COUNT, order: DESC }) {
      nodes {
        databaseId
        name
        count
        slug
      }
    }
  }
`;

async function listCategories() {
  const result = await client.query({ query: LIST_CATEGORIES });
  console.log(JSON.stringify(result.data.productCategories.nodes, null, 2));
}

listCategories();

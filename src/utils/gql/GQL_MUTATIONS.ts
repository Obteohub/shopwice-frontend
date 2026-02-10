import { gql } from '@apollo/client';

export const CREATE_USER = gql`
  mutation CreateUser(
    $username: String!
    $email: String!
    $password: String!
    $firstName: String
    $lastName: String
  ) {
    registerCustomer(
      input: {
        username: $username
        email: $email
        password: $password
        firstName: $firstName
        lastName: $lastName
      }
    ) {
      customer {
        id
        email
        firstName
        lastName
        username
      }
    }
  }
`;

export const LOGIN_USER = gql`
  mutation Login($username: String!, $password: String!) {
    login(input: { username: $username, password: $password }) {
      authToken
      refreshToken
      user {
        id
        databaseId
        email
        firstName
        lastName
        username
      }
    }
  }
`;

export const REFRESH_AUTH_TOKEN = gql`
  mutation RefreshAuthToken($refreshToken: String!) {
    refreshJwtAuthToken(input: { jwtRefreshToken: $refreshToken }) {
      authToken
    }
  }
`;

export const ADD_TO_CART = gql`
  mutation AddToCart($input: AddToCartInput!) {
    addToCart(input: $input) {
      cart {
        contents {
          nodes {
            key
            product {
              node {
                id
                databaseId
                name
                description
                type
                onSale
                slug
                averageRating
                reviewCount
                image {
                  id
                  sourceUrl
                  altText
                }
                galleryImages {
                  nodes {
                    id
                    sourceUrl
                    altText
                  }
                }
              }
            }
            variation {
              node {
                id
                databaseId
                name
                description
                type
                onSale
                price
                regularPrice
                salePrice
                image {
                  id
                  sourceUrl
                  altText
                }
                attributes {
                  nodes {
                    id
                    attributeId
                    name
                    value
                  }
                }
              }
            }
            quantity
            total
            subtotal
          }
        }
        subtotal
        total
      }
    }
  }
`;

export const CHECKOUT_MUTATION = gql`
  mutation CHECKOUT_MUTATION($input: CheckoutInput!) {
    checkout(input: $input) {
      result
      redirect
    }
  }
`;
export const UPDATE_CART = gql`
  mutation UpdateCart($input: UpdateItemQuantitiesInput!) {
    updateItemQuantities(input: $input) {
      cart {
        contents {
          nodes {
            key
            product {
              node {
                id
                databaseId
                name
                description
                type
                onSale
                slug
                averageRating
                reviewCount
                image {
                  id
                  sourceUrl
                  altText
                }
                galleryImages {
                  nodes {
                    id
                    sourceUrl
                    altText
                  }
                }
              }
            }
            variation {
              node {
                id
                databaseId
                name
                description
                type
                onSale
                price
                regularPrice
                salePrice
                image {
                  id
                  sourceUrl
                  altText
                }
                attributes {
                  nodes {
                    id
                    attributeId
                    name
                    value
                  }
                }
              }
            }
            quantity
            total
            subtotal
          }
        }
        subtotal
        total
      }
    }
  }
`;

export const UPDATE_CUSTOMER = gql`
  mutation UpdateCustomer($input: UpdateCustomerInput!) {
    updateCustomer(input: $input) {
      customer {
        shipping {
          firstName
          lastName
          address1
          address2
          city
          state
          postcode
          country
          email
          phone
        }
      }
    }
  }
`;

export const UPDATE_SHIPPING_METHOD = gql`
  mutation UpdateShippingMethod($input: UpdateShippingMethodInput!) {
    updateShippingMethod(input: $input) {
      cart {
        availableShippingMethods {
          packageDetails
          supportsShippingCalculator
          rates {
            id
            methodId
            label
            cost
          }
        }
        chosenShippingMethods
        shippingTotal
        total
      }
    }
  }
`;

export const SEND_PASSWORD_RESET_EMAIL = gql`
  mutation SendPasswordResetEmail($username: String!) {
    sendPasswordResetEmail(input: { username: $username }) {
      user {
        databaseId
      }
    }
  }
`;

export const RESET_USER_PASSWORD = gql`
  mutation ResetUserPassword($key: String!, $login: String!, $password: String!) {
    resetUserPassword(input: { key: $key, login: $login, password: $password }) {
      user {
        databaseId
        email
      }
    }
  }
`;
export const CLEAR_CART_MUTATION = gql`
  mutation CLEAR_CART_MUTATION($input: RemoveCouponsInput!) {
    removeCoupons(input: $input) {
      cart {
        contents {
           nodes {
               key
           }
        }
      }
    }
  }
`;
// Note: WC GraphQL doesn't have a direct 'emptyCart' mutation exposed by default in some versions.
// We usually empty it by removing all items or setting quantity to 0.
// We will use the existing UPDATE_CART logic to loop through and remove all items in the frontend component.

// Imports
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useQuery, useMutation } from '@apollo/client';
import { v4 as uuidv4 } from 'uuid';

// Components
import Button from '@/components/UI/Button.component';

// State
import { useCartStore } from '@/stores/cartStore';

// Utils
import { getFormattedCart } from '@/utils/functions/functions';

// GraphQL
import { GET_CART } from '@/utils/gql/GQL_QUERIES';
import { ADD_TO_CART } from '@/utils/gql/GQL_MUTATIONS';

interface IImage {
  __typename: string;
  id: string;
  uri: string;
  title: string;
  srcSet: string;
  sourceUrl: string;
}

interface IVariationNode {
  __typename: string;
  name: string;
}

interface IAllPaColor {
  __typename: string;
  nodes: IVariationNode[];
}

interface IAllPaSize {
  __typename: string;
  nodes: IVariationNode[];
}

export interface IVariationNodes {
  __typename: string;
  id: string;
  databaseId: number;
  name: string;
  stockStatus: string;
  stockQuantity: number;
  purchasable: boolean;
  onSale: boolean;
  salePrice?: string;
  regularPrice: string;
  sku?: string;
}

interface IVariations {
  __typename: string;
  nodes: IVariationNodes[];
}

export interface IProduct {
  __typename: string;
  id: string;
  databaseId: number;
  averageRating: number;
  slug: string;
  description: string;
  onSale: boolean;
  image: IImage;
  name: string;
  salePrice?: string;
  regularPrice: string;
  price: string;
  stockQuantity: number;
  sku?: string;
  stockStatus?: string;
  related?: {
    nodes: IProduct[];
  };
  upsell?: {
    nodes: IProduct[];
  };
  crossSell?: {
    nodes: IProduct[];
  };
  featured?: boolean;
  shortDescription?: string;
  reviewCount?: number;
  allPaColor?: IAllPaColor;
  allPaSize?: IAllPaSize;
  variations?: IVariations;
  productCategories?: {
    nodes: Array<{ name: string; slug: string }>;
  };
  productBrand?: {
    nodes: Array<{ name: string; slug: string }>;
  };
  galleryImages?: {
    nodes: IImage[];
  };
  reviews?: {
    nodes: Array<{
      id: string;
      content: string;
      date: string;
      rating: number;
      author: {
        node: {
          name: string;
        }
      }
    }>;
  };
  attributes?: {
    nodes: Array<{ name: string; options: string[] }>;
  };
}

export interface IProductRootObject {
  product: IProduct;
  variationId?: number;
  fullWidth?: boolean;
  buyNow?: boolean;
  quantity?: number;
}

/**
 * Handles the Add to cart functionality.
 * Uses GraphQL for product data
 * @param {IAddToCartProps} product // Product data
 * @param {number} variationId // Variation ID
 * @param {boolean} fullWidth // Whether the button should be full-width
 */

const AddToCart = ({
  product,
  variationId,
  fullWidth = false,
  buyNow = false,
  quantity = 1,
}: IProductRootObject) => {
  const router = useRouter();
  const { syncWithWooCommerce, isLoading: isCartLoading } = useCartStore();
  const [requestError, setRequestError] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  const productId = product?.databaseId ? product?.databaseId : variationId;

  const productQueryInput = {
    clientMutationId: uuidv4(), // Generate a unique id.
    productId,
    quantity,
  };

  // Get cart data query
  const { data, refetch } = useQuery(GET_CART, {
    notifyOnNetworkStatusChange: true,
  });

  useEffect(() => {
    if (data) {
      const updatedCart = getFormattedCart(data);
      if (updatedCart) {
        syncWithWooCommerce(updatedCart);
      }
    }
  }, [data, syncWithWooCommerce]);

  // Add to cart mutation
  const [addToCart, { loading: addToCartLoading, data: addToCartData, error: addToCartError }] = useMutation(ADD_TO_CART, {
    variables: {
      input: productQueryInput,
    },
    // Refetch all GET_CART queries to update cart across all components
    refetchQueries: [{ query: GET_CART }],
    awaitRefetchQueries: true,
  });

  useEffect(() => {
    if (addToCartData) {
      // Update the cart with new values in React context.
      setIsSuccess(true);
      const timer = setTimeout(() => setIsSuccess(false), 2000);

      if (buyNow) {
        router.push('/checkout');
      }

      return () => clearTimeout(timer);
    }
  }, [addToCartData, buyNow, router]);

  useEffect(() => {
    if (addToCartError) {
      console.log('Add to cart error:', addToCartError);
      setRequestError(true);
    }
  }, [addToCartError]);

  const handleAddToCart = () => {
    addToCart();
  };

  return (
    <>
      <Button
        handleButtonClick={() => handleAddToCart()}
        buttonDisabled={addToCartLoading || requestError || isCartLoading || isSuccess}
        fullWidth={fullWidth}
        className={
          isSuccess
            ? 'bg-green-600 hover:bg-green-700'
            : buyNow
              ? 'bg-orange-600 hover:bg-orange-700'
              : ''
        }
      >
        {isCartLoading ? 'Loading...' : isSuccess ? 'ADDED!' : (buyNow ? 'BUY NOW' : 'ADD TO CART')}
      </Button>
    </>
  );
};

export default AddToCart;

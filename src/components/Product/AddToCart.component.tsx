// Imports
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useMutation } from '@apollo/client';
import { v4 as uuidv4 } from 'uuid';

// Components
import Button from '@/components/UI/Button.component';
import LoadingSpinner from '@/components/LoadingSpinner/LoadingSpinner.component';

// State
import { useCartStore } from '@/stores/cartStore';

// Utils
import { getFormattedCart } from '@/utils/functions/functions';
import { ADD_TO_CART, UPDATE_CART } from '@/utils/gql/GQL_MUTATIONS';


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
  totalSales?: number;
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
  disabled?: boolean;
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
  disabled = false,
}: IProductRootObject) => {
  const router = useRouter();
  const { cart, syncWithWooCommerce, isLoading: isCartLoading } = useCartStore();
  const [requestError, setRequestError] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [isAdding, setIsAdding] = useState<boolean>(false);

  const productId = product?.databaseId ?? variationId;

  const [addToCart, { loading: mutationLoading }] = useMutation(ADD_TO_CART, {
    onCompleted: (data) => {
      if (data?.addToCart) {
        const formattedCart = getFormattedCart(data.addToCart);
        syncWithWooCommerce(formattedCart);
        setIsSuccess(true);
      }
      setIsAdding(false);
    },
    onError: (error) => {
      console.error('Add to cart error:', error);
      setRequestError(true);
      setIsAdding(false);
    }
  });

  const [updateCart] = useMutation(UPDATE_CART, {
    onCompleted: (data) => {
      if (data?.updateItemQuantities?.cart) {
        const formattedCart = getFormattedCart({ cart: data.updateItemQuantities.cart });
        syncWithWooCommerce(formattedCart);
      }
    },
    onError: (error) => {
      console.error('Update cart error:', error);
    }
  });

  useEffect(() => {
    if (isSuccess) {
      const timer = setTimeout(() => setIsSuccess(false), 2000);

      if (buyNow) {
        router.push('/checkout');
      }

      return () => clearTimeout(timer);
    }
  }, [isSuccess, buyNow, router]);

  const handleAddToCart = async () => {
    if (isAdding || mutationLoading) return;
    setIsAdding(true);
    setRequestError(false);

    // If Buy Now, try to clear cart first to remove "ghosts" and ensure clean checkout
    // Use global store state to check if cart has items
    if (buyNow && cart?.products && cart.products.length > 0) {
      try {
        const itemsToClear = cart.products.map((item) => ({
          key: item.cartKey,
          quantity: 0
        }));
        await updateCart({
          variables: {
            input: {
              clientMutationId: uuidv4(),
              items: itemsToClear
            }
          }
        });
      } catch (e) {
        console.error('AddToCart: Failed to clear cart before Buy Now', e);
      }
    }

    try {
      if (!productId) {
        console.warn('AddToCart: Missing productId');
        setRequestError(true);
        setIsAdding(false);
        return;
      }

      const input: any = {
        clientMutationId: uuidv4(),
        productId: productId,
        quantity: quantity,
      };

      if (variationId) {
        input.variationId = variationId;
      }

      await addToCart({ variables: { input } });
      
    } catch (e) {
      // Error handled in onError
      console.log('Add to cart execution error:', e);
    }
  };

  const isButtonDisabled = isAdding || mutationLoading || requestError || isCartLoading || isSuccess || disabled;

  return (
    <>
      <Button
        handleButtonClick={() => handleAddToCart()}
        buttonDisabled={isButtonDisabled}
        fullWidth={fullWidth}
        className={
          isSuccess
            ? 'bg-green-600 hover:bg-green-700'
            : buyNow
              ? 'bg-orange-600 hover:bg-orange-700'
              : ''
        }
      >
        {isCartLoading ? <LoadingSpinner color="white" size="sm" /> : isSuccess ? 'ADDED!' : (buyNow ? 'BUY NOW' : 'ADD TO CART')}
      </Button>
    </>
  );
};

export default AddToCart;

import { NextPage, InferGetStaticPropsType, GetStaticProps } from 'next';
import Categories from '@/components/Category/Categories.component';
import Layout from '@/components/Layout/Layout.component';
import { api } from '@/utils/api';
import { ENDPOINTS } from '@/utils/endpoints';

/**
 * Category page displays all of the categories
 */
const categories: NextPage = ({
  categories,
}: InferGetStaticPropsType<typeof getStaticProps>) => (
  <Layout title="categories">
    {categories && <Categories categories={categories} />}
  </Layout>
);

export default categories;

export const getStaticProps: GetStaticProps = async () => {
  try {
    const categories: any = await api.get(ENDPOINTS.CATEGORIES);

    // Filter root categories (parent is 0 or null)
    const rootCategories = categories.filter((cat: any) => !cat.parent || Number(cat.parent) === 0);

    return {
      props: {
        categories: rootCategories,
      },
      revalidate: 60,
    };
  } catch (error) {
    console.error('Error fetching categories:', error);
    return {
      props: {
        categories: [],
      },
      revalidate: 10,
    };
  }
};

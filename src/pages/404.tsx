import NotFoundView from '@/components/Errors/NotFoundView.component';
import { Product } from '@/types/product';
import { getNotFoundPageProducts } from '@/utils/notFoundPageData';

interface Custom404Props {
    bestSellers: Product[];
    newest: Product[];
    topRated: Product[];
}

export default function Custom404({ bestSellers, newest, topRated }: Custom404Props) {
    return <NotFoundView bestSellers={bestSellers} newest={newest} topRated={topRated} />;
}

export async function getStaticProps() {
    return {
        props: await getNotFoundPageProducts(),
    };
}

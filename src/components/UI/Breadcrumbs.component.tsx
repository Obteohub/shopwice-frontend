// Breadcrumbs - Refined
import React from 'react';
import Link from 'next/link';

interface CategoryNode {
    name: string;
    slug: string;
    ancestors?: {
        nodes: Array<{ name: string; slug: string }>;
    };
}

interface BreadcrumbsProps {
    categories?: {
        nodes: CategoryNode[];
    };
    productName: string;
}

const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ categories, productName }) => {
    // Safety check for categories
    if (!categories?.nodes || categories.nodes.length === 0) {
        return (
            <nav className="text-sm text-gray-500 mb-4 overflow-x-auto whitespace-nowrap pb-2">
                <ul className="flex items-center space-x-1">
                    <li>
                        <Link href="/" className="hover:text-black transition-colors">
                            Home
                        </Link>
                    </li>
                    <li>
                        <span className="text-gray-400">/</span>
                    </li>
                    <li className="text-gray-900 font-medium truncate max-w-[200px] md:max-w-xs" title={productName}>
                        {productName}
                    </li>
                </ul>
            </nav>
        );
    }

    // Find the category with the most ancestors (deepest nested)
    const deepCategory = categories.nodes.reduce((prev, current) => {
        const prevDepth = prev.ancestors?.nodes?.length || 0;
        const currentDepth = current.ancestors?.nodes?.length || 0;
        return currentDepth > prevDepth ? current : prev;
    }, categories.nodes[0]);

    // Construct the full path: [...ancestors, currentCategory]
    // WPGraphQL ancestors are usually returned from closest parent to furthest (Child -> Parent -> Root)
    // So we need to reverse them to get Root -> Parent -> Child
    const ancestors = deepCategory?.ancestors?.nodes ? [...deepCategory.ancestors.nodes].reverse() : [];
    const fullPath = deepCategory ? [...ancestors, deepCategory] : [];

    return (
        <nav className="text-sm text-gray-500 mb-4 overflow-x-auto whitespace-nowrap pb-2">
            <ul className="flex items-center space-x-1">
                <li>
                    <Link href="/" className="hover:text-black transition-colors">
                        Home
                    </Link>
                </li>
                <li>
                    <span className="text-gray-400">/</span>
                </li>

                {fullPath.map((cat, index) => (
                    <React.Fragment key={cat.slug || index}>
                        <li>
                            <Link href={`/product-category/${cat.slug}`} className="hover:text-black transition-colors">
                                {cat.name || cat.slug}
                            </Link>
                        </li>
                        <li>
                            <span className="text-gray-400">/</span>
                        </li>
                    </React.Fragment>
                ))}

                <li className="text-gray-900 font-medium truncate max-w-[200px] md:max-w-xs" title={productName}>
                    {productName}
                </li>
            </ul>
        </nav>
    );
};

export default Breadcrumbs;

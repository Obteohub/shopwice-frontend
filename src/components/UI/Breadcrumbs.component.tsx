import React from 'react';
import Link from 'next/link';
import { decodeHtmlEntities } from '@/utils/text';

type Ancestor = { id?: number | string; name: string; slug: string };

export type RestCategory = {
  id?: number | string;
  name: string;
  slug: string;
  parent?: number | string;
  ancestors?: Ancestor[];
};

interface BreadcrumbsProps {
  categories?: RestCategory[] | null;
  productName: string;
}

const normalizeId = (value: unknown): string => {
  const parsed = Number(value);
  if (Number.isFinite(parsed) && parsed > 0) return String(Math.floor(parsed));
  return String(value ?? '').trim();
};

const decodeLabel = (value: unknown): string =>
  decodeHtmlEntities(String(value ?? '').trim());

const dedupeBySlug = <T extends { slug?: string }>(items: T[]) => {
  const seen = new Set<string>();
  return items.filter((entry) => {
    const key = String(entry?.slug || '').trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const chooseDeepCategory = (categories: RestCategory[]) =>
  categories.reduce((prev, cur) => {
    const prevDepth = prev?.ancestors?.length || 0;
    const curDepth = cur?.ancestors?.length || 0;
    if (curDepth !== prevDepth) return curDepth > prevDepth ? cur : prev;

    const prevHasParent = Boolean(normalizeId(prev?.parent));
    const curHasParent = Boolean(normalizeId(cur?.parent));
    if (!prevHasParent && curHasParent) return cur;

    return prev;
  }, categories[0]);

const buildPathFromParentLinks = (
  categories: RestCategory[],
  deepCategory: RestCategory,
): Ancestor[] => {
  const byId = new Map<string, RestCategory>();
  categories.forEach((cat) => {
    const id = normalizeId(cat?.id);
    if (id) byId.set(id, cat);
  });

  const visited = new Set<string>();
  const result: Ancestor[] = [];
  let cursor: RestCategory | undefined = deepCategory;

  while (cursor) {
    const slug = String(cursor.slug || '').trim();
    if (!slug) break;

    const visitKey = `${normalizeId(cursor.id)}:${slug.toLowerCase()}`;
    if (visited.has(visitKey)) break;
    visited.add(visitKey);

    result.unshift({
      id: cursor.id,
      name: decodeLabel(cursor.name || slug),
      slug,
    });

    const parentId = normalizeId(cursor.parent);
    if (!parentId || parentId === '0') break;
    cursor = byId.get(parentId);
  }

  return dedupeBySlug(result);
};

const buildFullPath = (categories: RestCategory[]): Ancestor[] => {
  if (categories.length === 0) return [];
  const deep = chooseDeepCategory(categories);
  if (!deep) return [];

  const payloadPath = dedupeBySlug(
    [
      ...(Array.isArray(deep.ancestors) ? deep.ancestors : []),
      { id: deep.id, name: deep.name, slug: deep.slug },
    ]
      .filter((entry) => String(entry?.slug || '').trim().length > 0)
      .map((entry) => ({
        ...entry,
        name: decodeLabel(entry.name || entry.slug),
      })),
  );

  if (payloadPath.length > 0) return payloadPath;

  return buildPathFromParentLinks(categories, deep);
};

const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ categories, productName }) => {
  const cats = Array.isArray(categories) ? categories : [];
  const safeProductName = decodeLabel(productName);
  const fullPath = buildFullPath(cats);

  return (
    <nav className="text-sm text-gray-500 mb-4 pb-2" aria-label="Breadcrumb">
      <div className="overflow-x-auto">
        <ul className="flex flex-nowrap items-center gap-1 min-w-max">
          <li className="shrink-0">
            <Link href="/" className="hover:text-black transition-colors">
              Home
            </Link>
          </li>
          <li className="shrink-0">
            <span className="text-gray-400">/</span>
          </li>

          {fullPath.map((cat, idx) => (
            <React.Fragment key={`${cat.slug}-${idx}`}>
              <li className="shrink-0">
                <Link
                  href={`/product-category/${cat.slug}`}
                  className="hover:text-black transition-colors whitespace-nowrap"
                >
                  {decodeLabel(cat.name || cat.slug)}
                </Link>
              </li>
              <li className="shrink-0">
                <span className="text-gray-400">/</span>
              </li>
            </React.Fragment>
          ))}

          <li
            className="text-gray-900 font-medium whitespace-nowrap shrink-0"
            title={safeProductName}
          >
            {safeProductName}
          </li>
        </ul>
      </div>
    </nav>
  );
};

export default Breadcrumbs;

import { useEffect, useMemo, useState } from 'react';
import Accordion from '@/components/UI/Accordion.component';
import Checkbox from '@/components/UI/Checkbox.component';
import type { ApiFacetGroup, ApiFacetTerm, CollectionFilterState, StockStatus } from '@/features/collection/types';
import { api } from '@/utils/api';
import { ENDPOINTS } from '@/utils/endpoints';

export type FilterFacetOption = {
  value: string;
  label: string;
  slug?: string;
  count?: number;
};

type FilterFacetSection = {
  key: string;
  title: string;
  options: FilterFacetOption[];
};

type BrandTreeItem = {
  label: string;
  path: string;
  count?: number;
  isCurrent?: boolean;
};

type BrandFilterHierarchy = {
  trail: BrandTreeItem[];
  children: BrandTreeItem[];
};

type BrandTaxonomyTerm = {
  id?: number | string;
  databaseId?: number | string;
  slug?: string;
  name?: string;
  parent?: number | string | null;
};

type BrandTaxonomyNode = {
  id: string;
  slug: string;
  name: string;
  parentId: string | null;
};

type BrandTaxonomyIndex = {
  byId: Map<string, BrandTaxonomyNode>;
  bySlug: Map<string, BrandTaxonomyNode>;
  byName: Map<string, BrandTaxonomyNode>;
  childrenByParent: Map<string, BrandTaxonomyNode[]>;
};

let brandTaxonomyCache: BrandTaxonomyIndex | null = null;
let brandTaxonomyPromise: Promise<BrandTaxonomyIndex> | null = null;

interface ProductFiltersProps {
  state: CollectionFilterState;
  facets: ApiFacetGroup[];
  priceBounds?: [number, number];
  hasExplicitPriceFilter?: boolean;
  onToggleCategory: (value: string) => void;
  onToggleBrand: (value: string) => void;
  onSetBrands?: (values: string[]) => void;
  onToggleTag: (value: string) => void;
  onToggleLocation: (value: string) => void;
  onToggleStockStatus: (value: StockStatus) => void;
  onToggleAttribute: (taxonomy: string, value: string) => void;
  onSetBoolean: (key: 'inStock' | 'onSale', value: boolean | undefined) => void;
  onSetNumber: (
    key: 'minPrice' | 'maxPrice' | 'minRating' | 'maxRating',
    value: number | undefined,
  ) => void;
  onClearAll: () => void;
  isLoading: boolean;
  error: string | null;
  routeTaxonomy?: 'category' | 'brand' | 'tag' | 'location';
  brandHierarchy?: BrandFilterHierarchy;
  onNavigateBrandPath?: (path: string) => void;
}

const canonicalizeTaxonomyKey = (value: string) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/^pa_/, '')
    .replace(/^attr_/, '')
    .replace(/^attribute_/, '')
    .replace(/\s+/g, '-')
    .replace(/_+/g, '-');

const normalizeBrandId = (value: unknown): string => {
  const parsed = Number(value);
  if (Number.isFinite(parsed) && parsed > 0) return String(Math.floor(parsed));
  const fallback = String(value ?? '').trim();
  return fallback || '';
};

const normalizeSlug = (value: unknown) =>
  String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/_+/g, '-');

const normalizeNameKey = (value: unknown) =>
  String(value ?? '')
    .trim()
    .toLowerCase();

const normalizeBrandPayload = (payload: unknown): BrandTaxonomyTerm[] => {
  if (Array.isArray(payload)) return payload as BrandTaxonomyTerm[];
  if (!payload || typeof payload !== 'object') return [];
  const source = payload as Record<string, unknown>;
  if (Array.isArray(source.data)) return source.data as BrandTaxonomyTerm[];
  if (Array.isArray(source.items)) return source.items as BrandTaxonomyTerm[];
  if (Array.isArray(source.results)) return source.results as BrandTaxonomyTerm[];
  if (Array.isArray(source.brands)) return source.brands as BrandTaxonomyTerm[];
  return [];
};

const buildBrandTaxonomyIndex = (terms: BrandTaxonomyTerm[]): BrandTaxonomyIndex => {
  const byId = new Map<string, BrandTaxonomyNode>();
  const bySlug = new Map<string, BrandTaxonomyNode>();
  const byName = new Map<string, BrandTaxonomyNode>();
  const childrenByParent = new Map<string, BrandTaxonomyNode[]>();

  terms.forEach((entry) => {
    const id = normalizeBrandId(entry.databaseId ?? entry.id);
    const slug = normalizeSlug(entry.slug ?? entry.name);
    const name = String(entry.name ?? '').trim();
    if (!id || !slug || !name) return;

    const parentRaw = normalizeBrandId(entry.parent);
    const parentId = parentRaw && parentRaw !== '0' ? parentRaw : null;
    const node: BrandTaxonomyNode = { id, slug, name, parentId };

    byId.set(node.id, node);
    bySlug.set(node.slug, node);
    byName.set(normalizeNameKey(node.name), node);
  });

  byId.forEach((node) => {
    const parentKey = node.parentId ?? '0';
    const list = childrenByParent.get(parentKey) ?? [];
    list.push(node);
    childrenByParent.set(parentKey, list);
  });

  childrenByParent.forEach((list) => {
    list.sort((a, b) => a.name.localeCompare(b.name));
  });

  return { byId, bySlug, byName, childrenByParent };
};

const loadBrandTaxonomyIndex = async (): Promise<BrandTaxonomyIndex> => {
  if (brandTaxonomyCache) return brandTaxonomyCache;
  if (brandTaxonomyPromise) return brandTaxonomyPromise;

  brandTaxonomyPromise = (async () => {
    const terms: BrandTaxonomyTerm[] = [];
    const seen = new Set<string>();

    for (let page = 1; page <= 50; page += 1) {
      const payload = await api.get<unknown>(ENDPOINTS.BRANDS, {
        params: { per_page: 100, page },
      });
      const batch = normalizeBrandPayload(payload);
      if (!batch.length) break;

      let appended = 0;
      batch.forEach((entry) => {
        const id = normalizeBrandId(entry.databaseId ?? entry.id);
        if (!id || seen.has(id)) return;
        seen.add(id);
        terms.push(entry);
        appended += 1;
      });

      if (appended === 0 || batch.length < 100) break;
    }

    // Some environments return an unpaginated payload; use it if paginated reads were empty.
    if (terms.length === 0) {
      const fallback = await api.get<unknown>(ENDPOINTS.BRANDS);
      normalizeBrandPayload(fallback).forEach((entry) => {
        const id = normalizeBrandId(entry.databaseId ?? entry.id);
        if (!id || seen.has(id)) return;
        seen.add(id);
        terms.push(entry);
      });
    }

    const index = buildBrandTaxonomyIndex(terms);
    brandTaxonomyCache = index;
    return index;
  })()
    .finally(() => {
      brandTaxonomyPromise = null;
    });

  return brandTaxonomyPromise;
};

const normalizeTerm = (term: ApiFacetTerm): FilterFacetOption | null => {
  const label = String(term.name ?? term.label ?? term.value ?? term.slug ?? '').trim();
  if (!label) return null;

  const value = String(term.value ?? term.id ?? term.slug ?? label).trim();
  if (!value) return null;

  const count = Number(term.count);

  return {
    value,
    label,
    slug: String(term.slug ?? '').trim() || undefined,
    count: Number.isFinite(count) ? count : undefined,
  };
};

const normalizeOptions = (group: ApiFacetGroup): FilterFacetOption[] => {
  const fromTerms = Array.isArray(group.terms)
    ? group.terms.map(normalizeTerm).filter(Boolean) as FilterFacetOption[]
    : [];

  const fromOptions = Array.isArray(group.options)
    ? group.options
        .map((option) => {
          const label = String(option ?? '').trim();
          if (!label) return null;
          return {
            value: label,
            label,
          } satisfies FilterFacetOption;
        })
        .filter(Boolean) as FilterFacetOption[]
    : [];

  const merged = new Map<string, FilterFacetOption>();
  [...fromTerms, ...fromOptions].forEach((entry) => {
    const key = entry.value.toLowerCase();
    if (!key || merged.has(key)) return;
    merged.set(key, entry);
  });

  return Array.from(merged.values()).sort((a, b) => a.label.localeCompare(b.label));
};

const toFacetSections = (facets: ApiFacetGroup[]) => {
  const taxonomySections = new Map<string, FilterFacetSection>();
  const attributeSections: FilterFacetSection[] = [];

  const pushTaxonomy = (key: string, title: string, options: FilterFacetOption[]) => {
    if (!options.length) return;
    taxonomySections.set(key, {
      key,
      title,
      options,
    });
  };

  facets.forEach((group) => {
    const taxonomy = canonicalizeTaxonomyKey(
      String(group.taxonomy ?? group.name ?? group.label ?? ''),
    );
    if (!taxonomy) return;

    const options = normalizeOptions(group);
    if (!options.length) return;

    if (taxonomy === 'categories' || taxonomy === 'category') {
      pushTaxonomy('category', 'Categories', options);
      return;
    }
    if (taxonomy === 'brand' || taxonomy === 'brands' || taxonomy === 'product-brand') {
      pushTaxonomy('brand', 'Brands', options);
      return;
    }
    if (taxonomy === 'tag' || taxonomy === 'tags' || taxonomy === 'product-tag') {
      pushTaxonomy('tag', 'Tags', options);
      return;
    }
    if (taxonomy === 'location' || taxonomy === 'locations' || taxonomy === 'product-location') {
      pushTaxonomy('location', 'Locations', options);
      return;
    }

    attributeSections.push({
      key: taxonomy,
      title: String(group.label ?? group.name ?? taxonomy).trim() || taxonomy,
      options,
    });
  });

  return {
    category: taxonomySections.get('category'),
    brand: taxonomySections.get('brand'),
    tag: taxonomySections.get('tag'),
    location: taxonomySections.get('location'),
    attributes: attributeSections.sort((a, b) => a.title.localeCompare(b.title)),
  };
};

const toInputNumber = (value: string): number | undefined => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return undefined;
  return parsed;
};

type BrandFacetLevel = {
  depth: number;
  options: FilterFacetOption[];
};

type BrandFacetChainItem = {
  nodeId: string;
  value: string;
  label: string;
};

type BrandFacetView = {
  levels: BrandFacetLevel[];
  activeChainNodeIds: string[];
  activeChain: BrandFacetChainItem[];
};

const matchesOptionValue = (left: string, right: string) =>
  String(left || '').trim().toLowerCase() === String(right || '').trim().toLowerCase();

const normalizeBrandSelectionArray = (values: string[]) => {
  const seen = new Set<string>();
  const output: string[] = [];
  values.forEach((entry) => {
    const normalized = String(entry || '').trim();
    const key = normalized.toLowerCase();
    if (!key || seen.has(key)) return;
    seen.add(key);
    output.push(normalized);
  });
  return output;
};

const areSameBrandSelections = (left: string[], right: string[]) => {
  const normalizedLeft = normalizeBrandSelectionArray(left);
  const normalizedRight = normalizeBrandSelectionArray(right);
  if (normalizedLeft.length !== normalizedRight.length) return false;
  return normalizedLeft.every((value, index) => value.toLowerCase() === normalizedRight[index].toLowerCase());
};

const ProductFilters = ({
  state,
  facets,
  priceBounds,
  hasExplicitPriceFilter = false,
  onToggleCategory,
  onToggleBrand,
  onSetBrands,
  onToggleTag,
  onToggleLocation,
  onToggleStockStatus,
  onToggleAttribute,
  onSetBoolean,
  onSetNumber,
  onClearAll,
  isLoading,
  error,
  routeTaxonomy,
  brandHierarchy,
  onNavigateBrandPath,
}: ProductFiltersProps) => {
  const sections = useMemo(() => toFacetSections(facets), [facets]);
  const [brandTaxonomyIndex, setBrandTaxonomyIndex] = useState<BrandTaxonomyIndex | null>(null);

  useEffect(() => {
    let active = true;
    // Avoid loading the global brand taxonomy on every listing page.
    // Only hydrate hierarchical brand index for brand-scoped routes.
    if (!sections.brand || routeTaxonomy !== 'brand' || brandHierarchy) {
      return () => {
        active = false;
      };
    }

    void loadBrandTaxonomyIndex()
      .then((index) => {
        if (!active) return;
        setBrandTaxonomyIndex(index);
      })
      .catch(() => {
        if (!active) return;
        setBrandTaxonomyIndex(null);
      });

    return () => {
      active = false;
    };
  }, [brandHierarchy, routeTaxonomy, sections.brand]);

  const brandFacetView = useMemo<BrandFacetView | null>(() => {
    if (routeTaxonomy !== 'brand') return null;
    if (!sections.brand) return null;
    if (!brandTaxonomyIndex) return null;

    const options = sections.brand.options;
    if (!options.length) return null;

    const resolveNodeFromRawValue = (rawValue: string): BrandTaxonomyNode | null => {
      const normalized = String(rawValue || '').trim();
      if (!normalized) return null;
      const asId = normalizeBrandId(normalized);
      if (asId && brandTaxonomyIndex.byId.has(asId)) return brandTaxonomyIndex.byId.get(asId)!;

      const asSlug = normalizeSlug(normalized);
      if (asSlug && brandTaxonomyIndex.bySlug.has(asSlug)) return brandTaxonomyIndex.bySlug.get(asSlug)!;

      const asName = normalizeNameKey(normalized);
      if (asName && brandTaxonomyIndex.byName.has(asName)) return brandTaxonomyIndex.byName.get(asName)!;
      return null;
    };

    const resolveNodeFromOption = (option: FilterFacetOption): BrandTaxonomyNode | null => {
      const candidates = [option.value, option.slug, option.label]
        .map((entry) => String(entry || '').trim())
        .filter(Boolean);
      for (const candidate of candidates) {
        const node = resolveNodeFromRawValue(candidate);
        if (node) return node;
      }
      return null;
    };

    const optionNodePairs = options
      .map((option) => ({ option, node: resolveNodeFromOption(option) }))
      .filter((entry) => !!entry.node) as Array<{ option: FilterFacetOption; node: BrandTaxonomyNode }>;

    if (!optionNodePairs.length) return null;

    const optionByNodeId = new Map<string, FilterFacetOption>();
    const uniqueNodesById = new Map<string, BrandTaxonomyNode>();
    optionNodePairs.forEach(({ option, node }) => {
      if (!optionByNodeId.has(node.id)) {
        optionByNodeId.set(node.id, option);
      }
      if (!uniqueNodesById.has(node.id)) {
        uniqueNodesById.set(node.id, node);
      }
    });

    const availableNodeIds = new Set(uniqueNodesById.keys());
    const sortNodesByLabel = (nodes: BrandTaxonomyNode[]) =>
      [...nodes].sort((left, right) => {
        const leftLabel = optionByNodeId.get(left.id)?.label ?? left.name;
        const rightLabel = optionByNodeId.get(right.id)?.label ?? right.name;
        return leftLabel.localeCompare(rightLabel);
      });

    const rootNodes = sortNodesByLabel(
      Array.from(uniqueNodesById.values()).filter(
        (node) => !node.parentId || node.parentId === '0' || !availableNodeIds.has(node.parentId),
      ),
    );

    const optionFromNodes = (nodes: BrandTaxonomyNode[]) =>
      nodes
        .map((node) => optionByNodeId.get(node.id))
        .filter(Boolean) as FilterFacetOption[];

    const depthOfNode = (node: BrandTaxonomyNode) => {
      let depth = 0;
      let cursor: BrandTaxonomyNode | null = node;
      const visited = new Set<string>();
      while (cursor?.parentId && !visited.has(cursor.id)) {
        visited.add(cursor.id);
        const parentNode: BrandTaxonomyNode | null = brandTaxonomyIndex.byId.get(cursor.parentId) ?? null;
        if (!parentNode) break;
        depth += 1;
        cursor = parentNode;
      }
      return depth;
    };

    const selectedNodes = state.brand
      .map((selected) => resolveNodeFromRawValue(selected))
      .filter((node): node is BrandTaxonomyNode => Boolean(node && availableNodeIds.has(node.id)));

    const activeNode =
      selectedNodes.length > 0
        ? [...selectedNodes].sort((left, right) => depthOfNode(right) - depthOfNode(left))[0]
        : null;

    const activeChainNodeIds: string[] = [];
    if (activeNode) {
      let cursor: BrandTaxonomyNode | null = activeNode;
      const visited = new Set<string>();
      while (cursor && !visited.has(cursor.id)) {
        visited.add(cursor.id);
        if (availableNodeIds.has(cursor.id)) {
          activeChainNodeIds.unshift(cursor.id);
        }
        if (!cursor.parentId) break;
        cursor = brandTaxonomyIndex.byId.get(cursor.parentId) ?? null;
      }
    }

    const levels: BrandFacetLevel[] = [];
    const rootOptions = optionFromNodes(rootNodes);
    if (rootOptions.length > 0) {
      levels.push({ depth: 0, options: rootOptions });
    }

    activeChainNodeIds.forEach((nodeId, index) => {
      const childNodes = sortNodesByLabel(
        (brandTaxonomyIndex.childrenByParent.get(nodeId) ?? []).filter((node) =>
          availableNodeIds.has(node.id),
        ),
      );
      const childOptions = optionFromNodes(childNodes);
      if (!childOptions.length) return;
      levels.push({ depth: index + 1, options: childOptions });
    });

    const activeChain: BrandFacetChainItem[] = activeChainNodeIds
      .map((nodeId) => {
        const node = brandTaxonomyIndex.byId.get(nodeId);
        if (!node) return null;
        const option = optionByNodeId.get(nodeId);
        return {
          nodeId,
          value: String(option?.value ?? node.slug ?? node.id),
          label: String(option?.label ?? node.name),
        } satisfies BrandFacetChainItem;
      })
      .filter(Boolean) as BrandFacetChainItem[];

    return {
      levels,
      activeChainNodeIds,
      activeChain,
    };
  }, [brandTaxonomyIndex, routeTaxonomy, sections.brand, state.brand]);

  const activeFilterCount = useMemo(() => {
    const hasBoundMin = Array.isArray(priceBounds) && Number.isFinite(priceBounds[0]);
    const hasBoundMax = Array.isArray(priceBounds) && Number.isFinite(priceBounds[1]);
    const hasMinPriceFilter =
      hasExplicitPriceFilter &&
      typeof state.minPrice === 'number' &&
      Number.isFinite(state.minPrice) &&
      (!hasBoundMin || state.minPrice > Number(priceBounds[0]));
    const hasMaxPriceFilter =
      hasExplicitPriceFilter &&
      typeof state.maxPrice === 'number' &&
      Number.isFinite(state.maxPrice) &&
      (!hasBoundMax || state.maxPrice < Number(priceBounds[1]));

    return (
      (state.category ? 1 : 0) +
      state.brand.length +
      state.tag.length +
      state.location.length +
      (hasMinPriceFilter ? 1 : 0) +
      (hasMaxPriceFilter ? 1 : 0) +
      (state.minRating !== undefined ? 1 : 0) +
      (state.maxRating !== undefined ? 1 : 0) +
      state.stockStatus.length +
      (state.inStock !== undefined ? 1 : 0) +
      (state.onSale !== undefined ? 1 : 0) +
      Object.values(state.attributes).reduce((sum, values) => sum + values.length, 0)
    );
  }, [hasExplicitPriceFilter, priceBounds, state]);

  const stockStatusOptions: Array<{ value: StockStatus; label: string }> = [
    { value: 'instock', label: 'In Stock' },
    { value: 'outofstock', label: 'Out of Stock' },
    { value: 'onbackorder', label: 'On Backorder' },
  ];

  const resolveBrandNodeFromValue = (rawValue: string): BrandTaxonomyNode | null => {
    if (!brandTaxonomyIndex) return null;
    const normalized = String(rawValue || '').trim();
    if (!normalized) return null;

    const asId = normalizeBrandId(normalized);
    if (asId && brandTaxonomyIndex.byId.has(asId)) return brandTaxonomyIndex.byId.get(asId)!;

    const asSlug = normalizeSlug(normalized);
    if (asSlug && brandTaxonomyIndex.bySlug.has(asSlug)) return brandTaxonomyIndex.bySlug.get(asSlug)!;

    const asName = normalizeNameKey(normalized);
    if (asName && brandTaxonomyIndex.byName.has(asName)) return brandTaxonomyIndex.byName.get(asName)!;

    return null;
  };

  const setBrandState = (nextValues: string[]) => {
    const deduped = normalizeBrandSelectionArray(nextValues);
    const current = normalizeBrandSelectionArray(Array.isArray(state.brand) ? state.brand : []);
    if (areSameBrandSelections(current, deduped)) return;

    if (onSetBrands) {
      onSetBrands(deduped);
      return;
    }

    const hasValue = (values: string[], target: string) =>
      values.some((entry) => matchesOptionValue(entry, target));

    current.forEach((value) => {
      if (hasValue(deduped, value)) return;
      onToggleBrand(value);
    });

    deduped.forEach((value) => {
      if (hasValue(current, value)) return;
      onToggleBrand(value);
    });
  };

  const handleBrandSelection = (selectedValue: string) => {
    if (!brandTaxonomyIndex) {
      onToggleBrand(selectedValue);
      return;
    }

    const current = Array.isArray(state.brand) ? state.brand : [];
    const selectedNode = resolveBrandNodeFromValue(selectedValue);
    if (!selectedNode) {
      onToggleBrand(selectedValue);
      return;
    }

    const isAlreadySelected = current.some((value) => matchesOptionValue(value, selectedValue));
    if (isAlreadySelected) {
      const chain = brandFacetView?.activeChainNodeIds ?? [];
      const selectedIndex = chain.findIndex((nodeId) => nodeId === selectedNode.id);
      if (selectedIndex > 0) {
        const parentNodeId = chain[selectedIndex - 1];
        let parentValue: string | undefined;
        brandFacetView?.levels.forEach((level) => {
          if (parentValue) return;
          level.options.forEach((option) => {
            if (parentValue) return;
            const optionNode = resolveBrandNodeFromValue(option.value);
            if (optionNode?.id === parentNodeId) {
              parentValue = option.value;
            }
          });
        });
        if (parentValue) {
          setBrandState([parentValue]);
          return;
        }
      }

      setBrandState([]);
      return;
    }

    // Strict hierarchical mode: exactly one selected brand node at a time.
    setBrandState([selectedValue]);
  };

  return (
    <div className="w-full" aria-label="Product filters" data-testid="collection-filters-panel">
      <div className="mb-3 px-2 border-b border-gray-100 pb-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-gray-600">
            {activeFilterCount > 0
              ? `${activeFilterCount} active filter${activeFilterCount > 1 ? 's' : ''}`
              : 'Filter products'}
          </p>
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={onClearAll}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700"
              data-testid="filters-clear-all"
            >
              Clear all
            </button>
          )}
        </div>
      </div>

      {error && (
        <div
          className="mx-2 mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
          role="alert"
          data-testid="filters-error"
        >
          {error}
        </div>
      )}

      <Accordion title="Price" defaultOpen={true}>
        <div className="grid grid-cols-2 gap-2 px-2 pb-2">
          <div>
            <label htmlFor="filter-min-price" className="block text-xs text-gray-600 mb-1">
              Min price
            </label>
            <input
              id="filter-min-price"
              type="number"
              inputMode="numeric"
              value={state.minPrice ?? ''}
              onChange={(event) => onSetNumber('minPrice', toInputNumber(event.target.value))}
              className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              data-testid="filter-min-price"
            />
          </div>
          <div>
            <label htmlFor="filter-max-price" className="block text-xs text-gray-600 mb-1">
              Max price
            </label>
            <input
              id="filter-max-price"
              type="number"
              inputMode="numeric"
              value={state.maxPrice ?? ''}
              onChange={(event) => onSetNumber('maxPrice', toInputNumber(event.target.value))}
              className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              data-testid="filter-max-price"
            />
          </div>
        </div>
      </Accordion>

      <Accordion title="Ratings">
        <div className="grid grid-cols-2 gap-2 px-2 pb-2">
          <div>
            <label htmlFor="filter-min-rating" className="block text-xs text-gray-600 mb-1">
              Min rating
            </label>
            <select
              id="filter-min-rating"
              value={state.minRating ?? ''}
              onChange={(event) =>
                onSetNumber(
                  'minRating',
                  event.target.value ? Number(event.target.value) : undefined,
                )
              }
              className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              data-testid="filter-min-rating"
            >
              <option value="">Any</option>
              {[1, 2, 3, 4, 5].map((rating) => (
                <option key={`min-rating-${rating}`} value={rating}>
                  {rating}+
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="filter-max-rating" className="block text-xs text-gray-600 mb-1">
              Max rating
            </label>
            <select
              id="filter-max-rating"
              value={state.maxRating ?? ''}
              onChange={(event) =>
                onSetNumber(
                  'maxRating',
                  event.target.value ? Number(event.target.value) : undefined,
                )
              }
              className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              data-testid="filter-max-rating"
            >
              <option value="">Any</option>
              {[1, 2, 3, 4, 5].map((rating) => (
                <option key={`max-rating-${rating}`} value={rating}>
                  {rating}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Accordion>

      <Accordion title="Availability">
        <div className="px-2 pb-2 space-y-1">
          <Checkbox
            id="filter-in-stock"
            label="Only in stock"
            checked={state.inStock === true}
            onChange={() => onSetBoolean('inStock', state.inStock === true ? undefined : true)}
          />
          <Checkbox
            id="filter-on-sale"
            label="On sale"
            checked={state.onSale === true}
            onChange={() => onSetBoolean('onSale', state.onSale === true ? undefined : true)}
          />
          <fieldset className="pt-1">
            <legend className="text-xs font-semibold text-gray-600 mb-1">Stock status</legend>
            {stockStatusOptions.map((statusOption) => (
              <Checkbox
                key={statusOption.value}
                id={`stock-status-${statusOption.value}`}
                label={statusOption.label}
                checked={state.stockStatus.includes(statusOption.value)}
                onChange={() => onToggleStockStatus(statusOption.value)}
              />
            ))}
          </fieldset>
        </div>
      </Accordion>

      {sections.category && (
        <Accordion title={sections.category.title}>
          <div className="px-2 pb-2 max-h-56 overflow-y-auto custom-scrollbar">
            {sections.category.options.map((option) => (
              <Checkbox
                key={`category-${option.value}`}
                id={`category-${option.value}`}
                label={
                  option.count !== undefined ? `${option.label} (${option.count})` : option.label
                }
                checked={String(state.category || '').toLowerCase() === option.value.toLowerCase()}
                onChange={() => onToggleCategory(option.value)}
              />
            ))}
            {routeTaxonomy === 'category' && (
              <p className="text-[11px] text-gray-500 mt-2">
                Category route is locked to URL scope.
              </p>
            )}
          </div>
        </Accordion>
      )}

      {true && (
        <Accordion title={sections.brand?.title || 'Brands'} defaultOpen={true}>
          {routeTaxonomy === 'brand' && brandHierarchy ? (
            <div className="px-2 pb-2 space-y-3">
              <div>
                <div className="overflow-x-auto">
                  <div className="flex flex-nowrap items-center gap-1 min-w-max">
                    {brandHierarchy.trail.map((item, index) => (
                      <div key={`brand-trail-${index}`} className="flex items-center gap-1 shrink-0">
                        {index > 0 && (
                          <span className="text-gray-400" aria-hidden="true">
                            {'>'}
                          </span>
                        )}
                        {item.isCurrent ? (
                          <span className="text-sm font-semibold text-gray-900 whitespace-nowrap">{item.label}</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onNavigateBrandPath?.(item.path)}
                            className="text-sm text-blue-700 hover:text-blue-800 hover:underline whitespace-nowrap"
                          >
                            {item.label}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {brandHierarchy.children.length > 0 && (
                <div>
                  <div className="space-y-1">
                    {brandHierarchy.children.map((item, index) => (
                      <Checkbox
                        key={`brand-child-${index}`}
                        id={`brand-child-${index}`}
                        label={item.count !== undefined ? `${item.label} (${item.count})` : item.label}
                        checked={false}
                        onChange={() => onNavigateBrandPath?.(item.path)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="px-2 pb-2 max-h-56 overflow-y-auto custom-scrollbar">
              {brandFacetView ? (
                <>
                  {brandFacetView.activeChain.length > 1 && (
                    <div className="mb-2 overflow-x-auto" data-testid="brand-filter-breadcrumb">
                      <div className="flex flex-nowrap items-center gap-1 min-w-max text-xs">
                        {brandFacetView.activeChain.map((item, index) => (
                          <div key={`brand-chain-${item.nodeId}`} className="flex items-center gap-1 shrink-0">
                            {index > 0 && (
                              <span className="text-gray-400" aria-hidden="true">
                                {'>'}
                              </span>
                            )}
                            {index === brandFacetView.activeChain.length - 1 ? (
                              <span className="font-semibold text-gray-900 whitespace-nowrap">
                                {item.label}
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleBrandSelection(item.value)}
                                className="text-blue-700 hover:text-blue-800 hover:underline whitespace-nowrap"
                                data-testid={`brand-filter-breadcrumb-item-${index}`}
                              >
                                {item.label}
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {brandFacetView.levels.map((level) => {
                    const selectedNodeIdAtLevel = brandFacetView.activeChainNodeIds[level.depth];
                    const visibleOptions = level.options.filter((option) => {
                      if (!selectedNodeIdAtLevel) return true;
                      const node = resolveBrandNodeFromValue(option.value);
                      if (!node) return true;
                      return node.id !== selectedNodeIdAtLevel;
                    });

                    if (visibleOptions.length === 0) return null;

                    return (
                      <div
                        key={`brand-level-${level.depth}`}
                        className={level.depth > 0 ? 'mt-2 border-t border-gray-100 pt-2' : ''}
                      >
                        {visibleOptions.map((option) => (
                          <div
                            key={`brand-level-${level.depth}-option-${option.value}`}
                            data-testid={`facet-brand-level-${level.depth}-option-${option.value}`}
                          >
                            <Checkbox
                              id={`brand-level-${level.depth}-option-${option.value}`}
                              label={
                                option.count !== undefined ? `${option.label} (${option.count})` : option.label
                              }
                              checked={state.brand.some((value) => matchesOptionValue(value, option.value))}
                              onChange={() => handleBrandSelection(option.value)}
                            />
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </>
              ) : (
                (sections.brand?.options ?? []).length > 0 ? (
                  (sections.brand?.options ?? []).map((option) => (
                    <div key={`brand-option-${option.value}`} data-testid={`facet-brand-option-${option.value}`}>
                      <Checkbox
                        id={`brand-option-${option.value}`}
                        label={
                          option.count !== undefined ? `${option.label} (${option.count})` : option.label
                        }
                        checked={state.brand.some((value) => matchesOptionValue(value, option.value))}
                        onChange={() => handleBrandSelection(option.value)}
                      />
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-gray-500 py-1">No brands available.</p>
                )
              )}
            </div>
          )}
        </Accordion>
      )}

      {sections.location && (
        <Accordion title={sections.location.title}>
          <div className="px-2 pb-2 max-h-56 overflow-y-auto custom-scrollbar">
            {sections.location.options.map((option) => (
              <Checkbox
                key={`location-${option.value}`}
                id={`location-${option.value}`}
                label={
                  option.count !== undefined ? `${option.label} (${option.count})` : option.label
                }
                checked={state.location.some(
                  (value) => value.toLowerCase() === option.value.toLowerCase(),
                )}
                onChange={() => onToggleLocation(option.value)}
              />
            ))}
          </div>
        </Accordion>
      )}

      {sections.tag && (
        <Accordion title={sections.tag.title}>
          <div className="px-2 pb-2 max-h-56 overflow-y-auto custom-scrollbar">
            {sections.tag.options.map((option) => (
              <Checkbox
                key={`tag-${option.value}`}
                id={`tag-${option.value}`}
                label={
                  option.count !== undefined ? `${option.label} (${option.count})` : option.label
                }
                checked={state.tag.some(
                  (value) => value.toLowerCase() === option.value.toLowerCase(),
                )}
                onChange={() => onToggleTag(option.value)}
              />
            ))}
          </div>
        </Accordion>
      )}

      {sections.attributes.map((attributeSection) => (
        <Accordion key={attributeSection.key} title={attributeSection.title}>
          <div className="px-2 pb-2 max-h-56 overflow-y-auto custom-scrollbar">
            {attributeSection.options.map((option) => (
              <Checkbox
                key={`${attributeSection.key}-${option.value}`}
                id={`${attributeSection.key}-${option.value}`}
                label={
                  option.count !== undefined ? `${option.label} (${option.count})` : option.label
                }
                checked={(state.attributes[attributeSection.key] || []).some(
                  (value) => value.toLowerCase() === option.value.toLowerCase(),
                )}
                onChange={() => onToggleAttribute(attributeSection.key, option.value)}
              />
            ))}
          </div>
        </Accordion>
      ))}

      <p className="sr-only" role="status" aria-live="polite" data-testid="filters-loading">
        {isLoading ? 'Updating filters' : ''}
      </p>
    </div>
  );
};

export default ProductFilters;

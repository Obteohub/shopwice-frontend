import { api } from '@/utils/api';

type TermLike = {
  id?: number | string;
  databaseId?: number | string;
  name?: string;
  slug?: string;
  parent?: number | string | null;
};

type BreadcrumbItem = {
  label: string;
  href?: string | null;
};

const normalizeList = <T,>(payload: unknown): T[] => {
  if (Array.isArray(payload)) return payload as T[];
  if (!payload || typeof payload !== 'object') return [];

  const source = payload as Record<string, unknown>;
  if (Array.isArray(source.data)) return source.data as T[];
  if (Array.isArray(source.items)) return source.items as T[];
  if (Array.isArray(source.results)) return source.results as T[];
  if (Array.isArray(source.products)) return source.products as T[];
  return [];
};

const toNumericId = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

const normalizeTerm = (raw: unknown): TermLike | null => {
  if (!raw || typeof raw !== 'object') return null;
  const term = raw as TermLike;
  const id = toNumericId(term.databaseId ?? term.id);
  const name = String(term.name ?? '').trim();
  const slug = String(term.slug ?? '').trim();
  if (!id || !name || !slug) return null;
  return {
    ...term,
    id,
    databaseId: id,
    name,
    slug,
    parent: toNumericId(term.parent),
  };
};

const fetchTermById = async (
  endpoint: string,
  id: number,
): Promise<TermLike | null> => {
  if (!id) return null;
  try {
    const payload = await api.get<any>(endpoint, { params: { id } });
    const list = normalizeList<TermLike>(payload);
    const candidate =
      list.find((term) => toNumericId(term.databaseId ?? term.id) === id) ??
      list[0] ??
      (payload && typeof payload === 'object' && !Array.isArray(payload) ? (payload as TermLike) : null);
    const normalized = normalizeTerm(candidate);
    if (normalized) return normalized;
  } catch {
    // fall through to direct-by-id request
  }

  try {
    const directPayload = await api.get<any>(`${endpoint}/${id}`);
    const directCandidate =
      directPayload && typeof directPayload === 'object' && !Array.isArray(directPayload)
        ? (directPayload as TermLike)
        : normalizeList<TermLike>(directPayload)[0] ?? null;
    return normalizeTerm(directCandidate);
  } catch {
    return null;
  }
};

type BuildTaxonomyBreadcrumbsArgs = {
  current: TermLike;
  initialTerms?: TermLike[];
  endpoint: string;
  basePath: string;
};

export const buildTaxonomyBreadcrumbs = async ({
  current,
  initialTerms = [],
  endpoint,
  basePath,
}: BuildTaxonomyBreadcrumbsArgs): Promise<BreadcrumbItem[]> => {
  const normalizedCurrent = normalizeTerm(current);
  if (!normalizedCurrent) return [];

  const byId = new Map<number, TermLike>();
  initialTerms.forEach((term) => {
    const normalized = normalizeTerm(term);
    const id = toNumericId(normalized?.databaseId ?? normalized?.id);
    if (!normalized || !id) return;
    byId.set(id, normalized);
  });
  byId.set(toNumericId(normalizedCurrent.id), normalizedCurrent);

  const chain: TermLike[] = [];
  const visited = new Set<number>();
  let node: TermLike | null = normalizedCurrent;

  while (node) {
    const nodeId = toNumericId(node.databaseId ?? node.id);
    if (!nodeId || visited.has(nodeId)) break;
    visited.add(nodeId);
    chain.push(node);

    const parentId = toNumericId(node.parent);
    if (!parentId) break;

    let parent = byId.get(parentId) ?? null;
    if (!parent) {
      parent = await fetchTermById(endpoint, parentId);
      if (parent) byId.set(parentId, parent);
    }
    node = parent;
  }

  const ordered = chain.reverse();
  return ordered.map((term, idx) => ({
    label: String(term.name || term.slug || ''),
    href: idx === ordered.length - 1 ? null : `${basePath}/${term.slug}`,
  }));
};

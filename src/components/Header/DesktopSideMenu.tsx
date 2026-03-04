import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '@/utils/api';
import { ENDPOINTS } from '@/utils/endpoints';
import { decodeHtmlEntities } from '@/utils/text';

type Category = {
    id: number | string;
    name: string;
    slug: string;
    parent?: number | string | null;
};

interface DesktopSideMenuProps {
    categories?: Category[];
    isOpen?: boolean;
    onClose?: () => void;
    onPanelEnter?: () => void;
    onPanelLeave?: () => void;
}

const CACHE_KEY = 'shopwice_menu_cache';
const CACHE_DURATION_MS = 1000 * 60 * 60;
const DEFAULT_VISIBLE_GRANDCHILDREN = 8;

const normalizeCategories = (payload: unknown): Category[] => {
    if (Array.isArray(payload)) return payload as Category[];
    if (payload && typeof payload === 'object') {
        const obj = payload as Record<string, unknown>;
        if (Array.isArray(obj.data)) return obj.data as Category[];
        if (Array.isArray(obj.categories)) return obj.categories as Category[];
        if (Array.isArray(obj.results)) return obj.results as Category[];
    }
    return [];
};

const sortByName = (list: Category[]) =>
    [...list].sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));

const filterCategories = (list: Category[]) => {
    const filtered = list
    .map((cat) => ({
        ...cat,
        name: decodeHtmlEntities(cat?.name ?? '').trim(),
    }))
    .filter((cat) => {
        const name = String(cat?.name ?? '').toLowerCase();
        const slug = String(cat?.slug ?? '').toLowerCase();
        return !!cat?.slug && !!cat?.name && name !== 'uncategorized' && slug !== 'uncategorized';
    });

    const deduped: Category[] = [];
    const seen = new Set<string>();
    for (const cat of filtered) {
        const slugKey = String(cat.slug || '').trim().toLowerCase();
        const idKey = String(cat.id ?? '').trim();
        const key = slugKey || idKey;
        if (!key || seen.has(key)) continue;
        seen.add(key);
        deduped.push(cat);
    }
    return deduped;
};

const readCache = (): Category[] | null => {
    if (typeof window === 'undefined') return null;
    try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as { data?: Category[]; timestamp?: number };
        if (!Array.isArray(parsed?.data)) return null;
        if (!parsed.timestamp || Date.now() - parsed.timestamp > CACHE_DURATION_MS) {
            localStorage.removeItem(CACHE_KEY);
            return null;
        }
        return parsed.data;
    } catch {
        return null;
    }
};

const writeCache = (data: Category[]) => {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(
            CACHE_KEY,
            JSON.stringify({
                data,
                timestamp: Date.now(),
            }),
        );
    } catch {
        // Ignore storage failures.
    }
};

const toNumericId = (value: unknown): number => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
};

export default function DesktopSideMenu({
    categories: propCategories,
    isOpen = false,
    onClose,
    onPanelEnter,
    onPanelLeave,
}: DesktopSideMenuProps) {
    const [categories, setCategories] = useState<Category[]>(
        Array.isArray(propCategories) ? filterCategories(propCategories) : [],
    );
    const [loading, setLoading] = useState<boolean>(!Array.isArray(propCategories));
    const [activeRootId, setActiveRootId] = useState<number | string | null>(null);
    const [expandedChildren, setExpandedChildren] = useState<Record<string, boolean>>({});
    const panelRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!Array.isArray(propCategories)) return;
        setCategories(filterCategories(propCategories));
        setLoading(false);
    }, [propCategories]);

    useEffect(() => {
        if (Array.isArray(propCategories)) return;
        let cancelled = false;

        const loadCategories = async () => {
            setLoading(true);
            try {
                const cached = readCache();
                if (cached && !cancelled) {
                    setCategories(filterCategories(cached));
                    setLoading(false);
                    return;
                }

                const data: any = await api.get(ENDPOINTS.CATEGORIES);
                const normalized = filterCategories(normalizeCategories(data));
                if (cancelled) return;
                setCategories(normalized);
                writeCache(normalized);
            } catch {
                if (!cancelled) setCategories([]);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        void loadCategories();
        return () => {
            cancelled = true;
        };
    }, [propCategories]);

    const { rootCategories, childrenByParent } = useMemo(() => {
        const map = new Map<number, Category[]>();
        const roots: Category[] = [];

        categories.forEach((cat) => {
            const parent = toNumericId(cat.parent);
            const current = { ...cat };
            if (!parent) {
                roots.push(current);
                return;
            }
            if (!map.has(parent)) map.set(parent, []);
            map.get(parent)!.push(current);
        });

        const sortedRoots = sortByName(roots);
        map.forEach((value, key) => map.set(key, sortByName(value)));

        return {
            rootCategories: sortedRoots,
            childrenByParent: map,
        };
    }, [categories]);

    useEffect(() => {
        if (!isOpen) return;
        if (!rootCategories.length) {
            setActiveRootId(null);
            return;
        }

        const exists = rootCategories.some((cat) => String(cat.id) === String(activeRootId));
        if (!exists) {
            setActiveRootId(rootCategories[0].id);
        }
    }, [isOpen, rootCategories, activeRootId]);

    useEffect(() => {
        if (!isOpen) return;

        const onEsc = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose?.();
        };

        const onOutsideClick = (event: MouseEvent) => {
            const node = panelRef.current;
            if (!node) return;
            if (!node.contains(event.target as Node)) onClose?.();
        };

        window.addEventListener('keydown', onEsc);
        document.addEventListener('mousedown', onOutsideClick);

        return () => {
            window.removeEventListener('keydown', onEsc);
            document.removeEventListener('mousedown', onOutsideClick);
        };
    }, [isOpen, onClose]);

    const activeRoot = useMemo(
        () => rootCategories.find((cat) => String(cat.id) === String(activeRootId)) || rootCategories[0],
        [rootCategories, activeRootId],
    );

    const activeChildren = useMemo(() => {
        if (!activeRoot) return [] as Category[];
        return childrenByParent.get(toNumericId(activeRoot.id)) || [];
    }, [activeRoot, childrenByParent]);

    const activeGroups = useMemo(() => {
        return activeChildren.map((child) => ({
            child,
            grandchildren: childrenByParent.get(toNumericId(child.id)) || [],
        }));
    }, [activeChildren, childrenByParent]);

    useEffect(() => {
        setExpandedChildren({});
    }, [activeRoot?.id]);

    if (!isOpen) return null;

    return (
        <div className="absolute inset-x-0 top-full z-[90]">
            <div className="w-full px-8">
                <div
                    ref={panelRef}
                    className="w-full max-w-[1320px] bg-white border border-[#d5d9d9] rounded-b-md shadow-[0_8px_24px_rgba(0,0,0,0.24)] overflow-hidden"
                    onMouseEnter={onPanelEnter}
                    onMouseLeave={onPanelLeave}
                >
                    {loading ? (
                        <div className="p-6 text-sm text-gray-600">Loading menu...</div>
                    ) : rootCategories.length === 0 ? (
                        <div className="p-6 text-sm text-gray-600">No categories available.</div>
                    ) : (
                        <div className="grid grid-cols-[300px,1fr] h-[92vh] max-h-[760px] min-h-0">
                            <aside className="bg-[#2f4dc6] text-white overflow-y-auto min-h-0">
                                <div className="px-4 py-3 border-b border-white/10">
                                    <p className="text-[11px] uppercase tracking-[0.08em] text-white/75 font-semibold">
                                        Shop By Department
                                    </p>
                                </div>

                                <ul className="py-2">
                                    {rootCategories.map((category) => {
                                        const isActive = String(category.id) === String(activeRoot?.id);
                                        return (
                                            <li key={String(category.id)}>
                                                <button
                                                    type="button"
                                                    onMouseEnter={() => setActiveRootId(category.id)}
                                                    onFocus={() => setActiveRootId(category.id)}
                                                    onClick={() => setActiveRootId(category.id)}
                                                    className={`w-full px-4 py-2.5 text-left text-[13px] transition-colors flex items-center justify-between ${
                                                        isActive
                                                            ? 'bg-[#f7f7f7] text-[#111111] font-bold'
                                                            : 'text-white hover:bg-white/10'
                                                    }`}
                                                >
                                                    <span className="truncate pr-2">{category.name}</span>
                                                    <svg
                                                        xmlns="http://www.w3.org/2000/svg"
                                                        fill="none"
                                                        viewBox="0 0 24 24"
                                                        strokeWidth={2.5}
                                                        stroke="currentColor"
                                                        className="w-3.5 h-3.5 flex-shrink-0"
                                                    >
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="m9 5 7 7-7 7" />
                                                    </svg>
                                                </button>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </aside>

                            <section className="p-6 overflow-y-auto min-h-0 bg-white">
                                {activeRoot && (
                                    <div className="mb-5 pb-4 border-b border-gray-100 flex items-end justify-between gap-4">
                                        <Link
                                            href={`/product-category/${activeRoot.slug}`}
                                            prefetch={false}
                                            onClick={() => onClose?.()}
                                            className="text-2xl font-extrabold text-[#111111] hover:text-[#0F5FBD]"
                                        >
                                            See all {activeRoot.name}
                                        </Link>
                                        <span className="text-[11px] uppercase tracking-[0.08em] text-gray-500 font-semibold">
                                            Explore More
                                        </span>
                                    </div>
                                )}

                                {activeGroups.length > 0 ? (
                                    <div className="grid grid-cols-3 gap-x-8 gap-y-7">
                                        {activeGroups.map(({ child, grandchildren }) => (
                                            <div key={String(child.id)} className="min-w-0">
                                                <h3 className="text-[15px] font-bold text-[#111111] leading-tight">
                                                    {child.name}
                                                </h3>

                                                <Link
                                                    href={`/product-category/${child.slug}`}
                                                    prefetch={false}
                                                    onClick={() => onClose?.()}
                                                    className="inline-flex items-center gap-1 text-[13px] font-semibold text-[#0F5FBD] hover:underline mt-1 mb-1.5"
                                                >
                                                    See all {child.name}
                                                </Link>

                                                {grandchildren.length > 0 && (
                                                    <ul className="mt-1.5 space-y-1.5">
                                                        {(expandedChildren[String(child.id)]
                                                            ? grandchildren
                                                            : grandchildren.slice(0, DEFAULT_VISIBLE_GRANDCHILDREN)
                                                        ).map((grandchild) => (
                                                            <li key={String(grandchild.id)}>
                                                                <Link
                                                                    href={`/product-category/${grandchild.slug}`}
                                                                    prefetch={false}
                                                                    onClick={() => onClose?.()}
                                                                    className="text-[13px] text-[#37475a] hover:text-[#0F5FBD] hover:underline line-clamp-1"
                                                                >
                                                                    {grandchild.name}
                                                                </Link>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                )}

                                                {grandchildren.length > DEFAULT_VISIBLE_GRANDCHILDREN && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const key = String(child.id);
                                                            setExpandedChildren((prev) => ({
                                                                ...prev,
                                                                [key]: !prev[key],
                                                            }));
                                                        }}
                                                        className="mt-2 text-[12px] font-semibold text-[#0F5FBD] hover:underline"
                                                        aria-expanded={Boolean(expandedChildren[String(child.id)])}
                                                        aria-label={`${expandedChildren[String(child.id)] ? 'Show fewer' : 'Show all'} ${child.name} subcategories`}
                                                    >
                                                        {expandedChildren[String(child.id)]
                                                            ? 'Show fewer'
                                                            : `Show all (${grandchildren.length})`}
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : activeChildren.length > 0 ? (
                                    <ul className="grid grid-cols-3 gap-x-8 gap-y-3">
                                        {activeChildren.slice(0, 24).map((child) => (
                                            <li key={String(child.id)}>
                                                <Link
                                                    href={`/product-category/${child.slug}`}
                                                    prefetch={false}
                                                    onClick={() => onClose?.()}
                                                    className="text-[13px] text-[#37475a] hover:text-[#0F5FBD] hover:underline"
                                                >
                                                    See all {child.name}
                                                </Link>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-sm text-gray-500">
                                        No subcategories under {activeRoot?.name}.
                                    </p>
                                )}
                            </section>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

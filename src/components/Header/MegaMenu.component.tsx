import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useGlobalStore } from '@/stores/globalStore';
import { api } from '@/utils/api';
import { ENDPOINTS } from '@/utils/endpoints';
import { decodeHtmlEntities } from '@/utils/text';
import DesktopSideMenu from './DesktopSideMenu';

type Category = {
    id: number | string;
    name: string;
    slug: string;
    parent?: number | string | null;
};

type CacheShape = {
    data: Category[];
    timestamp: number;
};

const CACHE_KEY = 'shopwice_menu_cache';
const CACHE_DURATION_MS = 1000 * 60 * 60; // 1 hour

// Set true only if you want logs (keeps lint happy in production)
const DEBUG = false;
const log = (...args: unknown[]) => {
    if (DEBUG) {
        console.log(...args);
    }
};

function isBrowser(): boolean {
    return typeof window !== 'undefined';
}

function normalizeCategories(payload: unknown): Category[] {
    // Accept: Category[]
    if (Array.isArray(payload)) return payload as Category[];

    // Accept: { data: Category[] }
    if (typeof payload === 'object' && payload !== null) {
        const obj = payload as Record<string, unknown>;

        if (Array.isArray(obj.data)) return obj.data as Category[];
        if (Array.isArray(obj.categories)) return obj.categories as Category[];
        if (Array.isArray(obj.results)) return obj.results as Category[];
    }

    return [];
}

function filterCategories(list: Category[]): Category[] {
    const filtered = list
    .map((cat) => ({
        ...cat,
        name: decodeHtmlEntities(cat?.name ?? '').trim(),
    }))
    .filter((cat) => {
        const name = (cat?.name ?? '').toLowerCase();
        const slug = (cat?.slug ?? '').toLowerCase();
        return !!cat?.name && !!cat?.slug && name !== 'uncategorized' && slug !== 'uncategorized';
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
}

function readCache(): Category[] | null {
    if (!isBrowser()) return null;

    try {
        const raw = window.localStorage.getItem(CACHE_KEY);
        if (!raw) return null;

        const parsed = JSON.parse(raw) as CacheShape;
        const age = Date.now() - (parsed?.timestamp ?? 0);

        if (!Array.isArray(parsed?.data)) return null;
        if (age > CACHE_DURATION_MS) {
            window.localStorage.removeItem(CACHE_KEY);
            return null;
        }

        return parsed.data;
    } catch {
        // if JSON corrupted
        try {
            window.localStorage.removeItem(CACHE_KEY);
        } catch {
            // ignore
        }
        return null;
    }
}

function writeCache(data: Category[]): void {
    if (!isBrowser()) return;

    try {
        const payload: CacheShape = { data, timestamp: Date.now() };
        window.localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
    } catch {
        // localStorage can fail in private mode/quota — ignore safely
    }
}

const MegaMenu = () => {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [isSideMenuOpen, setIsSideMenuOpen] = useState<boolean>(false);
    const [mounted, setMounted] = useState<boolean>(false);
    const storeSideMenuOpen = useGlobalStore((s) => s.sideMenuOpen);
    const setSideMenuOpen = useGlobalStore((s) => s.setSideMenuOpen);

    const abortRef = useRef<AbortController | null>(null);
    const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const loadCategories = useCallback(async () => {
        // 1) cache
        const cached = readCache();
        if (cached) {
            setCategories(cached);
            setLoading(false);
            return;
        }

        // 2) fetch (REST)
        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        try {
            setLoading(true);

            /**
             * IMPORTANT:
             * Your api.get might return:
             * - Category[]
             * - { data: Category[] }
             * - { categories: Category[] }
             *
             * Also some clients use: api.get(url, { signal })
             * If yours doesn’t support signal, remove the second arg.
             */
            const res = await api.get(ENDPOINTS.CATEGORIES, { signal: controller.signal });

            const normalized = normalizeCategories(res);
            const filtered = filterCategories(normalized);

            if (!controller.signal.aborted) {
                setCategories(filtered);
                writeCache(filtered);
                log('Loaded categories:', filtered.length);
            }
        } catch (err: unknown) {
            // Ignore abort errors
            if (err instanceof DOMException && err.name === 'AbortError') return;

            if (!controller.signal.aborted) {
                // If api.get throws custom error shapes, don’t crash UI
                setCategories([]);
                log('Error loading categories:', err);
            }
        } finally {
            if (!controller.signal.aborted) {
                setLoading(false);
            }
        }
    }, []);

    useEffect(() => {
        setMounted(true);

        void loadCategories();

        return () => {
            abortRef.current?.abort();
            if (closeTimerRef.current) {
                clearTimeout(closeTimerRef.current);
                closeTimerRef.current = null;
            }
        };
    }, [loadCategories]);

    // Open desktop side menu only on desktop widths when triggered globally.
    useEffect(() => {
        if (!storeSideMenuOpen) return;

        const isDesktop = typeof window !== 'undefined'
            && window.matchMedia('(min-width: 1024px)').matches;

        if (isDesktop) {
            setIsSideMenuOpen(true);
            return;
        }

        // Prevent stale global mobile state from leaking into desktop menu logic.
        setSideMenuOpen(false);
    }, [storeSideMenuOpen, setSideMenuOpen]);

    const staticLinks = [
        { label: 'Sell on Shopwice', href: '/sell-on-shopwice' },
        { label: 'Delivery', href: '/delivery' },
        { label: 'Bulk Orders', href: '/bulk-orders' },
        { label: 'Hot Deals', href: '/hot-deals' },
        { label: 'Authentic & Guarantee', href: '/authentic-guarantee' },
    ];

    const clearCloseTimer = () => {
        if (closeTimerRef.current) {
            clearTimeout(closeTimerRef.current);
            closeTimerRef.current = null;
        }
    };

    const openSideMenu = () => {
        clearCloseTimer();
        setIsSideMenuOpen(true);
    };

    const scheduleCloseSideMenu = () => {
        clearCloseTimer();
        closeTimerRef.current = setTimeout(() => {
            setIsSideMenuOpen(false);
            setSideMenuOpen(false);
            closeTimerRef.current = null;
        }, 180);
    };

    if (!mounted || loading) return <div className="h-12 bg-[#0C6DC9]" />;

    return (
        <div
            className="bg-[#045ffb] hidden lg:block relative z-[70]"
            onMouseLeave={scheduleCloseSideMenu}
        >
            <div className="w-full px-8">
                <ul className="flex items-center h-12">
                    <li className="h-full flex items-center pr-6 mr-6 border-r border-white/20">
                        <button
                            type="button"
                            onClick={isSideMenuOpen ? () => { setIsSideMenuOpen(false); setSideMenuOpen(false); } : openSideMenu}
                            onMouseEnter={openSideMenu}
                            className="flex items-center gap-2 text-white hover:text-white transition-all group py-1.5 px-3 rounded-sm hover:bg-white/10"
                            aria-haspopup="dialog"
                            aria-expanded={isSideMenuOpen}
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={2.5}
                                stroke="currentColor"
                                className="w-5 h-5 group-hover:scale-110 transition-transform"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                            </svg>
                            <span className="text-sm font-bold tracking-tight">All Departments</span>
                        </button>
                    </li>

                    {staticLinks.map((link) => (
                        <li key={link.href} className="h-full flex items-center mr-8 last:mr-0">
                            <Link
                                href={link.href}
                                prefetch={false}
                                className="text-white hover:text-white transition-colors text-sm font-medium tracking-tight py-1.5 px-3 rounded-sm hover:bg-white/10"
                            >
                                {link.label}
                            </Link>
                        </li>
                    ))}
                </ul>
            </div>

            <DesktopSideMenu
                isOpen={isSideMenuOpen}
                onClose={() => { setIsSideMenuOpen(false); setSideMenuOpen(false); }}
                onPanelEnter={openSideMenu}
                onPanelLeave={scheduleCloseSideMenu}
                categories={categories}
            />
        </div>
    );
};

export default MegaMenu;

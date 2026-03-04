import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/utils/api';
import { ENDPOINTS } from '@/utils/endpoints';

const PROFILE_CACHE_KEY = 'shopwice-profile-cache-v1';
const PROFILE_CACHE_TTL_MS = 5 * 60 * 1000;

interface AccountSidebarProps {
    variant: 'desktop' | 'mobile';
    activeTab: string;
    onNavigate?: () => void;
}

const navItems = [
    {
        id: 'orders', label: 'Orders', icon: (props: any) => (
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
        ), badge: 0
    },
    {
        id: 'wishlist', label: 'Wishlist', icon: (props: any) => (
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
        )
    },
    {
        id: 'reviews', label: 'My Reviews', icon: (props: any) => (
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.382-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
        )
    },
    {
        id: 'address-book', label: 'Address Book', icon: (props: any) => (
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
        )
    },
    {
        id: 'payment-methods', label: 'Payment Methods', icon: (props: any) => (
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
        )
    },
    {
        id: 'notifications', label: 'Notifications', icon: (props: any) => (
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
        )
    },
    {
        id: 'account-management', label: 'Account Details', icon: (props: any) => (
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
        )
    },
];

const AccountSidebar = ({ variant, activeTab, onNavigate }: AccountSidebarProps) => {
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        let mounted = true;

        const normalizeUser = (raw: any) => {
            if (!raw || typeof raw !== 'object') return null;
            return {
                email: raw.email || '',
                nicename: raw.nicename || raw.username || '',
                displayName:
                    raw.displayName ||
                    raw.display_name ||
                    `${raw.first_name || raw.firstName || ''} ${raw.last_name || raw.lastName || ''}`.trim() ||
                    raw.username ||
                    'User',
            };
        };

        const loadUser = async () => {
            if (typeof window === 'undefined') return;

            const authData = localStorage.getItem('auth-data');
            if (!authData) return;

            try {
                const parsed = JSON.parse(authData);
                const localUser = normalizeUser(parsed?.user);
                if (localUser && mounted) {
                    setUser(localUser);
                }

                try {
                    const cachedRaw = sessionStorage.getItem(PROFILE_CACHE_KEY);
                    if (cachedRaw) {
                        const cached = JSON.parse(cachedRaw);
                        if (
                            cached?.user &&
                            Number(Date.now() - Number(cached?.ts || 0)) < PROFILE_CACHE_TTL_MS
                        ) {
                            setUser(cached.user);
                            return;
                        }
                    }
                } catch {
                    // Ignore cache parse/storage failures.
                }

                try {
                    const profile: any = await api.get(ENDPOINTS.AUTH.PROFILE);
                    const profileUser = normalizeUser(profile);

                    if (profileUser && mounted) {
                        setUser(profileUser);
                    }
                    if (profileUser) {
                        try {
                            sessionStorage.setItem(
                                PROFILE_CACHE_KEY,
                                JSON.stringify({ ts: Date.now(), user: profileUser }),
                            );
                        } catch {
                            // Ignore sessionStorage failures.
                        }
                    }

                    localStorage.setItem('auth-data', JSON.stringify({
                        ...parsed,
                        user: {
                            ...parsed?.user,
                            ...profileUser,
                        },
                    }));
                } catch {
                    // Keep localStorage user fallback if profile fetch fails.
                }
            } catch {
                console.error('Failed to parse auth data');
            }
        };

        loadUser();

        return () => {
            mounted = false;
        };
    }, []);

    const initials = user?.displayName
        ? user.displayName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
        : user?.email ? user.email[0].toUpperCase() : 'U';

    if (variant === 'mobile') {
        return (
            <div className="flex flex-col space-y-4">
                {/* User Header */}
                <div className="flex items-center space-x-3 pb-4 border-b border-gray-200">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm border-2 border-white shadow-sm overflow-hidden">
                        {initials}
                    </div>
                    <div className="flex flex-col min-w-0">
                        <span className="text-sm font-bold text-gray-900 truncate">
                            {user?.displayName || user?.nicename || 'User'}
                        </span>
                        <span className="text-xs text-gray-500 truncate">{user?.email || ''}</span>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex flex-col space-y-1">
                    {navItems.map((item) => {
                        const isActive = activeTab === item.id;
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.id}
                                href={`/my-account?tab=${item.id}`}
                                onClick={onNavigate}
                                className={`flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 group ${isActive
                                    ? 'bg-blue-50 text-blue-600'
                                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                    }`}
                            >
                                <div className="flex items-center space-x-3">
                                    <Icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'}`} />
                                    <span>{item.label}</span>
                                </div>
                                {item.badge ? (
                                    <span className="bg-blue-100 text-blue-600 text-[10px] py-0.5 px-2 rounded-full font-bold">
                                        {item.badge}
                                    </span>
                                ) : null}
                            </Link>
                        );
                    })}

                    {/* Logout (Special Case) */}
                    <button
                        onClick={() => {
                            if (confirm('Are you sure you want to log out?')) {
                                import('@/utils/auth').then(({ logout }) => logout());
                            }
                        }}
                        className="flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-all duration-200 text-left w-full mt-4"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        <span>Log Out</span>
                    </button>
                </nav>
            </div>
        );
    }

    return (
        <div className="flex flex-col space-y-6">
            {/* User Header */}
            <div className="flex items-center space-x-4 p-2">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg border-2 border-white shadow-sm overflow-hidden">
                    {initials}
                </div>
                <div className="flex flex-col min-w-0">
                    <span className="text-sm font-bold text-gray-900 truncate">
                        {user?.displayName || user?.nicename || 'User'}
                    </span>
                    <span className="text-xs text-gray-500 truncate">{user?.email || ''}</span>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex flex-col space-y-1">
                {navItems.map((item) => {
                    const isActive = activeTab === item.id;
                    const Icon = item.icon;
                    return (
                        <Link
                            key={item.id}
                            href={`/my-account?tab=${item.id}`}
                            className={`flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 group ${isActive
                                ? 'bg-blue-50 text-blue-600'
                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                }`}
                        >
                            <div className="flex items-center space-x-3">
                                <Icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'}`} />
                                <span>{item.label}</span>
                            </div>
                            {item.badge ? (
                                <span className="bg-blue-100 text-blue-600 text-[10px] py-0.5 px-2 rounded-full font-bold">
                                    {item.badge}
                                </span>
                            ) : null}
                        </Link>
                    );
                })}

                {/* Logout (Special Case) */}
                <button
                    onClick={() => {
                        if (confirm('Are you sure you want to log out?')) {
                            import('@/utils/auth').then(({ logout }) => logout());
                        }
                    }}
                    className="flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-all duration-200 text-left w-full mt-4"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span>Log Out</span>
                </button>
            </nav>
        </div>
    );
};

export default AccountSidebar;

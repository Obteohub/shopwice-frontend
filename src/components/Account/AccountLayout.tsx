import { ReactNode, Suspense, useState } from 'react';
import AccountSidebar from './AccountSidebar';
import { useRouter } from 'next/router';

interface AccountLayoutProps {
    children: ReactNode;
}

const AccountLayout = ({ children }: AccountLayoutProps) => {
    const router = useRouter();
    const currentTab = (router.query.tab as string) || 'orders';
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
            {/* Mobile Header with Hamburger Menu */}
            <div className="md:hidden sticky top-0 z-40 bg-white border-b border-gray-200 px-4 py-3 shadow-sm flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">My Account</h2>
                <button
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                    aria-label="Toggle menu"
                >
                    <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        {mobileMenuOpen ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        )}
                    </svg>
                </button>
            </div>

            {/* Mobile Sidebar Drawer */}
            {mobileMenuOpen && (
                <div className="md:hidden fixed inset-0 z-50 bg-black bg-opacity-50" onClick={() => setMobileMenuOpen(false)}>
                    <div
                        className="fixed left-0 top-0 bottom-0 w-64 bg-white shadow-lg overflow-y-auto z-50"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-6">
                            <AccountSidebar
                                variant="mobile"
                                activeTab={currentTab}
                                onNavigate={() => setMobileMenuOpen(false)}
                            />
                        </div>
                    </div>
                </div>
            )}

            <div className="container mx-auto px-4 py-8 flex flex-col md:flex-row gap-8">
                {/* Desktop Sidebar (Sticky Left) */}
                <aside className="hidden md:block w-64 flex-shrink-0">
                    <div className="sticky top-24">
                        <AccountSidebar variant="desktop" activeTab={currentTab} />
                    </div>
                </aside>

                {/* Main Content Area */}
                <main className="flex-grow min-w-0">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 min-h-[600px] overflow-hidden">
                        <Suspense fallback={<div className="p-8 text-center text-gray-500">Loading section...</div>}>
                            {children}
                        </Suspense>
                    </div>
                </main>
            </div>

            <style jsx global>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
        </div>
    );
};

export default AccountLayout;

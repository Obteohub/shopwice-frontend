import { usePaymentMethods } from '../hooks/usePaymentMethods';
import PaymentMethodsSkeleton from '../skeletons/PaymentMethodsSkeleton';
import Button from '../../UI/Button.component';

const CardIcon = ({ brand }: { brand: string }) => {
    // Simple representation of card brands
    const brands: Record<string, string> = {
        visa: 'V',
        mastercard: 'M',
        amex: 'A',
        discover: 'D',
    };
    return (
        <div className="w-10 h-6 bg-gray-900 rounded flex items-center justify-center text-[10px] font-black text-white italic">
            {brands[brand.toLowerCase()] || 'CARD'}
        </div>
    );
};

const SavedCardItem = ({ card, onRemove, onSetDefault }: { card: any, onRemove: (id: string) => void, onSetDefault: (id: string) => void }) => {
    return (
        <div className="border border-gray-100 rounded-xl p-4 md:p-6 bg-white hover:shadow-md transition-all group flex items-center justify-between">
            <div className="flex items-center gap-4">
                <CardIcon brand={card.brand} />
                <div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-gray-900 capitalize">{card.brand} ending in •••• {card.last4}</span>
                        {card.isDefault && (
                            <span className="text-[9px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded font-black uppercase tracking-tighter">Default</span>
                        )}
                    </div>
                    <p className="text-[10px] text-gray-500 font-medium uppercase tracking-widest mt-0.5">Expires {card.expiry}</p>
                </div>
            </div>

            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                {!card.isDefault && (
                    <button
                        onClick={() => onSetDefault(card.id)}
                        className="text-[10px] font-bold text-blue-600 hover:text-blue-700 uppercase tracking-widest px-2 py-1"
                    >
                        Set Default
                    </button>
                )}
                <button
                    onClick={() => onRemove(card.id)}
                    className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                    title="Remove Card"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                </button>
            </div>
        </div>
    );
};

const PaymentMethods = () => {
    const { gateways, savedCards, isLoading, isError, removeSavedCard, setDefaultCard } = usePaymentMethods();

    if (isLoading) return <PaymentMethodsSkeleton />;

    if (isError) {
        return (
            <div className="p-8 text-center text-red-500">
                <p>Failed to load payment methods.</p>
                <Button handleButtonClick={() => window.location.reload()} className="mt-4">Retry</Button>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Payment Methods</h2>
                    <p className="text-sm text-gray-500 mt-1">Safe and secure payment options for your convenience</p>
                </div>
                <Button
                    variant="primary"
                    className="text-xs font-bold py-2.5 px-6 flex items-center gap-2"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add New Card
                </Button>
            </div>

            <div className="space-y-8">
                {/* Saved Cards Section */}
                <section>
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Saved Cards</h3>
                    {savedCards.length > 0 ? (
                        <div className="space-y-3">
                            {savedCards.map(card => (
                                <SavedCardItem key={card.id} card={card} onRemove={removeSavedCard} onSetDefault={setDefaultCard} />
                            ))}
                        </div>
                    ) : (
                        <div className="p-6 bg-gray-50 rounded-xl border border-dashed border-gray-200 text-center">
                            <p className="text-sm text-gray-500">You haven&apos;t saved any payment methods yet.</p>
                        </div>
                    )}
                </section>

                {/* Available Gateways/Methods */}
                <section>
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Available Gateways</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {gateways.map((gate) => (
                            <div key={gate.id} className="p-4 border border-gray-100 rounded-xl bg-white flex items-center justify-between">
                                <div>
                                    <h4 className="text-sm font-bold text-gray-900">{gate.title}</h4>
                                    <p className="text-xs text-gray-500 line-clamp-1">{gate.description}</p>
                                </div>
                                <div className="w-8 h-8 bg-gray-50 rounded-full flex items-center justify-center text-gray-300">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                    </svg>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </div>

            {/* Security Reassurance */}
            <div className="mt-12 p-6 bg-blue-50/50 rounded-2xl border border-blue-100 flex items-start gap-4">
                <div className="w-10 h-10 bg-white rounded-full flex-shrink-0 flex items-center justify-center text-blue-600 shadow-sm border border-blue-50">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                </div>
                <div>
                    <h4 className="text-sm font-bold text-gray-900">Your payments are secure</h4>
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                        We use industry-standard encryption and security protocols. Your full card details are never stored on our servers.
                        All payment transactions are processed through specialized and certified payment gateways.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default PaymentMethods;


import React, { useState, useEffect } from 'react';

const DeliveryInfo = () => {
    const [deliveryData, setDeliveryData] = useState<{
        text: React.ReactNode;
        showTimer: boolean;
        isActive: boolean;
    } | null>(null);
    const [timeLeft, setTimeLeft] = useState<string>('');
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        // 1. Calculate Delivery Status
        const calculateStatus = () => {
            // Create a date object for the current time in Accra (GMT)
            // Since Accra is GMT+0, we can use UTC methods directly which is safer than relying on local machine time offset
            const now = new Date();

            const day = now.getUTCDay(); // 0 = Sunday, 6 = Saturday
            const hour = now.getUTCHours();
            const minute = now.getUTCMinutes();

            let text: React.ReactNode = '';
            let showTimer = false;
            let isActive = false;

            // Logic from PHP:
            // 1. SAT 4:01 PM to SUN (Monday Delivery)
            //    (Day == 6 && Time >= 16:01) OR (Day == 0)
            if ((day === 6 && (hour > 16 || (hour === 16 && minute >= 1))) || day === 0) {
                text = (
                    <>
                        Order it now and get it on <strong>Monday</strong>
                    </>
                );
            }
            // 2. MON-FRI EARLY MORNING (Get it Today)
            //    Day != 6 && Day != 0 && Time >= 00:01 && Time <= 07:59
            else if (
                day !== 6 &&
                day !== 0 &&
                (hour === 0 && minute >= 1 || (hour > 0 && hour < 8)) // 00:01 to 07:59
            ) {
                text = (
                    <>
                        <span className="text-[#27ae60]">Order it now and get it <strong>today</strong></span>
                    </>
                );
            }
            // 3. WORKING HOURS: THE "3 HOURS" WINDOW
            //    Day != 0 && Time >= 08:00 && Time <= 16:00
            else if (
                day !== 0 &&
                (hour >= 8 && (hour < 16 || (hour === 16 && minute === 0)))
            ) {
                text = (
                    <>
                        <span className="text-[#27ae60]">Order it now and get it in the <strong>next 3 hours</strong></span>
                    </>
                );
                showTimer = true;
                isActive = true;
            }
            // 4. EVENING (Deliver Tomorrow)
            else {
                text = (
                    <>
                        <span className="text-[#e67e22]">Order it now and get it tomorrow</span>
                    </>
                );
            }

            setDeliveryData({ text, showTimer, isActive });
        };

        calculateStatus();
        const statusInterval = setInterval(calculateStatus, 60000); // Update status every minute

        return () => clearInterval(statusInterval);
    }, []);

    // 2. Countdown Timer Logic
    useEffect(() => {
        if (!deliveryData?.showTimer) return;

        const tick = () => {
            const now = new Date();
            // Target is today at 16:00 UTC (Accra)
            const target = new Date();
            target.setUTCHours(16, 0, 0, 0);

            const diff = target.getTime() - now.getTime();

            if (diff <= 0) {
                setTimeLeft('0h 0m 0s');
                return;
            }

            const sec = Math.floor(diff / 1000);
            const h = Math.floor(sec / 3600);
            const m = Math.floor((sec % 3600) / 60);
            const s = sec % 60;

            setTimeLeft(`${h}h ${m}m ${s}s`);
        };

        tick(); // Initial call
        const timerInterval = setInterval(tick, 1000);

        return () => clearInterval(timerInterval);
    }, [deliveryData?.showTimer]);

    if (!deliveryData) return null;

    return (
        <>
            <style jsx>{`
                @keyframes pulse-green {
                    0% { box-shadow: 0 0 0 0 rgba(39, 174, 96, 0.4); }
                    70% { box-shadow: 0 0 0 10px rgba(39, 174, 96, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(39, 174, 96, 0); }
                }
                .accra-delivery-active {
                    animation: pulse-green 2s infinite;
                }
            `}</style>

            <div className={`py-2 mb-2 border-b border-gray-200 ${deliveryData.isActive ? 'accra-delivery-active' : ''}`}>
                <div className="flex items-start justify-between gap-2">
                    <div className="text-xs text-gray-600 leading-relaxed flex-1">
                        <strong>Greater Accra:</strong> {deliveryData.text}
                    </div>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="text-blue-600 text-xs font-semibold hover:underline focus:outline-none flex-shrink-0"
                        aria-label="Learn more about shipping"
                    >
                        Details
                    </button>
                </div>

                {deliveryData.showTimer && (
                    <div className="text-[11px] text-[#d32f2f] mt-2 font-bold">
                        Order within <span className="font-mono">{timeLeft}</span> for this window!
                    </div>
                )}
            </div>



            {/* Shipping Information Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setIsModalOpen(false)}>
                    <div className="bg-white rounded-2xl max-w-md w-full max-h-[80vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-2xl">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-bold text-gray-900">Shipping Information</h3>
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="text-gray-400 hover:text-gray-600 transition-colors"
                                    aria-label="Close modal"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        <div className="px-6 py-5 space-y-4">
                            <div>
                                <h4 className="font-semibold text-gray-900 mb-3">Delivery Windows (Accra, Tema, Kasoa, Amasaman, Adenta)</h4>
                                <div className="space-y-3">
                                    <div className="flex items-start gap-3">
                                        <div className="text-2xl">🚀</div>
                                        <div>
                                            <p className="font-medium text-sm text-gray-900">Same-Day Delivery</p>
                                            <p className="text-xs text-gray-600">Orders within these hours Mon-Fri: 12:01 AM - 7:59 AM, qualifies for same day delivery</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <div className="text-2xl">⚡</div>
                                        <div>
                                            <p className="font-medium text-sm text-gray-900">3-Hour Express</p>
                                            <p className="text-xs text-gray-600">Order between these hours: Mon-Sat: 8:00 AM - 4:00 PM qualifies for express sharp delivery.</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <div className="text-2xl">📅</div>
                                        <div>
                                            <p className="font-medium text-sm text-gray-900">Next Business Day</p>
                                            <p className="text-xs text-gray-600">Orders made from Mon-Fri: After 4:00 PM automatically qualify for standard next day delivery</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <div className="text-2xl">🚚</div>
                                        <div>
                                            <p className="font-medium text-sm text-gray-900">Monday Delivery</p>
                                            <p className="text-xs text-gray-600">Orders made on Sat (After 4:01 PM) - Sunday automatically qualify for Monday delivery.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                                <p className="text-xs text-blue-900">
                                    <strong>Note:</strong> This delivery times apply to Greater Accra region only and Kasoa only. Other regions have different delivery schedules. Please learn more from our delivery page.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </>
    );
};

export default DeliveryInfo;

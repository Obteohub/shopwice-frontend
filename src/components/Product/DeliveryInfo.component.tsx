import React, { useState, useEffect } from 'react';

type DeliveryState = {
  text: React.ReactNode;
  showTimer: boolean;
  isActive: boolean;
};

const createInitialDeliveryState = (): DeliveryState => ({
  text: (
    <span className="text-gray-700">
      Checking delivery window...
    </span>
  ),
  showTimer: false,
  isActive: false,
});

const DeliveryInfo = () => {
  const [deliveryData, setDeliveryData] = useState<DeliveryState>(createInitialDeliveryState);
  const [now, setNow] = useState<Date>(() => new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 1) Delivery status (Accra = UTC/GMT)
  useEffect(() => {
    const calculateStatus = () => {
      const now = new Date();
      const day = now.getUTCDay(); // 0 Sun ... 6 Sat
      const hour = now.getUTCHours();
      const minute = now.getUTCMinutes();

      let text: React.ReactNode = '';
      let showTimer = false;
      let isActive = false;

      // Rule 1: Sat 16:01+ OR all Sunday => Monday delivery
      if ((day === 6 && (hour > 16 || (hour === 16 && minute >= 1))) || day === 0) {
        text = (
          <>
            Order it now and get it on <strong>Monday</strong>
          </>
        );
      }
      // Rule 2: Mon–Fri early morning 00:01–07:59 => Today
      else if (
        day >= 1 &&
        day <= 5 &&
        ((hour === 0 && minute >= 1) || (hour >= 1 && hour <= 7))
      ) {
        text = (
          <span className="text-gray-700">
            Order it now and get it <strong>today</strong>
          </span>
        );
      }
      // Rule 3: Mon–Sat 08:00–16:00 => 3-hour express + countdown
      else if (day !== 0 && (hour > 8 || hour === 8 || (hour === 16 && minute === 0) || hour < 16) && hour >= 8 && (hour < 16 || (hour === 16 && minute === 0))) {
        text = (
          <span className="text-gray-700">
            Order it now and get it in the <strong>next 3 hours</strong>
          </span>
        );
        showTimer = true;
        isActive = true;
      }
      // Rule 4: Everything else => Tomorrow
      else {
        text = (
          <span className="text-gray-700">
            Order it now and get it tomorrow
          </span>
        );
      }

      setDeliveryData({ text, showTimer, isActive });
    };

    calculateStatus();
    const statusInterval = setInterval(calculateStatus, 60_000);

    return () => clearInterval(statusInterval);
  }, []);

  // 2) Countdown timer (only during express window)
  useEffect(() => {
    if (!deliveryData?.showTimer) return;

    const timerInterval = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => clearInterval(timerInterval);
  }, [deliveryData?.showTimer]);

  const timeLeft = (() => {
    if (!deliveryData?.showTimer) return '';

    // Target = today at 16:00 UTC (Accra)
    const target = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      16, 0, 0, 0
    ));

    let diff = target.getTime() - now.getTime();

    // If past 16:00, clamp to 0
    if (diff < 0) diff = 0;

    const sec = Math.floor(diff / 1000);
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;

    return `${h}h ${m}m ${s}s`;
  })();

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

      <div className={`${deliveryData.isActive ? 'accra-delivery-active' : ''} min-h-[42px]`}>
        <div className="flex items-start gap-1">
          <div className="text-xs text-gray-600 leading-relaxed">
            Greater Accra: {deliveryData.text}
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="text-gray-600 text-xs font-semibold underline hover:text-gray-800 focus:outline-none flex-shrink-0"
            aria-label="Learn more about shipping"
            type="button"
          >
            details
          </button>
        </div>

        <div className="text-[10px] text-gray-500 mt-1 font-bold min-h-[14px]">
          {deliveryData.showTimer && timeLeft ? (
            <>
              Order within <span className="font-mono">{timeLeft}</span> for this window!
            </>
          ) : (
            <span aria-hidden="true">&nbsp;</span>
          )}
        </div>
      </div>

      {/* Shipping Information Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full max-h-[80vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Shipping Information"
          >
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900">Shipping Information</h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label="Close modal"
                  type="button"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">
                  Delivery Windows (Accra, Tema, Kasoa, Amasaman, Adenta)
                </h4>

                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="text-2xl">🚀</div>
                    <div>
                      <p className="font-medium text-sm text-gray-900">Same-Day Delivery</p>
                      <p className="text-xs text-gray-600">
                        Orders Mon–Fri between 12:01 AM – 7:59 AM qualify for same-day delivery.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="text-2xl">⚡</div>
                    <div>
                      <p className="font-medium text-sm text-gray-900">3-Hour Express</p>
                      <p className="text-xs text-gray-600">
                        Orders Mon–Sat between 8:00 AM – 4:00 PM qualify for express delivery.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="text-2xl">📅</div>
                    <div>
                      <p className="font-medium text-sm text-gray-900">Next Business Day</p>
                      <p className="text-xs text-gray-600">
                        Orders Mon–Fri after 4:00 PM qualify for next-day delivery.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="text-2xl">🚚</div>
                    <div>
                      <p className="font-medium text-sm text-gray-900">Monday Delivery</p>
                      <p className="text-xs text-gray-600">
                        Orders made Sat (after 4:01 PM) – Sun qualify for Monday delivery.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                <p className="text-xs text-blue-900">
                  <strong>Note:</strong> These delivery times apply to Greater Accra (and Kasoa). Other regions have different schedules.
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

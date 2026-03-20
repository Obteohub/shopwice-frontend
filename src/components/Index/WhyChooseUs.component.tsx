const TRUCK_ICON = String.fromCodePoint(0x1F69A);
const BOX_ICON = String.fromCodePoint(0x1F4E6);
const CARD_ICON = String.fromCodePoint(0x1F4B3);
const SHIELD_ICON = String.fromCodePoint(0x1F6E1);
const PHONE_ICON = String.fromCodePoint(0x1F4DE);

const reasons = [
  {
    id: 'delivery',
    emoji: TRUCK_ICON,
    title: 'Fast Delivery',
    description: 'Same-day and next-day delivery options across Ghana.',
  },
  {
    id: 'authentic',
    emoji: BOX_ICON,
    title: 'Authentic Products',
    description: '100% genuine items sourced directly from verified suppliers.',
  },
  {
    id: 'payment',
    emoji: CARD_ICON,
    title: 'Flexible Payments',
    description: 'Pay on delivery, mobile money, card, or bank transfer.',
  },
  {
    id: 'warranty',
    emoji: SHIELD_ICON,
    title: 'Warranty Protection',
    description: 'All products carry manufacturer or Shopwice warranty.',
  },
  {
    id: 'support',
    emoji: PHONE_ICON,
    title: 'Customer Support',
    description: 'Friendly support team ready to help you every day.',
  },
];

const WhyChooseUs = () => (
  <section className="bg-white border-t border-gray-100 py-8">
    <div className="w-full px-4 sm:px-6">
      <h2 className="text-base font-bold text-gray-900 mb-4">Why Shopwice?</h2>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {reasons.map((r) => (
          <div
            key={r.id}
            className="flex flex-col items-center text-center gap-2 p-4 rounded-xl bg-gray-50 border border-gray-100 hover:bg-white hover:shadow-md transition-all duration-200"
          >
            <span className="text-3xl" aria-hidden="true">{r.emoji}</span>
            <p className="text-sm font-semibold text-gray-900 leading-tight">{r.title}</p>
            <p className="text-xs text-gray-500 leading-relaxed">{r.description}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default WhyChooseUs;

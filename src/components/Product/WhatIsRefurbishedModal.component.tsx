import Link from 'next/link';

interface WhatIsRefurbishedModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const WhatIsRefurbishedModal = ({ isOpen, onClose }: WhatIsRefurbishedModalProps) => {
    if (!isOpen) return null;

    const sections = [
        {
            title: "Quality you can afford",
            description: "Renewed products offer an affordable option to save on the high-end devices you love from top brands like Apple, Samsung, Google, and more.",
            icon: (
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"></path>
                </svg>
            )
        },
        {
            title: "Products you can trust",
            description: "All our renewed products have been professionally inspected, tested, cleaned, and refurbished as necessary either by the manufacturer or a manufacturer certified refurbished partner to meet original manufacturer standards.",
            icon: (
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
                </svg>
            )
        },
        {
            title: "Purchases with an impact",
            description: "Your Renewed device extends the lifetime of premium technology and significantly reduces electronic waste and carbon footprint.",
            icon: (
                <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                </svg>
            )
        },
        {
            title: "Backed By 90-day Renewed Guarantee",
            description: "Your purchase is eligible for a replacement or repair if the device fails to work as expected within 90 days. Refunds are only issued when replacement is not possible in case wh T&C Apply.",
            icon: (
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
            )
        }
    ];

    const faqs = [
        {
            question: "What should I expect to receive with my Renewed purchase?",
            answer: "All Renewed purchases come with accessories equivalent to those shipped in the box when new. Accessories may not be original brand but are certified compatible and fully functional. Devices are packaged in either original packaging or premium unbranded boxes, often unsealed for our final quality verification before delivery."
        },
        {
            question: "Can I buy a brand-new version of an older model?",
            answer: (
                <div className="space-y-3">
                    <p>Manufacturers like Apple, Samsung, and Google discontinue production of older models once newer ones are released. To promote sustainability, these older models are professionally refurbished and re-released as Renewed devices. This is common for flagship series that are a few years old.</p>
                    <p className="font-medium text-gray-900 italic">For customers seeking an absolutely brand-new experience, we recommend choosing the latest available models from the manufacturer, as older flagship production is transitioned to these high-quality Renewed standards.</p>
                </div>
            )
        }
    ];

    return (
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div
                className="absolute inset-0"
                onClick={onClose}
            ></div>
            <div className="relative z-10 flex min-h-full items-start justify-center overflow-y-auto p-4 sm:items-center">
                <div className="relative my-4 flex max-h-[calc(100vh-2rem)] w-full max-w-2xl min-h-0 flex-col overflow-hidden rounded-2xl bg-white shadow-2xl animate-in zoom-in-95 duration-200 font-sans">
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-3 right-3 z-20 rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 sm:top-4 sm:right-4"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                <div className="min-h-0 flex-1 overflow-y-auto">
                    {/* Header */}
                    <div className="relative overflow-hidden bg-blue-600 px-5 py-6 text-white sm:px-8 sm:py-8">
                        <div className="relative z-10">
                            <h3 className="mb-2 text-xl font-bold sm:text-2xl">Renewed & Refurbished Devices</h3>
                            <p className="text-sm leading-relaxed text-blue-100">
                                A Refurbished or Renewed device is a premium product that has been professionally restored to its original factory condition to ensure 100% performance and a &quot;Fresh in Box&quot; experience.
                            </p>
                        </div>
                        {/* Decorative element */}
                        <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white opacity-20 rounded-full blur-2xl"></div>
                    </div>

                    {/* Content */}
                    <div className="px-5 py-5 sm:px-8 sm:py-6">
                        {/* Key Benefits Grid */}
                        <div className="mb-8 grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6">
                        {sections.map((section, idx) => (
                            <div key={idx} className="flex gap-4">
                                <div className="mt-1 bg-gray-50 p-2 rounded-lg h-fit flex-shrink-0">
                                    {section.icon}
                                </div>
                                <div>
                                    <h4 className="font-bold text-gray-900 mb-1">{section.title}</h4>
                                    <p className="text-gray-600 text-[13px] leading-relaxed">
                                        {section.description}
                                    </p>
                                </div>
                            </div>
                        ))}
                        </div>

                        {/* FAQ/Details Section */}
                        <div className="space-y-6 border-t pt-6">
                            <h4 className="text-lg font-bold text-gray-900">Frequently Asked Questions</h4>
                            {faqs.map((faq, idx) => (
                                <div key={idx} className="space-y-2">
                                    <h5 className="font-bold text-gray-900 text-sm flex items-start gap-2">
                                        <span className="text-blue-600 font-bold text-lg leading-none">Q.</span>
                                        {faq.question}
                                    </h5>
                                    <div className="text-gray-600 text-sm leading-relaxed pl-6">
                                        {faq.answer}
                                    </div>
                                </div>
                            ))}
                            <div className="mt-2 rounded-xl border border-blue-100 bg-blue-50 p-4 text-left">
                                <p className="mb-3 text-xs font-medium leading-relaxed text-blue-800">
                                    <span className="font-bold">Our Promise:</span> Choosing refurbished doesn&apos;t mean compromising on quality. It means getting a premium device at a fraction of the cost, backed by our commitment to excellence.
                                </p>
                                <Link href="/refurbished-policy" className="text-blue-700 text-xs font-bold underline hover:text-blue-900 transition-colors">
                                    Read our full Refurbished & Renewed Policy
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="shrink-0 border-t bg-gray-50 px-5 py-4 sm:px-6 sm:py-5">
                    <button
                        onClick={onClose}
                        className="w-full rounded-xl bg-blue-600 py-3.5 text-sm font-bold tracking-wide text-white shadow-lg shadow-blue-200 transition-all hover:bg-blue-700"
                    >
                        Got it, thanks!
                    </button>
                </div>
                </div>
            </div>
        </div>
    );
};

export default WhatIsRefurbishedModal;


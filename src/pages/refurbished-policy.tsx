import Head from 'next/head';
import Layout from '@/components/Layout/Layout.component';

const RefurbishedPolicy = () => {
    const pillars = [
        {
            title: "Quality you can afford",
            subtitle: "Premium technology for less",
            description: "Renewed products offer an affordable option to save on the high-end devices you love from top brands like Apple, Samsung, Google, and more. We believe high-quality technology should be accessible to everyone.",
            icon: (
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"></path>
                </svg>
            )
        },
        {
            title: "Products you can trust",
            subtitle: "Rigorous inspection process",
            description: "All our renewed products have been professionally inspected, tested, cleaned, and refurbished as necessary either by the manufacturer or certified refurbish suppliers to meet original manufacturer standards.",
            icon: (
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
                </svg>
            )
        },
        {
            title: "Purchases with an impact",
            subtitle: "Sustainability at its core",
            description: "Your Renewed device extends the lifetime of premium technology and significantly reduces electronic waste and the carbon footprint associated with new electronics.",
            icon: (
                <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                </svg>
            )
        },
        {
            title: "90-day Limited Guarantee",
            subtitle: "Our commitment to you",
            description: "Your purchase is eligible for a replacement or repair if the device fails to work as expected within 90 days. Refunds are only issued when a replacement is not possible. T&C Apply.",
            icon: (
                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
            )
        }
    ];

    const policySections = [
        {
            id: 1,
            title: "Definition of Refurbished Products",
            content: (
                <div className="space-y-4">
                    <p>A Refurbished or Renewed phone is a smartphone that has been professionally restored to its original factory condition. Unlike &apos;used&apos; products, refurbished phones undergo a rigorous 90-point inspection by the manufacturer or manufacturer certified refurbished partners to ensure 100% performance, 100% battery health, and a &quot;Fresh in Box&quot; experience.</p>
                    <p>It is the smartest way to own the world&apos;s best premium smartphones at a significant value, without compromising on quality or peace of mind. These products are confirmed to be fully functional and work as a brand new one at the time of sale, ensuring you receive the premium experience you expect from your favorite brands.</p>
                </div>
            )
        },
        {
            id: 2,
            title: "Customer Acknowledgement & Acceptance",
            content: (
                <div className="space-y-4">
                    <p>By completing a purchase of a refurbished product, the customer confirms that:</p>
                    <ul className="list-disc pl-6 space-y-2">
                        <li>They understand the product is refurbished</li>
                        <li>They accept the replacement-first policy</li>
                        <li>They understand that cash refunds are limited</li>
                        <li>They agree to all inspection and verification processes</li>
                    </ul>
                    <p className="bg-blue-50 p-4 rounded-lg text-sm text-blue-800 font-medium">Failure to read this Policy does not exempt the customer from its terms.</p>
                </div>
            )
        },
        {
            id: 3,
            title: "No Change-of-Mind Returns",
            content: (
                <div className="space-y-4">
                    <p>Due to the nature of refurbished products, <span className="font-bold text-red-600 underline">Change-of-mind returns are NOT accepted.</span></p>
                    <p>Customers cannot return a refurbished product because they:</p>
                    <ul className="list-disc pl-6 space-y-2">
                        <li>No longer want it</li>
                        <li>Found a better price elsewhere</li>
                        <li>Prefer a different model, color, or condition</li>
                        <li>Are dissatisfied without a verifiable defect</li>
                    </ul>
                </div>
            )
        },
        {
            id: 4,
            title: "Return Request Window (Strict)",
            content: (
                <div className="space-y-4">
                    <p className="font-bold">Customers must inspect refurbished products immediately upon delivery.</p>
                    <ul className="list-disc pl-6 space-y-2">
                        <li>All return, replacement, or repair requests must be submitted within <span className="font-bold">72 hours (3 days)</span> of confirmed delivery</li>
                        <li>Requests submitted after this window may be automatically rejected</li>
                        <li>Proof of delivery time will be determined by courier records</li>
                    </ul>
                </div>
            )
        },
        {
            id: 5,
            title: "Primary Remedy: Repair or Replacement",
            content: (
                <div className="space-y-4">
                    <p>The primary remedy for eligible refurbished product issues is repair or replacement, not a refund.</p>
                    <p>A customer may qualify for repair or replacement if:</p>
                    <ul className="list-disc pl-6 space-y-2">
                        <li>The product is dead on arrival (DOA)</li>
                        <li>The product has a functional defect not disclosed on the product page</li>
                        <li>The incorrect model, storage capacity, color, or condition was delivered</li>
                    </ul>
                    <p className="italic text-gray-500 text-sm">All claims are subject to technical inspection and verification.</p>
                </div>
            )
        },
        {
            id: 6,
            title: "Replacement Conditions",
            content: (
                <ul className="list-disc pl-6 space-y-2">
                    <li>Replacement will be for the same model, storage, and refurbished condition</li>
                    <li>Replacement is subject to stock availability</li>
                    <li>Replacement processing time may range from 3–10 business days</li>
                    <li>Shopwice reserves the right to offer: a repair, a replacement, or a partial refund (see Section 8)</li>
                </ul>
            )
        },
        {
            id: 7,
            title: "Full Refund Policy (Limited & Conditional)",
            content: (
                <div className="space-y-4">
                    <p>A full refund will be issued only if all the following conditions are met:</p>
                    <ul className="list-disc pl-6 space-y-2">
                        <li>The product is verified to be faulty on arrival</li>
                        <li>The defect was not disclosed before purchase</li>
                        <li>A suitable replacement is not available within a reasonable period (7–10 business days)</li>
                        <li>The product passes return inspection</li>
                    </ul>
                    <p className="text-sm border-t pt-4">Refunds are processed via the original payment method and exclude delivery, handling, and service fees, unless otherwise required by law.</p>
                </div>
            )
        },
        {
            id: 8,
            title: "Partial Refunds (At Shopwice's Discretion)",
            content: (
                <div className="space-y-4">
                    <p>Shopwice may, at its sole discretion, offer a partial refund (70%–90% of value) for situations like:</p>
                    <ul className="list-disc pl-6 space-y-2">
                        <li>Minor cosmetic dissatisfaction</li>
                        <li>Customer preference for refund despite availability of replacement</li>
                        <li>Minor defects that do not affect core functionality</li>
                    </ul>
                </div>
            )
        },
        {
            id: 9,
            title: "Non-Refundable & Non-Returnable Situations",
            content: (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <p className="font-bold text-sm">Will NOT be granted if:</p>
                        <ul className="list-disc pl-6 space-y-1 text-sm text-gray-600">
                            <li>Signs of physical damage, drops, cracks, or liquid exposure</li>
                            <li>Warranty seals/stickers are removed, broken, or tampered</li>
                            <li>Device opened or modified by unauthorized technicians</li>
                            <li>Issue relates to normal battery performance</li>
                        </ul>
                    </div>
                    <div className="space-y-2">
                        <p className="font-bold text-sm">&nbsp;</p>
                        <ul className="list-disc pl-6 space-y-1 text-sm text-gray-600">
                            <li>Accessories are missing, swapped, or damaged</li>
                            <li>Used with incompatible software or accessories</li>
                            <li>Request submitted outside the 72-hour window</li>
                            <li>Fraud or abuse is suspected</li>
                        </ul>
                    </div>
                </div>
            )
        },
        {
            id: 10,
            title: "Battery Health Disclaimer",
            content: (
                <div className="space-y-2 italic text-gray-700">
                    <p>Unless explicitly stated: refurbished devices do not guarantee 100% battery health. Performance may be lower than new devices. Degradation within industry standards is not considered a defect.</p>
                </div>
            )
        },
        {
            id: 11,
            title: "Inspection & Verification Process",
            content: (
                <p>All returned products are subject to technical inspection, condition verification, and IMEI/serial validation. The inspection period is 2–5 business days. Decisions after inspection are final.</p>
            )
        },
        {
            id: 12,
            title: "Delivery & Return Costs",
            content: (
                <p>Original delivery fees are non-refundable. Customers may be responsible for return shipping unless the error is ours or the vendor&apos;s.</p>
            )
        },
        {
            id: 13,
            title: "Warranty Coverage",
            content: (
                <div className="space-y-2 text-sm">
                    <p>Includes a limited seller warranty IF stated on the product page. Does NOT cover: physical/liquid damage, software issues, unauthorized repairs, or normal wear and tear.</p>
                </div>
            )
        },
        {
            id: 14,
            title: "Vendor-Sold Refurbished Products",
            content: (
                <p>For refurbished products sold by third-party vendors: Vendors must comply with this Policy. Shopwice reserves the right to enforce remedies on behalf of customers. Vendor-specific warranties must not conflict with this Policy.</p>
            )
        },
        {
            id: 15,
            title: "Fraud Prevention & Abuse",
            content: (
                <p>Shopwice reserves the right to deny returns from customers with repeated abuse, suspend or terminate accounts involved in fraudulent activity, and report suspected fraud to relevant authorities.</p>
            )
        },
        {
            id: 16,
            title: "Limitation of Liability",
            content: (
                <p>To the fullest extent permitted by law, Shopwice shall not be liable for indirect, incidental, or consequential damages. Liability is limited to the purchase price of the refurbished product.</p>
            )
        }
    ];

    return (
        <Layout title="Refurbished Products Policy" fullWidth={true}>
            <Head>
                <title>Refurbished Products Refund, Return & Replacement Policy | Shopwice</title>
            </Head>
            <div className="bg-gray-50 min-h-screen pb-20">
                {/* Hero Section */}
                <div className="bg-white border-b">
                    <div className="container mx-auto px-6 py-12 md:py-20 max-w-5xl">
                        <div className="text-center">
                            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-6">Refurbished Products Policy</h1>
                            <p className="text-xl text-gray-500 max-w-3xl mx-auto leading-relaxed">
                                Our commitment to transparency, quality, and your satisfaction when choosing premium refurbished technology.
                            </p>
                            <div className="mt-8 flex items-center justify-center gap-2 text-sm text-gray-400 font-medium">
                                <span>Last Updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="container mx-auto px-6 mt-12 max-w-6xl">
                    {/* Visual Pillars */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
                        {pillars.map((pillar, idx) => (
                            <div key={idx} className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center">
                                <div className="bg-gray-50 w-16 h-16 rounded-xl flex items-center justify-center mb-6">
                                    {pillar.icon}
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 mb-2">{pillar.title}</h3>
                                <p className="text-gray-500 text-sm leading-relaxed">
                                    {pillar.description}
                                </p>
                            </div>
                        ))}
                    </div>

                    <div className="flex flex-col lg:flex-row gap-12">
                        {/* Sidebar Navigation (Optional for long pages) */}
                        <div className="lg:w-1/3 space-y-6">
                            <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm sticky top-8">
                                <h2 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">Policy Sections</h2>
                                <nav className="space-y-1">
                                    {policySections.map((sect) => (
                                        <a
                                            key={sect.id}
                                            href={`#section-${sect.id}`}
                                            className="block py-2 text-sm text-gray-600 hover:text-blue-600 transition-colors border-l-2 border-transparent hover:border-blue-600 pl-4"
                                        >
                                            {sect.id}. {sect.title}
                                        </a>
                                    ))}
                                    <div className="pt-4 mt-4 border-t">
                                        <p className="text-xs text-gray-400 font-medium uppercase tracking-widest mb-2">Help & Support</p>
                                        <p className="text-sm text-gray-600">info@shopwice.com</p>
                                        <p className="text-sm text-gray-600"> Phone/WhatsApp: [Insert Number]</p>
                                    </div>
                                </nav>
                            </div>
                        </div>

                        {/* Main Content Areas */}
                        <div className="lg:w-2/3">
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                                {policySections.map((sect, idx) => (
                                    <div
                                        key={sect.id}
                                        id={`#section-${sect.id}`}
                                        className={`p-8 md:p-12 ${idx !== policySections.length - 1 ? 'border-b border-gray-50' : ''}`}
                                    >
                                        <div className="flex items-start gap-4 mb-6">
                                            <span className="bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0">
                                                {sect.id}
                                            </span>
                                            <h2 className="text-xl font-bold text-gray-900">{sect.title}</h2>
                                        </div>
                                        <div className="text-gray-600 leading-relaxed text-[15px]">
                                            {sect.content}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-8 bg-gray-900 rounded-2xl p-8 md:p-12 text-white">
                                <h2 className="text-2xl font-bold mb-4">Final Decision Disclosure</h2>
                                <p className="text-gray-400 leading-relaxed mb-6">
                                    All decisions made by Shopwice after inspection are final and binding, subject to applicable consumer protection laws. By purchasing, you acknowledge this limitation of liability which is restricted to the purchase price of the refurbished product.
                                </p>
                                <div className="flex flex-wrap gap-4">
                                    <div className="bg-white/10 px-4 py-2 rounded-lg text-xs font-semibold tracking-wide uppercase">
                                        Repair First
                                    </div>
                                    <div className="bg-white/10 px-4 py-2 rounded-lg text-xs font-semibold tracking-wide uppercase">
                                        No Change of Mind
                                    </div>
                                    <div className="bg-white/10 px-4 py-2 rounded-lg text-xs font-semibold tracking-wide uppercase">
                                        72H Window
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default RefurbishedPolicy;

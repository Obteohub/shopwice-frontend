
import React from 'react';

const reasons = [
    {
        title: 'Best Pricing',
        description: 'We offer competitive prices on all our items.',
        icon: (
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 1.343-3 3s1.343 3 3 3 3 1.343 3 3-1.343 3-3 3m0-13a9 9 0 110 18 9 9 0 010-18zm0 0V3m0 18v-3" />
            </svg>
        )
    },
    {
        title: 'Reliable Shop',
        description: 'Trusted by thousands of customers nationwide.',
        icon: (
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
        )
    },
    {
        title: 'Secure Payment',
        description: 'Your transactions are 100% safe and encrypted.',
        icon: (
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
        )
    }
];

const WhyChooseUs = () => {
    return (
        <section className="bg-white py-12 px-6">
            <div className="container mx-auto">
                <h2 className="text-xl md:text-2xl font-bold text-[#2c3338] mb-10 text-center uppercase tracking-wide">
                    Why Choose Shopwice
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {reasons.map((reason) => (
                        <div key={reason.title} className="flex items-start gap-4 p-6 rounded-xl border border-gray-50 bg-gray-50/50 hover:bg-white hover:shadow-lg transition-all duration-300">
                            <div className="flex-shrink-0 p-3 bg-[#0C6DC9] rounded-lg">
                                {reason.icon}
                            </div>
                            <div>
                                <h3 className="text-[#2c3338] text-lg font-bold mb-1">{reason.title}</h3>
                                <p className="text-gray-500 text-sm leading-relaxed">{reason.description}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default WhyChooseUs;

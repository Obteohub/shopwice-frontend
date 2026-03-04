
import React from 'react';

const InfoBanner = () => {
    return (
        <section className="relative w-full py-24 overflow-hidden">
            {/* Background Image with Overlay */}
            <div className="absolute inset-0 z-0 text-white">
                <img
                    src="https://cdn.shopwice.com/2023/04/banner-homepage-scaled.webp"
                    alt="Banner background"
                    className="w-full h-full object-cover"
                />
            </div>

            <div className="w-full px-6 md:px-12 relative z-10">
                <div className="max-w-4xl">
                    <h1 className="text-xl md:text-2l font-normal text-[#2c3338] mb-6  tracking-tight">
                        Online Shopping in Ghana
                    </h1>
                    <p className="text-[#2c3338] text-l md:text-l leading-relaxed font-normal">
                        Join thousands of satisfied customers and experience the best online shopping in Ghana for home electronics today!
                        Discover a wide range of Shoes, Jerseys, Perfumes, Computers, Mobile Phones, Home Appliances, Home Audio & Speakers,
                        and unbeatable deals at our online store. Shop with ease and convenience from the comfort of your home, and enjoy
                        fast and reliable delivery straight to your doorstep.
                    </p>
                </div>
            </div>
        </section>
    );
};

export default InfoBanner;

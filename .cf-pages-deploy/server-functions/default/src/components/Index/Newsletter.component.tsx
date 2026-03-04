
import React from 'react';

const Newsletter = () => {
    return (
        <section className="bg-[#0045DE] py-16 px-6">
            <div className="container mx-auto max-w-4xl text-center">
                <h2 className="text-white text-3xl md:text-4xl font-extrabold mb-4">
                    Join our newsletter for GH₵ 20 discount!
                </h2>
                <p className="text-white/80 text-lg mb-8">
                    Get deals, promos, and offers directly to your mail. Stay updated with the latest trends.
                </p>
                <form className="flex flex-col md:flex-row gap-4 max-w-2xl mx-auto">
                    <input
                        type="email"
                        placeholder="Enter your email address..."
                        className="flex-grow px-6 py-4 rounded-[3px] focus:outline-none text-[#2c3338] shadow-inner"
                        required
                    />
                    <button
                        type="submit"
                        className="bg-[#F07F02] hover:bg-[#d97302] text-white px-10 py-4 rounded-[3px] font-bold uppercase transition-all shadow-md active:scale-95"
                    >
                        Subscribe
                    </button>
                </form>
            </div>
        </section>
    );
};

export default Newsletter;

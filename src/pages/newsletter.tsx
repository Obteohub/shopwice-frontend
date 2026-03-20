import { useState, ChangeEvent, FormEvent } from 'react';
import Head from 'next/head';
import Layout from '@/components/Layout/Layout.component';

export default function NewsletterPage() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus('loading');

    // TODO: wire up to actual newsletter API
    setTimeout(() => {
      setStatus('success');
      setEmail('');
      setName('');
    }, 800);
  };

  return (
    <Layout title="Newsletter — Get GHS 20 Off Your Next Order" fullWidth>
      <Head>
        <title>Newsletter — Get GHS 20 Off | Shopwice</title>
        <meta
          name="description"
          content="Subscribe to the Shopwice newsletter and get GHS 20 off your next order. Be the first to hear about deals, promos, and new arrivals."
        />
      </Head>

      {/* Hero */}
      <div className="bg-flat-accent text-white py-16 px-4 text-center">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          Get GHS 20 Off Your Next Order
        </h1>
        <p className="text-lg md:text-xl opacity-90 max-w-xl mx-auto">
          Subscribe to our newsletter and be the first to know about exclusive deals, new arrivals, and special promos.
        </p>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-12">

        {/* Subscription Form */}
        <div className="bg-white border-2 border-flat-border p-8 mb-10">
          {status === 'success' ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-black mb-2">You&apos;re subscribed!</h2>
              <p className="text-flat-secondary">
                Check your inbox for your GHS 20 discount code. Welcome to the Shopwice family.
              </p>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-bold mb-6 text-black border-b-2 border-black pb-2 inline-block">
                Subscribe Now
              </h2>
              <form onSubmit={handleSubmit} className="mt-6 space-y-5">
                <div>
                  <label htmlFor="name" className="block text-flat-secondary font-medium mb-2 text-sm">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={name}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                    required
                    placeholder="Enter your name"
                    className="w-full border-2 border-flat-border p-3 text-black focus:outline-none focus:border-flat-accent"
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-flat-secondary font-medium mb-2 text-sm">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                    required
                    placeholder="Enter your email address"
                    className="w-full border-2 border-flat-border p-3 text-black focus:outline-none focus:border-flat-accent"
                  />
                </div>
                <button
                  type="submit"
                  disabled={status === 'loading'}
                  className="w-full bg-flat-accent hover:bg-blue-700 disabled:opacity-60 text-white font-bold py-3 px-6 transition-colors"
                >
                  {status === 'loading' ? 'Subscribing...' : 'Subscribe & Get GHS 20 Off'}
                </button>
                <p className="text-xs text-flat-secondary text-center">
                  No spam, ever. Unsubscribe at any time.
                </p>
              </form>
            </>
          )}
        </div>

        {/* Benefits */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white border-2 border-flat-border p-6 text-center">
            <div className="w-12 h-12 bg-flat-accent/10 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-flat-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            </div>
            <h3 className="font-bold text-black mb-2">Exclusive Deals</h3>
            <p className="text-sm text-flat-secondary">Subscriber-only discounts and flash sales you won&apos;t find anywhere else.</p>
          </div>

          <div className="bg-white border-2 border-flat-border p-6 text-center">
            <div className="w-12 h-12 bg-flat-accent/10 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-flat-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <h3 className="font-bold text-black mb-2">New Arrivals First</h3>
            <p className="text-sm text-flat-secondary">Be the first to know when new products land on Shopwice.</p>
          </div>

          <div className="bg-white border-2 border-flat-border p-6 text-center">
            <div className="w-12 h-12 bg-flat-accent/10 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-flat-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="font-bold text-black mb-2">GHS 20 Welcome Gift</h3>
            <p className="text-sm text-flat-secondary">Get a GHS 20 discount code delivered straight to your inbox on signup.</p>
          </div>
        </div>

      </div>
    </Layout>
  );
}

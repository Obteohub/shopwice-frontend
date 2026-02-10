import React, { useState } from 'react';
import { getCart, addToCart, clearCart } from '@/utils/wc-store-api/cartService';
import { mapStoreApiCartToItems, formatStoreApiCartForStore } from '@/utils/functions/storeApiCartUtils';

export default function DebugCart() {
    const [logs, setLogs] = useState<string[]>([]);
    const addLog = (msg: string) => setLogs(prev => [...prev, msg]);

    const handleGetCart = async () => {
        addLog('Fetching cart...');
        try {
            const cart = await getCart();
            addLog(`Cart fetched: ${JSON.stringify(cart, null, 2)}`);
            try {
                const items = mapStoreApiCartToItems(cart);
                addLog(`Mapped items: ${JSON.stringify(items, null, 2)}`);
            } catch (e: any) {
                addLog(`Mapping Error: ${e.message}`);
            }
        } catch (e: any) {
            addLog(`Error: ${e.message}`);
        }
    };

    const handleClearCart = async () => {
        addLog('Clearing cart...');
        try {
            await clearCart();
            addLog('Cart cleared');
        } catch (e: any) {
            addLog(`Error: ${e.message}`);
        }
    };

    return (
        <div className="p-4">
            <h1>Debug Cart</h1>
            <div className="flex gap-2 mb-4">
                <button onClick={handleGetCart} className="bg-blue-500 text-white px-4 py-2 rounded">Get Cart</button>
                <button onClick={handleClearCart} className="bg-red-500 text-white px-4 py-2 rounded">Clear Cart</button>
            </div>
            <pre className="bg-gray-100 p-4 text-xs overflow-auto max-h-[500px]">
                {logs.join('\n')}
            </pre>
        </div>
    );
}

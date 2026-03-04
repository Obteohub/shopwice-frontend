import React from 'react';
import { usePWA } from '@/hooks/usePWA';

const InstallPrompt: React.FC = () => {
    const { showInstallPrompt, installPWA, dismissPrompt } = usePWA();

    if (!showInstallPrompt) return null;

    return (
        <>
            {showInstallPrompt && (
                <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-8 md:w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 z-[9999] animate-in fade-in slide-in-from-bottom-8 duration-500">
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-semibold text-gray-900 truncate">Install Shopwice</h3>
                            <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                                Install Shopwice App to your device  better shopping experience.
                            </p>
                            <div className="flex items-center gap-3 mt-3">
                                <button
                                    onClick={installPWA}
                                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2.5 px-4 rounded-lg transition-colors shadow-sm active:scale-95"
                                >
                                    Install App
                                </button>
                                <button
                                    onClick={dismissPrompt}
                                    className="px-3 py-2.5 text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    Not now
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default InstallPrompt;

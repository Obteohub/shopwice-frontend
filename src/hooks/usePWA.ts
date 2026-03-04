import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
    readonly platforms: string[];
    readonly userChoice: Promise<{
        outcome: 'accepted' | 'dismissed';
        platform: string;
    }>;
    prompt(): Promise<void>;
}

export const usePWA = () => {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [showInstallPrompt, setShowInstallPrompt] = useState(false);
    const isStandalone =
        typeof window !== 'undefined' &&
        (
            window.matchMedia?.('(display-mode: standalone)')?.matches ||
            (window.navigator as any)?.standalone === true
        );

    useEffect(() => {
        const standaloneNow =
            window.matchMedia?.('(display-mode: standalone)')?.matches ||
            (window.navigator as any)?.standalone === true;

        if (standaloneNow) {
            return;
        }

        const handler = (e: Event) => {
            // Prevent the mini-infobar from appearing on mobile
            e.preventDefault();
            // Stash the event so it can be triggered later.
            setDeferredPrompt(e as BeforeInstallPromptEvent);
            // Update UI notify the user they can install the PWA
            setShowInstallPrompt(true);
        };

        const appInstalledHandler = () => {
            setDeferredPrompt(null);
            setShowInstallPrompt(false);
        };

        window.addEventListener('beforeinstallprompt', handler);
        window.addEventListener('appinstalled', appInstalledHandler);

        return () => {
            window.removeEventListener('beforeinstallprompt', handler);
            window.removeEventListener('appinstalled', appInstalledHandler);
        };
    }, []);

    const installPWA = async () => {
        if (!deferredPrompt) return;

        // Show the installation prompt
        deferredPrompt.prompt();
        // Wait for the user to respond to the prompt
        await deferredPrompt.userChoice;

        // We've used the prompt, and can't use it again, throw it away
        setDeferredPrompt(null);
        setShowInstallPrompt(false);
    };

    const dismissPrompt = () => {
        setShowInstallPrompt(false);
    };

    return {
        showInstallPrompt,
        hasDeferredPrompt: !!deferredPrompt,
        isStandalone,
        installPWA,
        dismissPrompt
    };
};

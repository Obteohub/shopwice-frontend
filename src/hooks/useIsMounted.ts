import { useSyncExternalStore } from 'react';

export const useIsMounted = () => {
    const subscribe = () => () => { };

    return useSyncExternalStore(subscribe, () => true, () => false);
};

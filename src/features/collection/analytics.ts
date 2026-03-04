const pushDataLayerEvent = (eventName: string, payload: Record<string, unknown>) => {
  if (typeof window === 'undefined') return;

  const body = {
    event: eventName,
    ...payload,
    timestamp: Date.now(),
  };

  const win = window as typeof window & {
    dataLayer?: Array<Record<string, unknown>>;
  };

  if (!Array.isArray(win.dataLayer)) {
    win.dataLayer = [];
  }

  win.dataLayer.push(body);
};

export const trackFilterApplied = (payload: Record<string, unknown>) =>
  pushDataLayerEvent('filter_applied', payload);

export const trackFilterCleared = (payload: Record<string, unknown>) =>
  pushDataLayerEvent('filter_cleared', payload);

export const trackSortChanged = (payload: Record<string, unknown>) =>
  pushDataLayerEvent('sort_changed', payload);

export const trackPaginationChanged = (payload: Record<string, unknown>) =>
  pushDataLayerEvent('pagination_changed', payload);

export const trackNoResults = (payload: Record<string, unknown>) =>
  pushDataLayerEvent('no_results', payload);

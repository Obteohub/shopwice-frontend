/**
 * Ghana region utilities
 *
 * UI should display full region names.
 * API payload should send 2-letter WooCommerce region codes.
 */

export interface GhanaRegionOption {
  name: string;
  code: string;
}

export const GHANA_REGION_OPTIONS: GhanaRegionOption[] = [
  { name: 'Ahafo', code: 'AH' },
  { name: 'Ashanti', code: 'AF' },
  { name: 'Bono', code: 'BA' },
  { name: 'Bono East', code: 'BE' },
  { name: 'Central', code: 'CP' },
  { name: 'Eastern', code: 'EP' },
  { name: 'Greater Accra', code: 'AA' },
  { name: 'North East', code: 'NE' },
  { name: 'Northern', code: 'NP' },
  { name: 'Oti', code: 'OT' },
  { name: 'Savannah', code: 'SV' },
  { name: 'Upper East', code: 'UE' },
  { name: 'Upper West', code: 'UW' },
  { name: 'Volta', code: 'TV' },
  { name: 'Western', code: 'WP' },
  { name: 'Western North', code: 'WN' },
];

const GHANA_REGIONS: Record<string, string> = GHANA_REGION_OPTIONS.reduce(
  (acc, region) => {
    const upperName = region.name.toUpperCase();
    acc[upperName] = region.code;
    acc[`${upperName} REGION`] = region.code;
    return acc;
  },
  {} as Record<string, string>,
);

// Common user/provider aliases
GHANA_REGIONS.ACCRA = 'AA';
GHANA_REGIONS['GREATER ACCRA REGION'] = 'AA';

const REGION_CODE_TO_NAME: Record<string, string> = GHANA_REGION_OPTIONS.reduce(
  (acc, region) => {
    acc[region.code] = region.name;
    return acc;
  },
  {} as Record<string, string>,
);

/**
 * Converts region name/code input to 2-letter WooCommerce region code.
 * Returns the original string if no known mapping exists.
 */
export function normalizeGhanaRegion(regionInput: string): string {
  if (!regionInput) return '';
  const normalized = regionInput.toUpperCase().trim();
  if (REGION_CODE_TO_NAME[normalized]) return normalized;
  return GHANA_REGIONS[normalized] || regionInput;
}

/**
 * Converts region name/code input to user-friendly canonical region name.
 * Returns the original string if no known mapping exists.
 */
export function normalizeGhanaRegionName(regionInput: string): string {
  if (!regionInput) return '';
  const normalized = regionInput.toUpperCase().trim();
  if (REGION_CODE_TO_NAME[normalized]) return REGION_CODE_TO_NAME[normalized];
  const code = GHANA_REGIONS[normalized];
  if (code && REGION_CODE_TO_NAME[code]) return REGION_CODE_TO_NAME[code];
  return regionInput;
}


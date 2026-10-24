/**
 * Canonical/default product types for dressed inventory.
 * These are the only product types supported — they are final
 * and are created exclusively through batch processing, never
 * manually.
 */
export const DEFAULT_PRODUCT_TYPES = [
  'whole',
  'quarter',
  'Dog Food (Liver, Head, etc)',
  'gizzards',
  'liver',
  'hearts',
  'feet',
] as const;

export type ProductType = (typeof DEFAULT_PRODUCT_TYPES)[number];
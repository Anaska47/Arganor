import { Product } from "./data";

const FR_TAG = "arganor-21";
const US_TAG = "arganor-20"; // Keep US separate if needed, or use same tag if authorized

/**
 * Generates an optimized Amazon Affiliate Link.
 * Priority:
 * 1. Direct ASIN Link (dp/{ASIN}) -> Highest Conversion
 * 2. Search Link (s?k={Name}) -> Fallback (Never broken)
 */
export const getAffiliateLink = (product: Product, region: 'fr' | 'us' = 'fr'): string => {
    const tag = region === 'fr' ? FR_TAG : US_TAG;
    const domain = region === 'fr' ? 'amazon.fr' : 'amazon.com';

    // 1. Direct ASIN Link (Priority)
    // Ensure ASIN is valid (basic check: 10 chars)
    if (product.asin && product.asin.length === 10) {
        return `https://www.${domain}/dp/${product.asin}?tag=${tag}`;
    }

    // 2. Fallback to Search Link
    // Use existing link if present (from generator), otherwise generate fresh search link
    // The generator fills `affiliateLinks`, so we can default to that, or force search logic here.
    // To be safe and consistent, we regenerate the search link if ASIN is missing.

    const searchName = encodeURIComponent(product.name);
    return `https://www.${domain}/s?k=${searchName}&tag=${tag}`;
};

/**
 * Validates if a string is a valid Amazon ASIN format (10 alphanumeric chars).
 */
export const isValidASIN = (asin: string): boolean => {
    return /^[A-Z0-9]{10}$/.test(asin);
};

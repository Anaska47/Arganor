import { Product } from "./data";

const FR_TAG = "arganor-21";
const US_TAG = "arganor-20";

function getAffiliateContext(region: "fr" | "us" = "fr") {
    return {
        tag: region === "fr" ? FR_TAG : US_TAG,
        domain: region === "fr" ? "amazon.fr" : "amazon.com",
    };
}

function normalizeSearchQuery(value: string): string {
    return value
        .replace(/\b\d+(ml|g|oz)\b/gi, "")
        .replace(/\s+/g, " ")
        .trim();
}

export const getAmazonSearchLink = (query: string, region: "fr" | "us" = "fr"): string => {
    const { tag, domain } = getAffiliateContext(region);
    const cleanQuery = normalizeSearchQuery(query);
    const encodedQuery = encodeURIComponent(cleanQuery || query.trim());

    return `https://www.${domain}/s?k=${encodedQuery}&tag=${tag}`;
};

/**
 * Generates a resilient Amazon affiliate link.
 * We intentionally prefer affiliate search links over direct ASIN URLs
 * because the catalog contains stale products and regional availability shifts.
 */
export const getAffiliateLink = (product: Product, region: "fr" | "us" = "fr"): string => {
    return getAmazonSearchLink(product.name, region);
};

export const isValidASIN = (asin: string): boolean => {
    return /^[A-Z0-9]{10}$/.test(asin);
};

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

    // SOLUTION ANTI-404: 
    // On ignore volontairement les anciens ASINs aléatoires qui causent des erreurs.
    // On force la recherche directe du nom du produit sur Amazon. 
    // Cela garantit que la page Amazon s'ouvrira TOUJOURS avec les bons résultats + votre tag d'affiliation.
    
    // Clean search name for better results on Amazon
    let cleanName = product.name;
    // Remove volume/weight strings like "250ml", "100ml", "50ml" for broader matches just in case
    cleanName = cleanName.replace(/\b\d+(ml|g|oz)\b/ig, '').trim();

    const searchName = encodeURIComponent(cleanName);
    return `https://www.${domain}/s?k=${searchName}&tag=${tag}`;
};

/**
 * Validates if a string is a valid Amazon ASIN format (10 alphanumeric chars).
 */
export const isValidASIN = (asin: string): boolean => {
    return /^[A-Z0-9]{10}$/.test(asin);
};

import productsData from "../data/products.json";
import { normalizeIdentityKey, normalizeInlineText, repairMojibake, slugifyDisplayText } from "./content-clean";

export interface Product {
    id: string;
    name: string;
    slug: string;
    asin?: string;
    description?: string;
    benefits?: string;
    price: number;
    category: string;
    brand?: string;
    image: string;
    rating: number;
    reviews: number;
    features?: string[];
    affiliateLinks?: {
        us: string;
        fr: string;
    };
    seoTags?: string[];
}

type ProductCatalog = {
    items: Product[];
    bySlug: Map<string, Product>;
};

function normalizeSlug(value: string) {
    try {
        return decodeURIComponent(value).normalize("NFC");
    } catch {
        return value.normalize("NFC");
    }
}

function cleanProduct(product: Product): Product {
    return {
        ...product,
        id: String(product.id || "").trim(),
        name: normalizeInlineText(product.name),
        slug: normalizeSlug(repairMojibake(String(product.slug || ""))),
        asin: product.asin ? normalizeInlineText(product.asin) : undefined,
        description: product.description ? repairMojibake(product.description) : undefined,
        benefits: product.benefits ? repairMojibake(product.benefits) : undefined,
        category: normalizeInlineText(product.category),
        brand: product.brand ? normalizeInlineText(product.brand) : undefined,
        image: String(product.image || "").trim(),
        features: Array.isArray(product.features) ? product.features.map((feature) => normalizeInlineText(feature)) : undefined,
        seoTags: Array.isArray(product.seoTags) ? product.seoTags.map((tag) => normalizeInlineText(tag)) : undefined,
    };
}

const rawProducts = (productsData as Product[]).map(cleanProduct);

function pickRepresentativeProduct(products: Product[]): Product {
    return [...products].sort((left, right) => {
        const rightFeatureCount = right.features?.length || 0;
        const leftFeatureCount = left.features?.length || 0;
        const rightDescriptionLength = right.description?.length || 0;
        const leftDescriptionLength = left.description?.length || 0;

        return (
            (right.reviews || 0) - (left.reviews || 0) ||
            rightFeatureCount - leftFeatureCount ||
            rightDescriptionLength - leftDescriptionLength ||
            (left.price || 0) - (right.price || 0)
        );
    })[0];
}

function buildPublicCatalog(products: Product[]): ProductCatalog {
    const groups = new Map<string, Product[]>();

    for (const product of products) {
        const identity = normalizeIdentityKey([product.brand, product.name, product.asin]);
        const currentGroup = groups.get(identity) || [];
        currentGroup.push(product);
        groups.set(identity, currentGroup);
    }

    const items: Product[] = [];
    const bySlug = new Map<string, Product>();
    const usedSlugs = new Map<string, number>();

    for (const group of groups.values()) {
        const representative = pickRepresentativeProduct(group);
        const baseSlug =
            slugifyDisplayText(`${representative.brand || ""} ${representative.name}`) ||
            slugifyDisplayText(representative.name) ||
            representative.id;
        const occurrence = usedSlugs.get(baseSlug) || 0;
        usedSlugs.set(baseSlug, occurrence + 1);

        const publicSlug = occurrence === 0 ? baseSlug : `${baseSlug}-${occurrence + 1}`;
        const validPrices = group.map((entry) => entry.price).filter((value) => Number.isFinite(value) && value > 0);
        const validRatings = group.map((entry) => entry.rating).filter((value) => Number.isFinite(value) && value > 0);
        const validReviews = group.map((entry) => entry.reviews).filter((value) => Number.isFinite(value) && value >= 0);

        const canonical: Product = {
            ...representative,
            slug: publicSlug,
            price: validPrices.length > 0 ? Math.min(...validPrices) : representative.price,
            rating:
                validRatings.length > 0
                    ? Math.round((validRatings.reduce((sum, value) => sum + value, 0) / validRatings.length) * 10) / 10
                    : representative.rating,
            reviews: validReviews.length > 0 ? Math.max(...validReviews) : representative.reviews,
        };

        items.push(canonical);
        bySlug.set(normalizeSlug(publicSlug), canonical);

        for (const alias of group.map((entry) => normalizeSlug(entry.slug))) {
            bySlug.set(alias, canonical);
        }
    }

    items.sort((left, right) => (right.reviews || 0) - (left.reviews || 0));

    return { items, bySlug };
}

const publicCatalog = buildPublicCatalog(rawProducts);

export const getProducts = (): Product[] => {
    return rawProducts;
};

export const getFeaturedProducts = (): Product[] => {
    return rawProducts.slice(0, 3);
};

export const getPublicProducts = (): Product[] => {
    return publicCatalog.items;
};

export const getFeaturedPublicProducts = (): Product[] => {
    return publicCatalog.items.slice(0, 4);
};

export const getProductBySlug = (slug: string): Product | undefined => {
    const normalizedSlug = normalizeSlug(slug);
    return publicCatalog.bySlug.get(normalizedSlug) || rawProducts.find((product) => normalizeSlug(product.slug) === normalizedSlug);
};

export const getPublicProductBySlug = (slug: string): Product | undefined => {
    return publicCatalog.bySlug.get(normalizeSlug(slug));
};

export const getProductById = (id: string): Product | undefined => {
    return rawProducts.find((product) => product.id === id);
};

export const getProductsByCategory = (categorySlug: string): Product[] => {
    const categoryMap: Record<string, string> = {
        face: "Visage",
        hair: "Cheveux",
        body: "Corps",
        skincare: "Soin",
        "anti-aging": "Anti-age",
    };

    const targetCategory = categoryMap[categorySlug.toLowerCase()] || categorySlug;
    return rawProducts.filter((product) => product.category.toLowerCase().includes(targetCategory.toLowerCase()));
};

export const getPublicProductsByCategory = (categorySlug: string): Product[] => {
    const categoryMap: Record<string, string> = {
        face: "visage",
        hair: "cheveux",
        body: "corps",
        skincare: "soin",
        "anti-aging": "anti-age",
    };

    const targetCategory = (categoryMap[categorySlug.toLowerCase()] || categorySlug).toLowerCase();
    return publicCatalog.items.filter((product) => product.category.toLowerCase().includes(targetCategory));
};

import productsData from "../data/products.json";

export interface Product {
    id: string;
    name: string;
    slug: string;
    asin?: string; // New: Optional ASIN
    description?: string;
    benefits?: string; // New: Markdown supported
    price: number;
    category: string;
    brand?: string; // New
    image: string;
    rating: number;
    reviews: number;
    features?: string[];
    affiliateLinks?: {
        us: string;
        fr: string;
    };
    seoTags?: string[]; // New
}

export const getProducts = (): Product[] => {
    return productsData;
};

export const getFeaturedProducts = (): Product[] => {
    return productsData.slice(0, 3);
};

export const getProductBySlug = (slug: string): Product | undefined => {
    try {
        const decodedSlug = decodeURIComponent(slug);
        return productsData.find((p) => p.slug === decodedSlug);
    } catch (e) {
        return productsData.find((p) => p.slug === slug);
    }
};

export const getProductById = (id: string): Product | undefined => {
    return productsData.find((p) => p.id === id);
};

export const getProductsByCategory = (categorySlug: string): Product[] => {
    // Map URL slug to JSON array categories
    const categoryMap: Record<string, string> = {
        'face': 'Visage',
        'hair': 'Cheveux',
        'body': 'Corps',
        'skincare': 'Soin',
        'anti-aging': 'Anti-Âge'
    };

    const targetCategory = categoryMap[categorySlug.toLowerCase()] || categorySlug;
    return productsData.filter((p) => p.category.toLowerCase().includes(targetCategory.toLowerCase()));
};

import "server-only";

import type { Product } from "@/lib/data";
import { toAbsoluteUrl } from "@/lib/site";

export function isGenericProductImageUrl(image: string | undefined): boolean {
    if (!image) {
        return true;
    }

    return /unsplash\.com/i.test(image);
}

export function buildFallbackProductVisualUrl(productSlug: string): string {
    return toAbsoluteUrl(`/api/product-visual/${encodeURIComponent(productSlug)}`);
}

export function resolveDraftPostImage(product: Pick<Product, "slug" | "image">): string {
    return isGenericProductImageUrl(product.image) ? buildFallbackProductVisualUrl(product.slug) : product.image;
}

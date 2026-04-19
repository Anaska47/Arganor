import type { BlogPost } from "./blog";
import { getProductById, getProductBySlug, type Product } from "./data";

export type BlogAffiliateTarget = {
    product: Product | null;
    trackHref: string | null;
    displayName: string | null;
    resolution:
        | "related_product"
        | "content_product_slug"
        | "affiliate_query"
        | "content_search_fallback"
        | "title_search_fallback"
        | "none";
};

type ContentProductLink = {
    slug: string;
    text: string;
};

const MATCH_STOPWORDS = new Set([
    "avec",
    "dans",
    "pour",
    "plus",
    "tres",
    "trop",
    "bien",
    "guide",
    "comment",
    "utiliser",
    "routine",
    "matin",
    "soir",
    "face",
    "vaut",
    "vraiment",
    "simple",
    "classiques",
    "pratique",
    "pourquoi",
    "integre",
    "integree",
    "article",
    "arganor",
    "comme",
    "dans",
    "que",
    "quoi",
    "cela",
    "cette",
    "votre",
    "notre",
]);

function decodePathSegment(value: string): string {
    try {
        return decodeURIComponent(value);
    } catch {
        return value;
    }
}

function humanizeProductSlug(slug: string): string {
    return decodePathSegment(slug)
        .replace(/[-_]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function normalizeTextForMatch(value: string): string {
    return value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/['’]/g, " ")
        .replace(/[^a-z0-9]+/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();
}

function tokenizeMeaningful(value: string): string[] {
    return normalizeTextForMatch(value)
        .split(" ")
        .filter((token) => token.length >= 3 && !MATCH_STOPWORDS.has(token));
}

function hasEnoughSemanticOverlap(post: BlogPost, product: Product): boolean {
    const postSurface = [post.title, post.excerpt, post.affiliateQuery || ""].join(" ");
    const productSurface = [product.name, product.brand || ""].join(" ");
    const normalizedPostSurface = normalizeTextForMatch(postSurface);
    const normalizedProductName = normalizeTextForMatch(product.name);

    if (normalizedProductName && normalizedPostSurface.includes(normalizedProductName)) {
        return true;
    }

    const postTokens = new Set(tokenizeMeaningful(postSurface));
    const productTokens = tokenizeMeaningful(productSurface);
    const overlappingTokens = productTokens.filter((token) => postTokens.has(token));

    if (overlappingTokens.length >= 2) {
        return true;
    }

    const brandTokens = tokenizeMeaningful(product.brand || "");
    return brandTokens.some((token) => postTokens.has(token)) && overlappingTokens.length >= 1;
}

export function isProductRelevantToPost(post: BlogPost, product: Product): boolean {
    return hasEnoughSemanticOverlap(post, product);
}

function extractContentProductLinks(content: string): ContentProductLink[] {
    return [...content.matchAll(/\[([^\]]+)\]\((\/products\/[^)]+)\)/g)].map((match) => ({
        text: match[1].trim(),
        slug: decodePathSegment(match[2].replace(/^\/products\//, "").trim()),
    }));
}

function inferSearchQueryFromTitle(title: string): string | null {
    const compactTitle = String(title || "").replace(/\s+/g, " ").trim();
    const normalizedTitle = normalizeTextForMatch(compactTitle);
    const patterns = [
        /pourquoi j'ai integre (.+?) a ma routine/i,
        /pourquoi j'ai abandonne mes anciens produits pour le (.+)/i,
        /le guide ultime : comment utiliser (.+?) comme/i,
        /comment integrer le (.+?) dans/i,
        /meilleur prix pour (.+?) :/i,
        /test et avis .* : que vaut vraiment le (.+?) \?/i,
        /le secret d'une peau parfaite avec (.+?) \(/i,
        /why (.+?) is the ultimate solution/i,
    ];

    for (const pattern of patterns) {
        const match = normalizedTitle.match(pattern);
        if (match?.[1]) {
            return match[1].trim();
        }
    }

    if (compactTitle.includes(" : ")) {
        return compactTitle.split(" : ")[0].trim();
    }

    return compactTitle || null;
}

function buildTrackHref(params: Record<string, string>): string {
    const searchParams = new URLSearchParams(params);
    return `/api/track?${searchParams.toString()}`;
}

export function resolveBlogAffiliateTarget(post: BlogPost, source = "blog-cta"): BlogAffiliateTarget {
    if (post.relatedProductId) {
        const product = getProductById(post.relatedProductId);
        if (product && isProductRelevantToPost(post, product)) {
            return {
                product,
                trackHref: buildTrackHref({ id: product.id, s: source }),
                displayName: product.name,
                resolution: "related_product",
            };
        }
    }

    const contentLinks = extractContentProductLinks(String(post.content || ""));

    for (const link of contentLinks) {
        const product = getProductBySlug(link.slug);
        if (product && isProductRelevantToPost(post, product)) {
            return {
                product,
                trackHref: buildTrackHref({ id: product.id, s: source }),
                displayName: product.name,
                resolution: "content_product_slug",
            };
        }
    }

    if (post.affiliateQuery?.trim()) {
        return {
            product: null,
            trackHref: buildTrackHref({ q: post.affiliateQuery.trim(), s: source, post: post.slug }),
            displayName: post.affiliateQuery.trim(),
            resolution: "affiliate_query",
        };
    }

    if (contentLinks[0]) {
        const searchQuery = humanizeProductSlug(contentLinks[0].slug) || contentLinks[0].text;
        if (searchQuery) {
            return {
                product: null,
                trackHref: buildTrackHref({ q: searchQuery, s: source, post: post.slug }),
                displayName: searchQuery,
                resolution: "content_search_fallback",
            };
        }
    }

    const titleQuery = inferSearchQueryFromTitle(post.title);
    if (titleQuery) {
        return {
            product: null,
            trackHref: buildTrackHref({ q: titleQuery, s: source, post: post.slug }),
            displayName: titleQuery,
            resolution: "title_search_fallback",
        };
    }

    return {
        product: null,
        trackHref: null,
        displayName: null,
        resolution: "none",
    };
}

export function replaceMarkdownProductLinksWithAffiliateLinks(
    content: string,
    post: BlogPost,
    source = "blog-content",
): string {
    return String(content || "").replace(/\[([^\]]+)\]\((\/products\/[^)]+)\)/g, (_match, text: string, href: string) => {
        const decodedSlug = decodePathSegment(href.replace(/^\/products\//, "").trim());
        const product = getProductBySlug(decodedSlug);
        const targetHref = product
            ? isProductRelevantToPost(post, product)
                ? buildTrackHref({ id: product.id, s: source, post: post.slug })
                : buildTrackHref({ q: humanizeProductSlug(decodedSlug) || text, s: source, post: post.slug })
            : buildTrackHref({ q: humanizeProductSlug(decodedSlug) || text, s: source, post: post.slug });

        return `<a href="${targetHref}" target="_blank" rel="noopener noreferrer">${text}</a>`;
    });
}

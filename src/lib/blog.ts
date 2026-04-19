import postsData from "../data/posts.json";
import { normalizeInlineText, repairMojibake, slugifyDisplayText } from "./content-clean";

export interface BlogPost {
    id: string;
    title: string;
    slug: string;
    excerpt: string;
    content: string;
    category: string;
    author: string;
    publishedDate: string;
    image: string;
    relatedProductId?: string;
    affiliateQuery?: string;
    seoTags?: string[];
    pinterestImage?: string;
    pinterestImages?: string[];
    metaDescription?: string;
}

type RawBlogPost = BlogPost & {
    metaTitle?: string;
    keywords?: string;
    _rawSlug?: string;
};

function normalizeSlug(value: string): string {
    try {
        return decodeURIComponent(value).normalize("NFC");
    } catch {
        return value.normalize("NFC");
    }
}

const blogPosts = (postsData as RawBlogPost[]).map((post) => {
    const rawSlug = normalizeSlug(post.slug);

    return {
        ...post,
        title: normalizeInlineText(post.title),
        slug: slugifyDisplayText(post.title) || rawSlug,
        excerpt: repairMojibake(post.excerpt),
        content: repairMojibake(post.content),
        category: normalizeInlineText(post.category),
        author: normalizeInlineText(post.author),
        image: String(post.image || "").trim(),
        relatedProductId: post.relatedProductId ? normalizeInlineText(post.relatedProductId) : undefined,
        affiliateQuery: post.affiliateQuery ? normalizeInlineText(post.affiliateQuery) : undefined,
        seoTags: Array.isArray(post.seoTags) ? post.seoTags.map((tag) => normalizeInlineText(tag)) : undefined,
        pinterestImage: post.pinterestImage ? String(post.pinterestImage).trim() : undefined,
        pinterestImages: Array.isArray(post.pinterestImages) ? post.pinterestImages.map((image) => String(image).trim()) : undefined,
        metaDescription: post.metaDescription ? repairMojibake(post.metaDescription) : undefined,
        _rawSlug: rawSlug,
    };
});

export const getBlogPosts = (): BlogPost[] => {
    return blogPosts;
};

export const getBlogPostBySlug = (slug: string): BlogPost | undefined => {
    const normalizedSlug = normalizeSlug(slug);
    return blogPosts.find((post) => normalizeSlug(post.slug) === normalizedSlug || post._rawSlug === normalizedSlug);
};

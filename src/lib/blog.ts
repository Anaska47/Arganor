import postsData from "../data/posts.json";

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
    relatedProductId?: string; // New: Link to product
    seoTags?: string[]; // Added for SEO
    pinterestImage?: string; // Added for RSS
    pinterestImages?: string[]; // Mega-scale: Multiple pins
    metaDescription?: string; // Added for RSS
}

export const getBlogPosts = (): BlogPost[] => {
    return postsData;
};

export const getBlogPostBySlug = (slug: string): BlogPost | undefined => {
    return postsData.find((p) => p.slug === slug);
};

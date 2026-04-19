import "server-only";

import type { Product } from "@/lib/data";
import { readRuntimePosts, readRuntimeProducts, writeRuntimePosts } from "@/lib/runtime-content-store";

import { getContentQueueItem, updateContentQueue, type ContentQueueRow } from "./store";

type ContentDraft = {
    post: {
        slug: string;
        title: string;
        excerpt: string;
        metaDescription: string;
        content: string;
        category: string;
        relatedProductId: string;
        image: string;
    };
    pins: Array<{
        angle: string;
        hook: string;
        title: string;
        description: string;
        imagePrompt: string;
        fileHint: string;
        cta: string;
    }>;
};

type DraftReview = {
    verdict: "approved" | "needs_revision" | "rejected";
    rationale: string;
    blockingIssues: string[];
    warnings: string[];
    reviewedAt: string;
};

type PromotionPreview = {
    queueId: string;
    canPromote: boolean;
    blockers: string[];
    warnings: string[];
    post: PublishedPost;
};

type PromotionResult = {
    queueItem: ContentQueueRow;
    post: PublishedPost;
    promotedAt: string;
};

type PublishedPost = {
    id: string;
    title: string;
    slug: string;
    metaTitle: string;
    metaDescription: string;
    keywords: string;
    excerpt: string;
    content: string;
    category: string;
    author: string;
    publishedDate: string;
    image: string;
    relatedProductId: string;
    isAutopilot: boolean;
    isGrowthMachine: boolean;
    style: string;
};

function normalizeSlug(value: string): string {
    try {
        return decodeURIComponent(value).normalize("NFC");
    } catch {
        return value.normalize("NFC");
    }
}

function toQueuePayloadObject(queueItem: ContentQueueRow): Record<string, unknown> {
    if (queueItem.payload && typeof queueItem.payload === "object" && !Array.isArray(queueItem.payload)) {
        return { ...(queueItem.payload as Record<string, unknown>) };
    }

    return {};
}

function readContentDraft(queueItem: ContentQueueRow): ContentDraft {
    const payload = toQueuePayloadObject(queueItem);
    const contentDraft = payload.contentDraft;

    if (!contentDraft || typeof contentDraft !== "object" || Array.isArray(contentDraft)) {
        throw new Error(`[growth-machine] Queue item ${queueItem.id} has no contentDraft.`);
    }

    return contentDraft as ContentDraft;
}

function readReview(queueItem: ContentQueueRow): DraftReview {
    const payload = toQueuePayloadObject(queueItem);
    const review = payload.review;

    if (!review || typeof review !== "object" || Array.isArray(review)) {
        throw new Error(`[growth-machine] Queue item ${queueItem.id} has no review result.`);
    }

    return review as DraftReview;
}

function findProductBySlug(products: Product[], slug: string): Product | undefined {
    const normalizedSlug = normalizeSlug(slug);
    return products.find((product) => normalizeSlug(product.slug) === normalizedSlug);
}

function toKeywords(productName: string, category: string, clusterRef: string | null): string {
    return [productName, category, clusterRef || "arganor", "avis", "guide"].join(", ");
}

function toStyle(intent: string | null): string {
    if (intent === "routine") {
        return "ROUTINE";
    }

    if (intent === "problem_solution") {
        return "ANALYSE";
    }

    return "GUIDE";
}

function sanitizePublishedContent(content: string): string {
    return content
        .replace(
            /\n\nCe brouillon Growth Machine reste interne a Arganor tant qu'il n'est pas promu vers les JSON publics\.\n\n/g,
            "\n\n",
        )
        .replace(
            /\n\nObjectif: transformer le clic Pinterest en visite qualifiee puis en clic tracke\.\n/g,
            "\n",
        )
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}

function buildPublishedPost(queueItem: ContentQueueRow, contentDraft: ContentDraft, productName: string): PublishedPost {
    return {
        id: `gm-${Date.now()}-${contentDraft.post.slug}`,
        title: contentDraft.post.title,
        slug: contentDraft.post.slug,
        metaTitle: `${contentDraft.post.title} | Arganor Beaute`,
        metaDescription: contentDraft.post.metaDescription,
        keywords: toKeywords(productName, contentDraft.post.category, queueItem.cluster_ref),
        excerpt: contentDraft.post.excerpt,
        content: sanitizePublishedContent(contentDraft.post.content),
        category: contentDraft.post.category,
        author: "Growth Machine Arganor",
        publishedDate: new Date().toISOString().slice(0, 10),
        image: contentDraft.post.image,
        relatedProductId: contentDraft.post.relatedProductId,
        isAutopilot: false,
        isGrowthMachine: true,
        style: toStyle(queueItem.intent),
    };
}

export async function previewPromotion(queueItemId: string): Promise<PromotionPreview> {
    const queueItem = await getContentQueueItem(queueItemId);

    if (!queueItem) {
        throw new Error(`[growth-machine] Queue item not found: ${queueItemId}`);
    }

    if (!queueItem.product_ref) {
        throw new Error(`[growth-machine] Queue item ${queueItemId} has no product_ref.`);
    }

    const products = await readRuntimeProducts<Product>();
    const product = findProductBySlug(products, queueItem.product_ref);
    if (!product) {
        throw new Error(`[growth-machine] Product not found for slug: ${queueItem.product_ref}`);
    }

    const contentDraft = readContentDraft(queueItem);
    const review = readReview(queueItem);
    const posts = await readRuntimePosts<PublishedPost>();
    const blockers = [...review.blockingIssues];
    const warnings = [...review.warnings];

    if (review.verdict !== "approved") {
        blockers.push(`La review actuelle est '${review.verdict}'. Une promotion exige un brouillon approuve.`);
    }

    if (posts.some((post) => post.slug === contentDraft.post.slug)) {
        blockers.push(`Le slug ${contentDraft.post.slug} existe deja dans le store runtime.`);
    }

    const post = buildPublishedPost(queueItem, contentDraft, product.name);

    return {
        queueId: queueItem.id,
        canPromote: blockers.length === 0,
        blockers,
        warnings,
        post,
    };
}

export async function promoteQueueItem(queueItemId: string): Promise<PromotionResult> {
    const preview = await previewPromotion(queueItemId);

    if (!preview.canPromote) {
        throw new Error(`[growth-machine] Promotion blocked: ${preview.blockers.join(" | ")}`);
    }

    const posts = await readRuntimePosts<PublishedPost>();
    posts.unshift(preview.post);
    await writeRuntimePosts(posts, "growth-machine:promote");

    const queueItem = await getContentQueueItem(queueItemId);
    if (!queueItem) {
        throw new Error(`[growth-machine] Queue item not found after promotion: ${queueItemId}`);
    }

    const promotedAt = new Date().toISOString();
    const existingPayload = toQueuePayloadObject(queueItem);
    const nextPayload = {
        ...existingPayload,
        promotion: {
            promotedAt,
            promotedSlug: preview.post.slug,
            promotedPostId: preview.post.id,
        },
    };

    const updatedItem = await updateContentQueue(queueItem.id, {
        status: "completed",
        processed_at: promotedAt,
        payload: nextPayload,
    });

    return {
        queueItem: updatedItem,
        post: preview.post,
        promotedAt,
    };
}

export type { PromotionPreview, PromotionResult };

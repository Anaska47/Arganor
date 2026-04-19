import "server-only";

import type { BlogPost } from "@/lib/blog";
import type { Product } from "@/lib/data";
import { readRuntimePosts, readRuntimeProducts } from "@/lib/runtime-content-store";

import { generateGrowthJson, hasGrowthAiConfig } from "./ai";
import { resolvePromptVersion, type ResolvedPromptVersion } from "./prompts";
import { resolveProductTaxonomy, shouldWarnForTaxonomyResolution } from "./taxonomy";
import { getContentQueueItem, listContentQueue, updateContentQueue, type ContentQueueRow } from "./store";

type DraftReviewVerdict = "approved" | "needs_revision" | "rejected";

type DraftReview = {
    verdict: DraftReviewVerdict;
    rationale: string;
    blockingIssues: string[];
    warnings: string[];
    reviewedAt: string;
    promptRef: {
        module: string;
        promptKey: string;
        version: string;
        source: string;
    };
    generationMeta?: {
        mode: "ai" | "deterministic" | "hybrid";
        provider?: string;
        model?: string;
    };
};

type ReviewResult = {
    queueItem: ContentQueueRow;
    review: DraftReview;
    qaPrompt: ResolvedPromptVersion;
};

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

function normalizeSlug(value: string): string {
    try {
        return decodeURIComponent(value).normalize("NFC");
    } catch {
        return value.normalize("NFC");
    }
}

function findProductBySlug(products: Product[], slug: string): Product | null {
    const normalizedSlug = normalizeSlug(slug);
    return products.find((product) => normalizeSlug(product.slug) === normalizedSlug) ?? null;
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

function uniqueStrings(values: string[]): string[] {
    return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function buildRuleBasedReview(
    contentDraft: ContentDraft,
    queueItem: ContentQueueRow,
    product: Product | null,
    existingPosts: BlogPost[],
): DraftReview {
    const blockingIssues: string[] = [];
    const warnings: string[] = [];

    if (contentDraft.post.title.trim().length < 20) {
        blockingIssues.push("Le titre du brouillon est trop court.");
    }

    if (contentDraft.post.excerpt.trim().length < 90) {
        warnings.push("L'excerpt est encore leger pour une vraie page SEO.");
    }

    if (contentDraft.post.metaDescription.trim().length < 110) {
        warnings.push("La meta description est courte et devra etre enrichie avant promotion.");
    }

    if (contentDraft.post.content.trim().length < 700) {
        warnings.push("Le corps d'article reste un brouillon structure, pas encore un article final dense.");
    }

    if (contentDraft.pins.length < 3) {
        blockingIssues.push("Le brouillon ne contient pas assez de variantes Pinterest.");
    }

    if (existingPosts.some((post) => post.slug === contentDraft.post.slug)) {
        blockingIssues.push(`Le slug ${contentDraft.post.slug} existe deja dans le store runtime.`);
    }

    if (!product) {
        blockingIssues.push(`Le produit ${queueItem.product_ref || "unknown"} n'existe plus dans le catalogue.`);
    }

    if (!contentDraft.post.image) {
        blockingIssues.push("Le brouillon n'a pas d'image principale exploitable.");
    }

    if (product) {
        const taxonomy = resolveProductTaxonomy(product);

        if (taxonomy.confidence !== "low" && contentDraft.post.category !== taxonomy.effectiveCategory) {
            blockingIssues.push(
                `Le brouillon utilise la categorie "${contentDraft.post.category}" alors que la taxonomie resolue attend "${taxonomy.effectiveCategory}". Regenerer le draft avant promotion.`,
            );
        }

        if (taxonomy.confidence !== "low" && queueItem.cluster_ref && queueItem.cluster_ref !== taxonomy.effectiveClusterRef) {
            warnings.push(
                `Le cluster queue (${queueItem.cluster_ref}) ne correspond pas encore a la taxonomie resolue (${taxonomy.effectiveClusterRef}). Rejouer le draft pack pour harmoniser la queue.`,
            );
        }

        if (shouldWarnForTaxonomyResolution(taxonomy)) {
            for (const warning of taxonomy.warnings) {
                warnings.push(warning);
            }
        }
    }

    const verdict: DraftReviewVerdict = blockingIssues.length > 0 ? "rejected" : warnings.length > 0 ? "needs_revision" : "approved";

    return {
        verdict,
        rationale:
            verdict === "approved"
                ? "Le brouillon est propre pour une promotion controlee."
                : verdict === "needs_revision"
                  ? "Le brouillon est coherent mais demande encore un passage editorial."
                  : "Le brouillon doit etre corrige avant toute promotion.",
        blockingIssues,
        warnings,
        reviewedAt: new Date().toISOString(),
        promptRef: {
            module: "qa",
            promptKey: "content-guardrails",
            version: "v1",
            source: "registry",
        },
        generationMeta: {
            mode: "deterministic",
        },
    };
}

type AiReviewCandidate = {
    verdict?: DraftReviewVerdict;
    rationale?: string;
    blockingIssues?: string[];
    warnings?: string[];
};

async function maybeGenerateAiReview(
    queueItem: ContentQueueRow,
    contentDraft: ContentDraft,
    product: Product,
    qaPrompt: ResolvedPromptVersion,
): Promise<{ candidate: AiReviewCandidate; provider: string; model: string } | null> {
    if (!hasGrowthAiConfig()) {
        return null;
    }

    try {
        const result = await generateGrowthJson<AiReviewCandidate>({
            systemPrompt: [
                "You are the Arganor QA editor.",
                qaPrompt.promptBody,
                "Return JSON only.",
                "Be strict on clarity, usefulness, click intent, and editorial credibility.",
            ].join("\n\n"),
            userPrompt: JSON.stringify(
                {
                    queueItem: {
                        title: queueItem.title,
                        topic: queueItem.topic,
                        intent: queueItem.intent,
                        clusterRef: queueItem.cluster_ref,
                    },
                    product: {
                        slug: product.slug,
                        name: product.name,
                        category: product.category,
                        description: product.description,
                    },
                    draft: contentDraft,
                    expectedShape: {
                        verdict: "approved | needs_revision | rejected",
                        rationale: "string",
                        blockingIssues: ["string"],
                        warnings: ["string"],
                    },
                },
                null,
                2,
            ),
            temperature: 0.2,
            maxOutputTokens: 1200,
        });

        return {
            candidate: result.data,
            provider: result.provider,
            model: result.model,
        };
    } catch (error) {
        console.warn("[growth-machine] AI review failed, using rule-based fallback only:", error);
        return null;
    }
}

function mergeReviews(
    ruleReview: DraftReview,
    aiReview: { candidate: AiReviewCandidate; provider: string; model: string } | null,
    qaPrompt: ResolvedPromptVersion,
): DraftReview {
    if (!aiReview) {
        return {
            ...ruleReview,
            promptRef: {
                module: qaPrompt.module,
                promptKey: qaPrompt.promptKey,
                version: qaPrompt.version,
                source: qaPrompt.source,
            },
        };
    }

    const aiBlockingIssues = Array.isArray(aiReview.candidate.blockingIssues) ? aiReview.candidate.blockingIssues : [];
    const aiWarnings = Array.isArray(aiReview.candidate.warnings) ? aiReview.candidate.warnings : [];
    const combinedBlockingIssues = uniqueStrings([...aiBlockingIssues, ...ruleReview.blockingIssues]);
    const combinedWarnings = uniqueStrings([...aiWarnings, ...ruleReview.warnings]);

    if (aiReview.candidate.verdict === "rejected" && combinedBlockingIssues.length === 0) {
        combinedBlockingIssues.push(
            aiReview.candidate.rationale?.trim() || "AI review rejected the draft without a detailed blocker list.",
        );
    }

    const verdict: DraftReviewVerdict =
        combinedBlockingIssues.length > 0
            ? "rejected"
            : aiReview.candidate.verdict === "needs_revision" || combinedWarnings.length > 0
              ? "needs_revision"
              : "approved";

    return {
        verdict,
        rationale:
            typeof aiReview.candidate.rationale === "string" && aiReview.candidate.rationale.trim()
                ? aiReview.candidate.rationale.trim()
                : ruleReview.rationale,
        blockingIssues: combinedBlockingIssues,
        warnings: combinedWarnings,
        reviewedAt: new Date().toISOString(),
        promptRef: {
            module: qaPrompt.module,
            promptKey: qaPrompt.promptKey,
            version: qaPrompt.version,
            source: qaPrompt.source,
        },
        generationMeta: {
            mode: "hybrid",
            provider: aiReview.provider,
            model: aiReview.model,
        },
    };
}

export async function reviewQueueItem(queueItemId: string): Promise<ReviewResult> {
    const queueItem = await getContentQueueItem(queueItemId);

    if (!queueItem) {
        throw new Error(`[growth-machine] Queue item not found: ${queueItemId}`);
    }

    if (String(queueItem.kind) !== "post") {
        throw new Error(`[growth-machine] Queue item ${queueItemId} is not a post draft.`);
    }

    if (!queueItem.product_ref) {
        throw new Error(`[growth-machine] Queue item ${queueItemId} has no product_ref.`);
    }

    const qaPrompt = await resolvePromptVersion("qa", "content-guardrails");
    const contentDraft = readContentDraft(queueItem);
    const [existingPosts, products] = await Promise.all([readRuntimePosts<BlogPost>(), readRuntimeProducts<Product>()]);
    const product = findProductBySlug(products, queueItem.product_ref);
    const ruleReview = buildRuleBasedReview(contentDraft, queueItem, product, existingPosts);
    const aiReview = product ? await maybeGenerateAiReview(queueItem, contentDraft, product, qaPrompt) : null;
    const review = mergeReviews(ruleReview, aiReview, qaPrompt);

    const existingPayload = toQueuePayloadObject(queueItem);
    const nextPayload = {
        ...existingPayload,
        review,
        reviewedAt: review.reviewedAt,
    };

    const updatedItem = await updateContentQueue(queueItem.id, {
        payload: nextPayload,
    });

    return {
        queueItem: updatedItem,
        review,
        qaPrompt,
    };
}

export async function reviewDrafts(limit = 3): Promise<ReviewResult[]> {
    const draftItems = await listContentQueue({
        status: "draft",
        limit: Math.max(limit * 3, limit),
    });

    const candidates = draftItems.filter((item) => {
        if (String(item.kind) !== "post" || !item.product_ref) {
            return false;
        }

        const payload = toQueuePayloadObject(item);
        return Boolean(payload.contentDraft) && !payload.review;
    });

    const results: ReviewResult[] = [];

    for (const item of candidates.slice(0, Math.max(limit, 1))) {
        results.push(await reviewQueueItem(item.id));
    }

    return results;
}

export type { DraftReview, DraftReviewVerdict, ReviewResult };

import "server-only";

import { getBlogPosts } from "@/lib/blog";
import { getProductBySlug } from "@/lib/data";

import { generateGrowthJson, hasGrowthAiConfig } from "./ai";
import { resolvePromptVersion, type ResolvedPromptVersion } from "./prompts";
import { resolveProductTaxonomy, type ProductTaxonomyResolution } from "./taxonomy";
import {
    getContentQueueItem,
    listContentQueue,
    updateContentQueue,
    type ContentQueueRow,
} from "./store";

type DraftPack = {
    recommendedPostRef: string;
    article: {
        title: string;
        excerpt: string;
        metaDescription: string;
        sections: string[];
        cta: string;
    };
    pinDrafts: Array<{
        angle: string;
        hook: string;
        visualDirection: string;
        cta: string;
    }>;
    promptRefs: {
        writer: {
            module: string;
            promptKey: string;
            version: string;
            source: string;
        };
        creative: {
            module: string;
            promptKey: string;
            version: string;
            source: string;
        };
    };
    generatedAt: string;
    generationMeta?: {
        mode: "ai" | "deterministic";
        provider?: string;
        model?: string;
    };
};

type PreparedDraftResult = {
    queueItem: ContentQueueRow;
    writerPrompt: ResolvedPromptVersion;
    creativePrompt: ResolvedPromptVersion;
    draftPack: DraftPack;
};

function slugifySegment(value: string): string {
    return value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

function toPromptKeyForIntent(intent: string | null): string {
    if (intent === "routine") {
        return "routine-article";
    }

    return "buyer-intent-article";
}

function buildRecommendedPostRef(productSlug: string, intent: string | null): string {
    const suffix = intent === "routine" ? "routine-arganor" : intent === "problem_solution" ? "problemes-guide" : "guide-achat";
    return `${productSlug}-${suffix}`;
}

function buildArticleTitle(productName: string, intent: string | null): string {
    if (intent === "routine") {
        return `Comment integrer ${productName} dans une routine Arganor`;
    }

    if (intent === "problem_solution") {
        return `${productName} peut-il vraiment aider dans une routine ciblee ?`;
    }

    return `Pourquoi ${productName} merite un guide d'achat Arganor`;
}

function buildExcerpt(productName: string, intent: string | null): string {
    if (intent === "routine") {
        return `Une routine simple, claire et credible pour utiliser ${productName} sans surcharge ni promesse vide.`;
    }

    if (intent === "problem_solution") {
        return `On regarde ou ${productName} peut vraiment s'integrer, pour qui, et avec quelles attentes realistes.`;
    }

    return `Le point sur ${productName}, ses forces reelles, son positionnement et le type de routine auquel il convient le mieux.`;
}

function buildMetaDescription(productName: string, intent: string | null): string {
    if (intent === "routine") {
        return `Routine Arganor autour de ${productName}: ordre d'application, points d'attention et usage recommande.`;
    }

    if (intent === "problem_solution") {
        return `${productName}: problemes cibles, limites, et conseils d'usage dans une routine concrete.`;
    }

    return `${productName}: avis, points forts, limites et bonnes raisons d'en faire un vrai contenu d'achat Arganor.`;
}

function buildSections(productName: string, clusterRef: string, relatedPostCount: number): string[] {
    return [
        `Ce qu'il faut comprendre sur ${productName}`,
        `Ou le produit se place dans le cluster ${clusterRef || "general"}`,
        `Ce qui manque encore a Arganor (${relatedPostCount} article(s) relies aujourd'hui)`,
        "CTA et angle Pinterest a privilegier",
    ];
}

function buildPinDrafts(productName: string, clusterRef: string | null): DraftPack["pinDrafts"] {
    const cluster = clusterRef || "general";

    return [
        {
            angle: "buyer_intent",
            hook: `${productName} vaut-il vraiment le detour ?`,
            visualDirection: `Produit hero sur fond clair, focus premium, cluster ${cluster}`,
            cta: "Voir le guide",
        },
        {
            angle: "problem_solution",
            hook: `Le point sur ${productName} pour une routine plus nette`,
            visualDirection: `Avant/apres editorial, benefice concret, cluster ${cluster}`,
            cta: "Lire l'analyse",
        },
        {
            angle: "curiosity",
            hook: `L'erreur la plus courante avec ${productName}`,
            visualDirection: `Titre fort, contraste propre, promesse simple, cluster ${cluster}`,
            cta: "Voir la routine",
        },
    ];
}

function buildSuggestedAngles(category: string, relatedPostCount: number): string[] {
    const clusterRef =
        category
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "_")
            .replace(/^_+|_+$/g, "") || "general";

    if (relatedPostCount === 0) {
        return [`guide d'achat ${clusterRef}`, `avis expert ${clusterRef}`, `meilleur produit ${clusterRef}`];
    }

    if (relatedPostCount === 1) {
        return [`routine ${clusterRef}`, `comparatif ${clusterRef}`, `erreurs a eviter ${clusterRef}`];
    }

    return [`probleme-solution ${clusterRef}`, `angle saisonnier ${clusterRef}`, `hook pinterest ${clusterRef}`];
}

function buildDeterministicDraftPack(
    queueItem: ContentQueueRow,
    product: ReturnType<typeof getProductBySlug>,
    taxonomy: ProductTaxonomyResolution,
    relatedPostCount: number,
    writerPrompt: ResolvedPromptVersion,
    creativePrompt: ResolvedPromptVersion,
): DraftPack {
    if (!product) {
        throw new Error("[growth-machine] Missing product while building deterministic draft pack.");
    }

    return {
        recommendedPostRef: buildRecommendedPostRef(slugifySegment(product.name), queueItem.intent),
        article: {
            title: buildArticleTitle(product.name, queueItem.intent),
            excerpt: buildExcerpt(product.name, queueItem.intent),
            metaDescription: buildMetaDescription(product.name, queueItem.intent),
            sections: buildSections(product.name, taxonomy.effectiveClusterRef, relatedPostCount),
            cta: `Voir la fiche ${product.name}`,
        },
        pinDrafts: buildPinDrafts(product.name, taxonomy.effectiveClusterRef),
        promptRefs: {
            writer: {
                module: writerPrompt.module,
                promptKey: writerPrompt.promptKey,
                version: writerPrompt.version,
                source: writerPrompt.source,
            },
            creative: {
                module: creativePrompt.module,
                promptKey: creativePrompt.promptKey,
                version: creativePrompt.version,
                source: creativePrompt.source,
            },
        },
        generatedAt: new Date().toISOString(),
        generationMeta: {
            mode: "deterministic",
        },
    };
}

function sanitizeSections(value: unknown, fallback: string[]): string[] {
    if (!Array.isArray(value)) {
        return fallback;
    }

    const items = value
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter(Boolean)
        .slice(0, 6);

    return items.length > 0 ? items : fallback;
}

function sanitizePinDrafts(value: unknown, fallback: DraftPack["pinDrafts"]): DraftPack["pinDrafts"] {
    if (!Array.isArray(value)) {
        return fallback;
    }

    const items = value
        .map((item) => {
            if (!item || typeof item !== "object" || Array.isArray(item)) {
                return null;
            }

            const candidate = item as Record<string, unknown>;
            const angle = typeof candidate.angle === "string" ? candidate.angle.trim() : "";
            const hook = typeof candidate.hook === "string" ? candidate.hook.trim() : "";
            const visualDirection =
                typeof candidate.visualDirection === "string" ? candidate.visualDirection.trim() : "";
            const cta = typeof candidate.cta === "string" ? candidate.cta.trim() : "";

            if (!angle || !hook || !visualDirection || !cta) {
                return null;
            }

            return {
                angle,
                hook,
                visualDirection,
                cta,
            };
        })
        .filter((item): item is DraftPack["pinDrafts"][number] => Boolean(item))
        .slice(0, 5);

    return items.length > 0 ? items : fallback;
}

async function maybeGenerateDraftPackWithAi(
    queueItem: ContentQueueRow,
    product: NonNullable<ReturnType<typeof getProductBySlug>>,
    taxonomy: ProductTaxonomyResolution,
    relatedPostCount: number,
    writerPrompt: ResolvedPromptVersion,
    creativePrompt: ResolvedPromptVersion,
    fallback: DraftPack,
): Promise<DraftPack> {
    if (!hasGrowthAiConfig()) {
        return fallback;
    }

    const recentRelatedPosts = getBlogPosts()
        .filter((post) => post.relatedProductId === product.id)
        .slice(0, 3)
        .map((post) => ({
            title: post.title,
            slug: post.slug,
            excerpt: post.excerpt,
            category: post.category,
        }));

    type AiDraftPack = {
        recommendedPostRef?: string;
        article?: {
            title?: string;
            excerpt?: string;
            metaDescription?: string;
            sections?: string[];
            cta?: string;
        };
        pinDrafts?: Array<{
            angle?: string;
            hook?: string;
            visualDirection?: string;
            cta?: string;
        }>;
    };

    try {
        const result = await generateGrowthJson<AiDraftPack>({
            systemPrompt: [
                "You are the Arganor growth content planner.",
                writerPrompt.promptBody,
                creativePrompt.promptBody,
                "Return JSON only.",
                "You must create one article plan and 3 to 5 Pinterest hook variants.",
                "Keep the tone premium, concrete, and conversion-aware.",
                "Do not mention internal workflows or AI.",
            ].join("\n\n"),
            userPrompt: JSON.stringify(
                {
                    queueItem: {
                        title: queueItem.title,
                        topic: queueItem.topic,
                        intent: queueItem.intent,
                        clusterRef: taxonomy.effectiveClusterRef,
                        decisionReason: queueItem.decision_reason,
                    },
                    product: {
                        slug: product.slug,
                        name: product.name,
                        brand: product.brand ?? null,
                        category: taxonomy.effectiveCategory,
                        description: product.description,
                        rating: product.rating,
                        reviews: product.reviews,
                    },
                    taxonomy: {
                        sourceCategory: taxonomy.sourceCategory,
                        effectiveCategory: taxonomy.effectiveCategory,
                        effectiveClusterRef: taxonomy.effectiveClusterRef,
                        confidence: taxonomy.confidence,
                        rationale: taxonomy.rationale,
                    },
                    relatedPostCount,
                    recentRelatedPosts,
                    expectedShape: {
                        recommendedPostRef: "string",
                        article: {
                            title: "string",
                            excerpt: "string",
                            metaDescription: "string",
                            sections: ["string"],
                            cta: "string",
                        },
                        pinDrafts: [
                            {
                                angle: "string",
                                hook: "string",
                                visualDirection: "string",
                                cta: "string",
                            },
                        ],
                    },
                },
                null,
                2,
            ),
            temperature: 0.7,
            maxOutputTokens: 1400,
        });

        const aiArticle = result.data.article || {};

        return {
            ...fallback,
            recommendedPostRef:
                typeof result.data.recommendedPostRef === "string" && result.data.recommendedPostRef.trim()
                    ? slugifySegment(result.data.recommendedPostRef)
                    : fallback.recommendedPostRef,
            article: {
                title:
                    typeof aiArticle.title === "string" && aiArticle.title.trim()
                        ? aiArticle.title.trim()
                        : fallback.article.title,
                excerpt:
                    typeof aiArticle.excerpt === "string" && aiArticle.excerpt.trim()
                        ? aiArticle.excerpt.trim()
                        : fallback.article.excerpt,
                metaDescription:
                    typeof aiArticle.metaDescription === "string" && aiArticle.metaDescription.trim()
                        ? aiArticle.metaDescription.trim()
                        : fallback.article.metaDescription,
                sections: sanitizeSections(aiArticle.sections, fallback.article.sections),
                cta:
                    typeof aiArticle.cta === "string" && aiArticle.cta.trim()
                        ? aiArticle.cta.trim()
                        : fallback.article.cta,
            },
            pinDrafts: sanitizePinDrafts(result.data.pinDrafts, fallback.pinDrafts),
            generatedAt: new Date().toISOString(),
            generationMeta: {
                mode: "ai",
                provider: result.provider,
                model: result.model,
            },
        };
    } catch (error) {
        console.warn("[growth-machine] AI draft pack generation failed, using deterministic fallback:", error);
        return fallback;
    }
}

function toQueuePayloadObject(queueItem: ContentQueueRow): Record<string, unknown> {
    if (queueItem.payload && typeof queueItem.payload === "object" && !Array.isArray(queueItem.payload)) {
        return { ...(queueItem.payload as Record<string, unknown>) };
    }

    return {};
}

export async function prepareDraftForQueueItem(queueItemId: string): Promise<PreparedDraftResult> {
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

    const product = getProductBySlug(queueItem.product_ref);
    if (!product) {
        throw new Error(`[growth-machine] Product not found for slug: ${queueItem.product_ref}`);
    }

    const taxonomy = resolveProductTaxonomy(product);
    const posts = getBlogPosts();
    const relatedPostCount = posts.filter((post) => post.relatedProductId === product.id).length;
    const writerPrompt = await resolvePromptVersion("writer", toPromptKeyForIntent(queueItem.intent));
    const creativePrompt = await resolvePromptVersion("creative", "pinterest-hooks");

    const fallbackDraftPack = buildDeterministicDraftPack(
        queueItem,
        product,
        taxonomy,
        relatedPostCount,
        writerPrompt,
        creativePrompt,
    );
    const draftPack = await maybeGenerateDraftPackWithAi(
        queueItem,
        product,
        taxonomy,
        relatedPostCount,
        writerPrompt,
        creativePrompt,
        fallbackDraftPack,
    );

    const existingPayload = toQueuePayloadObject(queueItem);
    const nextPayload = {
        ...existingPayload,
        category: taxonomy.effectiveCategory,
        suggestedAngles: buildSuggestedAngles(taxonomy.effectiveCategory, relatedPostCount),
        taxonomy: {
            sourceCategory: taxonomy.sourceCategory,
            sourceClusterRef: taxonomy.sourceClusterRef,
            effectiveCategory: taxonomy.effectiveCategory,
            effectiveClusterRef: taxonomy.effectiveClusterRef,
            inferredAxis: taxonomy.inferredAxis,
            confidence: taxonomy.confidence,
            isCategoryMismatch: taxonomy.isCategoryMismatch,
            rationale: taxonomy.rationale,
            warnings: taxonomy.warnings,
        },
        draftPack,
        draftPreparedAt: draftPack.generatedAt,
        recommendedPostRefSlug: slugifySegment(draftPack.recommendedPostRef),
    };

    const updatedItem = await updateContentQueue(queueItem.id, {
        cluster_ref: taxonomy.effectiveClusterRef,
        payload: nextPayload,
    });

    return {
        queueItem: updatedItem,
        writerPrompt,
        creativePrompt,
        draftPack,
    };
}

export async function prepareDrafts(limit = 3): Promise<PreparedDraftResult[]> {
    const draftItems = await listContentQueue({
        status: "draft",
        limit: Math.max(limit * 3, limit),
    });

    const candidates = draftItems.filter((item) => {
        if (String(item.kind) !== "post") {
            return false;
        }

        if (!item.product_ref) {
            return false;
        }

        const payload = toQueuePayloadObject(item);
        return !payload.draftPack;
    });

    const results: PreparedDraftResult[] = [];

    for (const item of candidates.slice(0, Math.max(limit, 1))) {
        results.push(await prepareDraftForQueueItem(item.id));
    }

    return results;
}

export type { DraftPack, PreparedDraftResult };

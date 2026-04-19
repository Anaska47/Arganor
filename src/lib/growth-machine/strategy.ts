import "server-only";

import { getBlogPosts } from "@/lib/blog";
import { getProducts } from "@/lib/data";

import { generateGrowthJson, hasGrowthAiConfig } from "./ai";
import { resolvePromptVersion, type ResolvedPromptVersion } from "./prompts";
import { resolveProductTaxonomy, type ProductTaxonomyResolution } from "./taxonomy";
import { enqueueContent, listAgentMemory, listContentQueue, type ContentQueueRow } from "./store";

type StrategyIntent = "buyer_intent" | "routine" | "problem_solution";

type StrategyBrief = {
    title: string;
    topic: string;
    intent: StrategyIntent;
    score: number;
    clusterRef: string;
    productRef: string;
    productId: string;
    productName: string;
    relatedPostCount: number;
    decisionReason: string;
    prompt: ResolvedPromptVersion;
    payload: {
        productId: string;
        productName: string;
        brand: string | null;
        category: string;
        reviews: number;
        rating: number;
        relatedPostCount: number;
        suggestedAngles: string[];
        promptModule: string;
        promptKey: string;
        promptVersion: string;
        promptSource: string;
        scoring: {
            baseScore: number;
            recentProductPenalty: number;
            recentClusterPenalty: number;
            finalScore: number;
        };
        selectionMeta: {
            mode: "ai" | "deterministic";
            provider?: string;
            model?: string;
        };
        taxonomy: {
            sourceCategory: string;
            sourceClusterRef: string;
            effectiveCategory: string;
            effectiveClusterRef: string;
            inferredAxis: string | null;
            confidence: string;
            isCategoryMismatch: boolean;
            rationale: string;
            warnings: string[];
        };
    };
};

type StrategyQueueResult = {
    prompt: ResolvedPromptVersion;
    briefs: StrategyBrief[];
    queueItems: ContentQueueRow[];
};

type StrategyCandidate = {
    productId: string;
    productRef: string;
    productName: string;
    brand: string | null;
    category: string;
    clusterRef: string;
    reviews: number;
    rating: number;
    relatedPostCount: number;
    intent: StrategyIntent;
    topic: string;
    suggestedAngles: string[];
    baseScore: number;
    recentProductPenalty: number;
    recentClusterPenalty: number;
    score: number;
    decisionReason: string;
    taxonomy: ProductTaxonomyResolution;
};

type StrategySelection = {
    productRef?: string;
    intent?: string;
    topic?: string;
    suggestedAngles?: string[];
    decisionReason?: string;
};

function slugifySegment(value: string): string {
    return value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");
}

function toClusterRef(category: string): string {
    return slugifySegment(category || "general") || "general";
}

function sanitizeAngles(value: unknown, fallback: string[]): string[] {
    if (!Array.isArray(value)) {
        return fallback;
    }

    const items = value
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter(Boolean)
        .slice(0, 5);

    return items.length > 0 ? items : fallback;
}

function toIntent(value: string | null | undefined, fallback: StrategyIntent): StrategyIntent {
    if (value === "buyer_intent" || value === "routine" || value === "problem_solution") {
        return value;
    }

    return fallback;
}

function buildSuggestedAngles(category: string, relatedPostCount: number): string[] {
    const clusterRef = toClusterRef(category);

    if (relatedPostCount === 0) {
        return [`guide d'achat ${clusterRef}`, `avis expert ${clusterRef}`, `meilleur produit ${clusterRef}`];
    }

    if (relatedPostCount === 1) {
        return [`routine ${clusterRef}`, `comparatif ${clusterRef}`, `erreurs a eviter ${clusterRef}`];
    }

    return [`probleme-solution ${clusterRef}`, `angle saisonnier ${clusterRef}`, `hook pinterest ${clusterRef}`];
}

function buildIntent(relatedPostCount: number): StrategyIntent {
    if (relatedPostCount === 0) {
        return "buyer_intent";
    }

    if (relatedPostCount === 1) {
        return "routine";
    }

    return "problem_solution";
}

function buildTopic(productName: string, intent: StrategyIntent): string {
    if (intent === "buyer_intent") {
        return `Pourquoi ${productName} merite un guide d'achat Arganor`;
    }

    if (intent === "routine") {
        return `Routine Arganor autour de ${productName}`;
    }

    return `Problemes que ${productName} peut aider a resoudre`;
}

function isRecentIsoDate(value: string | null | undefined, windowInDays: number): boolean {
    if (!value) {
        return false;
    }

    const timestamp = Date.parse(value);
    if (!Number.isFinite(timestamp)) {
        return false;
    }

    const ageInMs = Date.now() - timestamp;
    return ageInMs <= windowInDays * 24 * 60 * 60 * 1000;
}

function buildDecisionReason(
    productName: string,
    relatedPostCount: number,
    reviews: number,
    rating: number,
    recentProductPenalty: number,
    recentClusterPenalty: number,
): string {
    const reasons = [
        `${productName} combine ${reviews} avis, une note de ${rating.toFixed(1)}/5 et seulement ${relatedPostCount} article(s) relies.`,
    ];

    if (recentProductPenalty > 0) {
        reasons.push(`Penalty recent_product=${recentProductPenalty} car ce produit a deja ete travaille recemment.`);
    }

    if (recentClusterPenalty > 0) {
        reasons.push(`Penalty recent_cluster=${recentClusterPenalty} car le cluster a deja recu de l'attention recente.`);
    }

    return reasons.join(" ");
}

function toStrategyBrief(
    candidate: StrategyCandidate,
    prompt: ResolvedPromptVersion,
    selectionMeta: StrategyBrief["payload"]["selectionMeta"],
    overrides?: StrategySelection,
): StrategyBrief {
    const nextIntent = toIntent(overrides?.intent, candidate.intent);
    const nextTopic =
        typeof overrides?.topic === "string" && overrides.topic.trim()
            ? overrides.topic.trim()
            : buildTopic(candidate.productName, nextIntent);
    const nextDecisionReason =
        typeof overrides?.decisionReason === "string" && overrides.decisionReason.trim()
            ? overrides.decisionReason.trim()
            : candidate.decisionReason;

    return {
        title: `Strategic brief: ${candidate.productName}`,
        topic: nextTopic,
        intent: nextIntent,
        score: candidate.score,
        clusterRef: candidate.clusterRef,
        productRef: candidate.productRef,
        productId: candidate.productId,
        productName: candidate.productName,
        relatedPostCount: candidate.relatedPostCount,
        decisionReason: nextDecisionReason,
        prompt,
        payload: {
            productId: candidate.productId,
            productName: candidate.productName,
            brand: candidate.brand,
            category: candidate.category,
            reviews: candidate.reviews,
            rating: candidate.rating,
            relatedPostCount: candidate.relatedPostCount,
            suggestedAngles: sanitizeAngles(overrides?.suggestedAngles, candidate.suggestedAngles),
            promptModule: prompt.module,
            promptKey: prompt.promptKey,
            promptVersion: prompt.version,
            promptSource: prompt.source,
            scoring: {
                baseScore: candidate.baseScore,
                recentProductPenalty: candidate.recentProductPenalty,
                recentClusterPenalty: candidate.recentClusterPenalty,
                finalScore: candidate.score,
            },
            selectionMeta,
            taxonomy: {
                sourceCategory: candidate.taxonomy.sourceCategory,
                sourceClusterRef: candidate.taxonomy.sourceClusterRef,
                effectiveCategory: candidate.taxonomy.effectiveCategory,
                effectiveClusterRef: candidate.taxonomy.effectiveClusterRef,
                inferredAxis: candidate.taxonomy.inferredAxis,
                confidence: candidate.taxonomy.confidence,
                isCategoryMismatch: candidate.taxonomy.isCategoryMismatch,
                rationale: candidate.taxonomy.rationale,
                warnings: candidate.taxonomy.warnings,
            },
        },
    };
}

async function maybeSelectBriefsWithAi(
    candidates: StrategyCandidate[],
    limit: number,
    prompt: ResolvedPromptVersion,
    recentProductRefs: string[],
    recentClusterRefs: string[],
): Promise<StrategyBrief[]> {
    const rankedCandidates = [...candidates].sort((left, right) => right.score - left.score);
    const deterministicBriefs = rankedCandidates
        .slice(0, Math.max(limit, 1))
        .map((candidate) => toStrategyBrief(candidate, prompt, { mode: "deterministic" }));

    if (!hasGrowthAiConfig() || rankedCandidates.length === 0) {
        return deterministicBriefs;
    }

    type AiSelectionResponse = {
        selections?: StrategySelection[];
    };

    const candidatePool = rankedCandidates.slice(0, Math.min(Math.max(limit * 3, limit), 12));

    try {
        const result = await generateGrowthJson<AiSelectionResponse>({
            systemPrompt: [
                "You are the Arganor strategist.",
                prompt.promptBody,
                "Return JSON only.",
                "Select the best next opportunities from the provided candidate pool.",
                "Do not invent products outside the candidate pool.",
                "Favor qualified traffic, cluster diversity, and low duplication risk.",
            ].join("\n\n"),
            userPrompt: JSON.stringify(
                {
                    limit,
                    recentSignals: {
                        recentProductRefs,
                        recentClusterRefs,
                    },
                    candidates: candidatePool.map((candidate) => ({
                        productRef: candidate.productRef,
                        productName: candidate.productName,
                        brand: candidate.brand,
                        category: candidate.category,
                        clusterRef: candidate.clusterRef,
                        intent: candidate.intent,
                        topic: candidate.topic,
                        relatedPostCount: candidate.relatedPostCount,
                        reviews: candidate.reviews,
                        rating: candidate.rating,
                        suggestedAngles: candidate.suggestedAngles,
                        score: candidate.score,
                        decisionReason: candidate.decisionReason,
                    })),
                    expectedShape: {
                        selections: [
                            {
                                productRef: "string",
                                intent: "buyer_intent | routine | problem_solution",
                                topic: "string",
                                suggestedAngles: ["string"],
                                decisionReason: "string",
                            },
                        ],
                    },
                },
                null,
                2,
            ),
            temperature: 0.5,
            maxOutputTokens: 1400,
        });

        const selectionMeta: StrategyBrief["payload"]["selectionMeta"] = {
            mode: "ai",
            provider: result.provider,
            model: result.model,
        };
        const candidateMap = new Map(candidatePool.map((candidate) => [candidate.productRef, candidate]));
        const selectedRefs = new Set<string>();
        const aiBriefs: StrategyBrief[] = [];

        for (const selection of Array.isArray(result.data.selections) ? result.data.selections : []) {
            const productRef = typeof selection.productRef === "string" ? selection.productRef.trim() : "";
            if (!productRef || selectedRefs.has(productRef)) {
                continue;
            }

            const candidate = candidateMap.get(productRef);
            if (!candidate) {
                continue;
            }

            selectedRefs.add(productRef);
            aiBriefs.push(toStrategyBrief(candidate, prompt, selectionMeta, selection));

            if (aiBriefs.length >= limit) {
                break;
            }
        }

        if (aiBriefs.length === 0) {
            return deterministicBriefs;
        }

        const fallbackFill = candidatePool
            .filter((candidate) => !selectedRefs.has(candidate.productRef))
            .map((candidate) => toStrategyBrief(candidate, prompt, selectionMeta))
            .slice(0, Math.max(limit - aiBriefs.length, 0));

        return [...aiBriefs, ...fallbackFill].slice(0, Math.max(limit, 1));
    } catch (error) {
        console.warn("[growth-machine] AI strategy selection failed, using deterministic fallback:", error);
        return deterministicBriefs;
    }
}

export async function generateStrategyBriefs(limit = 3): Promise<{ prompt: ResolvedPromptVersion; briefs: StrategyBrief[] }> {
    const products = getProducts();
    const posts = getBlogPosts();
    const prompt = await resolvePromptVersion("strategist", "daily-opportunity-selection");
    const [queueItems, memoryItems] = await Promise.all([listContentQueue({ limit: 100 }), listAgentMemory({ limit: 150 })]);

    const relatedPostCountByProductId = new Map<string, number>();
    for (const post of posts) {
        if (!post.relatedProductId) {
            continue;
        }

        relatedPostCountByProductId.set(
            post.relatedProductId,
            (relatedPostCountByProductId.get(post.relatedProductId) ?? 0) + 1,
        );
    }

    const openStatuses = new Set(["draft", "queued", "scheduled", "running"]);
    const openProductRefs = new Set(
        queueItems
            .filter((item) => openStatuses.has(String(item.status)) && item.product_ref)
            .map((item) => item.product_ref as string),
    );

    const recentProductRefs = new Set<string>();
    const recentClusterRefs = new Set<string>();

    for (const item of memoryItems) {
        if (!String(item.memory_key || "").endsWith(":generation")) {
            continue;
        }

        if (!isRecentIsoDate(item.last_seen_at || item.updated_at, 14)) {
            continue;
        }

        if (item.product_ref) {
            recentProductRefs.add(item.product_ref);
        }

        if (item.cluster_ref) {
            recentClusterRefs.add(item.cluster_ref);
        }
    }

    const candidates = products
        .flatMap((product) => {
            if (openProductRefs.has(product.slug)) {
                return [];
            }

            const relatedPostCount = relatedPostCountByProductId.get(product.id) ?? 0;
            const taxonomy = resolveProductTaxonomy(product);
            const clusterRef = taxonomy.effectiveClusterRef;
            const intent = buildIntent(relatedPostCount);
            const baseScore = Math.max(
                0,
                Math.round(
                    Math.min(product.reviews / 40, 40) +
                        product.rating * 10 +
                        Math.min((product.seoTags?.length ?? 0) * 2, 10) -
                        relatedPostCount * 18,
                ),
            );
            const recentProductPenalty = recentProductRefs.has(product.slug) ? 35 : 0;
            const recentClusterPenalty = recentClusterRefs.has(clusterRef) ? 12 : 0;
            const score = Math.max(0, baseScore - recentProductPenalty - recentClusterPenalty);

            return [
                {
                    productId: product.id,
                    productRef: product.slug,
                    productName: product.name,
                    brand: product.brand ?? null,
                    category: taxonomy.effectiveCategory,
                    clusterRef,
                    reviews: product.reviews,
                    rating: product.rating,
                    relatedPostCount,
                    intent,
                    topic: buildTopic(product.name, intent),
                    suggestedAngles: buildSuggestedAngles(taxonomy.effectiveCategory, relatedPostCount),
                    baseScore,
                    recentProductPenalty,
                    recentClusterPenalty,
                    score,
                    decisionReason: buildDecisionReason(
                        product.name,
                        relatedPostCount,
                        product.reviews,
                        product.rating,
                        recentProductPenalty,
                        recentClusterPenalty,
                    ),
                    taxonomy,
                } satisfies StrategyCandidate,
            ];
        })
        .sort((left, right) => right.score - left.score);

    const briefs = await maybeSelectBriefsWithAi(
        candidates,
        limit,
        prompt,
        Array.from(recentProductRefs),
        Array.from(recentClusterRefs),
    );

    return { prompt, briefs };
}

export async function enqueueStrategyBriefs(limit = 3): Promise<StrategyQueueResult> {
    const { prompt, briefs } = await generateStrategyBriefs(limit);
    const queueItems = await Promise.all(
        briefs.map((brief) =>
            enqueueContent({
                kind: "post",
                status: "draft",
                priority: brief.score,
                title: brief.title,
                topic: brief.topic,
                intent: brief.intent,
                product_ref: brief.productRef,
                cluster_ref: brief.clusterRef,
                payload: brief.payload,
                decision_reason: brief.decisionReason,
            }),
        ),
    );

    return {
        prompt,
        briefs,
        queueItems,
    };
}

export type { StrategyBrief, StrategyQueueResult };

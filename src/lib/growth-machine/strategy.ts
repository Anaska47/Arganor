import "server-only";

import { getBlogPosts } from "@/lib/blog";
import { getProductById, getProductBySlug, getPublicProducts } from "@/lib/data";

import { generateGrowthJson, hasGrowthAiConfig } from "./ai";
import { resolvePromptVersion, type ResolvedPromptVersion } from "./prompts";
import { resolveProductTaxonomy, type ProductTaxonomyResolution } from "./taxonomy";
import { enqueueContent, listAgentMemory, listContentQueue, type ContentQueueRow } from "./store";

type StrategyIntent = "buyer_intent" | "routine" | "problem_solution";
type BusinessTheme = "imperfections" | "hair_growth" | "hydration" | "anti_age" | "body_care" | "general";
type StrategyProduct = ReturnType<typeof getPublicProducts>[number];

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
            businessPriorityBoost: number;
            intentBonus: number;
            contentGapBonus: number;
            recentProductPenalty: number;
            recentClusterPenalty: number;
            finalScore: number;
        };
        selectionMeta: {
            mode: "ai" | "deterministic";
            provider?: string;
            model?: string;
        };
        businessFocus: {
            theme: BusinessTheme;
            label: string;
            priorityBoost: number;
            angleHints: string[];
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
    businessTheme: BusinessTheme;
    businessThemeLabel: string;
    businessPriorityBoost: number;
    intentBonus: number;
    contentGapBonus: number;
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

type BusinessPriorityProfile = {
    theme: BusinessTheme;
    label: string;
    priorityBoost: number;
    angleHints: string[];
};

function normalizeText(value: string): string {
    return value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
}

function toCanonicalProductRef(value: string | null | undefined): string | null {
    if (!value) {
        return null;
    }

    const product = getProductBySlug(value);
    return product?.slug || value;
}

function containsAnyPattern(value: string, patterns: RegExp[]): boolean {
    return patterns.some((pattern) => pattern.test(value));
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

function buildPriorityProfile(product: StrategyProduct, taxonomy: ProductTaxonomyResolution): BusinessPriorityProfile {
    const corpus = normalizeText(
        [
            product.name,
            product.category,
            ...(Array.isArray(product.features) ? product.features : []),
            ...(Array.isArray(product.seoTags) ? product.seoTags : []),
            ...taxonomy.signals.map((signal) => signal.label),
        ]
            .filter(Boolean)
            .join(" "),
    );

    if (
        containsAnyPattern(corpus, [
            /\bniacinamide\b/,
            /\bbha\b/,
            /\bimperfections?\b/,
            /\bboutons?\b/,
            /\bpores?\b/,
            /\bpeau grasse\b/,
            /\bsebum\b/,
        ])
    ) {
        return {
            theme: "imperfections",
            label: "imperfections / peau grasse",
            priorityBoost: 18,
            angleHints: [
                "meilleur serum niacinamide pour peau grasse",
                "bha ou niacinamide contre les imperfections",
                "routine simple anti-boutons",
            ],
        };
    }

    if (
        containsAnyPattern(corpus, [
            /\bromarin\b/,
            /\bricin\b/,
            /\bcheveux\b/,
            /\bcuir chevelu\b/,
            /\brepousse\b/,
            /\bcroissance\b/,
            /\bclairsemes?\b/,
            /\bfortifiant\b/,
            /\bshampooing\b/,
        ])
    ) {
        return {
            theme: "hair_growth",
            label: "pousse cheveux / cuir chevelu",
            priorityBoost: 16,
            angleHints: [
                "huile de romarin pour la pousse des cheveux",
                "ricin ou romarin pour cheveux clairsemes",
                "routine cuir chevelu simple",
            ],
        };
    }

    if (
        containsAnyPattern(corpus, [
            /\bhydratation\b/,
            /\bpeau seche\b/,
            /\bacide hyaluronique\b/,
            /\bsnail\b/,
            /\bmucin\b/,
            /\bglow\b/,
            /\bbarriere cutanee\b/,
            /\bceramide\b/,
            /\bargan\b/,
        ])
    ) {
        return {
            theme: "hydration",
            label: "hydratation / peau seche / glow",
            priorityBoost: 14,
            angleHints: [
                "routine peau seche acide hyaluronique",
                "snail mucin avant ou apres",
                "quelle creme pour peau tres seche",
            ],
        };
    }

    if (containsAnyPattern(corpus, [/\bretinol\b/, /\banti[ -]?age\b/, /\brides?\b/, /\bfermete\b/])) {
        return {
            theme: "anti_age",
            label: "anti-age premium",
            priorityBoost: 8,
            angleHints: ["retinol pour debutant", "routine anti-age simple", "erreurs a eviter avec le retinol"],
        };
    }

    if (taxonomy.effectiveClusterRef === "soin_du_corps") {
        return {
            theme: "body_care",
            label: "soin du corps",
            priorityBoost: 5,
            angleHints: ["routine corps nourrissante", "peau seche corps", "lait corps ou huile"],
        };
    }

    return {
        theme: "general",
        label: taxonomy.effectiveCategory.toLowerCase(),
        priorityBoost: 0,
        angleHints: [
            `guide d'achat ${taxonomy.effectiveClusterRef.replace(/_/g, " ")}`,
            `routine ${taxonomy.effectiveClusterRef.replace(/_/g, " ")}`,
            `erreurs a eviter ${taxonomy.effectiveClusterRef.replace(/_/g, " ")}`,
        ],
    };
}

function buildSuggestedAngles(productName: string, profile: BusinessPriorityProfile, relatedPostCount: number): string[] {
    const productLead = productName.trim();

    if (profile.theme === "imperfections") {
        if (relatedPostCount === 0) {
            return [
                `${productLead} pour peau grasse et imperfections`,
                "bha ou niacinamide lequel choisir",
                "routine anti-imperfections simple",
            ];
        }

        return [
            `comment utiliser ${productLead} sans irriter`,
            "routine peau grasse matin et soir",
            "erreurs qui aggravent les imperfections",
        ];
    }

    if (profile.theme === "hair_growth") {
        if (relatedPostCount === 0) {
            return [
                `${productLead} pour la pousse des cheveux`,
                "huile de romarin ou huile de ricin",
                "routine cuir chevelu et repousse",
            ];
        }

        return [
            `comment integrer ${productLead} dans une routine cheveux`,
            "cuir chevelu irrite ou cheveux clairsemes",
            "erreurs qui freinent la pousse",
        ];
    }

    if (profile.theme === "hydration") {
        if (relatedPostCount === 0) {
            return [
                `${productLead} pour hydrater une peau seche`,
                "acide hyaluronique dans quel ordre",
                "routine glow sans surcharger la peau",
            ];
        }

        return [
            `comment utiliser ${productLead} pour une peau qui tiraille`,
            "routine hydratation matin ou soir",
            "erreurs qui empechent la peau de rester souple",
        ];
    }

    if (relatedPostCount === 0) {
        return profile.angleHints;
    }

    if (relatedPostCount === 1) {
        return [
            ...profile.angleHints.slice(0, 2),
            `comparatif autour de ${productLead}`,
        ];
    }

    return [
        ...profile.angleHints.slice(0, 2),
        `hook Pinterest pour ${productLead}`,
    ];
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

function buildIntentBonus(intent: StrategyIntent): number {
    if (intent === "buyer_intent") {
        return 10;
    }

    if (intent === "routine") {
        return 6;
    }

    return 2;
}

function buildContentGapBonus(relatedPostCount: number): number {
    if (relatedPostCount === 0) {
        return 10;
    }

    if (relatedPostCount === 1) {
        return 6;
    }

    return 0;
}

function buildTopic(productName: string, intent: StrategyIntent, profile: BusinessPriorityProfile): string {
    if (profile.theme === "imperfections") {
        if (intent === "buyer_intent") {
            return `${productName} vaut-il le coup pour les imperfections et la peau grasse ?`;
        }

        if (intent === "routine") {
            return `Comment integrer ${productName} dans une routine peau grasse sans surcharger la peau`;
        }

        return `${productName} peut-il aider quand boutons, pores et brillance s'installent ?`;
    }

    if (profile.theme === "hair_growth") {
        if (intent === "buyer_intent") {
            return `Mon avis sur ${productName} pour la pousse des cheveux et le cuir chevelu`;
        }

        if (intent === "routine") {
            return `Routine simple avec ${productName} pour stimuler la pousse et le cuir chevelu`;
        }

        return `${productName} peut-il aider quand les cheveux paraissent plus clairsemes ?`;
    }

    if (profile.theme === "hydration") {
        if (intent === "buyer_intent") {
            return `${productName} est-il un bon choix pour hydrater une peau seche ?`;
        }

        if (intent === "routine") {
            return `Routine hydratation avec ${productName} pour peau seche ou terne`;
        }

        return `${productName} peut-il soulager une peau seche qui tiraille vraiment ?`;
    }

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
    businessThemeLabel: string,
    businessPriorityBoost: number,
    intentBonus: number,
    contentGapBonus: number,
    recentProductPenalty: number,
    recentClusterPenalty: number,
): string {
    const reasons = [
        `${productName} combine ${reviews} avis, une note de ${rating.toFixed(1)}/5 et seulement ${relatedPostCount} article(s) relies.`,
    ];

    if (businessPriorityBoost > 0) {
        reasons.push(`Priorite business ${businessThemeLabel} (+${businessPriorityBoost}).`);
    }

    if (intentBonus > 0) {
        reasons.push(`Intent bonus +${intentBonus}.`);
    }

    if (contentGapBonus > 0) {
        reasons.push(`Content gap bonus +${contentGapBonus}.`);
    }

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
            : buildTopic(candidate.productName, nextIntent, {
                  theme: candidate.businessTheme,
                  label: candidate.businessThemeLabel,
                  priorityBoost: candidate.businessPriorityBoost,
                  angleHints: candidate.suggestedAngles,
              });
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
                businessPriorityBoost: candidate.businessPriorityBoost,
                intentBonus: candidate.intentBonus,
                contentGapBonus: candidate.contentGapBonus,
                recentProductPenalty: candidate.recentProductPenalty,
                recentClusterPenalty: candidate.recentClusterPenalty,
                finalScore: candidate.score,
            },
            selectionMeta,
            businessFocus: {
                theme: candidate.businessTheme,
                label: candidate.businessThemeLabel,
                priorityBoost: candidate.businessPriorityBoost,
                angleHints: candidate.suggestedAngles,
            },
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
                        businessTheme: candidate.businessTheme,
                        businessThemeLabel: candidate.businessThemeLabel,
                        businessPriorityBoost: candidate.businessPriorityBoost,
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
    const products = getPublicProducts();
    const posts = getBlogPosts();
    const prompt = await resolvePromptVersion("strategist", "daily-opportunity-selection");
    const [queueItems, memoryItems] = await Promise.all([listContentQueue({ limit: 100 }), listAgentMemory({ limit: 150 })]);

    const relatedPostCountByProductRef = new Map<string, number>();
    for (const post of posts) {
        if (!post.relatedProductId) {
            continue;
        }

        const relatedProduct = getProductById(post.relatedProductId);
        if (!relatedProduct) {
            continue;
        }

        const canonicalProductRef = toCanonicalProductRef(relatedProduct.slug);
        if (!canonicalProductRef) {
            continue;
        }

        relatedPostCountByProductRef.set(
            canonicalProductRef,
            (relatedPostCountByProductRef.get(canonicalProductRef) ?? 0) + 1,
        );
    }

    const openStatuses = new Set(["draft", "queued", "scheduled", "running"]);
    const openProductRefs = new Set(
        queueItems
            .filter((item) => openStatuses.has(String(item.status)) && item.product_ref)
            .map((item) => toCanonicalProductRef(item.product_ref as string))
            .filter((value): value is string => Boolean(value)),
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
            const canonicalProductRef = toCanonicalProductRef(item.product_ref);
            if (canonicalProductRef) {
                recentProductRefs.add(canonicalProductRef);
            }
        }

        if (item.cluster_ref) {
            recentClusterRefs.add(item.cluster_ref);
        }
    }

    const candidates = products
        .flatMap((product) => {
            const canonicalProductRef = toCanonicalProductRef(product.slug) || product.slug;

            if (openProductRefs.has(canonicalProductRef)) {
                return [];
            }

            const relatedPostCount = relatedPostCountByProductRef.get(canonicalProductRef) ?? 0;
            const taxonomy = resolveProductTaxonomy(product);
            const clusterRef = taxonomy.effectiveClusterRef;
            const intent = buildIntent(relatedPostCount);
            const priorityProfile = buildPriorityProfile(product, taxonomy);
            const intentBonus = buildIntentBonus(intent);
            const contentGapBonus = buildContentGapBonus(relatedPostCount);
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
            const score = Math.max(
                0,
                baseScore + priorityProfile.priorityBoost + intentBonus + contentGapBonus - recentProductPenalty - recentClusterPenalty,
            );

            return [
                {
                    productId: product.id,
                    productRef: canonicalProductRef,
                    productName: product.name,
                    brand: product.brand ?? null,
                    category: taxonomy.effectiveCategory,
                    clusterRef,
                    reviews: product.reviews,
                    rating: product.rating,
                    relatedPostCount,
                    intent,
                    topic: buildTopic(product.name, intent, priorityProfile),
                    suggestedAngles: buildSuggestedAngles(product.name, priorityProfile, relatedPostCount),
                    businessTheme: priorityProfile.theme,
                    businessThemeLabel: priorityProfile.label,
                    businessPriorityBoost: priorityProfile.priorityBoost,
                    intentBonus,
                    contentGapBonus,
                    baseScore,
                    recentProductPenalty,
                    recentClusterPenalty,
                    score,
                    decisionReason: buildDecisionReason(
                        product.name,
                        relatedPostCount,
                        product.reviews,
                        product.rating,
                        priorityProfile.label,
                        priorityProfile.priorityBoost,
                        intentBonus,
                        contentGapBonus,
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

import "server-only";

import { getBlogPosts } from "@/lib/blog";
import { getProductBySlug } from "@/lib/data";

import { generateGrowthJson, hasGrowthAiConfig } from "./ai";
import { buildProductEvidence } from "./product-evidence";
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

function buildArticleTitle(productName: string, clusterRef: string, intent: string | null): string {
    if (intent === "routine") {
        if (clusterRef === "soin_des_cheveux") {
            return `${productName}: comment l'integrer sans alourdir le cuir chevelu`;
        }

        if (clusterRef === "soin_du_visage") {
            return `${productName}: comment l'integrer dans une routine sans surcharger la peau`;
        }

        return `${productName}: comment l'integrer dans une routine simple et realiste`;
    }

    if (intent === "problem_solution") {
        if (clusterRef === "soin_des_cheveux") {
            return `${productName}: peut-il aider si le cuir chevelu et la pousse sont la vraie priorite ?`;
        }

        if (clusterRef === "soin_du_visage") {
            return `${productName}: peut-il vraiment aider sur pores, brillance ou imperfections ?`;
        }

        return `${productName}: peut-il vraiment aider dans une routine ciblee ?`;
    }

    if (clusterRef === "soin_des_cheveux") {
        return `${productName}: pour qui, comment l'appliquer et quoi verifier avant achat`;
    }

    if (clusterRef === "soin_du_visage") {
        return `${productName}: pour qui, comment l'utiliser et quoi verifier avant achat`;
    }

    return `${productName}: vrai fit produit, limites et points a verifier avant achat`;
}

function buildExcerpt(productName: string, clusterRef: string, intent: string | null): string {
    if (intent === "routine") {
        if (clusterRef === "soin_des_cheveux") {
            return `Une routine simple pour utiliser ${productName} sur le cuir chevelu sans graisser toute la routine ni promettre une pousse miracle.`;
        }

        return `Une routine simple, claire et credible pour utiliser ${productName} sans surcharge ni promesse vide.`;
    }

    if (intent === "problem_solution") {
        return `On regarde ou ${productName} peut vraiment s'integrer, pour qui, avec quelles limites et a quel rythme juger le resultat.`;
    }

    if (clusterRef === "soin_des_cheveux") {
        return `On regarde a qui ${productName} peut convenir, comment l'appliquer sur le cuir chevelu et ce qu'il faut verifier avant de cliquer.`;
    }

    if (clusterRef === "soin_du_visage") {
        return `On regarde a qui ${productName} peut convenir, comment l'utiliser sans irriter et ce qu'il faut verifier avant achat.`;
    }

    return `Le point sur ${productName}, ses forces reelles, ses limites et le type de routine auquel il convient le mieux.`;
}

function buildMetaDescription(productName: string, clusterRef: string, intent: string | null): string {
    if (intent === "routine") {
        return `Routine Arganor autour de ${productName}: ordre d'application, points d'attention et usage recommande.`;
    }

    if (intent === "problem_solution") {
        return `${productName}: problemes cibles, limites, et conseils d'usage dans une routine concrete.`;
    }

    if (clusterRef === "soin_des_cheveux") {
        return `${productName}: application, limites, profils concernes et points a verifier avant achat.`;
    }

    if (clusterRef === "soin_du_visage") {
        return `${productName}: fit produit, tolerance, limites et points a verifier avant achat.`;
    }

    return `${productName}: avis, points forts, limites et verifications utiles avant achat.`;
}

function buildSections(productName: string, clusterRef: string, intent: string | null): string[] {
    if (intent === "routine") {
        if (clusterRef === "soin_des_cheveux") {
            return [
                `Pour quel cuir chevelu cette routine avec ${productName} reste logique`,
                `Comment appliquer ${productName} sans graisser toute la routine`,
                `Les erreurs qui font abandonner trop vite`,
                `Ce qu'il faut verifier avant de voir la fiche produit`,
            ];
        }

        return [
            `A qui cette routine avec ${productName} convient vraiment`,
            `Comment utiliser ${productName} dans le bon ordre`,
            `Les erreurs a eviter avec ${productName}`,
            `Notre avis avant d'aller voir la fiche produit`,
        ];
    }

    if (intent === "problem_solution") {
        if (clusterRef === "soin_du_visage") {
            return [
                `Quel besoin ${productName} peut vraiment aider a traiter`,
                `Ce que le produit peut faire sans survendre le resultat`,
                `Les limites et profils pour lesquels ralentir`,
                `Ce qu'il faut verifier sur la fiche produit avant achat`,
            ];
        }

        return [
            `Quel probleme ${productName} peut vraiment aider a corriger`,
            `Ce que ${productName} fait bien`,
            `Les limites a connaitre avant de l'essayer`,
            `Faut-il cliquer pour voir la fiche produit ?`,
        ];
    }

    if (clusterRef === "soin_des_cheveux") {
        return [
            `Pour quel type de cuir chevelu ${productName} peut etre un bon choix`,
            `Ce que cette huile apporte vraiment dans une routine simple`,
            `Ce qu'elle ne fera pas a elle seule`,
            `Comment l'appliquer sans erreur ni surcharge`,
            `Ce qu'il faut verifier sur la fiche Amazon avant achat`,
        ];
    }

    if (clusterRef === "soin_du_visage") {
        return [
            `Pour quel type de peau ${productName} peut etre pertinent`,
            `Ce que le produit fait bien quand le besoin est clair`,
            `Les limites et points de tolerance a garder en tete`,
            `Comment l'utiliser sans compliquer la routine`,
            `Ce qu'il faut verifier avant de cliquer vers la fiche produit`,
        ];
    }

    return [
        `Pour qui ${productName} est un bon choix`,
        `Ce que ${productName} fait bien`,
        `Les limites a connaitre avant d'acheter`,
        `Comment l'utiliser sans erreur`,
        `Notre verdict avant d'aller voir la fiche produit`,
    ];
}

function buildPinDrafts(productName: string, clusterRef: string | null, intent: string | null): DraftPack["pinDrafts"] {
    const cluster = clusterRef || "general";

    if (intent === "routine") {
        if (clusterRef === "soin_des_cheveux") {
            return [
                {
                    angle: "routine_simple",
                    hook: `Comment utiliser ${productName} sans graisser tout le cuir chevelu`,
                    visualDirection: `Routine cuir chevelu simple, produit hero, texte clair, cluster ${cluster}`,
                    cta: "Voir la routine simple",
                },
                {
                    angle: "mistake",
                    hook: `L'erreur qui fait abandonner trop vite ${productName}`,
                    visualDirection: `Hook erreur courante, contraste net, cluster ${cluster}`,
                    cta: "Eviter l'erreur",
                },
                {
                    angle: "result",
                    hook: `Pour quel cuir chevelu ${productName} reste logique`,
                    visualDirection: `Benefice concret, cadrage premium, cluster ${cluster}`,
                    cta: "Voir le bon fit",
                },
            ];
        }

        return [
            {
                angle: "routine_simple",
                hook: `Comment utiliser ${productName} sans surcharger sa routine`,
                visualDirection: `Routine simple, produit hero, texte clair, cluster ${cluster}`,
                cta: "Voir les etapes",
            },
            {
                angle: "mistake",
                hook: `L'erreur qui ruine l'effet de ${productName}`,
                visualDirection: `Hook erreur courante, contraste net, cluster ${cluster}`,
                cta: "Eviter l'erreur",
            },
            {
                angle: "result",
                hook: `A qui ${productName} convient vraiment`,
                visualDirection: `Promesse claire, benefice visible, cluster ${cluster}`,
                cta: "Voir si ca vous correspond",
            },
        ];
    }

    if (clusterRef === "soin_des_cheveux") {
        return [
            {
                angle: "buyer_intent",
                hook: `${productName}: bon choix ou simple buzz pour le cuir chevelu ?`,
                visualDirection: `Produit hero sur fond clair, promesse d'achat claire, cluster ${cluster}`,
                cta: "Voir l'avis concret",
            },
            {
                angle: "mistake",
                hook: `Ce qu'il faut verifier avant d'acheter cette huile cuir chevelu`,
                visualDirection: `Texte fort, objection utile, cluster ${cluster}`,
                cta: "Voir les verifications",
            },
            {
                angle: "result",
                hook: `A qui ${productName} peut vraiment convenir`,
                visualDirection: `Benefice concret, cadrage premium, cluster ${cluster}`,
                cta: "Voir si le produit colle",
            },
        ];
    }

    return [
        {
            angle: "buyer_intent",
            hook: `${productName} vaut-il vraiment le coup ?`,
            visualDirection: `Produit hero sur fond clair, promesse d'achat claire, cluster ${cluster}`,
            cta: "Voir notre avis",
        },
        {
            angle: "mistake",
            hook: `Ce qu'il faut savoir avant d'acheter ${productName}`,
            visualDirection: `Texte fort, objection utile, cluster ${cluster}`,
            cta: "Voir les points a verifier",
        },
        {
            angle: "result",
            hook: `Pour qui ${productName} est un bon choix`,
            visualDirection: `Benefice concret, cadrage premium, cluster ${cluster}`,
            cta: "Voir si c'est pour vous",
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

    const evidence = buildProductEvidence(product, taxonomy);

    return {
        recommendedPostRef: buildRecommendedPostRef(slugifySegment(product.name), queueItem.intent),
        article: {
            title: buildArticleTitle(product.name, taxonomy.effectiveClusterRef, queueItem.intent),
            excerpt: buildExcerpt(product.name, taxonomy.effectiveClusterRef, queueItem.intent),
            metaDescription: buildMetaDescription(product.name, taxonomy.effectiveClusterRef, queueItem.intent),
            sections: buildSections(product.name, taxonomy.effectiveClusterRef, queueItem.intent),
            cta: evidence.clickReasons[0] ? `Voir la fiche ${product.name} pour ${evidence.clickReasons[0]}` : `Voir la fiche ${product.name}`,
        },
        pinDrafts: buildPinDrafts(product.name, taxonomy.effectiveClusterRef, queueItem.intent),
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

    const evidence = buildProductEvidence(product, taxonomy);

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
                        asin: product.asin ?? null,
                        price: product.price,
                    },
                    taxonomy: {
                        sourceCategory: taxonomy.sourceCategory,
                        effectiveCategory: taxonomy.effectiveCategory,
                        effectiveClusterRef: taxonomy.effectiveClusterRef,
                        confidence: taxonomy.confidence,
                        rationale: taxonomy.rationale,
                    },
                    evidence: {
                        signals: evidence.signals,
                        fitProfiles: evidence.fitProfiles,
                        objectionChecklist: evidence.objectionChecklist,
                        clickReasons: evidence.clickReasons,
                        usageGuidance: evidence.usageGuidance,
                        qualitySummary: evidence.qualitySummary,
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

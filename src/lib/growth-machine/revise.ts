import "server-only";

import { getProductBySlug } from "@/lib/data";

import { generateGrowthJson, hasGrowthAiConfig } from "./ai";
import type { ContentDraft } from "./content-runner";
import { resolvePromptVersion, type ResolvedPromptVersion } from "./prompts";
import { reviewQueueItem, type DraftReview, type ReviewResult } from "./review";
import { resolveProductTaxonomy } from "./taxonomy";
import { getContentQueueItem, listContentQueue, updateContentQueue, type ContentQueueRow } from "./store";

type RevisionResult = {
    queueItem: ContentQueueRow;
    contentDraft: ContentDraft;
    writerPrompt: ResolvedPromptVersion;
    reviewResult: ReviewResult;
};

type AiRevisionDraft = {
    post?: {
        slug?: string;
        title?: string;
        excerpt?: string;
        metaDescription?: string;
        content?: string;
        category?: string;
    };
    pins?: Array<{
        angle?: string;
        hook?: string;
        title?: string;
        description?: string;
        imagePrompt?: string;
        cta?: string;
    }>;
};

type ProductRecord = NonNullable<ReturnType<typeof getProductBySlug>>;

function toWriterPromptKey(intent: string | null): string {
    if (intent === "routine") {
        return "routine-article";
    }

    return "buyer-intent-article";
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
        throw new Error(`[growth-machine] Queue item ${queueItem.id} has no review.`);
    }

    return review as DraftReview;
}

function readRevisionAttempts(payload: Record<string, unknown>): number {
    const revision = payload.revision;

    if (!revision || typeof revision !== "object" || Array.isArray(revision)) {
        return 0;
    }

    const attemptCount = (revision as { attemptCount?: unknown }).attemptCount;
    return typeof attemptCount === "number" && Number.isFinite(attemptCount) ? attemptCount : 0;
}

function toNonEmptyString(value: unknown, fallback: string): string {
    return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function uniqueStrings(items: string[]): string[] {
    return items.filter((item, index, values) => item && values.indexOf(item) === index);
}

function trimTrailingPunctuation(value: string): string {
    return value.trim().replace(/[.!?\s]+$/g, "");
}

function extractBenefitBullets(product: ProductRecord): string[] {
    if (!product.benefits) {
        return [];
    }

    return product.benefits
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.startsWith("- "))
        .map((line) => line.replace(/^- /, ""))
        .map((line) => line.replace(/\*\*(.*?)\*\*/g, "$1"))
        .map(trimTrailingPunctuation)
        .filter(Boolean)
        .slice(0, 4);
}

function buildProductSignals(product: ProductRecord): string[] {
    return uniqueStrings(
        [
            ...(Array.isArray(product.features) ? product.features : []),
            ...(Array.isArray(product.seoTags) ? product.seoTags : []),
            ...extractBenefitBullets(product),
        ]
            .map((item) => (typeof item === "string" ? trimTrailingPunctuation(item) : ""))
            .filter(Boolean),
    ).slice(0, 6);
}

function formatPrice(price: number): string | null {
    if (!Number.isFinite(price) || price <= 0) {
        return null;
    }

    return `${price.toFixed(2)} EUR`;
}

function replaceFinalCta(content: string, nextCta: string): string {
    if (/\*\*CTA\s*:\*\*/i.test(content)) {
        return content.replace(/\*\*CTA\s*:\*\*[\s\S]*$/i, `**CTA :** ${nextCta}`);
    }

    if (/CTA final:/i.test(content)) {
        return content.replace(/CTA final:[\s\S]*$/i, `CTA final: ${nextCta}`);
    }

    return `${content.trim()}\n\n**CTA :** ${nextCta}`;
}

function appendSectionIfMissing(content: string, heading: string, body: string): string {
    if (content.includes(`## ${heading}`)) {
        return content;
    }

    return `${content.trim()}\n\n## ${heading}\n\n${body}`;
}

function buildDeterministicRevisionDraft(
    queueItem: ContentQueueRow,
    contentDraft: ContentDraft,
    review: DraftReview,
    product: ProductRecord,
): ContentDraft {
    const taxonomy = resolveProductTaxonomy(product);
    const productSignals = buildProductSignals(product);
    const price = formatPrice(product.price);
    const socialProof =
        Number.isFinite(product.rating) && product.rating > 0 && Number.isFinite(product.reviews) && product.reviews >= 0
            ? `${product.rating}/5 sur ${product.reviews} avis`
            : null;
    const primaryNeed = productSignals.slice(0, 3).join(", ");
    const proofSentence = [
        product.brand ? `${product.brand} positionne ici ${product.name} sur un besoin clair` : `${product.name} vise un besoin clair`,
        primaryNeed ? `autour de ${primaryNeed}` : null,
        socialProof ? `avec un repere social de ${socialProof}` : null,
        price ? `et un prix repere autour de ${price}` : null,
    ]
        .filter(Boolean)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
    const comparisonSentence =
        taxonomy.effectiveClusterRef === "soin_du_visage"
            ? `${product.name} merite surtout le clic si l'objectif est de travailler pores, grain de peau ou congestion. Si la priorite du moment est plutot l'apaisement ou la reparation d'une peau tres reactive, ce n'est pas forcement le premier produit a regarder.`
            : `${product.name} merite surtout le clic si le besoin colle vraiment a son usage principal. Si la routine actuelle demande surtout douceur ou simplification, il faut verifier que ce produit n'ajoute pas une etape de trop.`;
    const verificationSentence = `Avant de cliquer, l'idee n'est pas juste de voir la photo produit: il faut verifier la fiche, la frequence d'usage conseillee, les avis recents et si le positionnement reel correspond bien a votre besoin du moment.`;
    const strongerCta = `Voir la fiche ${product.name} pour verifier les avis, la texture et si ce produit correspond vraiment a votre routine.`;

    let nextContent = replaceFinalCta(contentDraft.post.content, strongerCta);
    nextContent = appendSectionIfMissing(nextContent, "Ce qui distingue vraiment ce produit", `${proofSentence}. C'est ce niveau de preuve qui rend le contenu plus utile qu'un simple article general sur les BHA ou les imperfections.`);
    nextContent = appendSectionIfMissing(nextContent, "Quand ce n'est pas le meilleur choix", comparisonSentence);
    nextContent = appendSectionIfMissing(nextContent, "Ce qu'il faut verifier sur la fiche produit", verificationSentence);

    const reviewWarningSummary = review.warnings
        .map((warning) => warning.trim())
        .filter(Boolean)
        .slice(0, 3)
        .join(" ");

    return {
        post: {
            ...contentDraft.post,
            excerpt: `${contentDraft.post.excerpt} ${proofSentence}.`.replace(/\s+/g, " ").trim(),
            metaDescription: `${contentDraft.post.metaDescription} Verifiez aussi les avis, le niveau de preuve produit et les limites avant d'acheter.`
                .replace(/\s+/g, " ")
                .trim(),
            content: nextContent,
        },
        pins: contentDraft.pins.map((pin, index) => {
            if (index === 0) {
                return {
                    ...pin,
                    title: `${product.brand || product.name} : faut-il verifier la fiche ?`,
                    description: `${product.name} cible ${primaryNeed || "un besoin precis"} et affiche ${socialProof || "un bon volume d'avis"}. Un bon pin pour cliquer avant achat, pas juste enregistrer.`,
                    imagePrompt: `Pinterest vertical premium, flacon hero identifiable ${product.name}, etiquette visible, rendu editorial propre, fond clair elegant, angle achat, texte overlay lisible, aucun lifestyle generique`,
                    cta: "Verifier fiche + avis",
                };
            }

            if (index === 1) {
                return {
                    ...pin,
                    description: `${product.name}: verifier tolerance, frequence et vrai besoin avant achat. ${reviewWarningSummary}`.trim(),
                    imagePrompt: `Pinterest vertical premium, focus produit et check-list avant achat, etiquette visible, composition epuree, style comparatif utile, pas de visuel generique`,
                    cta: "Voir les points a verifier",
                };
            }

            return {
                ...pin,
                description: `${pin.description} ${comparisonSentence}`.replace(/\s+/g, " ").trim(),
                cta: "Voir si le produit vous convient",
            };
        }),
        generatedAt: new Date().toISOString(),
        generationMeta: {
            mode: "deterministic",
        },
    };
}

function buildFileHint(postSlug: string, index: number): string {
    return `/pins/${postSlug}-draft-${index + 1}.jpg`;
}

function sanitizePins(value: unknown, fallback: ContentDraft["pins"], postSlug: string): ContentDraft["pins"] {
    if (!Array.isArray(value)) {
        return fallback;
    }

    const items = value
        .map((item, index) => {
            if (!item || typeof item !== "object" || Array.isArray(item)) {
                return null;
            }

            const candidate = item as Record<string, unknown>;
            const fallbackPin = fallback[index] || fallback[fallback.length - 1];
            if (!fallbackPin) {
                return null;
            }

            return {
                angle: toNonEmptyString(candidate.angle, fallbackPin.angle),
                hook: toNonEmptyString(candidate.hook, fallbackPin.hook),
                title: toNonEmptyString(candidate.title, fallbackPin.title),
                description: toNonEmptyString(candidate.description, fallbackPin.description),
                imagePrompt: toNonEmptyString(candidate.imagePrompt, fallbackPin.imagePrompt),
                fileHint: buildFileHint(postSlug, index),
                cta: toNonEmptyString(candidate.cta, fallbackPin.cta),
            };
        })
        .filter((item): item is ContentDraft["pins"][number] => Boolean(item))
        .slice(0, 5);

    return items.length >= 3 ? items : fallback;
}

async function maybeReviseWithAi(
    queueItem: ContentQueueRow,
    contentDraft: ContentDraft,
    review: DraftReview,
    writerPrompt: ResolvedPromptVersion,
): Promise<ContentDraft | null> {
    if (!hasGrowthAiConfig()) {
        return null;
    }

    const product = queueItem.product_ref ? getProductBySlug(queueItem.product_ref) : null;
    if (!product) {
        return null;
    }

    const taxonomy = resolveProductTaxonomy(product);
    const payload = toQueuePayloadObject(queueItem);
    const draftPack =
        payload.draftPack && typeof payload.draftPack === "object" && !Array.isArray(payload.draftPack)
            ? payload.draftPack
            : null;
    const suggestedAngles = Array.isArray(payload.suggestedAngles)
        ? payload.suggestedAngles.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
        : [];

    try {
        const result = await generateGrowthJson<AiRevisionDraft>({
            systemPrompt: [
                "You are the Arganor senior conversion editor.",
                writerPrompt.promptBody,
                "Rewrite the draft to fix the review warnings without inventing new facts.",
                "Return JSON only.",
                "The revised draft must feel more product-specific, more useful, less repetitive, and more conversion-aware.",
                "Address warnings by adding concrete proof, clearer fit, clearer limits, stronger CTA, and better buyer guidance.",
                "Keep the tone premium, honest, and practical. Do not mention review comments, internal workflow, or AI.",
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
                        id: product.id,
                        slug: product.slug,
                        name: product.name,
                        brand: product.brand ?? null,
                        category: product.category,
                        description: product.description,
                        benefits: product.benefits ?? null,
                        features: Array.isArray(product.features) ? product.features : [],
                        seoTags: Array.isArray(product.seoTags) ? product.seoTags : [],
                        price: product.price,
                        rating: product.rating,
                        reviews: product.reviews,
                        image: product.image,
                    },
                    taxonomy: {
                        effectiveCategory: taxonomy.effectiveCategory,
                        effectiveClusterRef: taxonomy.effectiveClusterRef,
                        confidence: taxonomy.confidence,
                        rationale: taxonomy.rationale,
                    },
                    draftPack,
                    suggestedAngles,
                    currentDraft: contentDraft,
                    review: {
                        verdict: review.verdict,
                        rationale: review.rationale,
                        blockingIssues: review.blockingIssues,
                        warnings: review.warnings,
                    },
                    revisionGoal: {
                        keepSlugIfPossible: true,
                        fixWarnings: true,
                        strengthenClickIntent: true,
                        increaseSpecificity: true,
                    },
                    expectedShape: {
                        post: {
                            slug: "string",
                            title: "string",
                            excerpt: "string",
                            metaDescription: "string",
                            content: "markdown string",
                            category: "string",
                        },
                        pins: [
                            {
                                angle: "string",
                                hook: "string",
                                title: "string",
                                description: "string",
                                imagePrompt: "string",
                                cta: "string",
                            },
                        ],
                    },
                },
                null,
                2,
            ),
            temperature: 0.45,
            maxOutputTokens: 2400,
        });

        const aiPost = result.data.post || {};
        const safeSlug = toNonEmptyString(aiPost.slug, contentDraft.post.slug);

        return {
            post: {
                slug: safeSlug,
                title: toNonEmptyString(aiPost.title, contentDraft.post.title),
                excerpt: toNonEmptyString(aiPost.excerpt, contentDraft.post.excerpt),
                metaDescription: toNonEmptyString(aiPost.metaDescription, contentDraft.post.metaDescription),
                content: toNonEmptyString(aiPost.content, contentDraft.post.content),
                category: toNonEmptyString(aiPost.category, contentDraft.post.category),
                relatedProductId: contentDraft.post.relatedProductId,
                image: contentDraft.post.image,
            },
            pins: sanitizePins(result.data.pins, contentDraft.pins, safeSlug),
            generatedAt: new Date().toISOString(),
            generationMeta: {
                mode: "ai",
                provider: result.provider,
                model: result.model,
            },
        };
    } catch (error) {
        console.warn("[growth-machine] AI revision failed, keeping current draft:", error);
        return null;
    }
}

export async function reviseQueueItem(queueItemId: string): Promise<RevisionResult | null> {
    const queueItem = await getContentQueueItem(queueItemId);

    if (!queueItem) {
        throw new Error(`[growth-machine] Queue item not found: ${queueItemId}`);
    }

    if (String(queueItem.kind) !== "post" || !queueItem.product_ref) {
        return null;
    }

    const payload = toQueuePayloadObject(queueItem);
    if (readRevisionAttempts(payload) >= 1) {
        return null;
    }

    const review = readReview(queueItem);
    if (review.verdict !== "needs_revision") {
        return null;
    }

    const contentDraft = readContentDraft(queueItem);
    const product = getProductBySlug(queueItem.product_ref);
    if (!product) {
        return null;
    }
    const writerPrompt = await resolvePromptVersion("writer", toWriterPromptKey(queueItem.intent));
    const revisedDraft =
        (await maybeReviseWithAi(queueItem, contentDraft, review, writerPrompt)) ??
        buildDeterministicRevisionDraft(queueItem, contentDraft, review, product);

    const payloadWithoutReview = { ...payload };
    delete payloadWithoutReview.review;
    const reviewHistory = Array.isArray(payload.reviewHistory) ? [...payload.reviewHistory] : [];
    reviewHistory.unshift({
        reviewedAt: review.reviewedAt,
        verdict: review.verdict,
        rationale: review.rationale,
        blockingIssues: review.blockingIssues,
        warnings: review.warnings,
    });

    const updatedAfterRevision = await updateContentQueue(queueItem.id, {
        payload: {
            ...payloadWithoutReview,
            contentDraft: revisedDraft,
            contentDraftGeneratedAt: revisedDraft.generatedAt,
            reviewHistory: reviewHistory.slice(0, 5),
            revision: {
                attemptCount: readRevisionAttempts(payload) + 1,
                lastAttemptAt: revisedDraft.generatedAt,
                previousVerdict: review.verdict,
                warningsAddressed: review.warnings,
                promptRef: {
                    module: writerPrompt.module,
                    promptKey: writerPrompt.promptKey,
                    version: writerPrompt.version,
                    source: writerPrompt.source,
                },
                generationMeta: revisedDraft.generationMeta ?? null,
            },
        },
    });

    const reviewResult = await reviewQueueItem(updatedAfterRevision.id);
    const reviewedPayload = toQueuePayloadObject(reviewResult.queueItem);
    const revisionRecord =
        reviewedPayload.revision && typeof reviewedPayload.revision === "object" && !Array.isArray(reviewedPayload.revision)
            ? (reviewedPayload.revision as Record<string, unknown>)
            : {};

    const finalizedQueueItem = await updateContentQueue(reviewResult.queueItem.id, {
        payload: {
            ...reviewedPayload,
            revision: {
                ...revisionRecord,
                lastResult: reviewResult.review.verdict,
                lastReviewedAt: reviewResult.review.reviewedAt,
            },
        },
    });

    return {
        queueItem: finalizedQueueItem,
        contentDraft: revisedDraft,
        writerPrompt,
        reviewResult: {
            ...reviewResult,
            queueItem: finalizedQueueItem,
        },
    };
}

export async function reviseNeedsRevisionDrafts(limit = 3): Promise<RevisionResult[]> {
    const draftItems = await listContentQueue({
        status: "draft",
        limit: Math.max(limit * 4, limit),
    });

    const candidates = draftItems.filter((item) => {
        if (String(item.kind) !== "post" || !item.product_ref) {
            return false;
        }

        const payload = toQueuePayloadObject(item);
        const review = payload.review;
        if (!review || typeof review !== "object" || Array.isArray(review)) {
            return false;
        }

        return (
            Boolean(payload.contentDraft) &&
            (review as { verdict?: string }).verdict === "needs_revision" &&
            readRevisionAttempts(payload) < 1
        );
    });

    const results: RevisionResult[] = [];

    for (const item of candidates.slice(0, Math.max(limit, 1))) {
        const result = await reviseQueueItem(item.id);
        if (result) {
            results.push(result);
        }
    }

    return results;
}

export type { RevisionResult };

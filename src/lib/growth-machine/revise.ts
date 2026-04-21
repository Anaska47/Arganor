import "server-only";

import { getProductBySlug } from "@/lib/data";

import { generateGrowthJson, hasGrowthAiConfig } from "./ai";
import type { ContentDraft } from "./content-runner";
import { resolveDraftPostImage } from "./post-image";
import { buildProductEvidence } from "./product-evidence";
import { resolvePromptVersion, type ResolvedPromptVersion } from "./prompts";
import { reviewQueueItem, type DraftReview, type ReviewResult } from "./review";
import { enhanceContentDraftSpecificity } from "./specificity";
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
const MAX_REVISION_ATTEMPTS = 3;

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

function trimDanglingWords(value: string): string {
    const stopWords = new Set(["a", "au", "aux", "de", "des", "du", "et", "la", "le", "les", "ou", "si", "un", "une"]);
    const words = value.trim().split(/\s+/).filter(Boolean);

    while (words.length > 1) {
        const lastWord = words[words.length - 1]?.toLowerCase();
        if (!lastWord || (!stopWords.has(lastWord) && lastWord.length > 2)) {
            break;
        }

        words.pop();
    }

    return words.join(" ");
}

function normalizeForDedup(value: string): string {
    return value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
}

function clampText(value: string, maxLength: number): string {
    if (value.length <= maxLength) {
        return value;
    }

    const trimmed = value.slice(0, Math.max(0, maxLength - 1));
    const safeBreak = Math.max(trimmed.lastIndexOf(" "), trimmed.lastIndexOf(","));
    const candidate = safeBreak > 80 ? trimmed.slice(0, safeBreak) : trimmed;
    const cleaned = trimDanglingWords(candidate.trim().replace(/[,:;\s]+$/g, ""));

    return `${cleaned}.`;
}

function mergeCopyParts(parts: Array<string | null | undefined>, maxLength: number): string {
    const seen = new Set<string>();
    const values: string[] = [];

    for (const part of parts) {
        const cleaned = typeof part === "string" ? trimTrailingPunctuation(part.replace(/\s+/g, " ").trim()) : "";
        if (!cleaned) {
            continue;
        }

        const normalized = normalizeForDedup(cleaned);
        if (!normalized || seen.has(normalized)) {
            continue;
        }

        seen.add(normalized);
        values.push(cleaned);
    }

    return clampText(`${values.join(". ")}.`, maxLength);
}

function buildMarkdownBulletList(items: string[]): string {
    return items.map((item) => `- ${trimTrailingPunctuation(item)}`).join("\n");
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
    const signalList = productSignals.slice(0, 4);
    const primaryNeed = signalList.slice(0, 3).join(", ");
    const productLabel = product.brand ? `${product.brand} ${product.name}` : product.name;
    const introSentence = mergeCopyParts(
        [
            `${productLabel} vaut surtout le clic si le besoin colle vraiment a ${primaryNeed || "un usage tres cible"}`,
            product.description,
            socialProof ? `Le produit affiche deja ${socialProof}` : null,
            price ? `avec un prix repere autour de ${price}` : null,
        ],
        320,
    );
    const fitSentence =
        taxonomy.effectiveClusterRef === "soin_du_visage"
            ? `${product.name} merite surtout le clic si la priorite est de gerer pores visibles, points noirs, grain irregulier ou brillance recurrente. Si le besoin du moment est plutot l'apaisement, la reparation ou une routine minimaliste, ce n'est pas forcement le premier produit a tester.`
            : `${product.name} merite surtout le clic si le besoin colle vraiment a son usage principal. Si la routine actuelle demande surtout douceur ou simplification, il faut verifier que ce produit n'ajoute pas une etape de trop.`;
    const avoidSentence =
        taxonomy.effectiveClusterRef === "soin_du_visage"
            ? `Le point de vigilance principal reste la tolerance: si la peau est deja irritee, deshydratee ou surchargee en actifs exfoliants, il faut ralentir. Des rougeurs persistantes, des picotements qui durent ou une sensation de tiraillement sont des signaux clairs pour reduire la frequence.`
            : `Le point de vigilance principal reste l'usage reel dans la routine: si le produit surcharge deja une routine sensible ou complique un geste simple, il vaut mieux ralentir et verifier le bon fit avant achat.`;
    const timingSentence =
        taxonomy.effectiveClusterRef === "soin_du_visage"
            ? `Le bon repere n'est pas un effet spectaculaire en une nuit. Sur ce type de produit, il est plus credible d'observer la peau sur plusieurs applications, souvent sur deux a six semaines, en commencant doucement puis en ajustant selon la tolerance.`
            : `Le bon repere est la regularite: il faut juger le confort, la tenue dans la routine et la tolerance avant de conclure sur les resultats.`;
    const verificationBullets = uniqueStrings(
        [
            signalList[0] ? `Verifier que la promesse produit repose bien sur ${signalList[0]}` : "",
            signalList[1] ? `Comparer le besoin principal avec ${signalList[1]}` : "",
            socialProof ? `Regarder les avis: ${socialProof}` : "",
            price ? `Valider le prix repere autour de ${price}` : "",
            "Verifier la frequence d'usage et le bon moment dans la routine",
        ].filter(Boolean),
    ).slice(0, 5);
    const strongerCta = `Voir la fiche ${product.name} pour verifier les ingredients, les avis recents et le vrai fit dans votre routine.`;
    const finalCtaSentence = `Le clic vaut le coup surtout pour verifier la formule, les avis recents, le rythme d'utilisation conseille et voir si le produit correspond vraiment a votre besoin actuel.`;
    const contentSections = [
        `# ${contentDraft.post.title}`,
        introSentence,
        "## Ce qu'on verifie vraiment sur la fiche",
        `${product.brand || product.name} se distingue ici par un cadrage tres clair autour de ${primaryNeed || "quelques signaux produit concrets"}. Le but n'est pas de promettre trop, mais d'aider a voir vite si le produit colle au besoin et au niveau d'exigence de la routine.`,
        buildMarkdownBulletList(verificationBullets),
        "## Pour quel profil le clic est pertinent",
        fitSentence,
        "## Quand ralentir ou passer son tour",
        avoidSentence,
        "## A quel rythme juger les resultats",
        timingSentence,
        "## Pourquoi le clic peut valoir le coup",
        finalCtaSentence,
        `**CTA :** ${strongerCta}`,
    ];
    const nextContent = contentSections.join("\n\n");
    const nextExcerpt = mergeCopyParts(
        [
            `${product.name}: ${primaryNeed || "usage cible"} a verifier avant achat`,
            socialProof ? `${socialProof}` : null,
            "Le bon fit compte plus qu'une promesse trop large",
        ],
        220,
    );
    const nextMetaDescription = mergeCopyParts(
        [
            `${product.name}: points forts, limites et bon profil avant achat`,
            price ? `prix repere ${price}` : null,
            "Verifier aussi les avis et la frequence d'usage",
        ],
        165,
    );

    return {
        post: {
            ...contentDraft.post,
            excerpt: nextExcerpt,
            metaDescription: nextMetaDescription,
            content: nextContent,
        },
        pins: contentDraft.pins.map((pin, index) => {
            if (index === 0) {
                return {
                    ...pin,
                    hook: `${product.name}: 3 points a verifier avant achat`,
                    title: `${product.brand || product.name} : verifier avant achat`,
                    description: mergeCopyParts(
                        [
                            `${product.name}: ${primaryNeed || "un besoin precis"}`,
                            socialProof ? `repere social ${socialProof}` : null,
                            price ? `prix repere ${price}` : null,
                        ],
                        220,
                    ),
                    imagePrompt: `Pinterest vertical premium, packshot identifiable ${product.name}, branding lisible, rendu editorial propre, fond clair elegant, angle achat, focus sur ${primaryNeed || "le besoin produit"}, aucun lifestyle generique`,
                    cta: "Verifier fiche + avis",
                };
            }

            if (index === 1) {
                return {
                    ...pin,
                    description: mergeCopyParts(
                        [
                            `${product.name}: verifier tolerance, frequence et bon profil avant achat`,
                            "L'objectif est de savoir si le produit colle au besoin, pas juste au mot-cle produit",
                        ],
                        220,
                    ),
                    imagePrompt: `Pinterest vertical premium, focus produit et checklist avant achat, etiquette visible, composition epuree, angle concret et comparatif, pas de visuel generique`,
                    cta: "Voir les points a verifier",
                };
            }

            return {
                ...pin,
                description: mergeCopyParts([fitSentence], 220),
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
    const evidence = buildProductEvidence(product, taxonomy);
    const payload = toQueuePayloadObject(queueItem);
    const draftPack =
        payload.draftPack && typeof payload.draftPack === "object" && !Array.isArray(payload.draftPack)
            ? payload.draftPack
            : null;
    const suggestedAngles = Array.isArray(payload.suggestedAngles)
        ? payload.suggestedAngles.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
        : [];

    try {
        const postImage = resolveDraftPostImage(product);
        const result = await generateGrowthJson<AiRevisionDraft>({
            systemPrompt: [
                "You are the Arganor senior conversion editor.",
                writerPrompt.promptBody,
                "Rewrite the draft to fix the review warnings without inventing new facts.",
                "Return JSON only.",
                "The revised draft must feel more product-specific, more useful, less repetitive, and more conversion-aware.",
                "Address warnings by adding concrete proof, clearer fit, clearer limits, stronger CTA, and better buyer guidance.",
                "If the product is in the hair cluster, naturally include semantic variants such as cuir chevelu, pousse cheveux, huile romarin menthe, fortifiant capillaire, massage du cuir chevelu, et routine capillaire when they fit the facts provided.",
                "Make the article more concrete on application rhythm, fit profiles, and what to verify before clicking.",
                "Make the three Pinterest pins clearly distinct: one proof angle, one objection angle, one fit angle.",
                "The final CTA must explain the immediate benefit of the click.",
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
                        image: postImage,
                    },
                    taxonomy: {
                        effectiveCategory: taxonomy.effectiveCategory,
                        effectiveClusterRef: taxonomy.effectiveClusterRef,
                        confidence: taxonomy.confidence,
                        rationale: taxonomy.rationale,
                    },
                    evidence: {
                        signals: evidence.signals,
                        fitProfiles: evidence.fitProfiles,
                        clickReasons: evidence.clickReasons,
                        objectionChecklist: evidence.objectionChecklist,
                        usageGuidance: evidence.usageGuidance,
                        socialProofLabel: evidence.socialProofLabel,
                        priceLabel: evidence.priceLabel,
                        qualitySummary: evidence.qualitySummary,
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
                        distinctPinAngles: true,
                        includeConcreteUsage: true,
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
                image: postImage,
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
    if (readRevisionAttempts(payload) >= MAX_REVISION_ATTEMPTS) {
        return null;
    }

    const review = readReview(queueItem);
    if (review.verdict !== "needs_revision" && review.verdict !== "rejected") {
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
    const finalizedDraft = enhanceContentDraftSpecificity(
        revisedDraft,
        product,
        queueItem.cluster_ref || resolveProductTaxonomy(product).effectiveClusterRef,
        review.warnings,
    );

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
            contentDraft: finalizedDraft,
            contentDraftGeneratedAt: finalizedDraft.generatedAt,
            reviewHistory: reviewHistory.slice(0, 5),
            revision: {
                attemptCount: readRevisionAttempts(payload) + 1,
                lastAttemptAt: finalizedDraft.generatedAt,
                previousVerdict: review.verdict,
                warningsAddressed: review.warnings,
                promptRef: {
                    module: writerPrompt.module,
                    promptKey: writerPrompt.promptKey,
                    version: writerPrompt.version,
                    source: writerPrompt.source,
                },
                generationMeta: finalizedDraft.generationMeta ?? null,
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
        contentDraft: finalizedDraft,
        writerPrompt,
        reviewResult: {
            ...reviewResult,
            queueItem: finalizedQueueItem,
        },
    };
}

export async function reviseNeedsRevisionDrafts(limit = 3): Promise<RevisionResult[]> {
    const draftItems = await listContentQueue({
        limit: Math.max(limit * 8, limit),
    });

    const candidates = draftItems.filter((item) => {
        if (String(item.kind) !== "post" || !item.product_ref) {
            return false;
        }

        if (item.status !== "draft" && item.status !== "failed") {
            return false;
        }

        const payload = toQueuePayloadObject(item);
        const review = payload.review;
        if (!review || typeof review !== "object" || Array.isArray(review)) {
            return false;
        }

        return (
            Boolean(payload.contentDraft) &&
            ["needs_revision", "rejected"].includes((review as { verdict?: string }).verdict ?? "") &&
            readRevisionAttempts(payload) < MAX_REVISION_ATTEMPTS
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

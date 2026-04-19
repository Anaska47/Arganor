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
    generatedAt: string;
    generationMeta?: {
        mode: "ai" | "deterministic";
        provider?: string;
        model?: string;
    };
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
    generatedAt: string;
    generationMeta?: {
        mode: "ai" | "deterministic";
        provider?: string;
        model?: string;
    };
};

type PreparedContentDraftResult = {
    queueItem: ContentQueueRow;
    contentDraft: ContentDraft;
    writerPrompt: ResolvedPromptVersion;
};

function slugify(value: string): string {
    return value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

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

function readDraftPack(queueItem: ContentQueueRow): DraftPack {
    const payload = toQueuePayloadObject(queueItem);
    const draftPack = payload.draftPack;

    if (!draftPack || typeof draftPack !== "object" || Array.isArray(draftPack)) {
        throw new Error(`[growth-machine] Queue item ${queueItem.id} has no draftPack.`);
    }

    return draftPack as DraftPack;
}

function ensureUniqueSlug(baseSlug: string): string {
    const existingSlugs = new Set(getBlogPosts().map((post) => post.slug));

    if (!existingSlugs.has(baseSlug)) {
        return baseSlug;
    }

    let index = 2;
    while (existingSlugs.has(`${baseSlug}-${index}`)) {
        index += 1;
    }

    return `${baseSlug}-${index}`;
}

type ProductRecord = NonNullable<ReturnType<typeof getProductBySlug>>;

function stripMarkdown(value: string | undefined): string {
    if (!value) {
        return "";
    }

    return value
        .replace(/^###\s+/gm, "")
        .replace(/\*\*(.*?)\*\*/g, "$1")
        .replace(/`([^`]+)`/g, "$1")
        .replace(/\r/g, "")
        .trim();
}

function toReadableList(items: string[]): string {
    if (items.length === 0) {
        return "";
    }

    if (items.length === 1) {
        return items[0];
    }

    if (items.length === 2) {
        return `${items[0]} et ${items[1]}`;
    }

    return `${items.slice(0, -1).join(", ")} et ${items[items.length - 1]}`;
}

function uniqueStrings(items: string[]): string[] {
    return items.filter((item, index, values) => item && values.indexOf(item) === index);
}

function normalizeForMatch(value: string): string {
    return value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
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
        .filter(Boolean)
        .slice(0, 3);
}

function extractSignals(product: ProductRecord, taxonomy: ProductTaxonomyResolution): string[] {
    const taxonomySignals = taxonomy.signals
        .filter((signal) => signal.axis === (taxonomy.inferredAxis || taxonomy.categoryAxis || "face"))
        .map((signal) => signal.label.trim())
        .filter(Boolean)
        .filter((item, index, items) => items.indexOf(item) === index);

    if (taxonomySignals.length > 0) {
        return taxonomySignals.slice(0, 4);
    }

    const features = Array.isArray(product.features) ? product.features : [];
    const seoTags = Array.isArray(product.seoTags) ? product.seoTags : [];

    return [...features, ...seoTags]
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter(Boolean)
        .filter((item, index, items) => items.indexOf(item) === index)
        .slice(0, 4);
}

function formatPrice(price: number): string | null {
    if (!Number.isFinite(price) || price <= 0) {
        return null;
    }

    return `${price.toFixed(2)} EUR`;
}

function buildBuyerObjections(product: ProductRecord, taxonomy: ProductTaxonomyResolution): string[] {
    if (taxonomy.effectiveClusterRef === "soin_des_cheveux") {
        return [
            `A quelle frequence utiliser ${product.name} sans alourdir les racines ?`,
            `Est-ce un bon choix si le cuir chevelu est sensible ou deja charge en huiles ?`,
            "Que faut-il observer avant d'attendre un vrai resultat visible ?",
        ];
    }

    if (taxonomy.effectiveClusterRef === "soin_du_corps") {
        return [
            "Quand l'appliquer pour garder le plus de confort possible ?",
            "Est-ce suffisant si la peau tire beaucoup ou desquame facilement ?",
            "A quel moment faut-il plutot choisir une texture plus riche ou plus simple ?",
        ];
    }

    return [
        `Est-ce adapte si l'objectif principal est ${toReadableList(extractSignals(product, taxonomy).slice(0, 2)) || "une routine plus stable"} ?`,
        "Comment l'utiliser sans irriter ni surcharger la routine ?",
        "Quelles limites faut-il connaitre avant de cliquer sur Amazon ?",
    ];
}

function buildProductProofPoints(product: ProductRecord, taxonomy: ProductTaxonomyResolution): string[] {
    const proofPoints: string[] = [];
    const benefits = extractBenefitBullets(product);
    const signals = extractSignals(product, taxonomy);
    const formattedPrice = formatPrice(product.price);

    if (product.brand) {
        proofPoints.push(`Marque: ${product.brand}`);
    }

    if (formattedPrice) {
        proofPoints.push(`Prix repere: ${formattedPrice}`);
    }

    if (Number.isFinite(product.rating) && product.rating > 0 && Number.isFinite(product.reviews) && product.reviews >= 0) {
        proofPoints.push(`Preuve sociale: ${product.rating}/5 sur ${product.reviews} avis`);
    }

    if (product.asin) {
        proofPoints.push(`ASIN: ${product.asin}`);
    }

    for (const benefit of benefits.slice(0, 3)) {
        proofPoints.push(`Point fort: ${trimTrailingPunctuation(benefit)}`);
    }

    for (const signal of signals.slice(0, 4)) {
        proofPoints.push(`Signal produit: ${signal}`);
    }

    if (product.description) {
        proofPoints.push(`Description catalogue: ${stripMarkdown(product.description)}`);
    }

    return uniqueStrings(proofPoints).slice(0, 10);
}

function buildSectionBody(
    section: string,
    product: ProductRecord,
    taxonomy: ProductTaxonomyResolution,
    draftPack: DraftPack,
    queueItem: ContentQueueRow,
): string {
    const payload = toQueuePayloadObject(queueItem);
    const suggestedAngles = Array.isArray(payload.suggestedAngles)
        ? payload.suggestedAngles.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
        : [];
    const benefitBullets = extractBenefitBullets(product);
    const productSignals = extractSignals(product, taxonomy);
    const cleanDescription = stripMarkdown(product.description);
    const descriptionMatchesProduct =
        cleanDescription.length > 0 &&
        normalizeForMatch(cleanDescription).includes(normalizeForMatch(product.name));
    const readableCluster = taxonomy.effectiveClusterRef.replace(/_/g, " ");
    const topSignals = productSignals.slice(0, 3);
    const signalList = toReadableList(topSignals);
    const firstBenefit = trimTrailingPunctuation(benefitBullets[0] || "");
    const secondBenefit = trimTrailingPunctuation(benefitBullets[1] || "");
    const benefitSentence = [firstBenefit, secondBenefit].filter(Boolean).join(" ");
    const usageHint =
        taxonomy.effectiveClusterRef === "soin_des_cheveux"
            ? "Commence par une utilisation reguliere sur cuir chevelu propre, en observant la tolerance et la sensation apres quelques applications."
            : taxonomy.effectiveClusterRef === "soin_du_corps"
              ? "Applique sur peau propre et encore legerement humide pour mieux retenir le confort et limiter la sensation de tiraillement."
              : "Applique sur peau propre apres les textures les plus fluides et avant une creme plus enveloppante si ta peau a besoin de confort.";
    const audienceHint =
        taxonomy.effectiveClusterRef === "soin_des_cheveux"
            ? "Il convient surtout aux personnes qui cherchent une routine simple pour cuir chevelu, densite ou cheveux qui paraissent plus fatigues."
            : taxonomy.effectiveClusterRef === "soin_du_corps"
              ? "Il parle surtout aux peaux qui tirent vite, marquent le manque de confort ou ont besoin d'un geste nourrissant facile a tenir."
              : "Il convient surtout aux personnes qui cherchent plus de confort, d'eclat ou une routine plus stable sans multiplier les produits.";

    if (section.toLowerCase().includes("pour qui")) {
        const lead =
            benefitSentence ||
            (signalList
                ? `${product.name} est surtout interessant si ton besoin tourne autour de ${signalList}.`
                : `${product.name} vise un besoin simple a comprendre dans une routine ${readableCluster}.`);

        return `${lead} ${audienceHint} Si tu cherches un produit facile a integrer sans transformer toute ta routine, c'est ce type de profil qu'il faut garder en tete avant de cliquer.`;
    }

    if (section.toLowerCase().includes("ce que") && section.toLowerCase().includes("fait bien")) {
        const summary =
            descriptionMatchesProduct
                ? cleanDescription
                : `${product.name} se distingue surtout par une promesse lisible autour de ${signalList || "un besoin simple et concret"}.`;
        const benefits =
            benefitBullets.length > 0
                ? `Ses points forts les plus faciles a comprendre sont ${toReadableList(
                      benefitBullets.slice(0, 3).map((item) => trimTrailingPunctuation(item)),
                  )}.`
                : "";

        return `${summary} ${benefits} C'est ce qui peut justifier un clic qualifie quand on veut verifier la fiche, les avis et la texture en detail.`;
    }

    if (section.toLowerCase().includes("quel probleme")) {
        return `${product.name} peut etre pertinent si le besoin principal tourne autour de ${signalList || readableCluster}. L'important est d'expliquer clairement ce qu'il peut ameliorer, mais aussi de rester lucide: un bon contenu doit montrer dans quels cas le produit aide vraiment et dans quels cas il faut moderer ses attentes.`;
    }

    if (section.toLowerCase().includes("comment utiliser")) {
        return `${usageHint} Si la peau ou le cuir chevelu reagit facilement, commence doucement puis augmente selon le confort ressenti. Le bon angle editorial ici consiste a montrer un ordre simple, une frequence realiste et ce qu'il faut observer avant d'aller plus loin.`;
    }

    if (section.toLowerCase().includes("les erreurs")) {
        return `L'erreur la plus courante est d'attendre trop vite un resultat spectaculaire ou d'empiler trop de produits autour de ${product.name}. Mieux vaut une routine courte, reguliere et facile a suivre, avec un vrai point d'attention sur la tolerance, la texture et la frequence d'usage.`;
    }

    if (section.toLowerCase().includes("les limites")) {
        return `${product.name} n'est pas une solution magique, et c'est exactement ce qu'il faut dire dans un bon article de conversion. Selon le besoin, la tolerance ou le niveau d'attente, il peut etre utile de rappeler les limites, le temps d'observation necessaire et les cas ou un autre type de produit serait plus adapte.`;
    }

    if (section.toLowerCase().includes("notre avis") || section.toLowerCase().includes("faut-il cliquer")) {
        const angleLine =
            suggestedAngles.length > 0
                ? `L'angle le plus prometteur ici reste ${suggestedAngles[0]}.`
                : "L'angle le plus prometteur ici reste un avis simple et concret.";

        return `${draftPack.article.cta}. ${angleLine} Si le produit correspond au besoin que tu veux traiter, le clic vers la fiche doit servir a verifier les avis, la composition, la texture et le prix avant de trancher.`;
    }

    return `Le sujet doit rester concret, utile et oriente decision: benefices lisibles, limites honnetes et raison claire de cliquer.`;
}

function buildMarkdownContent(
    product: ProductRecord,
    taxonomy: ProductTaxonomyResolution,
    draftPack: DraftPack,
    queueItem: ContentQueueRow,
): string {
    const intro = draftPack.article.excerpt;
    const sections = draftPack.article.sections
        .map((section) => `## ${section}\n\n${buildSectionBody(section, product, taxonomy, draftPack, queueItem)}`)
        .join("\n\n");

    return `# ${draftPack.article.title}\n\n${intro}\n\n${sections}\n\n---\n\nCTA final: ${draftPack.article.cta} sur ${product.name}.`;
}

function buildPinTitle(productName: string, hook: string): string {
    const baseTitle = `${productName} | ${hook}`;
    return baseTitle.length > 100 ? baseTitle.slice(0, 97).trimEnd() + "..." : baseTitle;
}

function buildPinDescription(productName: string, angle: string, cta: string): string {
    return `${productName} sous l'angle ${angle.replace(/_/g, " ")}. ${cta}. Une idee de pin pensee pour attirer un trafic qualifie vers Arganor.`;
}

function buildFileHint(postSlug: string, index: number): string {
    return `/pins/${postSlug}-draft-${index + 1}.jpg`;
}

function buildDeterministicContentDraft(
    queueItem: ContentQueueRow,
    product: ProductRecord,
    taxonomy: ProductTaxonomyResolution,
    draftPack: DraftPack,
): ContentDraft {
    const safeSlug = ensureUniqueSlug(slugify(draftPack.recommendedPostRef));

    return {
        post: {
            slug: safeSlug,
            title: draftPack.article.title,
            excerpt: draftPack.article.excerpt,
            metaDescription: draftPack.article.metaDescription,
            content: buildMarkdownContent(product, taxonomy, draftPack, queueItem),
            category: taxonomy.effectiveCategory,
            relatedProductId: product.id,
            image: product.image,
        },
        pins: draftPack.pinDrafts.map((pin, index) => ({
            angle: pin.angle,
            hook: pin.hook,
            title: buildPinTitle(product.name, pin.hook),
            description: buildPinDescription(product.name, pin.angle, pin.cta),
            imagePrompt: `${pin.visualDirection}. Produit: ${product.name}. Style premium Arganor, ratio Pinterest 2:3.`,
            fileHint: buildFileHint(safeSlug, index),
            cta: pin.cta,
        })),
        generatedAt: new Date().toISOString(),
        generationMeta: {
            mode: "deterministic",
        },
    };
}

function toNonEmptyString(value: unknown, fallback: string): string {
    return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function sanitizePinContentDrafts(
    value: unknown,
    fallback: ContentDraft["pins"],
    postSlug: string,
): ContentDraft["pins"] {
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

async function maybeGenerateContentDraftWithAi(
    queueItem: ContentQueueRow,
    product: NonNullable<ReturnType<typeof getProductBySlug>>,
    taxonomy: ProductTaxonomyResolution,
    draftPack: DraftPack,
    writerPrompt: ResolvedPromptVersion,
    fallback: ContentDraft,
): Promise<ContentDraft> {
    if (!hasGrowthAiConfig()) {
        return fallback;
    }

    type AiContentDraft = {
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

    try {
        const payload = toQueuePayloadObject(queueItem);
        const suggestedAngles = Array.isArray(payload.suggestedAngles)
            ? payload.suggestedAngles.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
            : [];
        const productProofPoints = buildProductProofPoints(product, taxonomy);
        const buyerObjections = buildBuyerObjections(product, taxonomy);

        const result = await generateGrowthJson<AiContentDraft>({
            systemPrompt: [
                "You are the Arganor content engine.",
                writerPrompt.promptBody,
                "Expand the planning draft into a strong structured SEO draft and Pinterest click-oriented variants.",
                "Return JSON only.",
                "The article should be useful, premium, concrete, and ready for editorial review.",
                "Write like a senior beauty affiliate editor, not like a planner or generic SEO bot.",
                "Use only the provided product facts. Never invent ingredients, percentages, lab results, or personal experience.",
                "The article must feel specific to the product: cite proof points, buyer objections, realistic limits, usage cues, and a real reason to click.",
                "Include at least one comparison or decision framing so the reader understands when this product is a good fit and when it is not.",
                "The CTA must create qualified click intent, not vague curiosity.",
                "Do not mention internal systems, AI, or placeholders.",
            ].join("\n\n"),
            userPrompt: JSON.stringify(
                {
                    queueItem: {
                        title: queueItem.title,
                        topic: queueItem.topic,
                        intent: queueItem.intent,
                        clusterRef: taxonomy.effectiveClusterRef,
                    },
                    product: {
                        id: product.id,
                        slug: product.slug,
                        name: product.name,
                        category: taxonomy.effectiveCategory,
                        description: product.description,
                        image: product.image,
                        brand: product.brand ?? null,
                        asin: product.asin ?? null,
                        price: product.price,
                        rating: product.rating,
                        reviews: product.reviews,
                        benefits: product.benefits ?? null,
                        features: Array.isArray(product.features) ? product.features : [],
                        seoTags: Array.isArray(product.seoTags) ? product.seoTags : [],
                    },
                    taxonomy: {
                        sourceCategory: taxonomy.sourceCategory,
                        effectiveCategory: taxonomy.effectiveCategory,
                        effectiveClusterRef: taxonomy.effectiveClusterRef,
                        confidence: taxonomy.confidence,
                        rationale: taxonomy.rationale,
                    },
                    productProofPoints,
                    buyerObjections,
                    suggestedAngles,
                    draftPack,
                    editorialRequirements: {
                        includeConcreteProof: true,
                        includeLimits: true,
                        includeUsageGuidance: true,
                        includeDecisionFraming: true,
                        includeStrongCta: true,
                        avoidGenericFluff: true,
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
            temperature: 0.6,
            maxOutputTokens: 2600,
        });

        const aiPost = result.data.post || {};
        const safeSlug = ensureUniqueSlug(slugify(toNonEmptyString(aiPost.slug, fallback.post.slug)));

        return {
            post: {
                slug: safeSlug,
                title: toNonEmptyString(aiPost.title, fallback.post.title),
                excerpt: toNonEmptyString(aiPost.excerpt, fallback.post.excerpt),
                metaDescription: toNonEmptyString(aiPost.metaDescription, fallback.post.metaDescription),
                content: toNonEmptyString(aiPost.content, fallback.post.content),
                category: toNonEmptyString(aiPost.category, fallback.post.category),
                relatedProductId: product.id,
                image: product.image,
            },
            pins: sanitizePinContentDrafts(result.data.pins, fallback.pins, safeSlug),
            generatedAt: new Date().toISOString(),
            generationMeta: {
                mode: "ai",
                provider: result.provider,
                model: result.model,
            },
        };
    } catch (error) {
        console.warn("[growth-machine] AI content draft generation failed, using deterministic fallback:", error);
        return fallback;
    }
}

export async function prepareContentDraftForQueueItem(queueItemId: string): Promise<PreparedContentDraftResult> {
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
    const draftPack = readDraftPack(queueItem);
    const writerPrompt = await resolvePromptVersion("writer", toWriterPromptKey(queueItem.intent));
    const fallbackContentDraft = buildDeterministicContentDraft(queueItem, product, taxonomy, draftPack);
    const contentDraft = await maybeGenerateContentDraftWithAi(
        queueItem,
        product,
        taxonomy,
        draftPack,
        writerPrompt,
        fallbackContentDraft,
    );

    const existingPayload = toQueuePayloadObject(queueItem);
    const nextPayload = {
        ...existingPayload,
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
        contentDraft,
        contentDraftGeneratedAt: contentDraft.generatedAt,
        contentDraftPromptRef: {
            module: writerPrompt.module,
            promptKey: writerPrompt.promptKey,
            version: writerPrompt.version,
            source: writerPrompt.source,
        },
    };

    const updatedItem = await updateContentQueue(queueItem.id, {
        cluster_ref: taxonomy.effectiveClusterRef,
        payload: nextPayload,
    });

    return {
        queueItem: updatedItem,
        contentDraft,
        writerPrompt,
    };
}

export async function prepareContentDrafts(limit = 3): Promise<PreparedContentDraftResult[]> {
    const draftItems = await listContentQueue({
        status: "draft",
        limit: Math.max(limit * 3, limit),
    });

    const candidates = draftItems.filter((item) => {
        if (String(item.kind) !== "post" || !item.product_ref) {
            return false;
        }

        const payload = toQueuePayloadObject(item);
        return payload.draftPack && !payload.contentDraft;
    });

    const results: PreparedContentDraftResult[] = [];

    for (const item of candidates.slice(0, Math.max(limit, 1))) {
        results.push(await prepareContentDraftForQueueItem(item.id));
    }

    return results;
}

export type { ContentDraft, PreparedContentDraftResult };

import "server-only";

import { getBlogPosts } from "@/lib/blog";
import { getProductBySlug } from "@/lib/data";

import { generateGrowthJson, hasGrowthAiConfig } from "./ai";
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
};

function slugify(value: string): string {
    return value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
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

function buildSectionBody(
    section: string,
    product: ProductRecord,
    taxonomy: ProductTaxonomyResolution,
    draftPack: DraftPack,
    queueItem: ContentQueueRow,
): string {
    const payload = toQueuePayloadObject(queueItem);
    const relatedPostCount =
        typeof payload.relatedPostCount === "number" && Number.isFinite(payload.relatedPostCount)
            ? payload.relatedPostCount
            : 0;
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

    if (section.toLowerCase().includes("cta")) {
        const benefitFocus =
            benefitBullets[0] ||
            (productSignals.length > 0
                ? `Signal prioritaire: ${toReadableList(productSignals.slice(0, 3))}`
                : "Promesse simple, usage lisible et benefice central");

        return `${draftPack.article.cta}. Pour convertir proprement, il faut mettre en avant cette promesse: ${trimTrailingPunctuation(benefitFocus)}. Ajoute ensuite un usage facile a comprendre et une raison concrete de cliquer maintenant plutot que plus tard.`;
    }

    if (section.toLowerCase().includes("cluster")) {
        const anglesLine =
            suggestedAngles.length > 0
                ? `Les angles deja identifies pour Arganor sont ${toReadableList(suggestedAngles.slice(0, 3))}.`
                : "Le prochain contenu doit garder une promesse simple et un angle editorial net.";
        const signalsLine =
            productSignals.length > 0
                ? `Les signaux les plus utiles a capter autour de ce produit sont ${toReadableList(productSignals.slice(0, 4))}.`
                : `Le produit peut etre rattache a une intention ${taxonomy.effectiveCategory.toLowerCase()} avec un angle premium clair.`;

        return `Dans le cluster ${readableCluster}, ${product.name} a du sens car il relie besoin concret, image premium et intention d'achat. ${signalsLine} ${anglesLine}`;
    }

    if (section.toLowerCase().includes("ce qu'il faut comprendre")) {
        const bullets = benefitBullets.length > 0 ? benefitBullets.map((item) => `- ${item}`).join("\n") : "";
        const summary =
            descriptionMatchesProduct
                ? cleanDescription
                : `${product.name} se positionne comme une offre ${taxonomy.effectiveCategory.toLowerCase()} qui cherche a combiner desir, utilite et resultat visible autour de ${toReadableList(productSignals.slice(0, 3)) || "un benefice central clair"}.`;

        return bullets ? `${summary}\n\n${bullets}` : summary;
    }

    if (section.toLowerCase().includes("ce qui manque encore")) {
        if (relatedPostCount === 0) {
            return `${product.name} ouvre une porte interessante parce qu'Arganor n'a encore aucun article relie sur ce terrain. Il faut donc poser les bases: a qui le produit convient, quels benefices il faut prioriser et quelle promesse Pinterest peut generer un clic qualifie.`;
        }

        return `Arganor dispose deja de ${relatedPostCount} contenu(s) sur cette zone, mais il manque encore un angle plus proche de la decision d'achat. Ici, on doit completer l'existant avec plus de preuves concretes, un meilleur cadrage d'usage et une promesse plus nette.`;
    }

    return `Le sujet gagne a etre traite avec des preuves simples, une promesse sobre et une articulation claire entre desir, utilite et passage a l'action.`;
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
        const result = await generateGrowthJson<AiContentDraft>({
            systemPrompt: [
                "You are the Arganor content engine.",
                "Expand the planning draft into a strong structured SEO draft and Pinterest click-oriented variants.",
                "Return JSON only.",
                "The article should be useful, premium, concrete, and ready for editorial review.",
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
                    },
                    taxonomy: {
                        sourceCategory: taxonomy.sourceCategory,
                        effectiveCategory: taxonomy.effectiveCategory,
                        effectiveClusterRef: taxonomy.effectiveClusterRef,
                        confidence: taxonomy.confidence,
                        rationale: taxonomy.rationale,
                    },
                    draftPack,
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
            temperature: 0.7,
            maxOutputTokens: 2200,
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
    const fallbackContentDraft = buildDeterministicContentDraft(queueItem, product, taxonomy, draftPack);
    const contentDraft = await maybeGenerateContentDraftWithAi(queueItem, product, taxonomy, draftPack, fallbackContentDraft);

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
    };

    const updatedItem = await updateContentQueue(queueItem.id, {
        cluster_ref: taxonomy.effectiveClusterRef,
        payload: nextPayload,
    });

    return {
        queueItem: updatedItem,
        contentDraft,
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

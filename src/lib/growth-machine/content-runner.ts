import "server-only";

import { getBlogPosts } from "@/lib/blog";
import { getProductBySlug } from "@/lib/data";

import { generateGrowthJson, hasGrowthAiConfig } from "./ai";
import { buildProductEvidence } from "./product-evidence";
import { resolveDraftPostImage } from "./post-image";
import { resolvePromptVersion, type ResolvedPromptVersion } from "./prompts";
import { enhanceContentDraftSpecificity } from "./specificity";
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
        fallbackReason?: string;
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
        fallbackReason?: string;
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

function normalizeForDedup(value: string): string {
    return value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
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

        const sentence = `${cleaned}.`;
        const candidate = values.length > 0 ? `${values.join(" ")} ${sentence}` : sentence;
        if (candidate.length > maxLength) {
            if (values.length === 0) {
                return clampText(sentence, maxLength);
            }

            break;
        }

        seen.add(normalized);
        values.push(sentence);
    }

    return values.join(" ");
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

type ParsedDraftSection = {
    title: string;
    body: string | null;
};

function parseDraftSection(section: string): ParsedDraftSection {
    const titleMatch = section.match(/title:\s*(.+?)(?:\r?\n|$)/i);
    const bodyMatch = section.match(/body:\s*([\s\S]*)$/i);

    if (titleMatch || bodyMatch) {
        return {
            title: trimTrailingPunctuation((titleMatch?.[1] || "Ce qu'il faut verifier").trim()),
            body: bodyMatch?.[1] ? bodyMatch[1].replace(/\s+/g, " ").trim() : null,
        };
    }

    return {
        title: trimTrailingPunctuation(section.trim()),
        body: null,
    };
}

function buildSectionBody(
    section: string,
    product: ProductRecord,
    taxonomy: ProductTaxonomyResolution,
    draftPack: DraftPack,
    queueItem: ContentQueueRow,
): string {
    const parsedSection = parseDraftSection(section);
    const payload = toQueuePayloadObject(queueItem);
    const evidence = buildProductEvidence(product, taxonomy);
    const suggestedAngles = Array.isArray(payload.suggestedAngles)
        ? payload.suggestedAngles.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
        : [];
    const benefitBullets = extractBenefitBullets(product);
    const productSignals = evidence.signals;
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
    const audienceHint =
        evidence.fitProfiles.length > 0
            ? `Le meilleur fit reste ${toReadableList(evidence.fitProfiles.slice(0, 3))}.`
            : taxonomy.effectiveClusterRef === "soin_des_cheveux"
              ? "Il convient surtout aux personnes qui cherchent une routine simple pour cuir chevelu, densite ou cheveux qui paraissent plus fatigues."
              : taxonomy.effectiveClusterRef === "soin_du_corps"
                ? "Il parle surtout aux peaux qui tirent vite, marquent le manque de confort ou ont besoin d'un geste nourrissant facile a tenir."
                : "Il convient surtout aux personnes qui cherchent plus de confort, d'eclat ou une routine plus stable sans multiplier les produits.";
    const seededBody = parsedSection.body ? parsedSection.body.replace(/\s+/g, " ").trim() : "";
    const normalizedSectionKey = normalizeForDedup(parsedSection.title);
    const socialProofLine = evidence.socialProofLabel ? `La preuve sociale reste ${evidence.socialProofLabel}.` : "";
    const priceLine = evidence.priceLabel ? `Le prix repere tourne autour de ${evidence.priceLabel}.` : "";
    const asinLine = product.asin ? `La fiche Amazon a verifier correspond a l'ASIN ${product.asin}.` : "";
    const benefitsLine =
        benefitBullets.length > 0
            ? `Les points les plus lisibles sont ${toReadableList(
                  benefitBullets.slice(0, 3).map((item) => trimTrailingPunctuation(item)),
              )}.`
            : "";
    const objectionLine =
        evidence.objectionChecklist.length > 0
            ? `Les points a surveiller avant achat sont ${toReadableList(evidence.objectionChecklist.slice(0, 3))}.`
            : "";
    const clickLine =
        evidence.clickReasons.length > 0
            ? `Le clic devient utile surtout pour ${toReadableList(evidence.clickReasons.slice(0, 3))}.`
            : "";

    if (seededBody) {
        if (
            normalizedSectionKey.includes("pour qui") ||
            normalizedSectionKey.includes("pour quel") ||
            normalizedSectionKey.includes("bon choix")
        ) {
            return mergeCopyParts([seededBody, audienceHint, socialProofLine], 700);
        }

        if (normalizedSectionKey.includes("erreurs")) {
            return mergeCopyParts(
                [seededBody, "Le plus utile est de relier chaque erreur a une vraie decision: frequence, quantite, tolerance et raison de cliquer."],
                700,
            );
        }

        if (
            normalizedSectionKey.includes("routine") ||
            normalizedSectionKey.includes("comment") ||
            normalizedSectionKey.includes("appliquer")
        ) {
            return mergeCopyParts([seededBody, evidence.usageGuidance], 700);
        }

        if (
            normalizedSectionKey.includes("probleme") ||
            normalizedSectionKey.includes("fait bien") ||
            normalizedSectionKey.includes("pourquoi") ||
            normalizedSectionKey.includes("apporte vraiment")
        ) {
            return mergeCopyParts(
                [
                    seededBody,
                    benefitsLine || `${product.name} doit rester relie a des signaux concrets comme ${signalList || readableCluster}.`,
                    socialProofLine,
                    priceLine,
                ],
                700,
            );
        }

        if (
            normalizedSectionKey.includes("ne fera pas") ||
            normalizedSectionKey.includes("limites") ||
            normalizedSectionKey.includes("verifier")
        ) {
            return mergeCopyParts([seededBody, objectionLine, clickLine, asinLine], 700);
        }

        return clampText(seededBody, 700);
    }

    if (
        normalizedSectionKey.includes("pour qui") ||
        normalizedSectionKey.includes("pour quel") ||
        normalizedSectionKey.includes("bon choix")
    ) {
        const lead =
            benefitSentence ||
            (signalList
                ? `${product.name} est surtout interessant si ton besoin tourne autour de ${signalList}.`
                : `${product.name} vise un besoin simple a comprendre dans une routine ${readableCluster}.`);

        return `${lead} ${audienceHint} ${socialProofLine} Ce n'est pas un achat reflexe pour tout le monde: il faut surtout que le besoin tourne vraiment autour du cuir chevelu, d'une routine simple et d'une attente realiste avant de cliquer.`;
    }

    if (
        (normalizedSectionKey.includes("ce que") && normalizedSectionKey.includes("fait bien")) ||
        normalizedSectionKey.includes("apporte vraiment")
    ) {
        const summary =
            descriptionMatchesProduct
                ? cleanDescription
                : `${product.name} se distingue surtout par une promesse lisible autour de ${signalList || "un besoin simple et concret"}.`;

        return `${summary} ${benefitsLine} ${socialProofLine} ${priceLine} Cela ne prouve pas un miracle, mais donne une raison concrete de comparer la fiche Amazon avec d'autres huiles plus vagues du meme univers.`;
    }

    if (normalizedSectionKey.includes("quel probleme")) {
        return `${product.name} peut etre pertinent si le besoin principal tourne autour de ${signalList || readableCluster}. L'important est d'expliquer clairement ce qu'il peut ameliorer, mais aussi de rester lucide: un bon contenu doit montrer dans quels cas le produit aide vraiment et dans quels cas il faut moderer ses attentes.`;
    }

    if (normalizedSectionKey.includes("ne fera pas")) {
        return `${product.name} ne remplacera ni la regularite de la routine ni des attentes realistes sur la pousse. ${objectionLine} Si les racines regraissent vite ou si le cuir chevelu est reactif, mieux vaut commencer doucement, observer le confort et accepter qu'une huile seule ne corrige pas tout.`;
    }

    if (
        normalizedSectionKey.includes("comment utiliser") ||
        normalizedSectionKey.includes("comment l utiliser") ||
        normalizedSectionKey.includes("utiliser sans erreur") ||
        normalizedSectionKey.includes("comment l appliquer") ||
        normalizedSectionKey.includes("appliquer sans erreur")
    ) {
        return `${evidence.usageGuidance} L'idee n'est pas d'inonder les longueurs ou de multiplier les gestes, mais de garder un usage cible et facile a tenir. Si le cuir chevelu reagit facilement, commence plus legerement, observe le confort entre deux applications et ajuste seulement si la routine reste stable.`;
    }

    if (normalizedSectionKey.includes("les erreurs")) {
        const objections =
            evidence.objectionChecklist.length > 0
                ? `Les vrais points a verifier sont ${toReadableList(evidence.objectionChecklist.slice(0, 3))}.`
                : "Le vrai point d'attention reste la tolerance, la texture et la frequence d'usage.";

        return `L'erreur la plus courante est d'attendre trop vite un resultat spectaculaire ou d'empiler trop de produits autour de ${product.name}. ${objections} Mieux vaut une routine courte, reguliere et facile a suivre.`;
    }

    if (normalizedSectionKey.includes("les limites")) {
        return `${product.name} n'est pas une solution magique, et c'est exactement ce qu'il faut dire dans un bon article de conversion. Selon le besoin, la tolerance ou le niveau d'attente, il peut etre utile de rappeler les limites, le temps d'observation necessaire et les cas ou un autre type de produit serait plus adapte.`;
    }

    if (
        normalizedSectionKey.includes("notre avis") ||
        normalizedSectionKey.includes("notre verdict") ||
        normalizedSectionKey.includes("faut il cliquer") ||
        normalizedSectionKey.includes("voir la fiche produit") ||
        normalizedSectionKey.includes("ce qu il faut verifier") ||
        normalizedSectionKey.includes("avant achat") ||
        normalizedSectionKey.includes("verifier sur la fiche")
    ) {
        const angleLine =
            suggestedAngles.length > 0
                ? `L'angle le plus prometteur ici reste ${suggestedAngles[0]}.`
                : "L'angle le plus prometteur ici reste un avis simple et concret.";
        const clickLine =
            evidence.clickReasons.length > 0
                ? `Le clic doit surtout servir a ${toReadableList(evidence.clickReasons.slice(0, 2))}.`
                : "Le clic doit surtout servir a verifier les avis, la composition, la texture et le prix.";

        return `${draftPack.article.cta}. ${angleLine} ${clickLine} Si le produit correspond au besoin que tu veux traiter, c'est cette verification concrete qui justifie le passage vers la fiche Amazon.`;
    }

    return mergeCopyParts(
        [
            cleanDescription || `${product.name} reste pertinent surtout si le besoin tourne autour de ${signalList || readableCluster}.`,
            benefitsLine,
            objectionLine,
            clickLine || draftPack.article.cta,
        ],
        700,
    );
}

function buildMarkdownContent(
    product: ProductRecord,
    taxonomy: ProductTaxonomyResolution,
    draftPack: DraftPack,
    queueItem: ContentQueueRow,
): string {
    const intro = draftPack.article.excerpt;
    const evidence = buildProductEvidence(product, taxonomy);
    const sections = draftPack.article.sections
        .map((section) => {
            const parsedSection = parseDraftSection(section);
            return `## ${parsedSection.title}\n\n${buildSectionBody(section, product, taxonomy, draftPack, queueItem)}`;
        })
        .join("\n\n");
    const finalVerification =
        evidence.clickReasons.length > 0
            ? toReadableList(evidence.clickReasons.slice(0, 3))
            : `verifier le prix, les avis recents et le bon usage de ${product.name}`;

    return `# ${draftPack.article.title}\n\n${intro}\n\n${sections}\n\n---\n\nCTA final: ${draftPack.article.cta}. Le bon reflexe maintenant est de ${finalVerification}.`;
}

function buildMarkdownContentFromSections(
    title: string,
    intro: string,
    sections: Array<{ title: string; body: string }>,
    finalCta: string,
): string {
    const normalizedSections = sections
        .map((section) => ({
            title: trimTrailingPunctuation(section.title),
            body: section.body.replace(/\s+/g, " ").trim(),
        }))
        .filter((section) => section.title && section.body);

    const sectionMarkdown = normalizedSections.map((section) => `## ${section.title}\n\n${section.body}`).join("\n\n");

    return `# ${title}\n\n${intro}\n\n${sectionMarkdown}\n\n---\n\nCTA final: ${finalCta}`;
}

function buildPinTitle(productName: string, hook: string): string {
    const normalizedHook = hook.replace(/\s+/g, " ").trim();
    if (normalizedHook.length > 0 && normalizedHook.length <= 100) {
        return normalizedHook;
    }

    const fallback = `${productName} : verifier avant achat`;
    return fallback.length > 100 ? fallback.slice(0, 97).trimEnd() + "..." : fallback;
}

function buildPinDescription(
    product: ProductRecord,
    taxonomy: ProductTaxonomyResolution,
    pin: DraftPack["pinDrafts"][number],
): string {
    const evidence = buildProductEvidence(product, taxonomy);
    const signalSummary = evidence.signals.slice(0, 2).join(", ");
    const fitSummary = evidence.fitProfiles[0] || "un besoin concret";
    const objectionSummary = evidence.objectionChecklist.slice(0, 2).join(" et ");
    const clickReason = evidence.clickReasons[0] || "verifier la fiche avant achat";

    if (pin.angle.includes("mistake") || pin.angle.includes("erreur")) {
        return mergeCopyParts(
            [`${product.name}: verifier ${objectionSummary || "la tolerance et la frequence"} avant achat`, signalSummary ? `focus ${signalSummary}` : null],
            170,
        );
    }

    if (pin.angle.includes("result")) {
        return mergeCopyParts(
            [`${product.name}: utile si le besoin colle a ${fitSummary}`, clickReason],
            170,
        );
    }

    if (pin.angle.includes("routine")) {
        return mergeCopyParts(
            [`${product.name}: routine simple autour de ${signalSummary || taxonomy.effectiveClusterRef.replace(/_/g, " ")}`, evidence.usageGuidance],
            170,
        );
    }

    return mergeCopyParts(
        [`${product.name}: ${signalSummary || "points utiles"} a verifier avant achat`, clickReason],
        170,
    );
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
    const postImage = resolveDraftPostImage(product);

    return {
        post: {
            slug: safeSlug,
            title: draftPack.article.title,
            excerpt: draftPack.article.excerpt,
            metaDescription: draftPack.article.metaDescription,
            content: buildMarkdownContent(product, taxonomy, draftPack, queueItem),
            category: taxonomy.effectiveCategory,
            relatedProductId: product.id,
            image: postImage,
        },
        pins: draftPack.pinDrafts.map((pin, index) => ({
            angle: pin.angle,
            hook: pin.hook,
            title: buildPinTitle(product.name, pin.hook),
            description: buildPinDescription(product, taxonomy, pin),
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

function toFallbackReason(error: unknown): string {
    const message = error instanceof Error ? error.message : String(error);
    return message.replace(/\s+/g, " ").trim().slice(0, 280);
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
            intro?: string;
            category?: string;
            finalCta?: string;
        };
        sectionBodies?: Array<{
            title?: string;
            body?: string;
        }>;
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
        const postImage = resolveDraftPostImage(product);

        const result = await generateGrowthJson<AiContentDraft>({
            systemPrompt: [
                "You are the Arganor content engine.",
                writerPrompt.promptBody,
                "Expand the planning draft into a strong structured SEO draft and Pinterest click-oriented variants.",
                "Return JSON only.",
                "Do not return a full markdown article.",
                "Return a concise intro, one body per planned section, and a final CTA.",
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
                        visual: postImage,
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
                            intro: "string",
                            category: "string",
                            finalCta: "string",
                        },
                        sectionBodies: [
                            {
                                title: "string",
                                body: "string",
                            },
                        ],
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
            temperature: 0.35,
            maxOutputTokens: 1800,
        });

        const aiPost = result.data.post || {};
        const safeSlug = ensureUniqueSlug(slugify(toNonEmptyString(aiPost.slug, fallback.post.slug)));
        const postTitle = toNonEmptyString(aiPost.title, fallback.post.title);
        const postIntro = toNonEmptyString(aiPost.intro, fallback.post.excerpt);
        const finalCta = toNonEmptyString(aiPost.finalCta, draftPack.article.cta);
        const sectionBodies = draftPack.article.sections.map((section, index) => {
            const parsedSection = parseDraftSection(section);
            const aiSection = Array.isArray(result.data.sectionBodies) ? result.data.sectionBodies[index] : null;

            return {
                title:
                    aiSection && typeof aiSection.title === "string" && aiSection.title.trim()
                        ? trimTrailingPunctuation(aiSection.title.trim())
                        : parsedSection.title,
                body:
                    aiSection && typeof aiSection.body === "string" && aiSection.body.trim()
                        ? aiSection.body.replace(/\s+/g, " ").trim()
                        : buildSectionBody(section, product, taxonomy, draftPack, queueItem),
            };
        });

        return {
            post: {
                slug: safeSlug,
                title: postTitle,
                excerpt: toNonEmptyString(aiPost.excerpt, fallback.post.excerpt),
                metaDescription: toNonEmptyString(aiPost.metaDescription, fallback.post.metaDescription),
                content: buildMarkdownContentFromSections(postTitle, postIntro, sectionBodies, finalCta),
                category: toNonEmptyString(aiPost.category, fallback.post.category),
                relatedProductId: product.id,
                image: postImage,
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
        return {
            ...fallback,
            generatedAt: new Date().toISOString(),
            generationMeta: {
                mode: "deterministic",
                fallbackReason: toFallbackReason(error),
            },
        };
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
    const enhancedContentDraft = enhanceContentDraftSpecificity(
        contentDraft,
        product,
        taxonomy.effectiveClusterRef,
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
        contentDraft: enhancedContentDraft,
        contentDraftGeneratedAt: enhancedContentDraft.generatedAt,
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
        contentDraft: enhancedContentDraft,
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

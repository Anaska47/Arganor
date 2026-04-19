import "server-only";

import type { Product } from "@/lib/data";

import { resolveProductTaxonomy, type ProductTaxonomyResolution } from "./taxonomy";

export type ProductEvidenceProfile = {
    signals: string[];
    benefitBullets: string[];
    fitProfiles: string[];
    objectionChecklist: string[];
    clickReasons: string[];
    usageGuidance: string;
    priceLabel: string | null;
    socialProofLabel: string | null;
    qualityScore: number;
    qualityFlags: string[];
    qualitySummary: string;
    hasGenericImage: boolean;
    shouldQueue: boolean;
};

function normalizeText(value: string): string {
    return value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
}

function trimTrailingPunctuation(value: string): string {
    return value.trim().replace(/[.!?\s]+$/g, "");
}

function uniqueStrings(items: string[]): string[] {
    return items.filter((item, index, values) => item && values.indexOf(item) === index);
}

function toCorpus(product: Product, taxonomy: ProductTaxonomyResolution): string {
    return normalizeText(
        [
            product.name,
            product.description || "",
            product.benefits || "",
            product.category,
            ...(Array.isArray(product.features) ? product.features : []),
            ...(Array.isArray(product.seoTags) ? product.seoTags : []),
            ...taxonomy.signals.map((signal) => signal.label),
        ]
            .filter(Boolean)
            .join(" "),
    );
}

function formatPrice(price: number): string | null {
    if (!Number.isFinite(price) || price <= 0) {
        return null;
    }

    return `${price.toFixed(2)} EUR`;
}

function extractBenefitBullets(product: Product): string[] {
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

function extractNameSignals(product: Product): string[] {
    const matches: string[] = [];
    const normalizedName = product.name;
    const percentSignal = normalizedName.match(/(\d+\s?%\s*(?:BHA|AHA|niacinamide))/i);

    if (percentSignal?.[1]) {
        matches.push(percentSignal[1].toUpperCase().replace(/\s+/g, " "));
    }

    const mucinSignal = normalizedName.match(/(\d+\s*Mucin)/i);
    if (mucinSignal?.[1]) {
        matches.push(mucinSignal[1]);
    }

    if (/romarin/i.test(normalizedName) && /menthe/i.test(normalizedName)) {
        matches.push("romarin et menthe");
    }

    if (/acide hyaluronique/i.test(normalizedName)) {
        matches.push("acide hyaluronique");
    }

    if (/ceramide/i.test(normalizedName) || /ceramides/i.test(normalizedName)) {
        matches.push("ceramides");
    }

    if (/huile/i.test(normalizedName)) {
        matches.push("format huile");
    } else if (/essence/i.test(normalizedName)) {
        matches.push("format essence");
    } else if (/lotion/i.test(normalizedName)) {
        matches.push("format lotion");
    } else if (/serum|serum/i.test(normalizedName)) {
        matches.push("format serum");
    } else if (/baume/i.test(normalizedName)) {
        matches.push("format baume");
    }

    return uniqueStrings(matches);
}

function extractSignals(product: Product, taxonomy: ProductTaxonomyResolution): string[] {
    const taxonomySignals = taxonomy.signals
        .filter((signal) => signal.axis === (taxonomy.inferredAxis || taxonomy.categoryAxis || "face"))
        .map((signal) => trimTrailingPunctuation(signal.label))
        .filter(Boolean);

    return uniqueStrings(
        [
            ...taxonomySignals,
            ...extractNameSignals(product),
            ...(Array.isArray(product.features) ? product.features.map(trimTrailingPunctuation) : []),
            ...(Array.isArray(product.seoTags) ? product.seoTags.map(trimTrailingPunctuation) : []),
            ...extractBenefitBullets(product),
        ].filter(Boolean),
    ).slice(0, 8);
}

function hasAnyPattern(corpus: string, patterns: RegExp[]): boolean {
    return patterns.some((pattern) => pattern.test(corpus));
}

function buildFitProfiles(product: Product, taxonomy: ProductTaxonomyResolution, corpus: string): string[] {
    if (taxonomy.effectiveClusterRef === "soin_des_cheveux") {
        const profiles = [
            "routine pousse simple et reguliere",
            "cuir chevelu qui demande un geste cible",
            "longueurs fragilisees ou manque de densite percue",
        ];

        if (hasAnyPattern(corpus, [/\bromarin\b/, /\bmenthe\b/, /\bcuir chevelu\b/])) {
            profiles.unshift("cuir chevelu a masser sans routine lourde");
        }

        return uniqueStrings(profiles).slice(0, 3);
    }

    if (taxonomy.effectiveClusterRef === "soin_du_corps") {
        return [
            "peau seche qui tire vite",
            "routine corps simple et confortable",
            "besoin de nutrition reguliere plus que d'effet spectaculaire",
        ];
    }

    if (hasAnyPattern(corpus, [/\bniacinamide\b/, /\bbha\b/, /\bpores?\b/, /\bimperfections?\b/, /\bsebum\b/])) {
        return [
            "peau mixte a grasse avec pores visibles",
            "imperfections recurrentes et grain irregulier",
            "routine visage qui doit rester simple",
        ];
    }

    if (hasAnyPattern(corpus, [/\bmucin\b/, /\bhydratation\b/, /\bbarriere\b/, /\bceramide\b/, /\bpeau seche\b/])) {
        return [
            "peau deshydratee ou inconfortable",
            "barriere cutanee qui fatigue vite",
            "routine glow ou hydratation sans superposer trop d'actifs",
        ];
    }

    return [
        `${product.name} doit convenir a un besoin concret`,
        "routine simple a tenir sur plusieurs semaines",
        "attentes realistes avant de cliquer",
    ];
}

function buildObjectionChecklist(taxonomy: ProductTaxonomyResolution, corpus: string): string[] {
    if (taxonomy.effectiveClusterRef === "soin_des_cheveux") {
        return [
            "la frequence sur le cuir chevelu",
            "le risque d'alourdir les racines",
            "la regularite avant de juger les resultats",
        ];
    }

    if (taxonomy.effectiveClusterRef === "soin_du_corps") {
        return [
            "la richesse reelle de la texture",
            "la frequence pour garder le confort",
            "le niveau de secheresse traite par le produit",
        ];
    }

    if (hasAnyPattern(corpus, [/\bniacinamide\b/, /\bbha\b/, /\baha\b/, /\bsalicylique\b/, /\bretinol\b/])) {
        return [
            "la tolerance au demarrage",
            "la frequence d'usage",
            "les associations d'actifs deja presentes dans la routine",
        ];
    }

    return [
        "la texture sur votre peau",
        "la compatibilite avec le reste de la routine",
        "le delai realiste avant de voir un changement",
    ];
}

function buildClickReasons(
    product: Product,
    taxonomy: ProductTaxonomyResolution,
    signals: string[],
    socialProofLabel: string | null,
    priceLabel: string | null,
): string[] {
    const reasons = [
        signals.length > 0 ? `verifier ${signals.slice(0, 2).join(" et ")}` : null,
        socialProofLabel ? `voir les avis recents (${socialProofLabel})` : null,
        priceLabel ? `confirmer le prix autour de ${priceLabel}` : null,
        product.asin ? `controler la fiche Amazon ${product.asin}` : null,
    ];

    if (taxonomy.effectiveClusterRef === "soin_des_cheveux") {
        reasons.push("verifier la frequence d'application et le vrai besoin cuir chevelu");
    } else if (taxonomy.effectiveClusterRef === "soin_du_corps") {
        reasons.push("confirmer si la texture suffit pour une peau vraiment seche");
    } else {
        reasons.push("verifier la tolerance et le bon profil de peau avant achat");
    }

    return uniqueStrings(reasons.filter((value): value is string => Boolean(value))).slice(0, 4);
}

function buildUsageGuidance(taxonomy: ProductTaxonomyResolution): string {
    if (taxonomy.effectiveClusterRef === "soin_des_cheveux") {
        return "Appliquer sur cuir chevelu propre ou veille de lavage, masser, puis juger surtout la regularite et le confort avant de parler de resultat visible.";
    }

    if (taxonomy.effectiveClusterRef === "soin_du_corps") {
        return "Appliquer sur peau propre, idealement legerement humide, puis observer si le confort tient vraiment jusqu'a la prochaine application.";
    }

    return "Commencer avec une frequence simple, surveiller la tolerance, puis ajuster seulement si la peau reste stable plusieurs applications de suite.";
}

function hasGenericImage(image: string | undefined): boolean {
    if (!image) {
        return true;
    }

    return /unsplash\.com/i.test(image);
}

function buildQualityScore(params: {
    product: Product;
    signals: string[];
    benefitBullets: string[];
    descriptionLength: number;
    hasGenericImage: boolean;
}): { score: number; flags: string[] } {
    const flags: string[] = [];
    let score = 35;

    if (params.product.asin) {
        score += 14;
    } else {
        flags.push("missing_asin");
        score -= 18;
    }

    if (params.descriptionLength >= 140) {
        score += 12;
    } else if (params.descriptionLength >= 80) {
        score += 7;
    } else {
        flags.push("description_thin");
        score -= 12;
    }

    if (params.signals.length >= 5) {
        score += 16;
    } else if (params.signals.length >= 3) {
        score += 9;
    } else {
        flags.push("signal_poor");
        score -= 10;
    }

    if (params.benefitBullets.length >= 3) {
        score += 10;
    } else if (params.benefitBullets.length === 0) {
        flags.push("benefits_thin");
        score -= 6;
    }

    if (Number.isFinite(params.product.reviews) && params.product.reviews >= 500) {
        score += 12;
    } else if (Number.isFinite(params.product.reviews) && params.product.reviews >= 100) {
        score += 8;
    } else if (Number.isFinite(params.product.reviews) && params.product.reviews < 30) {
        flags.push("social_proof_light");
        score -= 4;
    }

    if (Number.isFinite(params.product.rating) && params.product.rating >= 4.6) {
        score += 5;
    }

    if (params.hasGenericImage) {
        flags.push("generic_image");
        score -= 12;
    }

    if (Number.isFinite(params.product.price) && (params.product.price < 4 || params.product.price > 90)) {
        flags.push("price_outlier");
        score -= 6;
    }

    return {
        score: Math.max(0, Math.min(100, score)),
        flags: uniqueStrings(flags),
    };
}

export function buildProductEvidence(
    product: Product,
    taxonomy: ProductTaxonomyResolution = resolveProductTaxonomy(product),
): ProductEvidenceProfile {
    const corpus = toCorpus(product, taxonomy);
    const benefitBullets = extractBenefitBullets(product);
    const signals = extractSignals(product, taxonomy);
    const fitProfiles = buildFitProfiles(product, taxonomy, corpus);
    const objectionChecklist = buildObjectionChecklist(taxonomy, corpus);
    const priceLabel = formatPrice(product.price);
    const socialProofLabel =
        Number.isFinite(product.rating) && product.rating > 0 && Number.isFinite(product.reviews) && product.reviews >= 0
            ? `${product.rating}/5 sur ${product.reviews} avis`
            : null;
    const clickReasons = buildClickReasons(product, taxonomy, signals, socialProofLabel, priceLabel);
    const usageGuidance = buildUsageGuidance(taxonomy);
    const genericImage = hasGenericImage(product.image);
    const descriptionLength = trimTrailingPunctuation(product.description || "").length;
    const quality = buildQualityScore({
        product,
        signals,
        benefitBullets,
        descriptionLength,
        hasGenericImage: genericImage,
    });
    const shouldQueue =
        Boolean(product.asin) &&
        descriptionLength >= 80 &&
        signals.length >= 3 &&
        quality.score >= 55;
    const qualitySummaryParts = [
        `evidence ${quality.score}/100`,
        signals.length >= 3 ? `${signals.length} signaux utiles` : "signaux encore trop pauvres",
        genericImage ? "visuel generique a surveiller" : "visuel plus exploitable",
    ];

    return {
        signals,
        benefitBullets,
        fitProfiles,
        objectionChecklist,
        clickReasons,
        usageGuidance,
        priceLabel,
        socialProofLabel,
        qualityScore: quality.score,
        qualityFlags: quality.flags,
        qualitySummary: qualitySummaryParts.join(" - "),
        hasGenericImage: genericImage,
        shouldQueue,
    };
}

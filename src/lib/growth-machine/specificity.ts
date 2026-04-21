import type { Product } from "@/lib/data";

import { buildProductEvidence } from "./product-evidence";

type SpecificityDraft = {
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

function trimTrailingPunctuation(value: string): string {
    return value.trim().replace(/[.!?\s]+$/g, "");
}

function clampText(value: string, maxLength: number): string {
    if (value.length <= maxLength) {
        return value;
    }

    const trimmed = value.slice(0, Math.max(0, maxLength - 1));
    const safeBreak = Math.max(trimmed.lastIndexOf(" "), trimmed.lastIndexOf(","));
    const candidate = safeBreak > 80 ? trimmed.slice(0, safeBreak) : trimmed;

    return `${candidate.trim().replace(/[,:;\s]+$/g, "")}.`;
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

function appendSectionIfMissing(content: string, heading: string, body: string): string {
    if (content.includes(`## ${heading}`)) {
        return content;
    }

    return `${content.trim()}\n\n## ${heading}\n\n${body}`;
}

function contentMentions(content: string, value: string): boolean {
    return normalizeForDedup(content).includes(normalizeForDedup(value));
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

function formatPrice(price: number): string | null {
    if (!Number.isFinite(price) || price <= 0) {
        return null;
    }

    return `${price.toFixed(2)} EUR`;
}

function buildFitSentence(product: Product, clusterRef: string, signals: string[]): string {
    const keySignal = signals.slice(0, 3).join(", ");

    if (clusterRef === "soin_du_visage") {
        return `${product.name} merite surtout le clic si la peau cumule pores visibles, brillance, grain irregulier ou petites imperfections recurrentes. Le produit devient plus pertinent quand le besoin principal colle vraiment a ${keySignal || "un usage exfoliant ou regulateur"} plutot qu'a une recherche d'apaisement pur.`;
    }

    if (clusterRef === "soin_des_cheveux") {
        return `${product.name} merite surtout le clic si le besoin tourne autour du cuir chevelu, de la longueur fragilisee ou d'une routine croissance simple. Le produit est plus pertinent quand on cherche ${keySignal || "un geste cible"} sans multiplier trop d'etapes.`;
    }

    if (clusterRef === "soin_du_corps") {
        return `${product.name} merite surtout le clic si la peau manque de confort, de souplesse ou de soutien quotidien. Le meilleur fit est un besoin concret et regulier, pas l'attente d'un resultat spectaculaire des la premiere application.`;
    }

    return `${product.name} merite le clic surtout si le besoin principal correspond aux signaux produit les plus visibles: ${keySignal || "usage simple et cible"}.`;
}

function buildShortFitLine(product: Product, clusterRef: string, signals: string[]): string {
    if (clusterRef === "soin_du_visage") {
        return `${product.name}: bon choix si pores, brillance et imperfections reviennent souvent.`;
    }

    if (clusterRef === "soin_des_cheveux") {
        return `${product.name}: pertinent si le besoin vise surtout le cuir chevelu, une routine croissance simple ou des longueurs fragilisees.`;
    }

    if (clusterRef === "soin_du_corps") {
        return `${product.name}: utile si la peau manque surtout de confort, de souplesse ou d'un geste nourrissant regulier.`;
    }

    return `${product.name}: utile si le besoin colle vraiment a ${signals.slice(0, 2).join(", ") || "un usage cible"}.`;
}

function buildAvoidSentence(product: Product, clusterRef: string): string {
    if (clusterRef === "soin_du_visage") {
        return `Si la peau est deja irritee, deshydratee ou surchargee en exfoliants, ${product.name} n'est pas forcement le premier achat a faire. Il faut aussi lever le pied en cas de picotements persistants, rougeurs qui durent ou tiraillements qui s'installent apres plusieurs utilisations.`;
    }

    if (clusterRef === "soin_des_cheveux") {
        return `Si le cuir chevelu est tres reactif ou si la routine actuelle est deja chargee en huiles, ${product.name} demande plus de prudence. Le bon reflexe est de reduire la frequence si les racines regraissent trop vite ou si le confort baisse.`;
    }

    return `Si la zone est deja reactive ou si le besoin principal n'est pas le bon, ${product.name} risque de deplacer le probleme plus que de le resoudre. L'important est de verifier la tolerance et d'ajuster la frequence avant d'insister.`;
}

function buildTimelineSentence(product: Product, clusterRef: string): string {
    if (clusterRef === "soin_du_visage") {
        return `Pour un produit comme ${product.name}, il est plus credible d'observer la peau sur plusieurs applications, souvent sur deux a six semaines selon la frequence et la tolerance, plutot que d'attendre un resultat net en une nuit.`;
    }

    if (clusterRef === "soin_des_cheveux") {
        return `Pour un produit comme ${product.name}, il faut juger surtout la regularite de la routine et le confort d'usage avant de parler de resultat visible. Sur les cheveux, le ressenti peut venir vite, mais les changements plus nets demandent generalement plusieurs semaines.`;
    }

    return `Le bon repere avec ${product.name}, c'est la regularite: on juge d'abord le confort, puis la tenue dans la routine, avant de parler d'un vrai resultat.`;
}

function buildVisualBrief(product: Product, signals: string[]): string {
    const packshotType = signals.find((signal) => signal.startsWith("format "))?.replace("format ", "") || "produit";
    const topSignals = signals.slice(0, 3).join(", ");

    return `Pinterest vertical premium, packshot ${packshotType} identifiable ${product.name}, branding ${product.brand || "produit"} lisible, rendu editorial propre, aucun lifestyle generique, focus sur ${topSignals || "le besoin produit"}, composition claire orientee clic`;
}

function buildReviewFocus(reviewWarnings: string[], clusterRef: string): string {
    const joinedWarnings = normalizeForDedup(reviewWarnings.join(" "));
    const checkpoints: string[] = [];

    if (joinedWarnings.includes("toler")) {
        checkpoints.push("la tolerance");
    }

    if (joinedWarnings.includes("frequen")) {
        checkpoints.push("la frequence");
    }

    if (joinedWarnings.includes("profil") || joinedWarnings.includes("type de peau") || joinedWarnings.includes("peau")) {
        checkpoints.push("le bon profil de peau");
    }

    if (joinedWarnings.includes("ingredient") || joinedWarnings.includes("formule")) {
        checkpoints.push("les ingredients");
    }

    if (joinedWarnings.includes("result")) {
        checkpoints.push("l'horizon des resultats");
    }

    if (joinedWarnings.includes("visuel") || joinedWarnings.includes("image")) {
        checkpoints.push("la coherence du produit");
    }

    if (clusterRef === "soin_du_visage") {
        checkpoints.push("la tolerance", "la frequence", "le bon profil de peau");
    } else if (clusterRef === "soin_des_cheveux") {
        checkpoints.push("le cuir chevelu", "la frequence", "le vrai besoin");
    } else {
        checkpoints.push("la frequence", "le vrai besoin");
    }

    const focus = uniqueStrings(checkpoints).slice(0, 2);
    return focus.length > 0 ? focus.join(", ") : "les points utiles avant achat";
}

function buildShortExcerpt(product: Product, clusterRef: string, socialProof: string | null): string {
    if (clusterRef === "soin_du_visage") {
        return mergeCopyParts(
            [`${product.name}: a qui il convient vraiment pour pores, brillance et imperfections`, socialProof],
            180,
        );
    }

    if (clusterRef === "soin_des_cheveux") {
        return mergeCopyParts(
            [`${product.name}: pour qui cette huile a du sens dans une routine cuir chevelu ou pousse cheveux`, socialProof],
            180,
        );
    }

    if (clusterRef === "soin_du_corps") {
        return mergeCopyParts(
            [`${product.name}: comment savoir si ce baume merite une place dans une routine peau seche`, socialProof],
            180,
        );
    }

    return mergeCopyParts([`${product.name}: vrai fit produit et points a verifier`, socialProof], 180);
}

function buildShortMetaDescription(product: Product, clusterRef: string): string {
    if (clusterRef === "soin_du_visage") {
        return clampText(`${product.name} : points forts, limites, tolerance et vrai fit produit avant achat.`, 160);
    }

    if (clusterRef === "soin_des_cheveux") {
        return clampText(`${product.name} : avis utile, limites, frequence d'usage et bon profil avant achat.`, 160);
    }

    if (clusterRef === "soin_du_corps") {
        return clampText(`${product.name} : routine utile, limites, confort et bon profil avant achat.`, 160);
    }

    return clampText(`${product.name} : points utiles, limites et bon fit avant achat.`, 160);
}

function buildClusterSpecificCta(product: Product, clusterRef: string): string {
    if (clusterRef === "soin_des_cheveux") {
        return `Voir la fiche ${product.name} pour verifier si cette huile romarin menthe convient a votre type de cuir chevelu, a votre frequence de lavage et a votre routine pousse cheveux.`;
    }

    if (clusterRef === "soin_du_visage") {
        return `Voir la fiche ${product.name} pour verifier la tolerance, la frequence d'usage et le vrai fit avec votre type de peau avant achat.`;
    }

    return `Voir la fiche ${product.name} pour verifier les ingredients, la frequence d'usage, les avis recents et la compatibilite avec votre routine.`;
}

function buildUsageGuidanceSection(product: Product, clusterRef: string, evidence: ReturnType<typeof buildProductEvidence>): string {
    if (clusterRef === "soin_des_cheveux") {
        return mergeCopyParts(
            [
                `${product.name} s'inscrit surtout dans une routine capillaire simple: massage du cuir chevelu, petite quantite, puis observation du confort entre deux lavages.`,
                evidence.usageGuidance,
                evidence.fitProfiles[0]
                    ? `Le profil le plus logique reste ${evidence.fitProfiles[0]}.`
                    : null,
                evidence.objectionChecklist[0]
                    ? `Le premier point a verifier reste ${evidence.objectionChecklist[0]}.`
                    : null,
            ],
            420,
        );
    }

    if (clusterRef === "soin_du_visage") {
        return mergeCopyParts(
            [
                evidence.usageGuidance,
                `${product.name} gagne a etre teste dans une routine simple, avec une frequence prudente et un vrai suivi de tolerance.`,
                evidence.fitProfiles[0] ? `Le bon profil de depart reste ${evidence.fitProfiles[0]}.` : null,
            ],
            420,
        );
    }

    return mergeCopyParts(
        [
            evidence.usageGuidance,
            `${product.name} a surtout du sens si l'usage reste simple, regulier et facile a tenir dans la vraie vie.`,
        ],
        360,
    );
}

function buildClickVerificationSection(product: Product, evidence: ReturnType<typeof buildProductEvidence>): string {
    return mergeCopyParts(
        [
            evidence.clickReasons[0] ? `Premier reflexe: ${evidence.clickReasons[0]}.` : null,
            evidence.clickReasons[1] ? `Deuxieme verification: ${evidence.clickReasons[1]}.` : null,
            evidence.clickReasons[2] ? `Troisieme verification: ${evidence.clickReasons[2]}.` : null,
            evidence.clickReasons[3] ? `Dernier point avant achat: ${evidence.clickReasons[3]}.` : null,
            `${product.name} merite le clic surtout si ces verifications confirment le bon fit produit, pas juste parce que le nom du produit est populaire.`,
        ],
        420,
    );
}

function buildHairSemanticSupport(product: Product, evidence: ReturnType<typeof buildProductEvidence>): string {
    return mergeCopyParts(
        [
            `${product.name} doit etre lu comme une huile romarin menthe orientee cuir chevelu, pas comme un soin capillaire universel.`,
            `Si la recherche tourne autour de pousse cheveux, huile fortifiante capillaire, massage du cuir chevelu ou routine capillaire simple, ce sont ces mots-la qu'il faut aligner avec le besoin reel.`,
            evidence.fitProfiles[1] ? `Le bon scenario d'usage ressemble plutot a ${evidence.fitProfiles[1]}.` : null,
            evidence.objectionChecklist[1] ? `Le point de friction a surveiller reste ${evidence.objectionChecklist[1]}.` : null,
        ],
        460,
    );
}

export function enhanceContentDraftSpecificity(
    draft: SpecificityDraft,
    product: Product,
    clusterRef: string,
    reviewWarnings: string[] = [],
): SpecificityDraft {
    const evidence = buildProductEvidence(product);
    const signals = evidence.signals;
    const price = evidence.priceLabel || formatPrice(product.price);
    const socialProof = evidence.socialProofLabel;
    const proofSentence = [
        product.brand ? `${product.brand} signe ici ${product.name}` : product.name,
        signals.length > 0 ? `avec des signaux clairs comme ${signals.slice(0, 4).join(", ")}` : null,
        socialProof ? `et un repere social de ${socialProof}` : null,
        price ? `pour un prix repere autour de ${price}` : null,
    ]
        .filter(Boolean)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
    const strongerCta = buildClusterSpecificCta(product, clusterRef);
    const shouldAppendDetailedSections = draft.generationMeta?.mode !== "ai" || reviewWarnings.length > 0;

    let nextContent = replaceFinalCta(draft.post.content, strongerCta);

    if (shouldAppendDetailedSections) {
        nextContent = appendSectionIfMissing(
            nextContent,
            "Les signaux produit a verifier",
            `${proofSentence}. Ce sont ces details concrets qui aident a distinguer ce produit d'un autre actif plus generique du meme univers.`,
        );
        nextContent = appendSectionIfMissing(nextContent, "Pour quel profil le clic est pertinent", buildFitSentence(product, clusterRef, signals));
        nextContent = appendSectionIfMissing(nextContent, "Quand ralentir ou passer son tour", buildAvoidSentence(product, clusterRef));
        nextContent = appendSectionIfMissing(nextContent, "A quel rythme juger les resultats", buildTimelineSentence(product, clusterRef));
        nextContent = appendSectionIfMissing(
            nextContent,
            clusterRef === "soin_des_cheveux" ? "Routine capillaire simple et frequence d'usage" : "Frequence d'usage et routine simple",
            buildUsageGuidanceSection(product, clusterRef, evidence),
        );
        nextContent = appendSectionIfMissing(
            nextContent,
            "Ce qu'il faut verifier avant de cliquer",
            buildClickVerificationSection(product, evidence),
        );
    }

    if (clusterRef === "soin_des_cheveux" && !contentMentions(nextContent, "huile fortifiante capillaire")) {
        nextContent = appendSectionIfMissing(nextContent, "Huile romarin menthe: le vrai fit produit", buildHairSemanticSupport(product, evidence));
    }

    const reviewFocus = buildReviewFocus(reviewWarnings, clusterRef);
    const pricingSentence = price ? `prix repere autour de ${price}` : null;
    const postExcerpt = buildShortExcerpt(product, clusterRef, socialProof);
    const postMetaDescription = buildShortMetaDescription(product, clusterRef);

    return {
        ...draft,
        post: {
            ...draft.post,
            excerpt: postExcerpt,
            metaDescription: postMetaDescription,
            content: nextContent,
        },
        pins: draft.pins.map((pin, index) => {
            if (index === 0) {
                return {
                    ...pin,
                    title: `${product.brand || product.name} : verifier avant achat`,
                    description: mergeCopyParts(
                        [
                            clusterRef === "soin_des_cheveux"
                                ? `${product.name}: huile romarin menthe, cuir chevelu, pousse cheveux`
                                : `${product.name}: ${signals.slice(0, 2).join(", ") || "des signaux produit clairs"}`,
                            socialProof ? `repere social ${socialProof}` : null,
                            pricingSentence ? `prix repere ${price}` : null,
                        ],
                        180,
                    ),
                    imagePrompt: buildVisualBrief(product, signals),
                    cta: "Verifier fiche + avis",
                };
            }

            if (index === 1) {
                return {
                    ...pin,
                    description: mergeCopyParts(
                        [
                            clusterRef === "soin_des_cheveux"
                                ? `${product.name}: verifier ${reviewFocus}, racines qui regraissent vite et routine capillaire avant achat`
                                : `${product.name}: verifier ${reviewFocus} avant achat`,
                            evidence.clickReasons[0] || `focus ${signals.slice(0, 2).join(", ")}`,
                        ],
                        180,
                    ),
                    imagePrompt: `${buildVisualBrief(product, signals)} avec angle checklist avant achat`,
                    cta: "Voir les points a verifier",
                };
            }

            return {
                ...pin,
                description: mergeCopyParts(
                    [
                        buildShortFitLine(product, clusterRef, signals),
                        clusterRef === "soin_des_cheveux"
                            ? "utile si la routine pousse cheveux reste simple et supporte bien le massage du cuir chevelu"
                            : evidence.clickReasons[0],
                    ],
                    180,
                ),
                imagePrompt: `${buildVisualBrief(product, signals)} avec angle comparaison et fit produit`,
                cta: "Voir si le produit vous convient",
            };
        }),
    };
}

export type { SpecificityDraft };

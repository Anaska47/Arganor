import type { Product } from "@/lib/data";

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

function trimTrailingPunctuation(value: string): string {
    return value.trim().replace(/[.!?\s]+$/g, "");
}

function appendSectionIfMissing(content: string, heading: string, body: string): string {
    if (content.includes(`## ${heading}`)) {
        return content;
    }

    return `${content.trim()}\n\n## ${heading}\n\n${body}`;
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
    const name = product.name;
    const matches: string[] = [];
    const percentSignal = name.match(/(\d+\s?%\s*(?:BHA|AHA|niacinamide))/i);
    if (percentSignal?.[1]) {
        matches.push(percentSignal[1].toUpperCase().replace(/\s+/g, " "));
    }

    const mucinSignal = name.match(/(\d+\s*Mucin)/i);
    if (mucinSignal?.[1]) {
        matches.push(mucinSignal[1]);
    }

    if (/romarin/i.test(name) && /menthe/i.test(name)) {
        matches.push("romarin et menthe");
    }

    if (/acide hyaluronique/i.test(name)) {
        matches.push("acide hyaluronique");
    }

    if (/ceramide/i.test(name) || /ceramides/i.test(name)) {
        matches.push("ceramides");
    }

    if (/huile/i.test(name)) {
        matches.push("format huile");
    } else if (/essence/i.test(name)) {
        matches.push("format essence");
    } else if (/lotion/i.test(name)) {
        matches.push("format lotion");
    } else if (/serum|sérum/i.test(name)) {
        matches.push("format serum");
    }

    return uniqueStrings(matches);
}

function buildProductSignals(product: Product): string[] {
    return uniqueStrings(
        [
            ...extractNameSignals(product),
            ...(Array.isArray(product.features) ? product.features : []),
            ...(Array.isArray(product.seoTags) ? product.seoTags : []),
            ...extractBenefitBullets(product),
        ]
            .map((item) => (typeof item === "string" ? trimTrailingPunctuation(item) : ""))
            .filter(Boolean),
    ).slice(0, 8);
}

function buildFitSentence(product: Product, clusterRef: string, signals: string[]): string {
    const keySignal = signals.slice(0, 3).join(", ");

    if (clusterRef === "soin_du_visage") {
        return `${product.name} merite surtout le clic si la peau cumule pores visibles, brillance, grain irregulier ou petites imperfections recurrentes. Le produit devient plus pertinent quand le besoin principal colle vraiment a ${keySignal || "un usage exfoliant ou regulateur"} plutot qu'a une recherche d'apaisement pur.`;
    }

    if (clusterRef === "soin_des_cheveux") {
        return `${product.name} merite surtout le clic si le besoin tourne autour du cuir chevelu, de la longueur fragilisee ou d'une routine croissance simple. Le produit est plus pertinent quand on cherche ${keySignal || "un geste ciblé"} sans multiplier trop d'etapes.`;
    }

    if (clusterRef === "soin_du_corps") {
        return `${product.name} merite surtout le clic si la peau manque de confort, de souplesse ou de soutien quotidien. Le meilleur fit est un besoin concret et regulier, pas l'attente d'un resultat spectaculaire des la premiere application.`;
    }

    return `${product.name} merite le clic surtout si le besoin principal correspond aux signaux produit les plus visibles: ${keySignal || "usage simple et ciblé"}.`;
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

export function enhanceContentDraftSpecificity(
    draft: SpecificityDraft,
    product: Product,
    clusterRef: string,
    reviewWarnings: string[] = [],
): SpecificityDraft {
    const signals = buildProductSignals(product);
    const price = formatPrice(product.price);
    const socialProof =
        Number.isFinite(product.rating) && product.rating > 0 && Number.isFinite(product.reviews) && product.reviews >= 0
            ? `${product.rating}/5 sur ${product.reviews} avis`
            : null;
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
    const strongerCta = `Voir la fiche ${product.name} pour verifier les ingredients, la frequence d'usage, les avis recents et la compatibilite avec votre routine.`;

    let nextContent = replaceFinalCta(draft.post.content, strongerCta);
    nextContent = appendSectionIfMissing(nextContent, "Les signaux produit a verifier", `${proofSentence}. Ce sont ces details concrets qui aident a distinguer ce produit d'un autre actif plus generique du meme univers.`);
    nextContent = appendSectionIfMissing(nextContent, "Pour quel profil le clic est pertinent", buildFitSentence(product, clusterRef, signals));
    nextContent = appendSectionIfMissing(nextContent, "Quand ralentir ou passer son tour", buildAvoidSentence(product, clusterRef));
    nextContent = appendSectionIfMissing(nextContent, "A quel rythme juger les resultats", buildTimelineSentence(product, clusterRef));

    const warningSummary = reviewWarnings
        .map((warning) => warning.trim())
        .filter(Boolean)
        .slice(0, 2)
        .join(" ");

    return {
        ...draft,
        post: {
            ...draft.post,
            excerpt: `${draft.post.excerpt} ${proofSentence}.`.replace(/\s+/g, " ").trim(),
            metaDescription: `${draft.post.metaDescription} Verifiez aussi les ingredients, les avis et le vrai fit produit avant achat.`
                .replace(/\s+/g, " ")
                .trim(),
            content: nextContent,
        },
        pins: draft.pins.map((pin, index) => {
            if (index === 0) {
                return {
                    ...pin,
                    title: `${product.brand || product.name} : verifier avant achat`,
                    description: `${product.name} se joue sur ${signals.slice(0, 3).join(", ") || "des signaux produit clairs"}. Un pin pense pour cliquer vers la fiche, pas juste enregistrer.`,
                    imagePrompt: buildVisualBrief(product, signals),
                    cta: "Verifier fiche + avis",
                };
            }

            if (index === 1) {
                return {
                    ...pin,
                    description: `${product.name}: verifier tolerance, frequence et bon profil avant achat. ${warningSummary}`.replace(/\s+/g, " ").trim(),
                    imagePrompt: `${buildVisualBrief(product, signals)} avec angle checklist avant achat`,
                    cta: "Voir les points a verifier",
                };
            }

            return {
                ...pin,
                description: `${pin.description} ${buildFitSentence(product, clusterRef, signals)}`.replace(/\s+/g, " ").trim(),
                imagePrompt: `${buildVisualBrief(product, signals)} avec angle comparaison et fit produit`,
                cta: "Voir si le produit vous convient",
            };
        }),
    };
}

export type { SpecificityDraft };

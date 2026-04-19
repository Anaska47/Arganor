import type { Product } from "@/lib/data";

export type TaxonomyAxis = "face" | "hair" | "body";
export type GrowthMachineCategory = "Soin du Visage" | "Soin des Cheveux" | "Soin du Corps";
export type TaxonomyConfidence = "high" | "medium" | "low";
export type TaxonomySignalSource = "name" | "feature" | "seo_tag";

type TaxonomySignalRule = {
    axis: TaxonomyAxis;
    label: string;
    pattern: RegExp;
};

export type ProductTaxonomySignal = {
    axis: TaxonomyAxis;
    source: TaxonomySignalSource;
    label: string;
    weight: number;
};

export type ProductTaxonomyResolution = {
    sourceCategory: string;
    sourceClusterRef: string;
    effectiveCategory: GrowthMachineCategory;
    effectiveClusterRef: string;
    categoryAxis: TaxonomyAxis | null;
    inferredAxis: TaxonomyAxis | null;
    detectedAxes: TaxonomyAxis[];
    isCategoryMismatch: boolean;
    confidence: TaxonomyConfidence;
    rationale: string;
    warnings: string[];
    signals: ProductTaxonomySignal[];
};

const CATEGORY_BY_AXIS: Record<TaxonomyAxis, GrowthMachineCategory> = {
    face: "Soin du Visage",
    hair: "Soin des Cheveux",
    body: "Soin du Corps",
};

const CLUSTER_BY_AXIS: Record<TaxonomyAxis, string> = {
    face: "soin_du_visage",
    hair: "soin_des_cheveux",
    body: "soin_du_corps",
};

const SIGNAL_RULES: TaxonomySignalRule[] = [
    { axis: "face", label: "visage", pattern: /\bvisage\b/ },
    { axis: "face", label: "peau", pattern: /\bpeau\b/ },
    { axis: "face", label: "serum", pattern: /\bserum\b/ },
    { axis: "face", label: "retinol", pattern: /\bretinol\b/ },
    { axis: "face", label: "niacinamide", pattern: /\bniacinamide\b/ },
    { axis: "face", label: "bha", pattern: /\bbha\b/ },
    { axis: "face", label: "imperfections", pattern: /\bimperfections?\b/ },
    { axis: "face", label: "acide hyaluronique", pattern: /\bacide hyaluronique\b/ },
    { axis: "face", label: "anti-age", pattern: /\banti[ -]?age\b/ },
    { axis: "hair", label: "cheveux", pattern: /\bcheveux\b/ },
    { axis: "hair", label: "capillaire", pattern: /\bcapillaire\b/ },
    { axis: "hair", label: "cuir chevelu", pattern: /\bcuir chevelu\b/ },
    { axis: "hair", label: "romarin", pattern: /\bromarin\b/ },
    { axis: "hair", label: "croissance", pattern: /\bcroissance\b/ },
    { axis: "hair", label: "repousse", pattern: /\brepousse\b/ },
    { axis: "hair", label: "fortifiant", pattern: /\bfortifiant\b/ },
    { axis: "hair", label: "shampooing", pattern: /\bshampooing\b/ },
    { axis: "body", label: "corps", pattern: /\bcorps\b/ },
    { axis: "body", label: "body", pattern: /\bbody\b/ },
    { axis: "body", label: "mains", pattern: /\bmains?\b/ },
    { axis: "body", label: "jambes", pattern: /\bjambes?\b/ },
    { axis: "body", label: "buste", pattern: /\bbuste\b/ },
];

function normalizeText(value: string): string {
    return value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
}

function collectSignalsFromText(
    value: string | undefined,
    source: TaxonomySignalSource,
    weight: number,
): ProductTaxonomySignal[] {
    if (!value) {
        return [];
    }

    const normalized = normalizeText(value);

    return SIGNAL_RULES.filter((rule) => rule.pattern.test(normalized)).map((rule) => ({
        axis: rule.axis,
        source,
        label: rule.label,
        weight,
    }));
}

function collectSignalsFromList(
    values: string[] | undefined,
    source: TaxonomySignalSource,
    weight: number,
): ProductTaxonomySignal[] {
    if (!Array.isArray(values) || values.length === 0) {
        return [];
    }

    return values.flatMap((value) => collectSignalsFromText(value, source, weight));
}

function uniqueAxes(signals: ProductTaxonomySignal[]): TaxonomyAxis[] {
    return Array.from(new Set(signals.map((signal) => signal.axis)));
}

function toCategoryAxis(category: string | undefined): TaxonomyAxis | null {
    const normalized = normalizeText(category || "");

    if (/(visage|peau)/.test(normalized)) {
        return "face";
    }

    if (/(cheveux|capillaire)/.test(normalized)) {
        return "hair";
    }

    if (/corps/.test(normalized)) {
        return "body";
    }

    return null;
}

function scoreSignals(signals: ProductTaxonomySignal[]): Map<TaxonomyAxis, number> {
    const scores = new Map<TaxonomyAxis, number>();

    for (const signal of signals) {
        scores.set(signal.axis, (scores.get(signal.axis) ?? 0) + signal.weight);
    }

    return scores;
}

function resolveInferredAxis(signals: ProductTaxonomySignal[]): {
    axis: TaxonomyAxis | null;
    confidence: TaxonomyConfidence;
    rationale: string;
} {
    const nameAxes = uniqueAxes(signals.filter((signal) => signal.source === "name"));

    if (nameAxes.length === 1) {
        return {
            axis: nameAxes[0],
            confidence: "high",
            rationale: `Le nom produit pointe clairement vers l'axe ${nameAxes[0]}.`,
        };
    }

    if (nameAxes.includes("face") && nameAxes.includes("body") && !nameAxes.includes("hair")) {
        return {
            axis: "body",
            confidence: "medium",
            rationale: "Le nom produit couvre visage et corps; la normalisation interne le rattache au corps par defaut.",
        };
    }

    const ranked = Array.from(scoreSignals(signals).entries()).sort((left, right) => right[1] - left[1]);
    const best = ranked[0];
    const second = ranked[1];

    if (!best) {
        return {
            axis: null,
            confidence: "low",
            rationale: "Aucun signal taxonomique clair n'a ete detecte hors categorie source.",
        };
    }

    if (!second || best[1] >= second[1] + 3) {
        return {
            axis: best[0],
            confidence: best[1] >= 5 ? "high" : "medium",
            rationale: `Les signaux produit convergent majoritairement vers l'axe ${best[0]}.`,
        };
    }

    return {
        axis: best[0],
        confidence: "low",
        rationale: "Les signaux taxonomiques sont trop partages pour corriger la categorie automatiquement avec certitude.",
    };
}

function toClusterRefFromCategory(category: string): string {
    const axis = toCategoryAxis(category);
    return axis ? CLUSTER_BY_AXIS[axis] : "general";
}

export function resolveProductTaxonomy(product: Pick<Product, "name" | "category" | "features" | "seoTags">): ProductTaxonomyResolution {
    const signals = [
        ...collectSignalsFromText(product.name, "name", 5),
        ...collectSignalsFromList(product.features, "feature", 2),
        ...collectSignalsFromList(product.seoTags, "seo_tag", 1),
    ];

    const categoryAxis = toCategoryAxis(product.category);
    const inference = resolveInferredAxis(signals);
    const effectiveAxis = inference.axis && inference.confidence !== "low" ? inference.axis : categoryAxis || "face";
    const effectiveCategory = CATEGORY_BY_AXIS[effectiveAxis];
    const effectiveClusterRef = CLUSTER_BY_AXIS[effectiveAxis];
    const sourceClusterRef = toClusterRefFromCategory(product.category);
    const isCategoryMismatch = Boolean(inference.axis && categoryAxis && inference.axis !== categoryAxis);
    const warnings: string[] = [];

    if (isCategoryMismatch) {
        const confidenceMessage =
            inference.confidence === "high"
                ? "La normalisation interne a une confiance forte."
                : inference.confidence === "medium"
                  ? "La normalisation interne est plausible mais merite verification."
                  : "La categorie source reste douteuse et demande une verification manuelle.";

        warnings.push(
            `Categorie source "${product.category}" incoherente avec les signaux produit. Normalisation proposee: "${effectiveCategory}". ${confidenceMessage}`,
        );
    }

    if (signals.length === 0) {
        warnings.push("Aucun signal nom/features/seoTags exploitable pour consolider la categorie source.");
    }

    if (inference.confidence === "medium" && uniqueAxes(signals.filter((signal) => signal.source === "name")).length > 1) {
        warnings.push("Le nom produit couvre plusieurs zones d'usage; la normalisation automatique reste prudente.");
    }

    return {
        sourceCategory: product.category,
        sourceClusterRef,
        effectiveCategory,
        effectiveClusterRef,
        categoryAxis,
        inferredAxis: inference.axis,
        detectedAxes: uniqueAxes(signals),
        isCategoryMismatch,
        confidence: inference.confidence,
        rationale: inference.rationale,
        warnings,
        signals,
    };
}

export function shouldWarnForTaxonomyResolution(resolution: ProductTaxonomyResolution): boolean {
    if (!resolution.isCategoryMismatch) {
        return false;
    }

    return resolution.confidence !== "high";
}

export function isCatalogTaxonomyIssue(resolution: ProductTaxonomyResolution): boolean {
    return resolution.isCategoryMismatch || resolution.confidence === "low";
}

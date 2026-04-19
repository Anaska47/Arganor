import "server-only";

import type { BlogPost } from "@/lib/blog";
import type { Product } from "@/lib/data";
import { readRuntimePosts, readRuntimeProducts } from "@/lib/runtime-content-store";

const CANONICAL_CATEGORIES = new Set(["Soin du Visage", "Soin des Cheveux", "Soin du Corps", "\u00C9ducation"]);

const TEMPLATE_PHRASES = [
    "on ne triche pas avec la nature",
    "produit phare de la gamme",
    "le verdict est sans appel",
    "routine efficace ne doit pas etre complexe",
    "marche de la cosmetique est sature",
];

const MOJIBAKE_FRAGMENTS = ["\u00C3", "\u00E2\u20AC", "\u00F0\u0178", "\uFFFD"];
const LOOSE_MOJIBAKE_FRAGMENT = /\u00C2(?=[\s,.;:!?'"()[\]{}\/\\-]|$)/;

type IssueSeverity = "critical" | "warning" | "info";

type AuditIssueType =
    | "stale_related_product_id"
    | "missing_affiliate_target"
    | "low_word_count"
    | "missing_meta_description"
    | "non_canonical_category"
    | "mojibake_detected"
    | "english_leakage"
    | "template_heavy"
    | "category_mismatch"
    | "inline_link_fallback";

export type BlogAuditIssue = {
    type: AuditIssueType;
    severity: IssueSeverity;
    message: string;
};

export type BlogAuditItem = {
    id: string;
    slug: string;
    title: string;
    category: string;
    publishedDate: string;
    wordCount: number;
    issueCount: number;
    score: number;
    quality: "healthy" | "needs_work" | "critical";
    issues: BlogAuditIssue[];
    flags: {
        hasAffiliateQuery: boolean;
        hasRelatedProductId: boolean;
        hasResolvedProduct: boolean;
        hasInlineProductLinks: boolean;
        hasInlineLinkFallback: boolean;
        templateMatchCount: number;
        mojibakeDetected: boolean;
        englishSignals: boolean;
    };
};

export type BlogAuditReport = {
    summary: {
        totalPosts: number;
        healthyCount: number;
        needsWorkCount: number;
        criticalCount: number;
        bySeverity: Record<IssueSeverity, number>;
        byType: Partial<Record<AuditIssueType, number>>;
        shortestPosts: number;
        mojibakeCount: number;
        englishLeakageCount: number;
        nonCanonicalCategoryCount: number;
    };
    items: BlogAuditItem[];
};

function normalizeText(value: string): string {
    return String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();
}

function normalizeSlug(value: string): string {
    try {
        return decodeURIComponent(value).normalize("NFC");
    } catch {
        return value.normalize("NFC");
    }
}

function wordCount(content: string): number {
    return String(content || "")
        .replace(/[>#*_`-]/g, " ")
        .split(/\s+/)
        .filter(Boolean).length;
}

function hasMojibake(value: string): boolean {
    const surface = String(value || "");

    if (MOJIBAKE_FRAGMENTS.some((fragment) => surface.includes(fragment))) {
        return true;
    }

    return LOOSE_MOJIBAKE_FRAGMENT.test(surface);
}

function hasEnglishSignals(value: string): boolean {
    const normalized = normalizeText(value);
    return /\b(why|ultimate solution|masterpiece|skin care|body care|premium shipping|discover|the struggle|enter)\b/i.test(
        normalized,
    );
}

function extractInlineProductSlugs(content: string): string[] {
    return [...String(content || "").matchAll(/\((\/products\/[^)]+)\)/g)].map((match) =>
        normalizeSlug(match[1].replace(/^\/products\//, "").trim()),
    );
}

function computeScore(issues: BlogAuditIssue[], wordCountValue: number): number {
    const severityWeight = { critical: 40, warning: 15, info: 5 };
    let score = issues.reduce((total, issue) => total + severityWeight[issue.severity], 0);

    if (wordCountValue < 120) score += 20;
    else if (wordCountValue < 180) score += 8;

    return score;
}

function toQuality(issues: BlogAuditIssue[]): BlogAuditItem["quality"] {
    if (issues.some((issue) => issue.severity === "critical")) {
        return "critical";
    }

    if (issues.some((issue) => issue.severity === "warning")) {
        return "needs_work";
    }

    return "healthy";
}

function buildAuditItem(post: BlogPost, products: Product[]): BlogAuditItem {
    const issues: BlogAuditIssue[] = [];
    const productsById = new Map(products.map((product) => [product.id, product]));
    const productsBySlug = new Map(products.map((product) => [normalizeSlug(product.slug), product]));
    const resolvedProduct = post.relatedProductId ? productsById.get(post.relatedProductId) ?? null : null;
    const inlineProductSlugs = extractInlineProductSlugs(post.content);
    const inlineFallbackSlugs = inlineProductSlugs.filter((slug) => !productsBySlug.has(slug));
    const templateMatches = TEMPLATE_PHRASES.filter((phrase) => normalizeText(post.content).includes(phrase));
    const surface = [post.title, post.category, post.excerpt, post.content].join("\n");
    const mojibakeDetected = hasMojibake(surface);
    const englishSignals = hasEnglishSignals(surface);
    const wordCountValue = wordCount(post.content);

    if (post.relatedProductId && !resolvedProduct) {
        issues.push({
            type: "stale_related_product_id",
            severity: "critical",
            message: `relatedProductId ${post.relatedProductId} ne correspond a aucun produit actif.`,
        });
    }

    if (!resolvedProduct && !post.affiliateQuery?.trim() && inlineProductSlugs.length === 0) {
        issues.push({
            type: "missing_affiliate_target",
            severity: "critical",
            message: "Aucun point d atterrissage affilie fiable n est disponible pour cet article.",
        });
    }

    if (wordCountValue < 120) {
        issues.push({
            type: "low_word_count",
            severity: "critical",
            message: `Contenu trop court (${wordCountValue} mots).`,
        });
    } else if (wordCountValue < 180) {
        issues.push({
            type: "low_word_count",
            severity: "warning",
            message: `Contenu fragile pour le SEO (${wordCountValue} mots).`,
        });
    }

    if (!post.metaDescription?.trim()) {
        issues.push({
            type: "missing_meta_description",
            severity: "warning",
            message: "metaDescription absente.",
        });
    }

    if (!CANONICAL_CATEGORIES.has(post.category)) {
        issues.push({
            type: "non_canonical_category",
            severity: "warning",
            message: `Categorie non canonique: ${post.category}.`,
        });
    }

    if (mojibakeDetected) {
        issues.push({
            type: "mojibake_detected",
            severity: "critical",
            message: "Traces d encodage casse detectees dans le texte.",
        });
    }

    if (englishSignals) {
        issues.push({
            type: "english_leakage",
            severity: "warning",
            message: "Expressions anglaises ou wording incoherent detectes.",
        });
    }

    if (templateMatches.length >= 3) {
        issues.push({
            type: "template_heavy",
            severity: "warning",
            message: `Patron editorial trop repetitif (${templateMatches.length} phrases template detectees).`,
        });
    }

    if (resolvedProduct && normalizeText(post.category) !== normalizeText(resolvedProduct.category)) {
        issues.push({
            type: "category_mismatch",
            severity: "warning",
            message: `Categorie article (${post.category}) differente de la categorie produit (${resolvedProduct.category}).`,
        });
    }

    if (inlineFallbackSlugs.length > 0) {
        issues.push({
            type: "inline_link_fallback",
            severity: "info",
            message: `${inlineFallbackSlugs.length} lien(s) produit inline basculent en recherche affiliee faute de slug local.`,
        });
    }

    const score = computeScore(issues, wordCountValue);

    return {
        id: post.id,
        slug: post.slug,
        title: post.title,
        category: post.category,
        publishedDate: post.publishedDate,
        wordCount: wordCountValue,
        issueCount: issues.length,
        score,
        quality: toQuality(issues),
        issues,
        flags: {
            hasAffiliateQuery: Boolean(post.affiliateQuery?.trim()),
            hasRelatedProductId: Boolean(post.relatedProductId),
            hasResolvedProduct: Boolean(resolvedProduct),
            hasInlineProductLinks: inlineProductSlugs.length > 0,
            hasInlineLinkFallback: inlineFallbackSlugs.length > 0,
            templateMatchCount: templateMatches.length,
            mojibakeDetected,
            englishSignals,
        },
    };
}

function compareItems(left: BlogAuditItem, right: BlogAuditItem): number {
    if (right.score !== left.score) {
        return right.score - left.score;
    }

    return left.wordCount - right.wordCount;
}

export async function getBlogAuditReport(options?: {
    includeHealthy?: boolean;
    limit?: number;
}): Promise<BlogAuditReport> {
    const [posts, products] = await Promise.all([readRuntimePosts<BlogPost>(), readRuntimeProducts<Product>()]);
    const items = posts.map((post) => buildAuditItem(post, products)).sort(compareItems);
    const filtered = options?.includeHealthy ? items : items.filter((item) => item.issueCount > 0);
    const limit = typeof options?.limit === "number" ? Math.max(1, options.limit) : undefined;

    const summary = {
        totalPosts: items.length,
        healthyCount: items.filter((item) => item.quality === "healthy").length,
        needsWorkCount: items.filter((item) => item.quality === "needs_work").length,
        criticalCount: items.filter((item) => item.quality === "critical").length,
        bySeverity: {
            critical: items.flatMap((item) => item.issues).filter((issue) => issue.severity === "critical").length,
            warning: items.flatMap((item) => item.issues).filter((issue) => issue.severity === "warning").length,
            info: items.flatMap((item) => item.issues).filter((issue) => issue.severity === "info").length,
        },
        byType: items
            .flatMap((item) => item.issues)
            .reduce<Partial<Record<AuditIssueType, number>>>((accumulator, issue) => {
                accumulator[issue.type] = (accumulator[issue.type] ?? 0) + 1;
                return accumulator;
            }, {}),
        shortestPosts: items.filter((item) => item.wordCount < 180).length,
        mojibakeCount: items.filter((item) => item.flags.mojibakeDetected).length,
        englishLeakageCount: items.filter((item) => item.flags.englishSignals).length,
        nonCanonicalCategoryCount: items.filter((item) => !CANONICAL_CATEGORIES.has(item.category)).length,
    };

    return {
        summary,
        items: typeof limit === "number" ? filtered.slice(0, limit) : filtered,
    };
}

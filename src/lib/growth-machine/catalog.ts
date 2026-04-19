import "server-only";

import type { Product } from "@/lib/data";
import { readRuntimeProducts, writeRuntimeProducts } from "@/lib/runtime-content-store";

import { isCatalogTaxonomyIssue, resolveProductTaxonomy, type ProductTaxonomyResolution } from "./taxonomy";

export type CatalogTaxonomyAuditItem = {
    id: string;
    slug: string;
    name: string;
    brand: string | null;
    sourceCategory: string;
    effectiveCategory: string;
    sourceClusterRef: string;
    effectiveClusterRef: string;
    inferredAxis: ProductTaxonomyResolution["inferredAxis"];
    confidence: ProductTaxonomyResolution["confidence"];
    isCategoryMismatch: boolean;
    isIssue: boolean;
    isFixable: boolean;
    rationale: string;
    warnings: string[];
};

export type CatalogTaxonomyFixPreview = {
    summary: {
        totalProducts: number;
        issueCount: number;
        mismatchCount: number;
        fixableCount: number;
        confidence: {
            high: number;
            medium: number;
            low: number;
        };
    };
    items: CatalogTaxonomyAuditItem[];
};

export type CatalogTaxonomyFixResult = CatalogTaxonomyFixPreview & {
    appliedAt: string;
    updatedCount: number;
    skippedCount: number;
};

function sortAudits(left: CatalogTaxonomyAuditItem, right: CatalogTaxonomyAuditItem): number {
    const fixableDelta = Number(right.isFixable) - Number(left.isFixable);
    if (fixableDelta !== 0) {
        return fixableDelta;
    }

    const mismatchDelta = Number(right.isCategoryMismatch) - Number(left.isCategoryMismatch);
    if (mismatchDelta !== 0) {
        return mismatchDelta;
    }

    const confidenceRank = { high: 0, medium: 1, low: 2 };
    return confidenceRank[right.confidence] - confidenceRank[left.confidence];
}

function isFixableTaxonomyMismatch(resolution: ProductTaxonomyResolution): boolean {
    return resolution.isCategoryMismatch && resolution.confidence === "high";
}

function toAuditItem(product: Product, resolution = resolveProductTaxonomy(product)): CatalogTaxonomyAuditItem {
    return {
        id: product.id,
        slug: product.slug,
        name: product.name,
        brand: product.brand ?? null,
        sourceCategory: resolution.sourceCategory,
        effectiveCategory: resolution.effectiveCategory,
        sourceClusterRef: resolution.sourceClusterRef,
        effectiveClusterRef: resolution.effectiveClusterRef,
        inferredAxis: resolution.inferredAxis,
        confidence: resolution.confidence,
        isCategoryMismatch: resolution.isCategoryMismatch,
        isIssue: isCatalogTaxonomyIssue(resolution),
        isFixable: isFixableTaxonomyMismatch(resolution),
        rationale: resolution.rationale,
        warnings: resolution.warnings,
    };
}

function buildSummary(items: CatalogTaxonomyAuditItem[], totalProducts: number): CatalogTaxonomyFixPreview["summary"] {
    return {
        totalProducts,
        issueCount: items.filter((item) => item.isIssue).length,
        mismatchCount: items.filter((item) => item.isCategoryMismatch).length,
        fixableCount: items.filter((item) => item.isFixable).length,
        confidence: {
            high: items.filter((item) => item.confidence === "high").length,
            medium: items.filter((item) => item.confidence === "medium").length,
            low: items.filter((item) => item.confidence === "low").length,
        },
    };
}

function filterByProductIds(items: CatalogTaxonomyAuditItem[], productIds: string[] | undefined): CatalogTaxonomyAuditItem[] {
    if (!productIds?.length) {
        return items;
    }

    const selectedIds = new Set(productIds);
    return items.filter((item) => selectedIds.has(item.id));
}

export async function getCatalogTaxonomyAudit(options?: {
    includeAll?: boolean;
    limit?: number;
    productIds?: string[];
}): Promise<CatalogTaxonomyFixPreview> {
    const products = await readRuntimeProducts<Product>();
    const audits = products.map((product) => toAuditItem(product)).sort(sortAudits);
    const filtered = filterByProductIds(audits, options?.productIds);
    const issuesOnly = options?.includeAll ? filtered : filtered.filter((item) => item.isIssue);
    const limit = typeof options?.limit === "number" ? Math.max(1, options.limit) : undefined;

    return {
        summary: buildSummary(audits, products.length),
        items: typeof limit === "number" ? issuesOnly.slice(0, limit) : issuesOnly,
    };
}

export async function previewCatalogTaxonomyFixes(options?: {
    productIds?: string[];
}): Promise<CatalogTaxonomyFixPreview> {
    const products = await readRuntimeProducts<Product>();
    const audits = products.map((product) => toAuditItem(product)).sort(sortAudits);
    const filtered = filterByProductIds(audits, options?.productIds);
    const fixableItems = filtered.filter((item) => item.isFixable);

    return {
        summary: buildSummary(audits, products.length),
        items: fixableItems,
    };
}

export async function applyCatalogTaxonomyFixes(options?: {
    productIds?: string[];
}): Promise<CatalogTaxonomyFixResult> {
    const products = await readRuntimeProducts<Product>();
    const selectedIds = options?.productIds?.length ? new Set(options.productIds) : null;

    let updatedCount = 0;
    let skippedCount = 0;
    const appliedItems: CatalogTaxonomyAuditItem[] = [];

    const nextProducts = products.map((product) => {
        if (selectedIds && !selectedIds.has(product.id)) {
            return product;
        }

        const resolution = resolveProductTaxonomy(product);
        if (!isFixableTaxonomyMismatch(resolution)) {
            skippedCount += 1;
            return product;
        }

        if (product.category === resolution.effectiveCategory) {
            skippedCount += 1;
            return product;
        }

        updatedCount += 1;
        appliedItems.push(toAuditItem(product, resolution));
        return {
            ...product,
            category: resolution.effectiveCategory,
        };
    });

    if (updatedCount > 0) {
        await writeRuntimeProducts(nextProducts, "growth-machine:catalog");
    }

    const latestAudit = await getCatalogTaxonomyAudit({ includeAll: true });

    return {
        summary: latestAudit.summary,
        items: appliedItems.sort(sortAudits),
        appliedAt: new Date().toISOString(),
        updatedCount,
        skippedCount,
    };
}

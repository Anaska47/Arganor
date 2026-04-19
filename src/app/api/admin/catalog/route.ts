import { NextRequest, NextResponse } from "next/server";

import { isAuthorizedRequest, unauthorizedJson } from "@/lib/api-auth";
import { getErrorMessage } from "@/lib/error-format";
import {
    applyCatalogTaxonomyFixes,
    getCatalogTaxonomyAudit,
    previewCatalogTaxonomyFixes,
} from "@/lib/growth-machine/catalog";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function parseLimit(value: string | null): number {
    const parsed = Number.parseInt(value || "", 10);
    if (!Number.isFinite(parsed)) {
        return 25;
    }

    return Math.min(Math.max(parsed, 1), 200);
}

export async function GET(req: NextRequest) {
    if (!isAuthorizedRequest(req)) {
        return unauthorizedJson();
    }

    try {
        const { searchParams } = new URL(req.url);
        const limit = parseLimit(searchParams.get("limit"));
        const includeAll = searchParams.get("includeAll") === "true";
        const audit = await getCatalogTaxonomyAudit({ includeAll, limit });

        return NextResponse.json(
            {
                success: true,
                summary: audit.summary,
                items: audit.items,
            },
            {
                headers: {
                    "Cache-Control": "no-store, no-cache, must-revalidate",
                },
            },
        );
    } catch (error) {
        const message = getErrorMessage(error, "Unknown catalog audit error");
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}

type CatalogMutationBody = {
    confirmWrite?: boolean;
    productIds?: string[];
};

export async function POST(req: NextRequest) {
    if (!isAuthorizedRequest(req)) {
        return unauthorizedJson();
    }

    try {
        const body = (await req.json()) as CatalogMutationBody;
        const productIds = Array.isArray(body?.productIds)
            ? body.productIds.filter((value): value is string => typeof value === "string" && value.trim().length > 0)
            : undefined;

        if (!body?.confirmWrite) {
            const preview = await previewCatalogTaxonomyFixes({ productIds });

            return NextResponse.json(
                {
                    success: true,
                    dryRun: true,
                    message: "Preview generated. Set confirmWrite=true to persist high-confidence taxonomy fixes into the runtime content store.",
                    summary: preview.summary,
                    items: preview.items,
                },
                {
                    headers: {
                        "Cache-Control": "no-store, no-cache, must-revalidate",
                    },
                },
            );
        }

        const result = await applyCatalogTaxonomyFixes({ productIds });

        return NextResponse.json(
            {
                success: true,
                message: `${result.updatedCount} product(s) updated in the runtime content store.`,
                summary: result.summary,
                updatedCount: result.updatedCount,
                skippedCount: result.skippedCount,
                items: result.items,
                appliedAt: result.appliedAt,
            },
            {
                headers: {
                    "Cache-Control": "no-store, no-cache, must-revalidate",
                },
            },
        );
    } catch (error) {
        const message = getErrorMessage(error, "Unknown catalog mutation error");
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}

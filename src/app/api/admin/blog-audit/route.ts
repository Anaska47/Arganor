import { NextRequest, NextResponse } from "next/server";

import { isAuthorizedRequest, unauthorizedJson } from "@/lib/api-auth";
import { getBlogAuditReport } from "@/lib/blog-audit";
import { getErrorMessage } from "@/lib/error-format";

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
        const includeHealthy = searchParams.get("includeHealthy") === "true";
        const report = await getBlogAuditReport({ includeHealthy, limit });

        return NextResponse.json(
            {
                success: true,
                summary: report.summary,
                items: report.items,
            },
            {
                headers: {
                    "Cache-Control": "no-store, no-cache, must-revalidate",
                },
            },
        );
    } catch (error) {
        const message = getErrorMessage(error, "Unknown blog audit error");
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}

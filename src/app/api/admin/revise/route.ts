import { NextRequest, NextResponse } from "next/server";

import { isAuthorizedRequest, unauthorizedJson } from "@/lib/api-auth";
import { reviseNeedsRevisionDrafts, reviseQueueItem } from "@/lib/growth-machine/revise";
import { getContentQueueItem, listContentQueue } from "@/lib/growth-machine/store";

function parseLimit(value: string | null): number | undefined {
    if (!value) {
        return undefined;
    }

    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : undefined;
}

type RevisePostBody = {
    queueId?: string;
    limit?: number;
};

function hasNeedsRevisionReview(item: Awaited<ReturnType<typeof getContentQueueItem>>) {
    if (!item || String(item.kind) !== "post") {
        return false;
    }

    if (!item.payload || typeof item.payload !== "object" || Array.isArray(item.payload)) {
        return false;
    }

    const payload = item.payload as Record<string, unknown>;
    const review = payload.review;
    if (!review || typeof review !== "object" || Array.isArray(review)) {
        return false;
    }

    return (review as { verdict?: string }).verdict === "needs_revision" && Boolean(payload.contentDraft);
}

export async function GET(req: NextRequest) {
    if (!isAuthorizedRequest(req)) {
        return unauthorizedJson();
    }

    try {
        const { searchParams } = new URL(req.url);
        const queueId = searchParams.get("queueId");

        if (queueId) {
            const item = await getContentQueueItem(queueId);
            return NextResponse.json({ success: true, item });
        }

        const limit = parseLimit(searchParams.get("limit")) ?? 10;
        const items = await listContentQueue({
            status: "draft",
            limit,
        });

        const revisableItems = items.filter((item) => hasNeedsRevisionReview(item));

        return NextResponse.json({
            success: true,
            count: revisableItems.length,
            items: revisableItems,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown revision error";
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    if (!isAuthorizedRequest(req)) {
        return unauthorizedJson();
    }

    try {
        const body = (await req.json()) as RevisePostBody;

        if (body.queueId) {
            const result = await reviseQueueItem(body.queueId);
            return NextResponse.json({
                success: true,
                result,
                message: result ? "Revision ciblee terminee." : "Aucune revision relancee pour cet item.",
            });
        }

        const limit = body.limit ?? 3;
        const results = await reviseNeedsRevisionDrafts(limit);

        return NextResponse.json({
            success: true,
            count: results.length,
            results,
            message: `${results.length} draft(s) needs_revision relances.`,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown revision error";
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}

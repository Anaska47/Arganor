import { NextRequest, NextResponse } from "next/server";

import { isAuthorizedRequest, unauthorizedJson } from "@/lib/api-auth";
import { prepareContentDraftForQueueItem, prepareContentDrafts } from "@/lib/growth-machine/content-runner";
import { getContentQueueItem, listContentQueue } from "@/lib/growth-machine/store";

function parseLimit(value: string | null): number | undefined {
    if (!value) {
        return undefined;
    }

    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : undefined;
}

type ContentDraftPostBody = {
    queueId?: string;
    limit?: number;
};

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

        const contentDrafts = items.filter((item) => {
            if (String(item.kind) !== "post") {
                return false;
            }

            if (!item.payload || typeof item.payload !== "object" || Array.isArray(item.payload)) {
                return false;
            }

            return Boolean((item.payload as Record<string, unknown>).contentDraft);
        });

        return NextResponse.json({
            success: true,
            count: contentDrafts.length,
            items: contentDrafts,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown content draft error";
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    if (!isAuthorizedRequest(req)) {
        return unauthorizedJson();
    }

    try {
        const body = (await req.json()) as ContentDraftPostBody;

        if (body.queueId) {
            const result = await prepareContentDraftForQueueItem(body.queueId);
            return NextResponse.json({
                success: true,
                result,
            });
        }

        const limit = body.limit ?? 3;
        const results = await prepareContentDrafts(limit);

        return NextResponse.json({
            success: true,
            count: results.length,
            results,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown content draft error";
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}

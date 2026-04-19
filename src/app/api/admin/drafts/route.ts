import { NextRequest, NextResponse } from "next/server";

import { isAuthorizedRequest, unauthorizedJson } from "@/lib/api-auth";
import { prepareDraftForQueueItem, prepareDrafts } from "@/lib/growth-machine/drafts";
import { getContentQueueItem, listContentQueue } from "@/lib/growth-machine/store";

function parseLimit(value: string | null): number | undefined {
    if (!value) {
        return undefined;
    }

    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : undefined;
}

type DraftPostBody = {
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

        const postDrafts = items.filter((item) => String(item.kind) === "post");

        return NextResponse.json({
            success: true,
            count: postDrafts.length,
            items: postDrafts,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown draft error";
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    if (!isAuthorizedRequest(req)) {
        return unauthorizedJson();
    }

    try {
        const body = (await req.json()) as DraftPostBody;

        if (body.queueId) {
            const result = await prepareDraftForQueueItem(body.queueId);
            return NextResponse.json({
                success: true,
                result,
            });
        }

        const limit = body.limit ?? 3;
        const results = await prepareDrafts(limit);

        return NextResponse.json({
            success: true,
            count: results.length,
            results,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown draft error";
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}

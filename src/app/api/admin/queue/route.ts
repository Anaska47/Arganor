import { NextRequest, NextResponse } from "next/server";

import { isAuthorizedRequest, unauthorizedJson } from "@/lib/api-auth";
import { getErrorMessage } from "@/lib/error-format";
import { enqueueContent, getContentQueueItem, listContentQueue, updateContentQueue } from "@/lib/growth-machine/store";
import type { ContentQueueInsert, ContentQueueRow } from "@/lib/growth-machine/store";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function parseLimit(value: string | null): number | undefined {
    if (!value) {
        return undefined;
    }

    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : undefined;
}

type QueuePostBody = {
    kind?: ContentQueueRow["kind"];
    status?: ContentQueueRow["status"];
    priority?: number;
    title?: string | null;
    topic?: string | null;
    intent?: string | null;
    productRef?: string | null;
    postRef?: string | null;
    clusterRef?: string | null;
    payload?: ContentQueueRow["payload"];
    decisionReason?: string | null;
    scheduledFor?: string | null;
};

type QueuePatchBody = {
    queueId?: string;
    status?: ContentQueueRow["status"];
    title?: string | null;
    topic?: string | null;
    intent?: string | null;
    productRef?: string | null;
    postRef?: string | null;
    clusterRef?: string | null;
    payload?: ContentQueueRow["payload"];
    decisionReason?: string | null;
    scheduledFor?: string | null;
    processedAt?: string | null;
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
            return NextResponse.json(
                {
                    success: true,
                    item,
                },
                {
                    headers: {
                        "Cache-Control": "no-store, no-cache, must-revalidate",
                    },
                },
            );
        }

        const status = searchParams.get("status") || undefined;
        const clusterRef = searchParams.get("clusterRef") || undefined;
        const limit = parseLimit(searchParams.get("limit"));

        const items = await listContentQueue({
            status: status as ContentQueueRow["status"] | undefined,
            clusterRef,
            limit,
        });

        return NextResponse.json(
            {
                success: true,
                count: items.length,
                items,
            },
            {
                headers: {
                    "Cache-Control": "no-store, no-cache, must-revalidate",
                },
            },
        );
    } catch (error) {
        const message = getErrorMessage(error, "Unknown queue error");
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    if (!isAuthorizedRequest(req)) {
        return unauthorizedJson();
    }

    try {
        const body = (await req.json()) as QueuePostBody;
        const record: ContentQueueInsert = {
            kind: body.kind,
            status: body.status,
            priority: body.priority,
            title: body.title,
            topic: body.topic,
            intent: body.intent,
            product_ref: body.productRef,
            post_ref: body.postRef,
            cluster_ref: body.clusterRef,
            payload: body.payload,
            decision_reason: body.decisionReason,
            scheduled_for: body.scheduledFor,
        };

        const item = await enqueueContent(record);

        return NextResponse.json({
            success: true,
            item,
        });
    } catch (error) {
        const message = getErrorMessage(error, "Unknown queue error");
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    if (!isAuthorizedRequest(req)) {
        return unauthorizedJson();
    }

    try {
        const body = (await req.json()) as QueuePatchBody;

        if (!body.queueId) {
            return NextResponse.json(
                { success: false, error: "queueId is required for queue updates." },
                { status: 400 },
            );
        }

        const patch: Partial<ContentQueueInsert> = {};

        if (body.status !== undefined) patch.status = body.status;
        if (body.title !== undefined) patch.title = body.title;
        if (body.topic !== undefined) patch.topic = body.topic;
        if (body.intent !== undefined) patch.intent = body.intent;
        if (body.productRef !== undefined) patch.product_ref = body.productRef;
        if (body.postRef !== undefined) patch.post_ref = body.postRef;
        if (body.clusterRef !== undefined) patch.cluster_ref = body.clusterRef;
        if (body.payload !== undefined) patch.payload = body.payload;
        if (body.decisionReason !== undefined) patch.decision_reason = body.decisionReason;
        if (body.scheduledFor !== undefined) patch.scheduled_for = body.scheduledFor;
        if (body.processedAt !== undefined) patch.processed_at = body.processedAt;

        const item = await updateContentQueue(body.queueId, patch);

        return NextResponse.json(
            {
                success: true,
                item,
            },
            {
                headers: {
                    "Cache-Control": "no-store, no-cache, must-revalidate",
                },
            },
        );
    } catch (error) {
        const message = getErrorMessage(error, "Unknown queue update error");
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}

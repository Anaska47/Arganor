import { NextRequest, NextResponse } from "next/server";

import { isAuthorizedRequest, unauthorizedJson } from "@/lib/api-auth";
import { previewPromotion, promoteQueueItem } from "@/lib/growth-machine/promote";

type PromotePostBody = {
    queueId?: string;
    confirmWrite?: boolean;
};

export async function GET(req: NextRequest) {
    if (!isAuthorizedRequest(req)) {
        return unauthorizedJson();
    }

    try {
        const { searchParams } = new URL(req.url);
        const queueId = searchParams.get("queueId");

        if (!queueId) {
            return NextResponse.json(
                { success: false, error: "queueId is required for promotion preview." },
                { status: 400 },
            );
        }

        const preview = await previewPromotion(queueId);

        return NextResponse.json({
            success: true,
            preview,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown promotion preview error";
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    if (!isAuthorizedRequest(req)) {
        return unauthorizedJson();
    }

    try {
        const body = (await req.json()) as PromotePostBody;

        if (!body.queueId) {
            return NextResponse.json(
                { success: false, error: "queueId is required for promotion." },
                { status: 400 },
            );
        }

        if (!body.confirmWrite) {
            const preview = await previewPromotion(body.queueId);
            return NextResponse.json({
                success: true,
                confirmed: false,
                preview,
                message: "Promotion preview generated. Set confirmWrite=true to persist the promoted post into the runtime content store.",
            });
        }

        const result = await promoteQueueItem(body.queueId);

        return NextResponse.json({
            success: true,
            confirmed: true,
            result,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown promotion error";
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}

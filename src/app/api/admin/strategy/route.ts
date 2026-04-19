import { NextRequest, NextResponse } from "next/server";

import { isAuthorizedRequest, unauthorizedJson } from "@/lib/api-auth";
import { enqueueStrategyBriefs, generateStrategyBriefs } from "@/lib/growth-machine/strategy";

function parseLimit(value: string | null): number | undefined {
    if (!value) {
        return undefined;
    }

    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : undefined;
}

type StrategyPostBody = {
    limit?: number;
};

export async function GET(req: NextRequest) {
    if (!isAuthorizedRequest(req)) {
        return unauthorizedJson();
    }

    try {
        const { searchParams } = new URL(req.url);
        const limit = parseLimit(searchParams.get("limit")) ?? 3;
        const result = await generateStrategyBriefs(limit);

        return NextResponse.json({
            success: true,
            prompt: result.prompt,
            briefs: result.briefs,
            count: result.briefs.length,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown strategy error";
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    if (!isAuthorizedRequest(req)) {
        return unauthorizedJson();
    }

    try {
        const body = (await req.json()) as StrategyPostBody;
        const limit = body.limit ?? 3;
        const result = await enqueueStrategyBriefs(limit);

        return NextResponse.json({
            success: true,
            prompt: result.prompt,
            briefs: result.briefs,
            queueItems: result.queueItems,
            count: result.queueItems.length,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown strategy error";
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}

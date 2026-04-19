import { NextRequest, NextResponse } from "next/server";

import { isAuthorizedRequest, unauthorizedJson } from "@/lib/api-auth";
import { getAgentMemory, listAgentMemory, upsertAgentMemory } from "@/lib/growth-machine/store";
import type { AgentMemoryInsert, AgentMemoryRow } from "@/lib/growth-machine/store";

function parseLimit(value: string | null): number | undefined {
    if (!value) {
        return undefined;
    }

    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : undefined;
}

type MemoryPostBody = {
    memoryKey: string;
    memoryType?: AgentMemoryRow["memory_type"];
    scopeRef?: string | null;
    productRef?: string | null;
    postRef?: string | null;
    clusterRef?: string | null;
    summary?: string | null;
    source?: string | null;
    confidence?: number | null;
    value?: AgentMemoryRow["value"];
    lastSeenAt?: string | null;
};

export async function GET(req: NextRequest) {
    if (!isAuthorizedRequest(req)) {
        return unauthorizedJson();
    }

    try {
        const { searchParams } = new URL(req.url);
        const memoryKey = searchParams.get("memoryKey");

        if (memoryKey) {
            const item = await getAgentMemory(memoryKey);
            return NextResponse.json({ success: true, item });
        }

        const prefix = searchParams.get("prefix") || undefined;
        const clusterRef = searchParams.get("clusterRef") || undefined;
        const limit = parseLimit(searchParams.get("limit"));

        const items = await listAgentMemory({
            prefix: prefix as "product" | "post" | "cluster" | "hook" | undefined,
            clusterRef,
            limit,
        });

        return NextResponse.json({
            success: true,
            count: items.length,
            items,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown memory error";
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    if (!isAuthorizedRequest(req)) {
        return unauthorizedJson();
    }

    try {
        const body = (await req.json()) as MemoryPostBody;
        const record: AgentMemoryInsert = {
            memory_key: body.memoryKey,
            memory_type: body.memoryType,
            scope_ref: body.scopeRef,
            product_ref: body.productRef,
            post_ref: body.postRef,
            cluster_ref: body.clusterRef,
            summary: body.summary,
            source: body.source,
            confidence: body.confidence,
            value: body.value,
            last_seen_at: body.lastSeenAt,
        };

        const item = await upsertAgentMemory(record);

        return NextResponse.json({
            success: true,
            item,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown memory error";
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}

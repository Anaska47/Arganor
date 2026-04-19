import { NextRequest, NextResponse } from "next/server";

import { isAuthorizedRequest, unauthorizedJson } from "@/lib/api-auth";
import { getErrorMessage } from "@/lib/error-format";
import { getAutopilotRun, listAutopilotRuns } from "@/lib/growth-machine/store";
import type { AutopilotRunRow } from "@/lib/growth-machine/store";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function parseLimit(value: string | null): number | undefined {
    if (!value) {
        return undefined;
    }

    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : undefined;
}

export async function GET(req: NextRequest) {
    if (!isAuthorizedRequest(req)) {
        return unauthorizedJson();
    }

    try {
        const { searchParams } = new URL(req.url);
        const runId = searchParams.get("runId");

        if (runId) {
            const item = await getAutopilotRun(runId);

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
        const limit = parseLimit(searchParams.get("limit"));
        const items = await listAutopilotRuns({
            status: status as AutopilotRunRow["status"] | undefined,
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
        const message = getErrorMessage(error, "Unknown autopilot run error");
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}

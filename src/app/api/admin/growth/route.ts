import { NextRequest, NextResponse } from "next/server";

import { isAuthorizedRequest, unauthorizedJson } from "@/lib/api-auth";
import { getErrorMessage } from "@/lib/error-format";
import { getGrowthAiStatus } from "@/lib/growth-machine/ai";
import { runGrowthCycle } from "@/lib/growth-machine/orchestrator";
import { getGrowthMachineOverview } from "@/lib/growth-machine/store";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type GrowthPostBody = {
    seedPrompts?: boolean;
    limit?: number;
    promoteApproved?: boolean;
    promoteLimit?: number;
};

export async function GET(req: NextRequest) {
    if (!isAuthorizedRequest(req)) {
        return unauthorizedJson();
    }

    try {
        const overview = await getGrowthMachineOverview();
        const ai = getGrowthAiStatus();

        return NextResponse.json(
            {
                success: true,
                overview,
                ai,
            },
            {
                headers: {
                    "Cache-Control": "no-store, no-cache, must-revalidate",
                },
            },
        );
    } catch (error) {
        const message = getErrorMessage(error, "Unknown growth overview error");
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    if (!isAuthorizedRequest(req)) {
        return unauthorizedJson();
    }

    try {
        const body = (await req.json()) as GrowthPostBody;
        const result = await runGrowthCycle({
            seedPrompts: body.seedPrompts,
            limit: body.limit,
            promoteApproved: body.promoteApproved,
            promoteLimit: body.promoteLimit,
        });
        const overview = await getGrowthMachineOverview();
        const ai = getGrowthAiStatus();

        return NextResponse.json({
            success: true,
            result,
            overview,
            ai,
            message: `Cycle Growth Machine termine: ${result.briefCount} briefs, ${result.contentDraftCount} content drafts, ${result.reviewCount} reviews.`,
        });
    } catch (error) {
        const message = getErrorMessage(error, "Unknown growth cycle error");
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}

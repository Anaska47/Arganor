import { NextRequest, NextResponse } from "next/server";

import { recordPageVisit, readClicksDataAsync, writeClicksDataAsync } from "@/lib/click-tracking";
import {
    ATTRIBUTION_COOKIE_NAME,
    normalizeAttributionSnapshot,
    normalizeTrackingPath,
    parseAttributionCookie,
} from "@/lib/traffic-attribution";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function asObject(value: unknown) {
    return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export async function POST(req: NextRequest) {
    let payload: Record<string, unknown> = {};

    try {
        payload = asObject(await req.json());
    } catch {
        payload = {};
    }

    const now = new Date().toISOString();
    const cookieAttribution = parseAttributionCookie(req.cookies.get(ATTRIBUTION_COOKIE_NAME)?.value || null);
    const providedAttribution = asObject(payload.attribution);
    const path = normalizeTrackingPath(typeof payload.path === "string" ? payload.path : "/");
    const pageType = typeof payload.pageType === "string" && payload.pageType.trim() ? payload.pageType.trim() : "other";

    const attribution = normalizeAttributionSnapshot({
        ...cookieAttribution,
        ...providedAttribution,
        landingPath: path,
        sessionId:
            (typeof payload.sessionId === "string" && payload.sessionId.trim()) ||
            (typeof providedAttribution.sessionId === "string" && providedAttribution.sessionId.trim()) ||
            cookieAttribution?.sessionId ||
            null,
        firstSeenAt:
            (typeof providedAttribution.firstSeenAt === "string" && providedAttribution.firstSeenAt.trim()) ||
            cookieAttribution?.firstSeenAt ||
            now,
        lastSeenAt: now,
    });

    try {
        const data = await readClicksDataAsync();
        await writeClicksDataAsync(
            recordPageVisit(data, {
                path,
                pageType,
                source: attribution.source,
                channel: attribution.channel,
                campaign: attribution.campaign,
                sessionId: attribution.sessionId,
                time: now,
            }),
        );
    } catch (error) {
        console.error("Save page visit failed", error);
    }

    return NextResponse.json(
        { success: true },
        {
            headers: {
                "cache-control": "no-store",
            },
        },
    );
}

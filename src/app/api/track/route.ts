import { NextRequest, NextResponse } from "next/server";

import { getAffiliateLink, getAmazonSearchLink } from "@/lib/affiliate";
import { recordAffiliateClick, readClicksDataAsync, repairTrackedText, writeClicksDataAsync } from "@/lib/click-tracking";
import { getProductById } from "@/lib/data";
import {
    ATTRIBUTION_COOKIE_NAME,
    detectAttributionChannel,
    parseAttributionCookie,
} from "@/lib/traffic-attribution";

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get("id");
    const searchQuery = (searchParams.get("q") || searchParams.get("query") || "").trim();
    const placement = searchParams.get("s") || "direct";
    const cookieAttribution = parseAttributionCookie(req.cookies.get(ATTRIBUTION_COOKIE_NAME)?.value || null);
    const source =
        (searchParams.get("src") || searchParams.get("source") || "").trim() ||
        cookieAttribution?.source ||
        "direct";
    const channel =
        (searchParams.get("channel") || "").trim() ||
        cookieAttribution?.channel ||
        detectAttributionChannel(source, null, null);
    const campaign =
        (searchParams.get("campaign") || "").trim() ||
        cookieAttribution?.campaign ||
        null;
    const pagePath = (searchParams.get("page") || "").trim() || cookieAttribution?.landingPath || null;
    const sessionId = (searchParams.get("session") || "").trim() || cookieAttribution?.sessionId || null;

    const product = productId ? getProductById(productId) : undefined;
    if (!product && !searchQuery) {
        return NextResponse.redirect(new URL("/", req.url));
    }

    const data = await readClicksDataAsync();
    const trackedTargetId = product?.id || `search:${searchQuery.toLowerCase()}`;
    const trackedProductName = repairTrackedText(product?.name || searchQuery);

    const nextData = recordAffiliateClick(data, {
        productId: trackedTargetId,
        productName: trackedProductName,
        source,
        placement,
        channel,
        campaign,
        pagePath,
        sessionId,
        time: new Date().toISOString(),
    });

    try {
        await writeClicksDataAsync(nextData);
    } catch (error) {
        console.error("Save click failed", error);
    }

    const amazonLink = product
        ? getAffiliateLink(product, "fr")
        : getAmazonSearchLink(searchQuery, "fr");

    return NextResponse.redirect(amazonLink);
}

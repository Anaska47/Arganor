import { NextRequest, NextResponse } from "next/server";

import { getAffiliateLink, getAmazonSearchLink } from "@/lib/affiliate";
import { readClicksDataAsync, repairTrackedText, writeClicksDataAsync } from "@/lib/click-tracking";
import { getProductById } from "@/lib/data";

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get("id");
    const searchQuery = (searchParams.get("q") || searchParams.get("query") || "").trim();
    const source = searchParams.get("s") || "direct";

    const product = productId ? getProductById(productId) : undefined;
    if (!product && !searchQuery) {
        return NextResponse.redirect(new URL("/", req.url));
    }

    const data = await readClicksDataAsync();
    const trackedTargetId = product?.id || `search:${searchQuery.toLowerCase()}`;
    const trackedProductName = repairTrackedText(product?.name || searchQuery);

    data.totalClicks = (data.totalClicks || 0) + 1;
    if (!data.productClicks[trackedTargetId]) data.productClicks[trackedTargetId] = 0;
    data.productClicks[trackedTargetId]++;

    data.recentClicks.unshift({
        productId: trackedTargetId,
        productName: trackedProductName,
        source,
        time: new Date().toISOString(),
    });
    data.recentClicks = data.recentClicks.slice(0, 50);

    try {
        await writeClicksDataAsync(data);
    } catch (error) {
        console.error("Save click failed", error);
    }

    const amazonLink = product
        ? getAffiliateLink(product, "fr")
        : getAmazonSearchLink(searchQuery, "fr");

    return NextResponse.redirect(amazonLink);
}

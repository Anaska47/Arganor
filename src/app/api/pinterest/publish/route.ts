import { NextRequest, NextResponse } from "next/server";
import { getProducts, getProductById } from "@/lib/data";
import { buildPinData, buildMakeWebhookPayload } from "@/lib/pinterest";
import { getSiteUrl } from "@/lib/site";
import { isAuthorizedRequest, unauthorizedJson } from "@/lib/api-auth";

const MAKE_WEBHOOK = (process.env.PINTEREST_WEBHOOK || "").trim();

async function sendToMake(payload: object): Promise<{ ok: boolean; status: number; text: string }> {
    if (!MAKE_WEBHOOK) {
        return { ok: false, status: 503, text: "PINTEREST_WEBHOOK is not configured." };
    }

    try {
        const res = await fetch(MAKE_WEBHOOK, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        const text = await res.text();
        return { ok: res.ok, status: res.status, text };
    } catch (err) {
        return { ok: false, status: 500, text: String(err) };
    }
}

// POST /api/pinterest/publish?productId=xxx   → publish 1 specific product
// POST /api/pinterest/publish?batch=5         → publish top-5 products (daily automation)
export async function POST(req: NextRequest) {
    if (!isAuthorizedRequest(req)) {
        return unauthorizedJson();
    }

    const { searchParams } = new URL(req.url);
    const productId = searchParams.get("productId");
    const batchSize = parseInt(searchParams.get("batch") || "0");
    
    const baseUrl = getSiteUrl();

    // ── Single product publish ──────────────────────────────────
    if (productId) {
        const product = getProductById(productId);
        if (!product) {
            return NextResponse.json({ error: "Product not found" }, { status: 404 });
        }
        const pin = buildPinData(product, baseUrl);
        const payload = buildMakeWebhookPayload(pin);
        const result = await sendToMake(payload);

        return NextResponse.json({
            success: result.ok,
            productId,
            productName: product.name,
            pinTitle: pin.title,
            makeResponse: result.text,
            imageUrl: pin.imageUrl,
        }, { status: result.ok ? 200 : 502 });
    }

    // ── Batch publish (daily cron) ──────────────────────────────
    if (batchSize > 0) {
        const products = getProducts()
            .sort((a, b) => b.reviews - a.reviews)
            .slice(0, Math.min(batchSize, 10)); // max 10 per batch

        const results = [];
        for (const product of products) {
            const pin = buildPinData(product, baseUrl);
            const payload = buildMakeWebhookPayload(pin);
            const result = await sendToMake(payload);
            results.push({
                productId: product.id,
                productName: product.name,
                success: result.ok,
                makeResponse: result.text,
            });
            // Small delay between requests to avoid rate limits
            await new Promise(r => setTimeout(r, 500));
        }

        const successCount = results.filter(r => r.success).length;
        return NextResponse.json({
            success: successCount === results.length,
            sent: successCount,
            total: results.length,
            results,
        });
    }

    return NextResponse.json({ error: "Provide ?productId=xxx or ?batch=N" }, { status: 400 });
}

// GET /api/pinterest/publish → Quick status check
export async function GET(req: NextRequest) {
    if (!isAuthorizedRequest(req)) {
        return unauthorizedJson();
    }
    return NextResponse.json({
        webhook: MAKE_WEBHOOK ? MAKE_WEBHOOK.replace(/\/[^/]+$/, "/***") : null,
        status: "ready",
        webhookConfigured: !!MAKE_WEBHOOK,
        usage: {
            single: "POST /api/pinterest/publish?productId=real-1000",
            batch: "POST /api/pinterest/publish?batch=5",
            withKey: "POST /api/pinterest/publish?batch=5&key=YOUR_KEY",
        },
    });
}

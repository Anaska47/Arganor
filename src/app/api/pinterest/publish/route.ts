import { NextRequest, NextResponse } from "next/server";
import { getProducts, getProductById } from "@/lib/data";
import { buildPinData, buildMakeWebhookPayload } from "@/lib/pinterest";

const MAKE_WEBHOOK = process.env.PINTEREST_WEBHOOK || "https://hook.eu2.make.com/f7uev8liex6gs2o9klx082s6muyq1dtl";
const API_KEY = process.env.ARGANOR_API_KEY || "";

function isAuthorized(req: NextRequest): boolean {
    // Accept via Authorization header ("Bearer XXX" or raw key)
    const authHeader = req.headers.get("authorization") || "";
    const headerKey = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (API_KEY && headerKey === API_KEY) return true;

    // Accept via x-api-key header
    const xKey = req.headers.get("x-api-key") || "";
    if (API_KEY && xKey === API_KEY) return true;

    // Accept via ?key= query param (for easy cron testing)
    const queryKey = new URL(req.url).searchParams.get("key") || "";
    if (API_KEY && queryKey === API_KEY) return true;

    // If no API_KEY is set (dev mode), allow all
    if (!API_KEY) return true;

    return false;
}


async function sendToMake(payload: object): Promise<{ ok: boolean; status: number; text: string }> {
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
    if (!isAuthorized(req)) {
        return NextResponse.json({ error: "Unauthorized. Provide a valid API key." }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const productId = searchParams.get("productId");
    const batchSize = parseInt(searchParams.get("batch") || "0");
    
    // Force production URL for Pinterest (never use VERCEL_URL because it might point to a protected preview branch causing SSO login issues)
    const baseUrl = "https://arganor.vercel.app";

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
    if (!isAuthorized(req)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({
        webhook: MAKE_WEBHOOK.replace(/\/[^/]+$/, "/***"),
        status: "ready",
        apiKeyConfigured: !!API_KEY,
        usage: {
            single: "POST /api/pinterest/publish?productId=real-1000",
            batch: "POST /api/pinterest/publish?batch=5",
            withKey: "POST /api/pinterest/publish?batch=5&key=YOUR_KEY",
        },
    });
}

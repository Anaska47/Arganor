import { NextRequest, NextResponse } from "next/server";
import fs from 'fs';
import path from 'path';
import { getProductById } from "@/lib/data";

const CLICKS_PATH = path.join(process.cwd(), 'src/data/clicks.json');

function getClicks() {
    try {
        if (!fs.existsSync(CLICKS_PATH)) return { totalClicks: 0, productClicks: {}, recentClicks: [] };
        return JSON.parse(fs.readFileSync(CLICKS_PATH, 'utf8'));
    } catch (e) {
        return { totalClicks: 0, productClicks: {}, recentClicks: [] };
    }
}

function saveClicks(data: any) {
    try {
        fs.writeFileSync(CLICKS_PATH, JSON.stringify(data, null, 2));
    } catch (e) {
        console.error("Save click failed", e);
    }
}

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get("id");
    const source = searchParams.get("s") || "direct"; // p=pinterest, b=blog, s=search

    if (!productId) return NextResponse.redirect(new URL('/', req.url));

    const product = getProductById(productId);
    if (!product) return NextResponse.redirect(new URL('/', req.url));

    // ── Update Tracking Data ─────────────────────────────────
    const data = getClicks();
    data.totalClicks = (data.totalClicks || 0) + 1;
    
    if (!data.productClicks[productId]) data.productClicks[productId] = 0;
    data.productClicks[productId]++;

    // Log recent activity (keep last 50)
    data.recentClicks.unshift({
        productId,
        productName: product.name,
        source,
        time: new Date().toISOString()
    });
    data.recentClicks = data.recentClicks.slice(0, 50);

    saveClicks(data);

    // ── Build Affiliate Link ─────────────────────────────────
    // Fallback if no ASIN/link in data
    const amazonLink = `https://www.amazon.fr/dp/${product.asin || 'B00K5H0RX0'}?tag=arganor-21`;
    
    // REDIRECT to Amazon immediately!
    return NextResponse.redirect(amazonLink);
}

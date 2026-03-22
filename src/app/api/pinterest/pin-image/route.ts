import { NextRequest, NextResponse } from "next/server";
import { getProductById } from "@/lib/data";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import React from "react";

// Satori uses React-like syntax to generate SVG, then Resvg converts to PNG
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get("productId");

    if (!productId) return NextResponse.json({ error: "No productId" }, { status: 400 });

    const product = getProductById(productId);
    if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

    // ── Generate SVG using Satori ──────────────────────────────
    // Using inline styles for Satori
    const svg = await satori(
        (
            <div style={{
                width: 1000, height: 1500, display: 'flex', flexDirection: 'column',
                background: 'linear-gradient(to bottom right, #1a0e05, #2d1a08)',
                fontFamily: 'sans-serif', position: 'relative', borderTop: '6px solid #f0c060'
            }}>
                {/* Product Image (Satori doesn't render real images easily without pre-fetching, 
                    so we use a stylish placeholder or the user can map the raw product image in Pinterest module) */}
                <div style={{ width: '100%', height: 800, background: '#222', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <img src={product.image} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.8 }} />
                </div>

                <div style={{ padding: 60, display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <div style={{ display: 'flex', gap: 12, marginBottom: 30 }}>
                        <span style={{ background: '#f9e8d0', color: '#7a5020', padding: '8px 20px', borderRadius: 30, fontSize: 24, fontWeight: 'bold' }}>
                            {product.category}
                        </span>
                        <span style={{ border: '1px solid rgba(240,192,96,0.4)', color: '#f0c060', padding: '8px 20px', borderRadius: 30, fontSize: 24 }}>
                            {product.brand}
                        </span>
                    </div>

                    <h1 style={{ fontSize: 56, color: '#fff', margin: '0 0 20px 0', lineHeight: 1.1 }}>
                        {product.name.slice(0, 60)}{product.name.length > 60 ? '...' : ''}
                    </h1>

                    <div style={{ fontSize: 40, color: '#f0c060', marginBottom: 40 }}>
                        {'★'.repeat(Math.round(product.rating))} <span style={{ color: '#c9973a', fontSize: 28 }}>{product.rating}/5</span>
                    </div>

                    <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <div style={{ color: '#c9973a', fontSize: 24 }}>À partir de</div>
                            <div style={{ color: '#f0c060', fontSize: 80, fontWeight: 'bold' }}>{product.price}€</div>
                        </div>
                        <div style={{ background: '#f0c060', color: '#1a0e05', padding: '24px 44px', borderRadius: 60, fontSize: 32, fontWeight: 'bold' }}>
                            Voir sur Amazon →
                        </div>
                    </div>
                </div>

                {/* Footer logo */}
                <div style={{ position: 'absolute', bottom: 30, left: 60, right: 60, display: 'flex', justifyContent: 'space-between', opacity: 0.6 }}>
                    <div style={{ color: '#f0c060', fontSize: 28, fontWeight: 'bold', letterSpacing: 4 }}>ARGANOR</div>
                    <div style={{ color: '#c9973a', fontSize: 20 }}>arganor.vercel.app</div>
                </div>
            </div>
        ) as any,
        {
            width: 1000,
            height: 1500,
            // Simple system font fallback to avoid complex font loading issues
            fonts: [
                {
                    name: 'Inter',
                    data: Buffer.alloc(0), // Placeholder (will use system default if empty)
                    weight: 400,
                    style: 'normal',
                },
            ],
        }
    );

    // ── Convert SVG to PNG ─────────────────────────────────────
    const resvg = new Resvg(svg, { background: '#1a0e05' });
    const pngData = resvg.render();
    const pngBuffer = pngData.asPng();

    return new NextResponse(pngBuffer, {
        headers: {
            "Content-Type": "image/png",
            "Cache-Control": "public, max-age=3600",
        },
    });
}

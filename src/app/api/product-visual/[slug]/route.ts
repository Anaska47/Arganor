import { NextRequest } from "next/server";

import { getProductBySlug } from "@/lib/data";
import { buildProductEvidence } from "@/lib/growth-machine/product-evidence";
import { resolveProductTaxonomy } from "@/lib/growth-machine/taxonomy";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function escapeXml(value: string): string {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

function truncate(value: string, maxLength: number): string {
    if (value.length <= maxLength) {
        return value;
    }

    return `${value.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
}

function toClusterLabel(clusterRef: string): string {
    return clusterRef.replace(/_/g, " ");
}

export async function GET(
    _req: NextRequest,
    context: { params: Promise<Record<string, string | string[] | undefined>> },
) {
    const params = await context.params;
    const slugParam = typeof params.slug === "string" ? params.slug : Array.isArray(params.slug) ? params.slug[0] : null;

    if (!slugParam) {
        return new Response("Bad request", { status: 400 });
    }

    const product = getProductBySlug(decodeURIComponent(slugParam));

    if (!product) {
        return new Response("Not found", { status: 404 });
    }

    const taxonomy = resolveProductTaxonomy(product);
    const evidence = buildProductEvidence(product, taxonomy);
    const title = truncate(product.name, 54);
    const clusterLabel = toClusterLabel(taxonomy.effectiveClusterRef);
    const signalLine = truncate(evidence.signals.slice(0, 4).join(" - "), 78) || clusterLabel;
    const proofLine =
        [evidence.socialProofLabel, evidence.priceLabel, product.asin ? `ASIN ${product.asin}` : ""].filter(Boolean).join(" - ") ||
        "Selection produit Arganor";

    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1600" height="900" viewBox="0 0 1600 900" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="1600" height="900" fill="#0B0B0B"/>
  <rect x="80" y="80" width="1440" height="740" rx="28" fill="#131313" stroke="#C9A24A" stroke-width="2"/>
  <rect x="108" y="108" width="240" height="52" rx="26" fill="#C9A24A"/>
  <text x="228" y="141" text-anchor="middle" font-size="28" font-family="Arial, sans-serif" font-weight="700" fill="#0B0B0B">ARGANOR</text>
  <text x="120" y="232" font-size="34" font-family="Arial, sans-serif" font-weight="700" fill="#C9A24A">${escapeXml(product.brand || "Selection Arganor")}</text>
  <text x="120" y="322" font-size="68" font-family="Georgia, serif" font-weight="700" fill="#FAF6EE">${escapeXml(title)}</text>
  <text x="120" y="392" font-size="32" font-family="Arial, sans-serif" fill="#D9D4C7">${escapeXml(signalLine)}</text>
  <rect x="120" y="452" width="420" height="96" rx="18" fill="#1D1D1D" stroke="#2E2E2E"/>
  <text x="150" y="492" font-size="26" font-family="Arial, sans-serif" font-weight="700" fill="#FAF6EE">A verifier avant achat</text>
  <text x="150" y="530" font-size="24" font-family="Arial, sans-serif" fill="#D9D4C7">${escapeXml(truncate(proofLine, 54))}</text>
  <rect x="120" y="596" width="600" height="120" rx="18" fill="#151515" stroke="#2E2E2E"/>
  <text x="150" y="642" font-size="24" font-family="Arial, sans-serif" font-weight="700" fill="#C9A24A">Pourquoi ce visuel existe</text>
  <text x="150" y="684" font-size="24" font-family="Arial, sans-serif" fill="#E7E2D7">${escapeXml(
      truncate(
          "Visuel editorial propre pour remplacer une image catalogue trop generique et garder un contexte produit plus credible.",
          94,
      ),
  )}</text>
  <rect x="1080" y="176" width="340" height="480" rx="28" fill="#F4E7C1"/>
  <rect x="1112" y="208" width="276" height="416" rx="22" fill="#FAF6EE"/>
  <rect x="1166" y="262" width="168" height="224" rx="22" fill="#C9A24A"/>
  <rect x="1198" y="220" width="104" height="58" rx="16" fill="#0B0B0B"/>
  <text x="1250" y="256" text-anchor="middle" font-size="24" font-family="Arial, sans-serif" font-weight="700" fill="#FAF6EE">${escapeXml(
      truncate(product.brand || "Brand", 10),
  )}</text>
  <text x="1250" y="548" text-anchor="middle" font-size="26" font-family="Arial, sans-serif" font-weight="700" fill="#0B0B0B">${escapeXml(
      truncate(clusterLabel.toUpperCase(), 20),
  )}</text>
  <text x="120" y="784" font-size="22" font-family="Arial, sans-serif" fill="#A8A297">Arganor Growth Machine - product visual fallback</text>
</svg>`;

    return new Response(svg, {
        headers: {
            "Content-Type": "image/svg+xml; charset=utf-8",
            "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
        },
    });
}

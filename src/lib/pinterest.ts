import type { Product } from "./data";
import { getSiteUrl } from "./site";

export interface PinData {
    imageUrl: string;
    title: string;
    description: string;
    link: string;
    hashtags: string[];
    productId: string;
    productName: string;
    generatedAt: string;
}

const HASHTAGS_BY_CATEGORY: Record<string, string[]> = {
    "Soin du Visage": ["#SoinVisage", "#BeauteNaturelle", "#HuileVisage", "#SkincareRoutine", "#PeauParfaite", "#SoinNaturel", "#Arganor"],
    "Soin des Cheveux": ["#SoinCheveux", "#HuileCheveux", "#RoutineCheveux", "#BeauxCheveux", "#HairCare", "#ChevreuxNaturels", "#Arganor"],
    "Soin du Corps": ["#SoinCorps", "#HuileMassage", "#PeauDouce", "#BeauteHolistic", "#SoinNaturel", "#BodyCare", "#Arganor"],
};

const DEFAULT_HASHTAGS = ["#BeauteNaturelle", "#SoinNaturel", "#HuileArgan", "#BeauteBio", "#Arganor"];

export function buildPinData(product: Product, baseUrl: string = getSiteUrl()): PinData {
    const productUrl = new URL(`${baseUrl}/products/${product.slug}`);
    productUrl.searchParams.set("utm_source", "pinterest");
    productUrl.searchParams.set("utm_medium", "organic");
    productUrl.searchParams.set("utm_campaign", "catalog-pins");
    productUrl.searchParams.set("utm_content", product.id);
    const cleanName = product.name.replace(/\s+\d+(ml|g|oz)\s*/gi, "").trim();
    const title = `${cleanName} | ${product.brand} | Soin naturel recommande`.slice(0, 100);
    const description = [
        `${product.name}`,
        `${product.rating}/5 - ${product.reviews.toLocaleString("fr-FR")} avis verifies`,
        "",
        getBenefit(product),
        "",
        `Disponible sur Amazon France des ${product.price} EUR`,
        "Livraison rapide | Retours gratuits",
        "",
        "Decouvre tous nos soins naturels sur arganor.vercel.app",
    ].join("\n").slice(0, 500);

    const hashtags = HASHTAGS_BY_CATEGORY[product.category] || DEFAULT_HASHTAGS;
    const productImg = product.image.startsWith("http") ? product.image : `${baseUrl}${product.image}`;

    return {
        imageUrl: productImg,
        title,
        description,
        link: productUrl.toString(),
        hashtags,
        productId: product.id,
        productName: product.name,
        generatedAt: new Date().toISOString(),
    };
}

function getBenefit(product: Product): string {
    const match = product.benefits?.match(/\*\*(.+?)\*\*[:\s]+(.+)/);
    if (match) return `Point fort: ${match[2].trim()}`;
    return `Un des reperes les plus suivis de la categorie ${product.category}`;
}

export function buildMakeWebhookPayload(pin: PinData) {
    return {
        title: pin.title,
        description: `${pin.description}\n\n${pin.hashtags.join(" ")}`,
        link: pin.link,
        imageUrl: pin.imageUrl,
        board: "Arganor - Soins Naturels",
        productId: pin.productId,
        generatedAt: pin.generatedAt,
    };
}

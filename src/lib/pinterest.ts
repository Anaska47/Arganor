import { Product } from "./data";

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
    "Soin du Visage": ["#SoinVisage", "#BeautéNaturelle", "#HuileVisage", "#SkincareRoutine", "#PeauParfaite", "#SoinNaturel", "#Arganor"],
    "Soin des Cheveux": ["#SoinCheveux", "#HuileCheveux", "#RoutineCheveux", "#BeauxCheveux", "#HairCare", "#ChevreuxNaturels", "#Arganor"],
    "Soin du Corps": ["#SoinCorps", "#HuileMassage", "#PeauDouce", "#BeautéHolistic", "#SoinNaturel", "#BodyCare", "#Arganor"],
};

const DEFAULT_HASHTAGS = ["#BeautéNaturelle", "#SoinNaturel", "#HuileArgan", "#BeautéBio", "#Arganor"];

export function buildPinData(product: Product, baseUrl: string = "https://arganor.vercel.app"): PinData {
    const productUrl = `${baseUrl}/products/${product.slug}`;
    const cleanName = product.name.replace(/\s+\d+(ml|g|oz)\s*/gi, "").trim();

    // Title: max 100 chars, optimized for Pinterest search
    const title = `✨ ${cleanName} — ${product.brand} | Soin Naturel Recommandé`.slice(0, 100);

    // Description: max 500 chars, SEO-rich, CTA fort
    const rating = "⭐".repeat(Math.round(product.rating));
    const description = [
        `💛 ${product.name}`,
        `${rating} ${product.rating}/5 — ${product.reviews.toLocaleString("fr-FR")} avis vérifiés`,
        ``,
        getBenefit(product),
        ``,
        `👉 Disponible sur Amazon France dès ${product.price}€`,
        `📦 Livraison rapide | Retours gratuits`,
        ``,
        `Découvre tous nos soins naturels sur arganor.vercel.app`,
    ].join("\n").slice(0, 500);

    const hashtags = HASHTAGS_BY_CATEGORY[product.category] || DEFAULT_HASHTAGS;

    // Using the real product image directly for Pinterest (avoiding font/svg build issues)
    const productImg = product.image.startsWith("http") ? product.image : `${baseUrl}${product.image}`;

    return {
        imageUrl: productImg,
        title,
        description,
        link: productUrl,
        hashtags,
        productId: product.id,
        productName: product.name,
        generatedAt: new Date().toISOString(),
    };
}

function getBenefit(product: Product): string {
    // Extract first bullet from benefits markdown
    const match = product.benefits.match(/\*\*(.+?)\*\*[:\s]+(.+)/);
    if (match) return `✅ ${match[2].trim()}`;
    return `✅ Un des best-sellers de la catégorie ${product.category}`;
}

export function buildMakeWebhookPayload(pin: PinData) {
    return {
        title: pin.title,
        description: `${pin.description}\n\n${pin.hashtags.join(" ")}`,
        link: pin.link,
        imageUrl: pin.imageUrl,
        board: "Arganor — Soins Naturels",
        productId: pin.productId,
        generatedAt: pin.generatedAt,
    };
}

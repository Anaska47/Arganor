import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Award, Check, Clock, Shield, ShieldCheck, Star, Truck } from "lucide-react";

import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import ProductCard from "@/components/ui/ProductCard";
import { getPublicProductBySlug, getPublicProducts } from "@/lib/data";
import { formatEuroPrice } from "@/lib/pricing";
import { toAbsoluteUrl } from "@/lib/site";

interface ProductPageProps {
    params: Promise<{ slug: string }>;
}

function renderBenefitsHtml(benefits?: string): string {
    return String(benefits || "Decouvrez un soin cible pour une routine plus claire.")
        .replace(/### (.*)/g, "<h3>$1</h3>")
        .replace(/- \*\*(.*?)\*\*:/g, "<strong>&bull; $1:</strong>")
        .replace(/\n/g, "<br />");
}

export async function generateStaticParams() {
    const products = getPublicProducts();
    return products.map((product) => ({
        slug: product.slug,
    }));
}

export async function generateMetadata({ params }: ProductPageProps) {
    const { slug } = await params;
    const decodedSlug = decodeURIComponent(slug);
    const product = getPublicProductBySlug(decodedSlug);

    if (!product) {
        return {
            title: "Produit introuvable | Arganor",
        };
    }

    return {
        title: `${product.name} | Arganor`,
        description: product.description,
        keywords: product.seoTags,
        alternates: {
            canonical: toAbsoluteUrl(`/products/${product.slug}`),
        },
        openGraph: {
            title: product.name,
            description: product.description,
            images: [product.image],
            url: toAbsoluteUrl(`/products/${product.slug}`),
        },
    };
}

export default async function ProductPage({ params }: ProductPageProps) {
    const { slug } = await params;
    const decodedSlug = decodeURIComponent(slug);
    const product = getPublicProductBySlug(decodedSlug);

    if (!product) {
        notFound();
    }
    if (decodedSlug !== product.slug) {
        redirect(`/products/${product.slug}`);
    }

    const allProducts = getPublicProducts();
    const relatedProducts = allProducts.filter((candidate) => candidate.id !== product.id && candidate.category === product.category).slice(0, 3);

    const productUrl = toAbsoluteUrl(`/products/${product.slug}`);

    return (
        <>
            <Header />
            <main>
                <div className="container product-container">
                    <div className="breadcrumbs">
                        <Link href="/">Accueil</Link> / <Link href="/products">Produits</Link> / <span>{product.name}</span>
                    </div>

                    <script
                        type="application/ld+json"
                        dangerouslySetInnerHTML={{
                            __html: JSON.stringify({
                                "@context": "https://schema.org/",
                                "@type": "Product",
                                name: product.name,
                                image: product.image,
                                description: product.description,
                                brand: {
                                    "@type": "Brand",
                                    name: product.brand,
                                },
                                offers: {
                                    "@type": "Offer",
                                    url: productUrl,
                                    priceCurrency: "EUR",
                                    price: product.price,
                                    availability: "https://schema.org/InStock",
                                    seller: {
                                        "@type": "Organization",
                                        name: "Amazon",
                                    },
                                },
                                aggregateRating: {
                                    "@type": "AggregateRating",
                                    ratingValue: product.rating,
                                    reviewCount: product.reviews,
                                },
                            }),
                        }}
                    />

                    <div className="product-layout">
                        <div className="product-gallery">
                            <div className="main-image">
                                <a
                                    href={`/api/track?id=${product.id}&s=product-image`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ display: "block", width: "100%", height: "100%" }}
                                >
                                    <img
                                        src={product.image}
                                        alt={product.name}
                                        style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "8px", cursor: "pointer" }}
                                    />
                                </a>
                            </div>
                        </div>

                        <div className="product-info">
                            <span className="product-category">{product.category}</span>
                            <h1 className="product-title">{product.name}</h1>

                            <div className="rating-row">
                                <div className="stars">
                                    <Star size={18} fill="var(--color-gold)" color="var(--color-gold)" />
                                    <Star size={18} fill="var(--color-gold)" color="var(--color-gold)" />
                                    <Star size={18} fill="var(--color-gold)" color="var(--color-gold)" />
                                    <Star size={18} fill="var(--color-gold)" color="var(--color-gold)" />
                                    <Star size={18} fill="var(--color-gold)" color="var(--color-gold)" />
                                </div>
                                <span className="rating-text">
                                    {product.rating} ({product.reviews} avis)
                                </span>
                            </div>

                            <div className="price-row">
                                <span className="price">{formatEuroPrice(product.price)}</span>
                                <span className="shipping-badge">Repere prix</span>
                            </div>

                            <div className="description">
                                <p>{product.description}</p>
                            </div>

                            <div
                                style={{
                                    background: "var(--color-light-grey)",
                                    padding: "1rem 1.2rem",
                                    borderRadius: "6px",
                                    marginBottom: "1.5rem",
                                    fontSize: "0.95rem",
                                    color: "var(--color-charcoal)",
                                }}
                            >
                                Arganor reference ce produit et vous redirige vers Amazon pour verifier le prix, la disponibilite et les conditions de livraison.
                            </div>

                            <div className="features-list">
                                <h3>Points cles</h3>
                                <ul>
                                    {product.features?.map((feature, index) => (
                                        <li key={index}>
                                            <Check size={16} color="var(--color-gold)" /> {feature}
                                        </li>
                                    )) || (
                                        <li>
                                            <Check size={16} color="var(--color-gold)" /> Routine ciblee
                                        </li>
                                    )}
                                </ul>
                            </div>

                            <div className="scarcity-alert">
                                <Clock size={20} />
                                <span>
                                    <strong>Avant de commander :</strong> verifiez le prix, la disponibilite et le delai directement sur Amazon.
                                </span>
                            </div>

                            <div className="actions">
                                <a href={`/api/track?id=${product.id}&s=buy-fr`} className="btn btn-primary buy-btn" target="_blank" rel="noopener noreferrer">
                                    Voir le prix sur Amazon
                                </a>
                                <div style={{ marginTop: "10px", fontSize: "0.85rem", color: "var(--color-grey)", textAlign: "center" }}>
                                    Amazon gere le paiement, la disponibilite et la livraison.
                                </div>
                            </div>

                            <div className="trust-badges">
                                <div className="trust-badge-item">
                                    <Truck size={22} color="var(--color-gold-dark)" />
                                    <span>Disponibilite et livraison visibles sur Amazon</span>
                                </div>
                                <div className="trust-badge-item">
                                    <Shield size={22} color="var(--color-gold-dark)" />
                                    <span>Redirection vers une fiche produit Amazon</span>
                                </div>
                                <div className="trust-badge-item">
                                    <Award size={22} color="var(--color-gold-dark)" />
                                    <span>Comparaison simple avec les avis clients</span>
                                </div>
                                <div className="trust-badge-item">
                                    <ShieldCheck size={22} color="var(--color-gold-dark)" />
                                    <span>Verification rapide du prix et du format</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <section className="section bg-cream">
                    <div className="container">
                        <h2 className="section-title">Pourquoi ce soin merite l'attention</h2>
                        <div className="benefits-content" style={{ maxWidth: "800px", margin: "0 auto", fontSize: "1.1rem", lineHeight: "1.8" }}>
                            <div dangerouslySetInnerHTML={{ __html: renderBenefitsHtml(product.benefits) }} />
                        </div>
                    </div>
                </section>

                {relatedProducts.length > 0 && (
                    <section className="section related-section">
                        <div className="container">
                            <h2 className="section-title">Vous aimerez aussi</h2>
                            <div className="product-grid">
                                {relatedProducts.map((relatedProduct) => (
                                    <ProductCard key={relatedProduct.id} product={relatedProduct} />
                                ))}
                            </div>
                        </div>
                    </section>
                )}

                <div className="mobile-sticky-buy">
                    <div className="price-info">
                        <span className="price">{formatEuroPrice(product.price)}</span>
                        <span className="rating-text">Note {product.rating}</span>
                    </div>
                    <a href={`/api/track?id=${product.id}&s=mobile-sticky`} className="btn btn-primary buy-btn" target="_blank" rel="noopener noreferrer">
                        Voir sur Amazon
                    </a>
                </div>
            </main>
            <Footer />
        </>
    );
}

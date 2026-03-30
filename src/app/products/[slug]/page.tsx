import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { getProductBySlug, getProducts } from "@/lib/data";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Star, Check, Truck, ShieldCheck, Clock, Award, Shield } from "lucide-react";
import ProductCard from "@/components/ui/ProductCard";
import { getAffiliateLink } from "@/lib/affiliate";

interface ProductPageProps {
    params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
    const products = getProducts();
    return products.map((product) => ({
        slug: product.slug,
    }));
}

export async function generateMetadata({ params }: ProductPageProps) {
    const { slug } = await params;
    const decodedSlug = decodeURIComponent(slug);
    const product = getProductBySlug(decodedSlug);

    if (!product) {
        return {
            title: "Product Not Found | Arganor",
        };
    }

    return {
        title: `${product.name} | Arganor Luxury Beauty`,
        description: product.description,
        keywords: product.seoTags,
        openGraph: {
            title: product.name,
            description: product.description,
            images: [product.image],
        },
    };
}

export default async function ProductPage({ params }: ProductPageProps) {
    const { slug } = await params;
    const decodedSlug = decodeURIComponent(slug);
    const product = getProductBySlug(decodedSlug);

    if (!product) {
        notFound();
    }

    const allProducts = getProducts();
    const relatedProducts = allProducts.filter(p => p.id !== product.id && p.category === product.category).slice(0, 3);

    return (
        <>
            <Header />
            <main>
                <div className="container product-container">
                    {/* Breadcrumbs */}
                    <div className="breadcrumbs">
                        <Link href="/">Home</Link> / <Link href="/products">Products</Link> / <span>{product.name}</span>
                    </div>

                    {/* SEO Structured Data Schema */}
                    <script
                        type="application/ld+json"
                        dangerouslySetInnerHTML={{
                            __html: JSON.stringify({
                                "@context": "https://schema.org/",
                                "@type": "Product",
                                "name": product.name,
                                "image": product.image,
                                "description": product.description,
                                "brand": {
                                    "@type": "Brand",
                                    "name": product.brand
                                },
                                "offers": {
                                    "@type": "Offer",
                                    "url": `https://arganor.com/products/${product.slug}`,
                                    "priceCurrency": "EUR",
                                    "price": product.price,
                                    "availability": "https://schema.org/InStock",
                                    "seller": {
                                        "@type": "Organization",
                                        "name": "Amazon"
                                    }
                                },
                                "aggregateRating": {
                                    "@type": "AggregateRating",
                                    "ratingValue": product.rating,
                                    "reviewCount": product.reviews
                                }
                            })
                        }}
                    />

                    <div className="product-layout">
                        {/* Image Section */}
                        <div className="product-gallery">
                            {/* Product Image Clickable to Amazon */}
                            <div className="main-image">
                                <a href={`/api/track?id=${product.id}&s=product-image`} target="_blank" rel="noopener noreferrer" style={{ display: 'block', width: '100%', height: '100%' }}>
                                    <img
                                        src={product.image}
                                        alt={product.name}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px', cursor: 'pointer' }}
                                    />
                                </a>
                            </div>
                        </div>

                        {/* Details Section */}
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
                                <span className="rating-text">{product.rating} ({product.reviews} reviews)</span>
                            </div>

                            <div className="price-row">
                                <span className="price">${product.price.toFixed(2)}</span>
                                <span className="shipping-badge">Free Premium Shipping</span>
                            </div>

                            <div className="description">
                                <p>{product.description}</p>
                            </div>

                            <div className="features-list">
                                <h3>Avantages Clés</h3>
                                <ul>
                                    {product.features?.map((feature, index) => (
                                        <li key={index}><Check size={16} color="var(--color-gold)" /> {feature}</li>
                                    )) || <li><Check size={16} color="var(--color-gold)" /> Incontournable</li>}
                                </ul>
                            </div>

                            <div className="scarcity-alert">
                                <Clock size={20} />
                                <span><strong>Forte Demande :</strong> Plus que quelques articles disponibles. Commandez vite avant rupture de stock !</span>
                            </div>

                             <div className="actions">
                                <a href={`/api/track?id=${product.id}&s=buy-fr`} className="btn btn-primary buy-btn" target="_blank" rel="noopener noreferrer">
                                   📦 Acheter au meilleur prix sur Amazon
                                </a>
                                <div style={{ marginTop: '10px', fontSize: '0.85rem', color: 'var(--color-dark-muted)', textAlign: 'center' }}>
                                    Paiement sécurisé et expédition garantie par Amazon
                                </div>
                            </div>

                            <div className="trust-badges">
                                <div className="trust-badge-item">
                                    <Truck size={22} color="var(--color-gold-dark)" />
                                    <span>Livraison Gratuite & Rapide</span>
                                </div>
                                <div className="trust-badge-item">
                                    <Shield size={22} color="var(--color-gold-dark)" />
                                    <span>Paiement 100% Sécurisé</span>
                                </div>
                                <div className="trust-badge-item">
                                    <Award size={22} color="var(--color-gold-dark)" />
                                    <span>Label de Qualité Bio</span>
                                </div>
                                <div className="trust-badge-item">
                                    <ShieldCheck size={22} color="var(--color-gold-dark)" />
                                    <span>Garantie Satisfait ou Remboursé</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Benefits Section */}
                <section className="section bg-cream">
                    <div className="container">
                        <h2 className="section-title">Why You&apos;ll Love It</h2>
                        <div className="benefits-content" style={{ maxWidth: '800px', margin: '0 auto', fontSize: '1.1rem', lineHeight: '1.8' }}>
                            {/* Simple markdown rendering */}
                            <div dangerouslySetInnerHTML={{
                                __html: (product.benefits || "Découvrez un soin d'exception.")
                                    .replace(/### (.*)/g, '<h3>$1</h3>')
                                    .replace(/- \*\*(.*?)\*\*:/g, '<strong>• $1:</strong>')
                                    .replace(/\n/g, '<br />')
                            }} />
                        </div>
                    </div>
                </section>

                {/* Related Products */}
                {relatedProducts.length > 0 && (
                    <section className="section related-section">
                        <div className="container">
                            <h2 className="section-title">Vous aimerez aussi</h2>
                            <div className="product-grid">
                                {relatedProducts.map(p => (
                                    <ProductCard key={p.id} product={p} />
                                ))}
                            </div>
                        </div>
                    </section>
                )}

                {/* Mobile Sticky Action Bar */}
                 <div className="mobile-sticky-buy">
                    <div className="price-info">
                        <span className="price">${product.price.toFixed(2)}</span>
                        <span className="rating-text">★ {product.rating}</span>
                    </div>
                    <a href={`/api/track?id=${product.id}&s=mobile-sticky`} className="btn btn-primary buy-btn" target="_blank" rel="noopener noreferrer">
                        Commander sur Amazon
                    </a>
                </div>

            </main>
            <Footer />
        </>
    );
}

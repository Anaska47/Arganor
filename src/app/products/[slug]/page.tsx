import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { getProductBySlug, getProducts } from "@/lib/data";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Star, Check, Truck, ShieldCheck } from "lucide-react";
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
    const product = getProductBySlug(slug);

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
    const product = getProductBySlug(slug);

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
                            <div className="main-image">
                                <Image
                                    src={product.image}
                                    alt={product.name}
                                    fill
                                    className="img"
                                    sizes="(max-width: 768px) 100vw, 50vw"
                                    priority
                                />
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
                                <h3>Key Features</h3>
                                <ul>
                                    {product.features.map((feature, index) => (
                                        <li key={index}><Check size={16} color="var(--color-gold)" /> {feature}</li>
                                    ))}
                                </ul>
                            </div>

                            <div className="actions">
                                <a href={getAffiliateLink(product, 'us')} className="btn btn-primary buy-btn" target="_blank" rel="noopener noreferrer">
                                    Buy on Amazon US
                                </a>
                                <div style={{ marginTop: '10px' }}>
                                    <a href={getAffiliateLink(product, 'fr')} className="btn btn-outline buy-btn" target="_blank" rel="noopener noreferrer">
                                        Acheter sur Amazon FR
                                    </a>
                                </div>
                            </div>

                            <div className="guarantees">
                                <div className="guarantee-item">
                                    <Truck size={20} />
                                    <span>Fast Delivery</span>
                                </div>
                                <div className="guarantee-item">
                                    <ShieldCheck size={20} />
                                    <span>Authenticity Guaranteed</span>
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
                                __html: product.benefits
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
                            <h2 className="section-title">You May Also Like</h2>
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
                    <a href={getAffiliateLink(product, 'fr')} className="btn btn-primary buy-btn" target="_blank" rel="noopener noreferrer">
                        Acheter 
                    </a>
                </div>

            </main>
            <Footer />
        </>
    );
}

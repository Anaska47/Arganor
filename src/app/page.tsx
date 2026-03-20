import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ProductCard from "@/components/ui/ProductCard";
import { getFeaturedProducts } from "@/lib/data";
import Link from "next/link";
import { ArrowRight, Star, ShieldCheck, Heart } from "lucide-react";

export default function Home() {
  const featuredProducts = getFeaturedProducts();

  return (
    <>
      <Header />
      <main>
        {/* Hero Section */}
        <section className="hero">
          <div className="container hero-content">
            <span className="hero-subtitle">L&apos;Héritage de l&apos;Atlas</span>
            <h1>L&apos;Arganor : L&apos;Élixir de Jeunesse Éternelle</h1>
            <p>Découvrez la puissance transformatrice de l&apos;or liquide du Maroc. Bio, durable et d&apos;un luxe absolu pour votre peau et vos cheveux.</p>
            <div className="hero-cta">
              <Link href="/products" className="btn btn-primary">Explorer la Collection</Link>
              <Link href="/blog" className="btn btn-outline">Notre Histoire</Link>
            </div>
          </div>
        </section>

        {/* Categories Section */}
        <section className="section">
          <div className="container">
            <h2 className="section-title">Inspiré par la Nature</h2>
            <div className="category-grid">
              <Link href="/category/face" className="category-card">
                <div className="category-image face"></div>
                <h3>Soin du Visage</h3>
                <span className="explore-link">Découvrir <ArrowRight size={14} /></span>
              </Link>
              <Link href="/category/hair" className="category-card">
                <div className="category-image hair"></div>
                <h3>Soin des Cheveux</h3>
                <span className="explore-link">Découvrir <ArrowRight size={14} /></span>
              </Link>
              <Link href="/category/body" className="category-card">
                <div className="category-image body"></div>
                <h3>Soin du Corps</h3>
                <span className="explore-link">Découvrir <ArrowRight size={14} /></span>
              </Link>
            </div>
          </div>
        </section>

        {/* Featured Products */}
        <section className="section bg-cream">
          <div className="container">
            <div className="section-header">
              <h2 className="section-title">Nos Best-Sellers</h2>
              <Link href="/products" className="view-all">Tout voir <ArrowRight size={16} /></Link>
            </div>
            <div className="product-grid">
              {featuredProducts.slice(0, 4).map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </section>

        {/* Brand Values */}
        <section className="section values-section">
          <div className="container values-grid">
            <div className="value-item">
              <div className="value-icon"><Star size={24} /></div>
              <h3>100% Biologique</h3>
              <p>Directement issu des coopératives certifiées du sud du Maroc.</p>
            </div>
            <div className="value-item">
              <div className="value-icon"><Heart size={24} /></div>
              <h3>Éthique & Cruelty-Free</h3>
              <p>La beauté sans compromis. Aucun test sur les animaux.</p>
            </div>
            <div className="value-item">
              <div className="value-icon"><ShieldCheck size={24} /></div>
              <h3>Qualité Supérieure</h3>
              <p>Extraction à froid pour préserver chaque molécule active.</p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

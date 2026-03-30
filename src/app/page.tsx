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
        {/* Hero Section - CINEMATIC WAOUH EFFECT */}
        <section className="hero-video-container reveal">
          <video 
            autoPlay 
            muted 
            loop 
            playsInline 
            className="hero-video"
            poster="/images/hero-fallback.jpg"
          >
            <source src="/videos/hero-luxury.mp4" type="video/mp4" />
          </video>
          <div className="hero-overlay"></div>
          
          <div className="container hero-content">
            <span className="hero-subtitle reveal-delay-1">L&apos;Héritage de l&apos;Atlas</span>
            <h1 className="reveal-delay-2">L&apos;Arganor<span>™</span><br />L&apos;Élixir de Jeunesse</h1>
            <p className="reveal-delay-3">Découvrez la puissance transformatrice de l&apos;or liquide. Une immersion sensorielle dans le luxe absolu.</p>
            <div className="hero-cta reveal-delay-3">
              <Link href="/products" className="btn btn-gold">Boutique Exclusive</Link>
              <Link href="/blog" className="btn btn-outline-white">Notre Journal</Link>
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
        <section className="section values-section reveal">
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

        {/* Testimonials */}
        <section className="testimonials reveal">
          <div className="container">
            <h2>L&apos;Excellence Prouvée</h2>
            <div className="testimonials-grid">
              <div className="testim-card">
                <div className="stars">★★★★★</div>
                <p>&quot;Cette huile a complètement transformé la texture de ma peau. Le packaging respire le luxe et l&apos;efficacité est au rendez-vous. Impératif.&quot;</p>
                <div className="testim-author">— Claire V.</div>
              </div>
              <div className="testim-card">
                <div className="stars">★★★★★</div>
                <p>&quot;J&apos;ai jeté toutes mes autres crèmes. L&apos;application est un pur moment de bonheur végétal. Mes cheveux n&apos;ont jamais été aussi vigoureux.&quot;</p>
                <div className="testim-author">— Sarah M.</div>
              </div>
              <div className="testim-card">
                <div className="stars">★★★★★</div>
                <p>&quot;Un standard de qualité époustouflant. La pureté se ressent dès la première goutte. Livraison impeccable via Amazon.&quot;</p>
                <div className="testim-author">— Sophie L.</div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

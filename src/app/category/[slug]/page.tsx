import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ProductCard from "@/components/ui/ProductCard";
import { getProductsByCategory } from "@/lib/data"; // Assumes you might need getProducts for static params
import { notFound } from "next/navigation";

// Define known categories for static generation
const CATEGORIES = ["face", "hair", "body", "skincare", "anti-aging"];

interface CategoryPageProps {
    params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
    return CATEGORIES.map((slug) => ({
        slug,
    }));
}

export async function generateMetadata({ params }: CategoryPageProps) {
    const { slug } = await params;
    const capitalized = slug.charAt(0).toUpperCase() + slug.slice(1);
    return {
        title: `${capitalized} Care | Arganor`,
        description: `Shop premium ${slug} care products enriched with organic argan oil.`,
    };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
    const { slug } = await params;
    const products = getProductsByCategory(slug);

    // If no products found for this category (and it's not in our static list? actually we serve dynamic too)
    // For now just show empty or what we have.

    const categoryName = slug.charAt(0).toUpperCase() + slug.slice(1);

    return (
        <>
            <Header />
            <main>
                <div className="category-header">
                    <div className="container">
                        <h1>{categoryName} Care</h1>
                        <p>Curated organic solutions for your {slug}.</p>
                    </div>
                </div>

                <section className="section">
                    <div className="container">
                        {products.length > 0 ? (
                            <div className="product-grid">
                                {products.map(product => (
                                    <ProductCard key={product.id} product={product} />
                                ))}
                            </div>
                        ) : (
                            <div className="empty-state">
                                <p>No products found in this category.</p>
                            </div>
                        )}
                    </div>
                </section>
            </main>
            <Footer />
        </>
    );
}

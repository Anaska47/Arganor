import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import ProductCard from "@/components/ui/ProductCard";
import { getPublicProductsByCategory } from "@/lib/data";

const CATEGORIES = ["face", "hair", "body", "skincare", "anti-aging"];
const CATEGORY_LABELS: Record<string, string> = {
    face: "Soin du visage",
    hair: "Soin des cheveux",
    body: "Soin du corps",
    skincare: "Routine skincare",
    "anti-aging": "Soin anti-age",
};

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
    const label = CATEGORY_LABELS[slug] || slug;

    return {
        title: `${label} | Arganor`,
        description: `Les reperes Arganor pour choisir un produit autour de ${label.toLowerCase()}.`,
    };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
    const { slug } = await params;
    const products = getPublicProductsByCategory(slug);
    const categoryName = CATEGORY_LABELS[slug] || slug;

    return (
        <>
            <Header />
            <main>
                <div className="category-header">
                    <div className="container">
                        <h1>{categoryName}</h1>
                        <p>Une selection de produits lisibles et deja qualifies pour cette famille de besoins.</p>
                    </div>
                </div>

                <section className="section">
                    <div className="container">
                        {products.length > 0 ? (
                            <div className="product-grid">
                                {products.map((product) => (
                                    <ProductCard key={product.id} product={product} />
                                ))}
                            </div>
                        ) : (
                            <div className="empty-state">
                                <p>Aucun produit n'est encore publie dans cette categorie.</p>
                            </div>
                        )}
                    </div>
                </section>
            </main>
            <Footer />
        </>
    );
}

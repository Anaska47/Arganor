import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import ProductCard from "@/components/ui/ProductCard";
import { getPublicProducts } from "@/lib/data";

export const metadata = {
    title: "Produits recommandes | Arganor",
    description: "Une selection claire de produits beaute et bien-etre suivis par Arganor.",
};

export default function ProductsPage() {
    const products = getPublicProducts();

    return (
        <>
            <Header />
            <main className="main-content">
                <div className="page-header">
                    <div className="container">
                        <h1>Produits recommandes</h1>
                        <p>Des reperes simples pour comparer, choisir et verifier le bon produit sur Amazon.</p>
                    </div>
                </div>

                <section className="section">
                    <div className="container">
                        <div className="product-grid">
                            {products.map((product) => (
                                <ProductCard key={product.id} product={product} />
                            ))}
                        </div>
                    </div>
                </section>
            </main>
            <Footer />
        </>
    );
}

import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ProductCard from "@/components/ui/ProductCard";
import { getProducts } from "@/lib/data";

export default function ProductsPage() {
  const products = getProducts();

  return (
    <>
      <Header />
      <main className="main-content">
        <div className="page-header">
          <div className="container">
            <h1>All Products</h1>
            <p>Explore our complete collection of organic luxury.</p>
          </div>
        </div>

        <section className="section">
          <div className="container">
            <div className="product-grid">
              {products.map(product => (
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

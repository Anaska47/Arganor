import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

export const metadata = {
  title: "Shipping Policy | Arganor",
  description: "Arganor shipping information and delivery times.",
};

export default function ShippingPage() {
  return (
    <>
      <Header />
      <main className="container" style={{ padding: "4rem 0", maxWidth: "800px", lineHeight: "1.8" }}>
        <h1 style={{ marginBottom: "2rem", fontSize: "2.5rem" }}>Shipping Policy</h1>

        <section style={{ marginTop: "2rem" }}>
          <h2>1. Shipping with Amazon</h2>
          <p>
            Because Arganor curates premium beauty products via affiliate partnerships with Amazon, shipping methods, costs, and delivery times are determined directly by Amazon Logistics or the third-party seller on their platform. 
          </p>
          <p>
            For exact shipping dates, expedited options (like Amazon Prime Free One-Day Delivery), and tracking information, please refer to the Amazon checkout page during your purchase.
          </p>
        </section>

        <section style={{ marginTop: "2rem" }}>
          <h2>2. Direct Order Shipping</h2>
          <p>
            For any promotional or limited-edition items sold directly via Arganor.com, standard shipping is processed within 1-2 business days. 
          </p>
          <ul style={{ paddingLeft: "2rem", marginTop: "1rem" }}>
            <li><strong>Standard Shipping (EU):</strong> 3-5 business days</li>
            <li><strong>International Shipping:</strong> 7-14 business days</li>
          </ul>
        </section>

        <section style={{ marginTop: "2rem" }}>
          <h2>3. Shipping Costs</h2>
          <p>
            Shipping costs for direct purchases are calculated at checkout based on location. Amazon purchases are subject to Amazon's shipping rates, often qualifying for free or discounted Prime shipping.
          </p>
        </section>

        <section style={{ marginTop: "2rem" }}>
          <h2>4. Contact Us</h2>
          <p>If you have questions regarding a direct shipment from Arganor, contact us at purorganicoil@gmail.com. For questions regarding an Amazon shipment, please check your Amazon Orders page.</p>
        </section>

      </main>
      <Footer />
    </>
  );
}

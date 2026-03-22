import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

export const metadata = {
  title: "Return & Refund Policy | Arganor",
  description: "Arganor return and refund policy information.",
};

export default function RefundPage() {
  return (
    <>
      <Header />
      <main className="container" style={{ padding: "4rem 0", maxWidth: "800px", lineHeight: "1.8" }}>
        <h1 style={{ marginBottom: "2rem", fontSize: "2.5rem" }}>Return & Refund Policy</h1>

        <section style={{ marginTop: "2rem" }}>
          <h2>1. Amazon Purchases</h2>
          <p>
            As an affiliate partner, the majority of our premium products are fulfilled and shipped directly by Amazon. 
            Therefore, any returns, refunds, or exchanges must be handled through your Amazon account under Amazon&apos;s 
            standard return policy. Arganor cannot process refunds for items purchased through affiliate links.
          </p>
        </section>

        <section style={{ marginTop: "2rem" }}>
          <h2>2. Direct Purchases</h2>
          <p>
            For any products purchased directly on Arganor.com, we offer a 30-day money-back guarantee. If you are not completely satisfied with your purchase, you may return the item within 30 days of the delivery date for a full refund or exchange.
          </p>
          <ul style={{ paddingLeft: "2rem", marginTop: "1rem" }}>
            <li>Items must be unopened and in their original packaging.</li>
            <li>Proof of purchase is required.</li>
            <li>Return shipping costs are the responsibility of the customer unless the product arrived damaged or incorrect.</li>
          </ul>
        </section>

        <section style={{ marginTop: "2rem" }}>
          <h2>3. Damaged or Defective Items</h2>
          <p>
            If your direct order arrives damaged, please contact us within 48 hours with photographic evidence at <strong>purorganicoil@gmail.com</strong>, and we will issue a replacement at no extra cost.
          </p>
        </section>

        <section style={{ marginTop: "2rem" }}>
          <h2>4. Contact Us</h2>
          <p>If you have any questions about our Returns and Refunds Policy, please contact us: purorganicoil@gmail.com.</p>
        </section>
      </main>
      <Footer />
    </>
  );
}

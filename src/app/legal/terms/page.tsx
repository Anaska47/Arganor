import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

export const metadata = {
  title: "Terms of Service | Arganor",
  description: "Terms and conditions of use for Arganor.",
};

export default function TermsPage() {
  return (
    <>
      <Header />
      <main className="container" style={{ padding: "4rem 0", maxWidth: "800px", lineHeight: "1.8" }}>
        <h1 style={{ marginBottom: "2rem", fontSize: "2.5rem" }}>Terms of Service</h1>
        <p><strong>Last Updated: {new Date().toLocaleDateString()}</strong></p>

        <section style={{ marginTop: "2rem" }}>
          <h2>1. Agreement to Terms</h2>
          <p>By accessing or using our website, www.arganor.com, you agree to be bound by these Terms of Service. If you disagree with any part of the terms, you may not access the service.</p>
        </section>

        <section style={{ marginTop: "2rem" }}>
          <h2>2. Intellectual Property</h2>
          <p>The Service and its original content, features, and functionality are and will remain the exclusive property of Arganor and its licensors. Our trademarks and trade dress may not be used in connection with any product or service without the prior written consent of Arganor.</p>
        </section>

        <section style={{ marginTop: "2rem" }}>
          <h2>3. Products & Services</h2>
          <p>Certain products or services may be available exclusively online through the website. These products or services may have limited quantities and are subject to return or exchange only according to our Return Policy.</p>
        </section>

        <section style={{ marginTop: "2rem" }}>
          <h2>4. Links to Other Web Sites</h2>
          <p>Our Service may contain affiliate links to third-party web sites or services that are not owned or controlled by Arganor, such as Amazon. Arganor has no control over, and assumes no responsibility for, the content, privacy policies, or practices of any third party web sites or services.</p>
        </section>

        <section style={{ marginTop: "2rem" }}>
          <h2>5. Contact Information</h2>
          <p>Questions about the Terms of Service should be sent to us at purorganicoil@gmail.com.</p>
        </section>
      </main>
      <Footer />
    </>
  );
}

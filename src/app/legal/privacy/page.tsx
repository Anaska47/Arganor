import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

export const metadata = {
  title: "Privacy Policy | Arganor",
  description: "Learn how Arganor protects your personal information.",
};

export default function PrivacyPage() {
  return (
    <>
      <Header />
      <main className="container" style={{ padding: "4rem 0", maxWidth: "800px", lineHeight: "1.8" }}>
        <h1 style={{ marginBottom: "2rem", fontSize: "2.5rem" }}>Privacy Policy</h1>
        
        <p><strong>Effective Date: {new Date().toLocaleDateString()}</strong></p>

        <section style={{ marginTop: "2rem" }}>
          <h2>1. Information We Collect</h2>
          <p>We may collect personal identification information from Users in a variety of ways, including, but not limited to, when Users visit our site, register on the site, place an order, subscribe to the newsletter, respond to a survey, fill out a form, and in connection with other activities, services, features or resources we make available on our Site. Users may be asked for, as appropriate, name, email address, mailing address, phone number.</p>
        </section>

        <section style={{ marginTop: "2rem" }}>
          <h2>2. Use Of Data</h2>
          <p>Arganor uses the collected data for various purposes:</p>
          <ul style={{ paddingLeft: "2rem", marginTop: "1rem" }}>
            <li>To provide and maintain our Service</li>
            <li>To notify you about changes to our Service</li>
            <li>To provide customer support</li>
            <li>To gather analysis or valuable information so that we can improve our Service</li>
          </ul>
        </section>

        <section style={{ marginTop: "2rem" }}>
          <h2>3. Cookies</h2>
          <p>Cookies are files with small amount of data which may include an anonymous unique identifier. Cookies are sent to your browser from a website and stored on your device. We use cookies and similar tracking technologies to track the activity on our Service and hold certain information.</p>
        </section>

        <section style={{ marginTop: "2rem" }}>
          <h2>4. Links To Other Sites</h2>
          <p>Our Service contains affiliate links to other sites that are not operated by us. If you click on a third party link (such as an Amazon product link), you will be directed to that third party's site. We strongly advise you to review the Privacy Policy of every site you visit.</p>
        </section>

        <section style={{ marginTop: "2rem" }}>
          <h2>5. Contact Us</h2>
          <p>If you have any questions about this Privacy Policy, please contact us: purorganicoil@gmail.com.</p>
        </section>

      </main>
      <Footer />
    </>
  );
}

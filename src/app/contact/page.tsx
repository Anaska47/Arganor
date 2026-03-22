import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

export const metadata = {
  title: "Contact Us | Arganor",
  description: "Get in touch with Arganor for any inquiries about our premium beauty products.",
};

export default function ContactPage() {
  return (
    <>
      <Header />
      <main className="container" style={{ padding: "4rem 0", maxWidth: "800px" }}>
        <h1 style={{ marginBottom: "2rem", fontSize: "2.5rem" }}>Contact Us</h1>
        
        <div style={{ display: "grid", gap: "2rem", marginBottom: "3rem" }}>
          <div style={{ padding: "2rem", background: "#fdf8f0", borderRadius: "8px" }}>
            <h2 style={{ marginBottom: "1rem" }}>Our Information</h2>
            <p><strong>Email:</strong> purorganicoil@gmail.com</p>
            <p><strong>Phone:</strong> +33 1 23 45 67 89</p>
            <p><strong>Address:</strong> 15 Avenue des Champs-Élysées, 75008 Paris, France</p>
            <p><strong>Support Hours:</strong> Monday to Friday, 9:00 AM - 6:00 PM (CET)</p>
          </div>
        </div>

        <form style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <h2>Send us a Message</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <label>Name</label>
            <input type="text" placeholder="Your Name" style={{ padding: "0.8rem", borderRadius: "4px", border: "1px solid #ccc" }} required />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <label>Email</label>
            <input type="email" placeholder="Your Email" style={{ padding: "0.8rem", borderRadius: "4px", border: "1px solid #ccc" }} required />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <label>Message</label>
            <textarea rows={5} placeholder="How can we help you?" style={{ padding: "0.8rem", borderRadius: "4px", border: "1px solid #ccc" }} required></textarea>
          </div>
          <button type="submit" className="btn btn-primary" style={{ alignSelf: "flex-start" }}>Submit Message</button>
        </form>
      </main>
      <Footer />
    </>
  );
}

import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";

export const metadata = {
    title: "Contact | Arganor",
    description: "Contacter Arganor pour une question produit, un partenariat ou une demande generale.",
};

export default function ContactPage() {
    return (
        <>
            <Header />
            <main className="container" style={{ padding: "4rem 0", maxWidth: "800px" }}>
                <section style={{ display: "grid", gap: "1rem", marginBottom: "2rem" }}>
                    <h1 style={{ fontSize: "2.5rem" }}>Nous contacter</h1>
                    <p style={{ fontSize: "1.05rem", lineHeight: "1.8", color: "var(--color-charcoal)" }}>
                        Pour une question sur un produit, une demande de partenariat ou une remarque sur le site, le plus simple est de nous ecrire par email.
                    </p>
                </section>

                <div style={{ display: "grid", gap: "2rem", marginBottom: "3rem" }}>
                    <div style={{ padding: "2rem", background: "#fdf8f0", borderRadius: "8px" }}>
                        <h2 style={{ marginBottom: "1rem" }}>Coordonnees</h2>
                        <p>
                            <strong>Email :</strong> <a href="mailto:purorganicoil@gmail.com">purorganicoil@gmail.com</a>
                        </p>
                        <p>
                            <strong>Telephone :</strong> <a href="tel:+33619926923">06 19 92 69 23</a>
                        </p>
                        <p>
                            <strong>Adresse :</strong> 100 av du 11 novembre 1918, 83170 Brignoles
                        </p>
                        <p>
                            <strong>Disponibilite :</strong> lun-ven, 9h-18h
                        </p>
                    </div>
                </div>

                <section style={{ padding: "2rem", border: "1px solid #e6dfd3", borderRadius: "8px", display: "grid", gap: "1rem" }}>
                    <h2>Ecrire a Arganor</h2>
                    <p style={{ lineHeight: "1.8" }}>
                        Nous repondons plus vite par email. Si vous nous contactez pour un produit, ajoutez simplement le nom de la reference ou le lien de
                        l'article concerne.
                    </p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
                        <a href="mailto:purorganicoil@gmail.com?subject=Contact%20Arganor" className="btn btn-primary">
                            Envoyer un email
                        </a>
                        <a href="tel:+33619926923" className="btn btn-outline">
                            Appeler Arganor
                        </a>
                    </div>
                </section>
            </main>
            <Footer />
        </>
    );
}

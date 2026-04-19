import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";

export const metadata = {
    title: "A propos | Arganor",
    description: "Arganor selectionne, explique et relie des produits a des usages reels pour une decision plus simple.",
};

const cardStyle = {
    padding: "2rem",
    borderRadius: "8px",
    background: "var(--color-light-grey)",
};

export default function AboutPage() {
    return (
        <>
            <Header />
            <main className="container" style={{ padding: "4rem 0", maxWidth: "960px" }}>
                <section style={{ display: "grid", gap: "1.5rem", marginBottom: "3rem" }}>
                    <span style={{ textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--color-gold-dark)" }}>Arganor</span>
                    <h1 style={{ fontSize: "2.8rem", lineHeight: "1.1" }}>Des reperes simples pour choisir les bons produits.</h1>
                    <p style={{ fontSize: "1.1rem", lineHeight: "1.8", color: "var(--color-charcoal)" }}>
                        Arganor relie des contenus editoriaux, des routines ciblees et des fiches produits pour aider a comparer plus vite,
                        comprendre l'usage d'un soin et verifier ensuite les informations directement sur Amazon.
                    </p>
                </section>

                <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem", marginBottom: "3rem" }}>
                    <div style={cardStyle}>
                        <h2 style={{ marginBottom: "0.75rem" }}>Selection</h2>
                        <p>Nous privilegions des produits lisibles, avec un besoin clair, une promesse simple et un vrai usage en routine.</p>
                    </div>
                    <div style={cardStyle}>
                        <h2 style={{ marginBottom: "0.75rem" }}>Clarte</h2>
                        <p>Chaque fiche doit permettre de comprendre rapidement pour qui le produit est utile, comment l'integrer et quoi verifier avant achat.</p>
                    </div>
                    <div style={cardStyle}>
                        <h2 style={{ marginBottom: "0.75rem" }}>Verification</h2>
                        <p>Le prix, la disponibilite, la livraison et les avis restent verifies chez Amazon au moment du clic.</p>
                    </div>
                </section>

                <section style={{ display: "grid", gap: "1rem" }}>
                    <h2>Notre ligne editoriale</h2>
                    <p style={{ lineHeight: "1.8" }}>
                        Nous cherchons un equilibre simple: du contenu utile pour le SEO, des visuels adaptes a Pinterest et des fiches produits assez propres
                        pour ne pas faire perdre de temps a la personne qui arrive sur le site.
                    </p>
                    <p style={{ lineHeight: "1.8" }}>
                        Arganor n'encaisse pas le paiement. Le site agit comme une couche de recommandation et de contexte, puis redirige vers Amazon pour la
                        verification finale.
                    </p>
                </section>
            </main>
            <Footer />
        </>
    );
}

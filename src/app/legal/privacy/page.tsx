import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";

export const metadata = {
  title: "Confidentialite | Arganor",
  description:
    "Comment Arganor collecte, utilise et protege les donnees de navigation et de contact.",
};

const sectionStyle = { marginTop: "2rem" };

export default function PrivacyPage() {
  return (
    <>
      <Header />
      <main
        className="container"
        style={{ padding: "4rem 0", maxWidth: "800px", lineHeight: "1.8" }}
      >
        <h1 style={{ marginBottom: "2rem", fontSize: "2.5rem" }}>
          Politique de confidentialite
        </h1>

        <p>
          <strong>Date d&apos;effet: {new Date().toLocaleDateString("fr-FR")}</strong>
        </p>

        <section style={sectionStyle}>
          <h2>1. Donnees que nous pouvons collecter</h2>
          <p>
            Nous pouvons collecter des donnees de navigation techniques et
            statistiques, par exemple les pages consultees, les clics sur
            certains liens, le navigateur utilise, le terminal ou l&apos;origine du
            trafic. Si vous nous contactez directement, nous pouvons aussi
            recevoir les informations que vous choisissez de nous transmettre,
            comme votre nom ou votre adresse email.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2>2. Usage de ces donnees</h2>
          <p>Ces informations peuvent etre utilisees pour:</p>
          <ul style={{ paddingLeft: "2rem", marginTop: "1rem" }}>
            <li>ameliorer les contenus et l&apos;experience de navigation</li>
            <li>mesurer l&apos;interet pour certains sujets ou produits</li>
            <li>analyser les performances des liens et contenus editoriaux</li>
            <li>repondre aux messages envoyes a Arganor</li>
          </ul>
        </section>

        <section style={sectionStyle}>
          <h2>3. Cookies et mesure d&apos;audience</h2>
          <p>
            Arganor peut utiliser des cookies ou technologies similaires pour
            assurer le bon fonctionnement du site, memoriser certaines
            preferences et mesurer l&apos;audience. Des services tiers peuvent aussi
            deposer leurs propres cookies lorsqu&apos;un utilisateur interagit avec
            leurs pages apres redirection.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2>4. Liens externes et affiliation</h2>
          <p>
            Le site contient des liens vers des plateformes tierces, notamment
            Amazon. Lorsque vous cliquez sur un lien externe, vous quittez
            Arganor et vous etes alors soumis a la politique de confidentialite
            du service tiers concerne.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2>5. Contact</h2>
          <p>
            Pour toute question relative a cette politique de confidentialite,
            vous pouvez nous contacter a <strong>purorganicoil@gmail.com</strong>.
          </p>
        </section>
      </main>
      <Footer />
    </>
  );
}

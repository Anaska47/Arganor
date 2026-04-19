import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";

export const metadata = {
  title: "Livraison et expedition | Arganor",
  description:
    "Informations sur la livraison des produits consultes via les liens d'affiliation Arganor.",
};

const sectionStyle = { marginTop: "2rem" };

export default function ShippingPage() {
  return (
    <>
      <Header />
      <main
        className="container"
        style={{ padding: "4rem 0", maxWidth: "800px", lineHeight: "1.8" }}
      >
        <h1 style={{ marginBottom: "2rem", fontSize: "2.5rem" }}>
          Livraison et expedition
        </h1>

        <section style={sectionStyle}>
          <h2>1. Fonctionnement actuel</h2>
          <p>
            Arganor ne gere pas directement l&apos;expedition des produits references
            sur le site. Lorsqu&apos;un visiteur clique sur un lien produit, il est
            redirige vers une plateforme tierce, le plus souvent Amazon, qui
            prend ensuite en charge la commande, la livraison et le suivi.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2>2. Delais, frais et disponibilite</h2>
          <p>
            Les delais de livraison, les frais d&apos;expedition, les options de
            transport, la disponibilite et les conditions Prime sont definis par
            Amazon ou par le vendeur tiers au moment du passage de commande.
          </p>
          <p>
            Pour connaitre les dates de livraison estimees ou les frais exacts,
            merci de consulter la page produit et le tunnel de commande du
            marchand concerne.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2>3. Suivi de commande</h2>
          <p>
            Une fois la commande passee sur Amazon ou sur une autre plateforme
            tierce, le suivi, les notifications et la gestion de l&apos;expedition
            sont accessibles depuis votre compte client sur cette plateforme.
            Arganor n&apos;a pas acces a ces informations logistiques.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2>4. Besoin d&apos;aide</h2>
          <p>
            Pour toute question liee a une livraison, un retard ou un colis
            manquant, le bon point de contact est le service client du marchand
            chez qui l&apos;achat a ete finalise. Pour une question sur un contenu ou
            un lien present sur Arganor, vous pouvez nous ecrire a
            <strong> purorganicoil@gmail.com</strong>.
          </p>
        </section>
      </main>
      <Footer />
    </>
  );
}

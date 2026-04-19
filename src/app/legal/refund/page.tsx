import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";

export const metadata = {
  title: "Retours et remboursements | Arganor",
  description:
    "Informations sur les retours et remboursements des produits consultes via Arganor.",
};

const sectionStyle = { marginTop: "2rem" };

export default function RefundPage() {
  return (
    <>
      <Header />
      <main
        className="container"
        style={{ padding: "4rem 0", maxWidth: "800px", lineHeight: "1.8" }}
      >
        <h1 style={{ marginBottom: "2rem", fontSize: "2.5rem" }}>
          Retours et remboursements
        </h1>

        <section style={sectionStyle}>
          <h2>1. Produits achetes via un lien Arganor</h2>
          <p>
            La plupart des produits presentes sur Arganor sont consultes via des
            liens d&apos;affiliation menant vers Amazon ou vers d&apos;autres vendeurs
            tiers. Les retours, remboursements, echanges, litiges et garanties
            sont donc geres par la plateforme ou le vendeur chez qui la commande
            a ete effectivement passee.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2>2. Procedure applicable</h2>
          <p>
            Si vous souhaitez retourner un article ou demander un remboursement,
            veuillez vous connecter a votre compte Amazon ou au compte utilise
            chez le marchand tiers, puis suivre leur procedure officielle de
            retour. Les conditions peuvent varier selon le type de produit, le
            vendeur et le pays de livraison.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2>3. Role d&apos;Arganor</h2>
          <p>
            Arganor n&apos;encaisse pas le paiement des produits vendus sur Amazon et
            n&apos;intervient pas dans la logistique ou le service apres-vente des
            commandes passees chez un tiers. Nous ne pouvons donc pas valider un
            remboursement ni emettre une etiquette de retour pour ces achats.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2>4. Nous contacter</h2>
          <p>
            Si vous constatez un lien casse, une page produit incoherente ou un
            contenu editorial a corriger, vous pouvez nous ecrire a
            <strong> purorganicoil@gmail.com</strong>. Pour toute demande
            commerciale liee a une commande, merci de contacter directement le
            vendeur concerne.
          </p>
        </section>
      </main>
      <Footer />
    </>
  );
}

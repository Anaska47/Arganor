import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";

export const metadata = {
  title: "Conditions d'utilisation | Arganor",
  description:
    "Conditions d'utilisation du site Arganor, de ses contenus editoriaux et de ses liens d'affiliation.",
};

const sectionStyle = { marginTop: "2rem" };

export default function TermsPage() {
  return (
    <>
      <Header />
      <main
        className="container"
        style={{ padding: "4rem 0", maxWidth: "800px", lineHeight: "1.8" }}
      >
        <h1 style={{ marginBottom: "2rem", fontSize: "2.5rem" }}>
          Conditions d&apos;utilisation
        </h1>
        <p>
          <strong>Derniere mise a jour: {new Date().toLocaleDateString("fr-FR")}</strong>
        </p>

        <section style={sectionStyle}>
          <h2>1. Objet du site</h2>
          <p>
            Arganor est un site editorial consacre a la beaute, au soin, aux
            routines et a la curation de produits. Nous publions des articles,
            selections, comparatifs, recommandations et liens vers des
            plateformes tierces, notamment Amazon.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2>2. Acceptation des conditions</h2>
          <p>
            En accedant au site Arganor ou en utilisant ses contenus, vous
            acceptez les presentes conditions d&apos;utilisation. Si vous n&apos;etes
            pas d&apos;accord avec tout ou partie de ces conditions, merci de ne pas
            utiliser le site.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2>3. Nature des informations publiees</h2>
          <p>
            Les contenus publies sur Arganor sont fournis a titre informatif et
            editorial. Nous cherchons a maintenir des informations utiles,
            lisibles et coherentes, mais nous ne garantissons pas l&apos;absence
            totale d&apos;erreur, d&apos;omission, d&apos;indisponibilite ou de decalage de
            prix, stock, formulation ou visuel chez les marchands tiers.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2>4. Liens d&apos;affiliation et plateformes tierces</h2>
          <p>
            Certains liens presents sur Arganor sont des liens d&apos;affiliation.
            Lorsque vous cliquez sur un lien produit, vous pouvez etre redirige
            vers un site tiers comme Amazon. Arganor peut percevoir une
            commission sans surcout pour vous si un achat est realise via ces
            liens.
          </p>
          <p>
            Les achats, paiements, livraisons, garanties, disponibilites,
            retours et remboursements sont geres par la plateforme tierce ou le
            vendeur concerne. Arganor n&apos;est pas le vendeur des produits
            presentes sur ces pages, sauf mention explicite contraire.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2>5. Propriete intellectuelle</h2>
          <p>
            Les textes, selections, structures de pages, elements visuels,
            marques de presentation et contenus originaux d&apos;Arganor sont
            proteges par les regles applicables en matiere de propriete
            intellectuelle. Toute reproduction ou reutilisation substantielle
            sans autorisation prealable est interdite.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2>6. Limitation de responsabilite</h2>
          <p>
            Arganor ne pourra etre tenu responsable d&apos;une decision d&apos;achat,
            d&apos;une rupture de stock, d&apos;un changement de prix, d&apos;un retard de
            livraison, d&apos;une erreur de fiche produit, ni d&apos;un litige lie a une
            commande passee sur un site tiers.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2>7. Contact</h2>
          <p>
            Pour toute question a propos du site ou des presentes conditions,
            vous pouvez nous contacter a l&apos;adresse suivante:
            <strong> purorganicoil@gmail.com</strong>.
          </p>
        </section>
      </main>
      <Footer />
    </>
  );
}

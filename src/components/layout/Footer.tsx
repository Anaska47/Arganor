"use client";

import Link from "next/link";
import { Instagram, Facebook, Twitter, Send } from "lucide-react";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-grid">
        <div className="footer-brand">
          <h3 className="footer-logo">ARGANOR</h3>
          <p className="footer-desc">
            Découvrez l'or liquide du Maroc. Huile d'argan bio premium et soins de beauté de luxe pour une peau intemporelle.
          </p>
          <div className="footer-contact-info" style={{ marginTop: '1rem', fontSize: '0.9rem', color: 'var(--color-dark-muted)' }}>
            <p><strong>Nous Contacter :</strong></p>
            <p>📧 purorganicoil@gmail.com</p>
            <p>📱 06 19 92 69 23</p>
            <p>📍 100 av du 11 novembre 1918, 83170 Brignoles</p>
            <p>Disponible Lun-Ven, 9h-18h</p>
          </div>
        </div>


        <div className="footer-links">
          <h4>Boutique</h4>
          <Link href="/products">Tous les Produits</Link>
          <Link href="/category/face">Soins du Visage</Link>
          <Link href="/category/hair">Soins des Cheveux</Link>
          <Link href="/category/body">Soins du Corps</Link>
        </div>

        <div className="footer-links">
          <h4>Entreprise</h4>
          <Link href="/blog">Le Journal</Link>
          <Link href="/contact">Nous Contacter</Link>
          <Link href="/about">À propos d'Arganor</Link>
        </div>

        <div className="footer-links">
          <h4>Légal</h4>
          <Link href="/legal/terms">Conditions d'Utilisation</Link>
          <Link href="/legal/privacy">Confidentialité</Link>
          <Link href="/legal/shipping">Politique d'Expédition</Link>
          <Link href="/legal/refund">Retours & Remboursements</Link>
        </div>

        <div className="footer-newsletter">
          <h4>Restons Connectés</h4>
          <p>Rejoignez notre newsletter pour des offres exclusives et astuces beauté.</p>
          <form className="newsletter-form" onSubmit={(e) => e.preventDefault()}>
            <input type="email" placeholder="Votre adresse e-mail" />
            <button type="submit" aria-label="Subscribe">
              <Send size={18} />
            </button>
          </form>
          <div className="social-icons">
            <a href="https://instagram.com/arganor" target="_blank" rel="noopener noreferrer" aria-label="Instagram"><Instagram size={20} /></a>
            <a href="https://facebook.com/arganor" target="_blank" rel="noopener noreferrer" aria-label="Facebook"><Facebook size={20} /></a>
            <a href="https://pinterest.com/arganor" target="_blank" rel="noopener noreferrer" aria-label="Pinterest"><Twitter size={20} /></a>
          </div>

        </div>
      </div>

      <div className="footer-bottom">
        <div className="container">
          <p>&copy; {new Date().getFullYear()} Arganor. Tous droits réservés.</p>
        </div>
      </div>

    </footer>
  );
}

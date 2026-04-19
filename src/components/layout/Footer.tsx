"use client";

import Link from "next/link";
import { Facebook, Instagram, Mail, PinIcon } from "lucide-react";

export default function Footer() {
    return (
        <footer className="footer">
            <div className="container footer-grid">
                <div className="footer-brand">
                    <h3 className="footer-logo">ARGANOR</h3>
                    <p className="footer-desc">
                        Reperes editoriaux, selections produits et routines ciblees autour de la beaute naturelle.
                    </p>
                    <div className="footer-contact-info" style={{ marginTop: "1rem", fontSize: "0.9rem", color: "var(--color-grey)" }}>
                        <p>
                            <strong>Nous contacter :</strong>
                        </p>
                        <p>Email : purorganicoil@gmail.com</p>
                        <p>Telephone : 06 19 92 69 23</p>
                        <p>Adresse : 100 av du 11 novembre 1918, 83170 Brignoles</p>
                        <p>Disponible lun-ven, 9h-18h</p>
                    </div>
                </div>

                <div className="footer-links">
                    <h4>Boutique</h4>
                    <Link href="/products">Tous les produits</Link>
                    <Link href="/category/face">Soins du visage</Link>
                    <Link href="/category/hair">Soins des cheveux</Link>
                    <Link href="/category/body">Soins du corps</Link>
                </div>

                <div className="footer-links">
                    <h4>Arganor</h4>
                    <Link href="/blog">Le journal</Link>
                    <Link href="/contact">Nous contacter</Link>
                    <Link href="/about">A propos</Link>
                </div>

                <div className="footer-links">
                    <h4>Legal</h4>
                    <Link href="/legal/terms">Conditions d'utilisation</Link>
                    <Link href="/legal/privacy">Confidentialite</Link>
                    <Link href="/legal/shipping">Politique d'expedition</Link>
                    <Link href="/legal/refund">Retours et remboursements</Link>
                </div>

                <div className="footer-newsletter">
                    <h4>Suivre Arganor</h4>
                    <p>Retrouvez nos nouveaux guides, selections et inspirations sur nos canaux principaux.</p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", marginTop: "1rem" }}>
                        <Link href="/blog" className="btn btn-primary" style={{ padding: "0.8rem 1rem" }}>
                            Lire le journal
                        </Link>
                        <a
                            href="mailto:purorganicoil@gmail.com"
                            className="btn btn-outline"
                            style={{ padding: "0.8rem 1rem", display: "inline-flex", alignItems: "center", gap: "0.5rem" }}
                        >
                            <Mail size={16} />
                            Nous ecrire
                        </a>
                    </div>
                    <div className="social-icons">
                        <a href="https://www.instagram.com/1arganor" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                            <Instagram size={20} />
                        </a>
                        <a href="https://www.facebook.com/Purorganicoil" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
                            <Facebook size={20} />
                        </a>
                        <a href="https://pinterest.com/arganor" target="_blank" rel="noopener noreferrer" aria-label="Pinterest">
                            <PinIcon size={20} />
                        </a>
                    </div>
                </div>
            </div>

            <div className="footer-bottom">
                <div className="container">
                    <p>&copy; {new Date().getFullYear()} Arganor. Tous droits reserves.</p>
                </div>
            </div>
        </footer>
    );
}

"use client";

import Link from "next/link";
import { BookOpenText, Mail, Menu, X } from "lucide-react";
import { useState } from "react";

export default function Header() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    return (
        <>
            <div className="top-bar">
                <p>Selection Arganor | routines ciblees, contenus editoriaux et reperes d'achat</p>
            </div>

            <header className={`header ${isMenuOpen ? "menu-open" : ""}`}>
                <div className="container header-container">
                    <button
                        type="button"
                        className="mobile-menu-btn"
                        aria-label={isMenuOpen ? "Fermer le menu" : "Ouvrir le menu"}
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                    >
                        {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>

                    <Link href="/" className="logo">
                        ARGANOR
                    </Link>

                    <nav className={`nav-links ${isMenuOpen ? "active" : ""}`}>
                        <Link href="/products" className="nav-link" onClick={() => setIsMenuOpen(false)}>
                            Produits
                        </Link>
                        <Link href="/category/face" className="nav-link" onClick={() => setIsMenuOpen(false)}>
                            Soin du Visage
                        </Link>
                        <Link href="/category/hair" className="nav-link" onClick={() => setIsMenuOpen(false)}>
                            Soin des Cheveux
                        </Link>
                        <Link href="/blog" className="nav-link" onClick={() => setIsMenuOpen(false)}>
                            Journal
                        </Link>
                    </nav>

                    <div className="header-actions">
                        <Link href="/blog" className="icon-btn" aria-label="Journal Arganor">
                            <BookOpenText size={22} color="var(--color-black)" />
                        </Link>
                        <Link href="/contact" className="icon-btn" aria-label="Contacter Arganor">
                            <Mail size={22} color="var(--color-black)" />
                        </Link>
                    </div>
                </div>
            </header>
        </>
    );
}

"use client";

import Link from "next/link";
import { ShoppingBag, Search, Menu, X } from "lucide-react";
import { useState } from "react";

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <>
      {/* Premium Announcement Bar */}
      <div className="top-bar">
        <p>✨ Livraison Premium Gratuite Worldwide | 100% Huile d&apos;Argan Bio certifiée ✨</p>
      </div>
      
      <header className={`header ${isMenuOpen ? "menu-open" : ""}`}>
        <div className="container header-container">
        <div className="mobile-menu-btn" onClick={() => setIsMenuOpen(!isMenuOpen)}>
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </div>

        <Link href="/" className="logo">
          ARGANOR
        </Link>

        <nav className={`nav-links ${isMenuOpen ? "active" : ""}`}>
          <Link href="/products" className="nav-link" onClick={() => setIsMenuOpen(false)}>Shop</Link>
          <Link href="/category/face" className="nav-link" onClick={() => setIsMenuOpen(false)}>Soin du Visage</Link>
          <Link href="/category/hair" className="nav-link" onClick={() => setIsMenuOpen(false)}>Soin des Cheveux</Link>
          <Link href="/blog" className="nav-link" onClick={() => setIsMenuOpen(false)}>Journal</Link>
        </nav>

        <div className="header-actions">
          <button className="icon-btn" aria-label="Search">
            <Search size={22} color="var(--color-black)" />
          </button>
          <button className="icon-btn" aria-label="Cart">
            <ShoppingBag size={22} color="var(--color-black)" />
          </button>
        </div>
      </div>
      </header>
    </>
  );
}

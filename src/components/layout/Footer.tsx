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
            Discover the liquid gold of Morocco. Premium organic argan oil and luxury beauty products for timeless skin.
          </p>
          <div className="footer-contact-info" style={{ marginTop: '1rem', fontSize: '0.9rem', color: 'var(--color-dark-muted)' }}>
            <p><strong>Contact Us:</strong></p>
            <p>📧 purorganicoil@gmail.com</p>
            <p>📱 +33 1 23 45 67 89</p>
            <p>📍 15 Avenue des Champs-Élysées, 75008 Paris, France</p>
            <p>Available Mon-Fri, 9AM-6PM (CET)</p>
          </div>
        </div>


        <div className="footer-links">
          <h4>Shop</h4>
          <Link href="/products">All Products</Link>
          <Link href="/category/face">Face Care</Link>
          <Link href="/category/hair">Hair Care</Link>
          <Link href="/category/body">Body Care</Link>
        </div>

        <div className="footer-links">
          <h4>Company</h4>
          <Link href="/blog">Journal</Link>
          <Link href="/contact">Contact Us</Link>
          <Link href="/about">About Arganor</Link>
        </div>

        <div className="footer-links">
          <h4>Legal</h4>
          <Link href="/legal/terms">Terms of Service</Link>
          <Link href="/legal/privacy">Privacy Policy</Link>
          <Link href="/legal/shipping">Shipping Policy</Link>
          <Link href="/legal/refund">Return & Refund Policy</Link>
        </div>


        <div className="footer-newsletter">
          <h4>Stay Connected</h4>
          <p>Join our newsletter for exclusive offers and beauty tips.</p>
          <form className="newsletter-form" onSubmit={(e) => e.preventDefault()}>
            <input type="email" placeholder="Your email address" />
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
          <p>&copy; {new Date().getFullYear()} Arganor. All rights reserved.</p>
        </div>
      </div>

    </footer>
  );
}

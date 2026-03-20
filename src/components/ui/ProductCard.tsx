import Link from "next/link";
import { Product } from "@/lib/data";
import { getAffiliateLink } from "@/lib/affiliate";
import { Star } from "lucide-react";

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  return (
    <div className="product-card">
      <div className="image-container">
        <a href={getAffiliateLink(product, 'fr')} target="_blank" rel="noopener noreferrer">
          <img
            src={product.image}
            alt={product.name}
            className="product-image"
            style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }}
            loading="lazy"
          />
        </a>
        <span className="category-tag">{product.category}</span>
      </div>

      <div className="card-details">
        <div className="rating">
          <Star size={14} fill="var(--color-gold)" color="var(--color-gold)" />
          <span>{product.rating} ({product.reviews})</span>
        </div>

        <Link href={`/products/${product.slug}`}>
          <h3 className="product-title">{product.name}</h3>
        </Link>

        <p className="price">${product.price.toFixed(2)}</p>

        <a href={getAffiliateLink(product, 'fr')} className="btn-view" target="_blank" rel="noopener noreferrer">
          Voir le Produit
        </a>
      </div>
    </div>
  );
}

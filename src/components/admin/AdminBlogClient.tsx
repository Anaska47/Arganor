"use client";

import { useCallback, useEffect, useState } from "react";
import { Edit, Trash2, Plus } from "lucide-react";

type BlogPost = {
    id: string;
    title: string;
    slug: string;
    excerpt: string;
    content: string;
    category: string;
    author: string;
    publishedDate: string;
    image?: string;
    relatedProductId?: string;
};

type Product = {
    id: string;
    name: string;
    slug: string;
    category: string;
    brand: string;
    benefits: string;
    image?: string;
};

export default function AdminBlogClient() {
    const [posts, setPosts] = useState<BlogPost[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);

    const fetchPosts = useCallback(async () => {
        const res = await fetch("/api/blog");
        const data = await res.json();
        setPosts(data);
        setLoading(false);
    }, []);

    useEffect(() => {
        let isMounted = true;

        void Promise.all([
            fetch("/api/blog").then((res) => res.json() as Promise<BlogPost[]>),
            fetch("/api/products").then((res) => res.json() as Promise<Product[]>),
        ]).then(([nextPosts, nextProducts]) => {
            if (!isMounted) return;
            setPosts(nextPosts);
            setProducts(nextProducts);
            setLoading(false);
        });

        return () => {
            isMounted = false;
        };
    }, []);

    const generatePost = async (product: Product) => {
        setGenerating(true);

        const newPost: BlogPost = {
            id: `b${Date.now()}`,
            title: `Why ${product.name} is the Ultimate Solution for ${product.category}`,
            slug: `why-${product.slug}-is-ultimate-solution`,
            excerpt: `Discover the transformative power of ${product.name}. We dive deep into why this ${product.brand} product is changing the game in ${product.category}.`,
            content: `
# The Struggle with ${product.category}

Many of us struggle with finding the right products for our routine. Whether it's dryness, aging, or just lack of glow, the search can be endless.

## Enter: ${product.name}

This is where **${product.name}** changes everything. Sourced from the finest organic ingredients, it offers:

${product.benefits}

## Why We Recommend It

We've tested countless products, but this one stands out because of its purity and effectiveness. 

> "It's not just a product, it's a ritual."

## How to Use

Apply generous amounts before bed or in the morning for best results.
            `,
            category: product.category,
            author: "Arganor AI Editor",
            publishedDate: new Date().toISOString().split("T")[0],
            image: product.image,
            relatedProductId: product.id,
        };

        await fetch("/api/blog", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(newPost),
        });

        await fetchPosts();
        setGenerating(false);
        alert(`Generated blog post for ${product.name}!`);
    };

    if (loading) return <div>Loading Admin Panel...</div>;

    return (
        <div>
            <header className="page-header-admin flex-header">
                <h1>Blog Management</h1>

                <div className="header-actions">
                    <label htmlFor="generate-article-select" className="sr-only">
                        Generate an article for a product
                    </label>

                    <select
                        id="generate-article-select"
                        aria-label="Generate an article for a product"
                        onChange={(e) => {
                            if (e.target.value) {
                                const prod = products.find((p) => p.id === e.target.value);
                                if (prod) generatePost(prod);
                                e.target.value = "";
                            }
                        }}
                        className="smart-select"
                        disabled={generating}
                    >
                        <option value="">✨ Generate Article for...</option>
                        {products.map((p) => (
                            <option key={p.id} value={p.id}>
                                {p.name}
                            </option>
                        ))}
                    </select>

                    <button className="btn btn-primary add-btn">
                        <Plus size={18} /> New Post
                    </button>
                </div>
            </header>

            <div className="admin-table-container">
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>Title</th>
                            <th>Category</th>
                            <th>Author</th>
                            <th>Date</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {posts.map((post) => (
                            <tr key={post.id}>
                                <td className="font-semibold">{post.title}</td>
                                <td>
                                    <span className="badge">{post.category}</span>
                                </td>
                                <td>{post.author}</td>
                                <td>{post.publishedDate}</td>
                                <td>
                                    <div className="action-buttons">
                                        <button className="action-btn edit" title="Edit">
                                            <Edit size={16} />
                                        </button>
                                        <button className="action-btn delete" title="Delete">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <style jsx>{`
                .header-actions {
                    display: flex;
                    gap: 10px;
                }

                .smart-select {
                    padding: 8px 12px;
                    border: 1px solid var(--color-gold);
                    border-radius: 4px;
                    background: white;
                    color: var(--color-gold-dark);
                    cursor: pointer;
                    outline: none;
                }

                .smart-select:hover {
                    background: var(--color-cream);
                }

                .sr-only {
                    position: absolute;
                    width: 1px;
                    height: 1px;
                    padding: 0;
                    margin: -1px;
                    overflow: hidden;
                    clip: rect(0, 0, 0, 0);
                    white-space: nowrap;
                    border: 0;
                }
            `}</style>
        </div>
    );
}

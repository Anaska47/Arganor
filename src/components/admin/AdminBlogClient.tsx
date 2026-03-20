"use client";

import { useState, useEffect } from "react";
import { Edit, Trash2, Plus } from "lucide-react";

export default function AdminBlogClient() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [posts, setPosts] = useState<any[]>([]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [products, setProducts] = useState<any[]>([]); // For auto-linking
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);

    const fetchPosts = async () => {
        const res = await fetch('/api/blog');
        const data = await res.json();
        setPosts(data);
        setLoading(false);
    };

    const fetchProducts = async () => {
        const res = await fetch('/api/products');
        const data = await res.json();
        setProducts(data);
    };

    useEffect(() => {
        fetchPosts();
        fetchProducts();
    }, []);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const generatePost = async (product: any) => {
        setGenerating(true);
        // Mimic AI generation using "Smart Templates"
        const newPost = {
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
            publishedDate: new Date().toISOString().split('T')[0],
            image: product.image,
            relatedProductId: product.id
        };

        // Save to API
        await fetch('/api/blog', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newPost)
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
                <div style={{ display: 'flex', gap: '10px' }}>
                    {/* Simple Auto-Gen Demo button */}
                    <select
                        onChange={(e) => {
                            if (e.target.value) {
                                const prod = products.find(p => p.id === e.target.value);
                                if (prod) generatePost(prod);
                                e.target.value = ""; // reset
                            }
                        }}
                        className="smart-select"
                        disabled={generating}
                    >
                        <option value="">✨ Generate Article for...</option>
                        {products.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                    <button className="btn btn-primary add-btn"><Plus size={18} /> New Post</button>
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
                                <td><span className="badge">{post.category}</span></td>
                                <td>{post.author}</td>
                                <td>{post.publishedDate}</td>
                                <td>
                                    <div className="action-buttons">
                                        <button className="action-btn edit" title="Edit"><Edit size={16} /></button>
                                        <button className="action-btn delete" title="Delete"><Trash2 size={16} /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <style jsx>{`
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
      `}</style>
        </div>
    );
}

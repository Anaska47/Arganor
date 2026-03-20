"use client";

import { useState, useEffect } from "react";
import { Edit, Trash2, Plus } from "lucide-react";
import Image from "next/image";

export default function AdminProductsClient() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [products, setProducts] = useState<any[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [newItem, setNewItem] = useState({ name: '', price: '', category: 'Face Care', asin: '' });


    const loadProducts = () => {
        fetch('/api/products')
            .then(res => res.json())
            .then(data => setProducts(data));
    };

    useEffect(() => {
        loadProducts();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Basic ASIN Validation
        if (newItem.asin && newItem.asin.length !== 10) {
            alert("ASIN must be exactly 10 alphanumeric characters.");
            return;
        }

        // Just a mock create for now, would stick to API in real scenario
        // For this demo, we'll reload the page to simulate or call the API if ready
        await fetch('/api/products', {
            method: 'POST',
            body: JSON.stringify({ ...newItem, id: `p${Date.now()}` })
        });

        setShowForm(false);
        loadProducts();
    };

    return (
        <div>
            <header className="page-header-admin flex-header">
                <h1>Product Management</h1>
                <button className="btn btn-primary add-btn" onClick={() => setShowForm(!showForm)}>
                    <Plus size={18} /> {showForm ? 'Cancel' : 'Add New Product'}
                </button>
            </header>

            {showForm && (
                <div className="admin-form-container">
                    <form onSubmit={handleSubmit} className="admin-form">
                        <div className="form-group">
                            <label>Product Name</label>
                            <input
                                type="text"
                                value={newItem.name}
                                onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>ASIN (10 chars)</label>
                            <input
                                type="text"
                                value={newItem.asin}
                                onChange={(e) => setNewItem({ ...newItem, asin: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10) })}
                                placeholder="B00..."
                            />
                            <small>Leave empty to auto-generate Search Link</small>
                        </div>
                        <div className="form-group">
                            <label>Price ($)</label>
                            <input
                                type="number"
                                value={newItem.price}
                                onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
                                required
                            />
                        </div>
                        <button type="submit" className="btn btn-primary">Save Product</button>
                    </form>
                </div>
            )}

            <div className="admin-table-container">
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>Image</th>
                            <th>Name</th>
                            <th>ASIN</th>
                            <th>Category</th>
                            <th>Price</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {products.map((product) => (
                            <tr key={product.id}>
                                <td>
                                    <div className="table-img">
                                        <Image src={product.image || '/placeholder.jpg'} alt={product.name} width={40} height={40} className="rounded-img" />
                                    </div>
                                </td>
                                <td className="font-semibold">{product.name}</td>
                                <td>
                                    {product.asin ? (
                                        <span className="badge badge-success">{product.asin}</span>
                                    ) : (
                                        <span className="badge badge-warning">Auto-Search</span>
                                    )}
                                </td>
                                <td><span className="badge">{product.category}</span></td>
                                <td>${Number(product.price).toFixed(2)}</td>
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
        </div>
    );
}

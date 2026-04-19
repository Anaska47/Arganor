"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Edit, Plus, RefreshCw, Trash2 } from "lucide-react";

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
    affiliateQuery?: string;
    metaDescription?: string;
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

type AuditSeverity = "critical" | "warning" | "info";

type BlogAuditIssue = {
    type: string;
    severity: AuditSeverity;
    message: string;
};

type BlogAuditItem = {
    id: string;
    slug: string;
    title: string;
    category: string;
    publishedDate: string;
    wordCount: number;
    issueCount: number;
    score: number;
    quality: "healthy" | "needs_work" | "critical";
    issues: BlogAuditIssue[];
};

type BlogAuditSummary = {
    totalPosts: number;
    healthyCount: number;
    needsWorkCount: number;
    criticalCount: number;
    bySeverity: Record<AuditSeverity, number>;
    byType: Record<string, number | undefined>;
    shortestPosts: number;
    mojibakeCount: number;
    englishLeakageCount: number;
    nonCanonicalCategoryCount: number;
};

function getAdminHeaders(): HeadersInit {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const apiKey = window.localStorage.getItem("arganorAdminApiKey");
    if (apiKey) {
        headers.Authorization = `Bearer ${apiKey}`;
    }
    return headers;
}

function getSeverityLabel(severity: AuditSeverity): string {
    if (severity === "critical") return "Critique";
    if (severity === "warning") return "Warning";
    return "Info";
}

function getQualityLabel(quality: BlogAuditItem["quality"]): string {
    if (quality === "critical") return "A reprendre";
    if (quality === "needs_work") return "A renforcer";
    return "Sain";
}

function getAffiliateTargetLabel(post: BlogPost): string {
    if (post.relatedProductId) return "Produit";
    if (post.affiliateQuery?.trim()) return "Recherche";
    return "Inline";
}

function getIssueCount(summary: BlogAuditSummary | null, type: string): number {
    return Number(summary?.byType?.[type] ?? 0);
}

export default function AdminBlogClient() {
    const [posts, setPosts] = useState<BlogPost[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [auditSummary, setAuditSummary] = useState<BlogAuditSummary | null>(null);
    const [auditItems, setAuditItems] = useState<BlogAuditItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [auditLoading, setAuditLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [auditError, setAuditError] = useState<string | null>(null);

    const fetchCatalog = useCallback(async () => {
        const [nextPosts, nextProducts] = await Promise.all([
            fetch("/api/blog", { cache: "no-store" }).then((res) => res.json() as Promise<BlogPost[]>),
            fetch("/api/products", { cache: "no-store" }).then((res) => res.json() as Promise<Product[]>),
        ]);

        setPosts(nextPosts);
        setProducts(nextProducts);
    }, []);

    const fetchAudit = useCallback(async () => {
        setAuditLoading(true);
        setAuditError(null);

        try {
            const res = await fetch("/api/admin/blog-audit?limit=10", {
                headers: getAdminHeaders(),
                cache: "no-store",
            });
            const data = (await res.json()) as {
                success?: boolean;
                error?: string;
                summary?: BlogAuditSummary;
                items?: BlogAuditItem[];
            };

            if (!res.ok || !data.success) {
                throw new Error(data.error || "Impossible de charger l audit blog.");
            }

            setAuditSummary(data.summary || null);
            setAuditItems(data.items || []);
        } catch (error) {
            const message = error instanceof Error ? error.message : "Erreur inattendue";
            setAuditError(message);
            setAuditSummary(null);
            setAuditItems([]);
        } finally {
            setAuditLoading(false);
        }
    }, []);

    const refreshAll = useCallback(async () => {
        setRefreshing(true);
        try {
            await Promise.all([fetchCatalog(), fetchAudit()]);
        } finally {
            setRefreshing(false);
        }
    }, [fetchAudit, fetchCatalog]);

    useEffect(() => {
        let isMounted = true;

        void Promise.allSettled([fetchCatalog(), fetchAudit()]).finally(() => {
            if (isMounted) {
                setLoading(false);
            }
        });

        return () => {
            isMounted = false;
        };
    }, [fetchAudit, fetchCatalog]);

    const fetchPosts = useCallback(async () => {
        const res = await fetch("/api/blog", { cache: "no-store" });
        const data = (await res.json()) as BlogPost[];
        setPosts(data);
        setLoading(false);
    }, []);

    const topAuditItems = useMemo(() => auditItems.slice(0, 6), [auditItems]);

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
            headers: getAdminHeaders(),
            body: JSON.stringify(newPost),
        });

        await Promise.all([fetchPosts(), fetchAudit()]);
        setGenerating(false);
        alert(`Generated blog post for ${product.name}!`);
    };

    if (loading) return <div>Loading Admin Panel...</div>;

    return (
        <div className="blog-admin-page">
            <header className="page-header-admin flex-header">
                <div>
                    <h1>Blog Management</h1>
                    <p className="blog-admin-copy">
                        Pilotage des articles SEO, des cibles d affiliation et des points faibles de contenu.
                    </p>
                </div>

                <div className="header-actions">
                    <button className="refresh-btn" onClick={refreshAll} disabled={refreshing || generating}>
                        <RefreshCw size={16} className={refreshing ? "spin-icon" : ""} />
                        Rafraichir
                    </button>

                    <label htmlFor="generate-article-select" className="sr-only">
                        Generate an article for a product
                    </label>

                    <select
                        id="generate-article-select"
                        aria-label="Generate an article for a product"
                        onChange={(e) => {
                            if (e.target.value) {
                                const prod = products.find((p) => p.id === e.target.value);
                                if (prod) {
                                    void generatePost(prod);
                                }
                                e.target.value = "";
                            }
                        }}
                        className="smart-select"
                        disabled={generating || refreshing}
                    >
                        <option value="">Generate Article for...</option>
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

            <div className="stats-grid blog-audit-grid">
                <div className="stat-card">
                    <div className="stat-info">
                        <h3>Posts audites</h3>
                        <p>{auditSummary?.totalPosts ?? posts.length}</p>
                        <span className="stat-trend">Catalogue blog actuel</span>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-info">
                        <h3>Critiques</h3>
                        <p>{auditSummary?.criticalCount ?? 0}</p>
                        <span className="stat-trend">
                            {auditSummary?.bySeverity.critical ?? 0} issue(s) critiques cumulees
                        </span>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-info">
                        <h3>A renforcer</h3>
                        <p>{auditSummary?.needsWorkCount ?? 0}</p>
                        <span className="stat-trend">{auditSummary?.healthyCount ?? 0} post(s) sains</span>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-info">
                        <h3>Blind spots</h3>
                        <p>{getIssueCount(auditSummary, "missing_meta_description")}</p>
                        <span className="stat-trend">
                            {auditSummary?.mojibakeCount ?? 0} encodage(s), {auditSummary?.shortestPosts ?? 0} contenus courts
                        </span>
                    </div>
                </div>
            </div>

            <section className="blog-audit-panel">
                <div className="blog-audit-panel-top">
                    <div>
                        <h2>Content Audit</h2>
                        <p>Top des articles a reprendre en priorite avant publication massive ou repin RSS.</p>
                    </div>
                    <div className="blog-audit-chip-row">
                        <span className="audit-chip">meta manquante: {getIssueCount(auditSummary, "missing_meta_description")}</span>
                        <span className="audit-chip">mojibake: {auditSummary?.mojibakeCount ?? 0}</span>
                        <span className="audit-chip">anglais: {auditSummary?.englishLeakageCount ?? 0}</span>
                        <span className="audit-chip">categories hors canon: {auditSummary?.nonCanonicalCategoryCount ?? 0}</span>
                    </div>
                </div>

                {auditError ? (
                    <div className="audit-error-banner">
                        <AlertTriangle size={16} />
                        <span>{auditError}</span>
                    </div>
                ) : null}

                {auditLoading ? <p className="audit-loading-copy">Chargement de l audit...</p> : null}

                {!auditLoading && !auditError ? (
                    <div className="audit-item-list">
                        {topAuditItems.length > 0 ? (
                            topAuditItems.map((item) => (
                                <article key={item.id} className="audit-item-card">
                                    <div className="audit-item-top">
                                        <div>
                                            <a
                                                href={`/blog/${encodeURIComponent(item.slug)}`}
                                                className="audit-item-link"
                                                target="_blank"
                                                rel="noreferrer"
                                            >
                                                {item.title}
                                            </a>
                                            <p className="audit-item-meta">
                                                {item.slug} | {item.category} | {item.wordCount} mots
                                            </p>
                                        </div>

                                        <div className="audit-item-badges">
                                            <span className={`audit-pill ${item.quality}`}>{getQualityLabel(item.quality)}</span>
                                            <span className="audit-pill neutral">score {item.score}</span>
                                        </div>
                                    </div>

                                    <div className="audit-issues">
                                        {item.issues.slice(0, 3).map((issue, index) => (
                                            <span key={`${item.id}-${issue.type}-${index}`} className={`issue-pill ${issue.severity}`}>
                                                {getSeverityLabel(issue.severity)}: {issue.message}
                                            </span>
                                        ))}
                                        {item.issueCount > 3 ? (
                                            <span className="issue-pill neutral">+{item.issueCount - 3} autre(s) point(s)</span>
                                        ) : null}
                                    </div>
                                </article>
                            ))
                        ) : (
                            <p className="audit-loading-copy">Aucun probleme detecte pour l instant.</p>
                        )}
                    </div>
                ) : null}
            </section>

            <div className="admin-table-container">
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>Title</th>
                            <th>Category</th>
                            <th>Affiliate</th>
                            <th>Meta</th>
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
                                <td>
                                    <span className={`mini-pill ${post.relatedProductId ? "ok" : post.affiliateQuery ? "query" : "fallback"}`}>
                                        {getAffiliateTargetLabel(post)}
                                    </span>
                                </td>
                                <td>{post.metaDescription?.trim() ? "OK" : "Missing"}</td>
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
                .blog-admin-page {
                    display: flex;
                    flex-direction: column;
                    gap: 24px;
                }

                .flex-header {
                    display: flex;
                    justify-content: space-between;
                    gap: 16px;
                    align-items: flex-start;
                }

                .blog-admin-copy {
                    margin: 6px 0 0 0;
                    color: #666;
                    line-height: 1.5;
                }

                .header-actions {
                    display: flex;
                    gap: 10px;
                    flex-wrap: wrap;
                    justify-content: flex-end;
                }

                .refresh-btn,
                .smart-select {
                    padding: 8px 12px;
                    border: 1px solid var(--color-gold);
                    border-radius: 4px;
                    background: white;
                    color: var(--color-gold-dark);
                    cursor: pointer;
                    outline: none;
                }

                .refresh-btn {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                }

                .refresh-btn:disabled,
                .smart-select:disabled {
                    opacity: 0.65;
                    cursor: not-allowed;
                }

                .smart-select:hover,
                .refresh-btn:hover {
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

                .blog-audit-grid {
                    margin-bottom: 0;
                }

                .blog-audit-panel {
                    background: white;
                    border-radius: 8px;
                    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
                    padding: 1.5rem;
                }

                .blog-audit-panel-top {
                    display: flex;
                    justify-content: space-between;
                    gap: 16px;
                    align-items: flex-start;
                    margin-bottom: 1rem;
                }

                .blog-audit-panel-top h2 {
                    margin: 0 0 6px 0;
                    font-size: 1.25rem;
                }

                .blog-audit-panel-top p {
                    margin: 0;
                    color: #666;
                    line-height: 1.5;
                }

                .blog-audit-chip-row {
                    display: flex;
                    gap: 8px;
                    flex-wrap: wrap;
                    justify-content: flex-end;
                }

                .audit-chip,
                .mini-pill,
                .audit-pill,
                .issue-pill {
                    display: inline-flex;
                    align-items: center;
                    border-radius: 999px;
                    font-size: 0.75rem;
                    font-weight: 600;
                    line-height: 1.4;
                }

                .audit-chip {
                    padding: 6px 10px;
                    background: #f5f5f5;
                    color: #444;
                    border: 1px solid #ececec;
                }

                .audit-error-banner {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    margin-bottom: 1rem;
                    padding: 10px 12px;
                    border-radius: 8px;
                    background: #fff7ed;
                    color: #9a3412;
                    border: 1px solid #fdba74;
                }

                .audit-loading-copy {
                    margin: 0;
                    color: #666;
                }

                .audit-item-list {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }

                .audit-item-card {
                    border: 1px solid #ececec;
                    border-radius: 8px;
                    padding: 14px;
                    background: #fcfcfc;
                }

                .audit-item-top {
                    display: flex;
                    justify-content: space-between;
                    gap: 12px;
                    align-items: flex-start;
                    margin-bottom: 10px;
                }

                .audit-item-link {
                    color: #111;
                    font-weight: 700;
                    text-decoration: none;
                }

                .audit-item-link:hover {
                    text-decoration: underline;
                }

                .audit-item-meta {
                    margin: 4px 0 0 0;
                    font-size: 0.8rem;
                    color: #666;
                }

                .audit-item-badges,
                .audit-issues {
                    display: flex;
                    gap: 8px;
                    flex-wrap: wrap;
                }

                .audit-pill {
                    padding: 6px 10px;
                    border: 1px solid transparent;
                }

                .audit-pill.critical {
                    background: #fee2e2;
                    color: #991b1b;
                    border-color: #fecaca;
                }

                .audit-pill.needs_work {
                    background: #fef3c7;
                    color: #92400e;
                    border-color: #fcd34d;
                }

                .audit-pill.healthy {
                    background: #dcfce7;
                    color: #166534;
                    border-color: #bbf7d0;
                }

                .audit-pill.neutral,
                .issue-pill.neutral {
                    background: #f5f5f5;
                    color: #444;
                    border-color: #e5e5e5;
                }

                .issue-pill {
                    padding: 5px 9px;
                    border: 1px solid transparent;
                    font-weight: 500;
                }

                .issue-pill.critical {
                    background: #fff1f2;
                    color: #be123c;
                    border-color: #fecdd3;
                }

                .issue-pill.warning {
                    background: #fffbeb;
                    color: #92400e;
                    border-color: #fde68a;
                }

                .issue-pill.info {
                    background: #eff6ff;
                    color: #1d4ed8;
                    border-color: #bfdbfe;
                }

                .mini-pill {
                    padding: 5px 9px;
                    border: 1px solid transparent;
                }

                .mini-pill.ok {
                    background: #dcfce7;
                    color: #166534;
                    border-color: #bbf7d0;
                }

                .mini-pill.query {
                    background: #eff6ff;
                    color: #1d4ed8;
                    border-color: #bfdbfe;
                }

                .mini-pill.fallback {
                    background: #fef3c7;
                    color: #92400e;
                    border-color: #fcd34d;
                }

                .spin-icon {
                    animation: spin 1s linear infinite;
                }

                @keyframes spin {
                    to {
                        transform: rotate(360deg);
                    }
                }

                @media (max-width: 1100px) {
                    .flex-header,
                    .blog-audit-panel-top {
                        flex-direction: column;
                    }

                    .header-actions,
                    .blog-audit-chip-row {
                        justify-content: flex-start;
                    }
                }
            `}</style>
        </div>
    );
}

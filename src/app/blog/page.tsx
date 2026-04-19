import { ArrowRight, Calendar, User } from "lucide-react";
import Link from "next/link";

import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import { getBlogPosts } from "@/lib/blog";

export const metadata = {
    title: "Le Journal Arganor | Guides, routines et reperes beaute",
    description: "Des articles pour comprendre les produits, organiser une routine et mieux choisir.",
    keywords: ["beaute", "routine", "soins naturels", "guide achat", "arganor"],
};

interface BlogPageProps {
    searchParams: Promise<{ category?: string }>;
}

export default async function BlogPage({ searchParams }: BlogPageProps) {
    const params = await searchParams;
    const activeCategory = params.category || "All";
    const allPosts = getBlogPosts();

    const categories = ["All", ...Array.from(new Set(allPosts.map((post) => post.category)))];

    let displayPosts = allPosts;
    if (activeCategory !== "All") {
        displayPosts = allPosts.filter((post) => post.category === activeCategory);
    }

    const showingAll = activeCategory === "All";
    const featuredPost = showingAll && displayPosts.length > 0 ? displayPosts[0] : null;
    const regularPosts = showingAll ? displayPosts.slice(1) : displayPosts;

    return (
        <>
            <Header />
            <main>
                <section className="page-header" style={{ paddingBottom: "2rem" }}>
                    <div className="container">
                        <h1>Le Journal Arganor</h1>
                        <p>Des guides utiles, des routines simples et des reperes clairs avant achat.</p>
                    </div>
                </section>

                {featuredPost && (
                    <section className="section" style={{ paddingTop: "2rem", paddingBottom: "2rem" }}>
                        <div className="container">
                            <div
                                className="featured-post"
                                style={{
                                    display: "grid",
                                    gridTemplateColumns: "1fr 1fr",
                                    gap: "3rem",
                                    alignItems: "center",
                                    background: "var(--color-cream)",
                                    borderRadius: "8px",
                                    overflow: "hidden",
                                }}
                            >
                                <div className="featured-image" style={{ position: "relative", aspectRatio: "4/3", width: "100%", height: "100%" }}>
                                    <img
                                        src={featuredPost.image}
                                        alt={featuredPost.title}
                                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                    />
                                </div>
                                <div className="featured-content" style={{ padding: "2rem 3rem 2rem 0" }}>
                                    <span
                                        className="blog-category"
                                        style={{
                                            position: "static",
                                            display: "inline-block",
                                            marginBottom: "1rem",
                                            background: "var(--color-gold-light)",
                                            padding: "5px 12px",
                                        }}
                                    >
                                        {featuredPost.category}
                                    </span>
                                    <Link href={`/blog/${featuredPost.slug}`}>
                                        <h2 style={{ fontSize: "2.2rem", marginBottom: "1rem", lineHeight: "1.2" }}>{featuredPost.title}</h2>
                                    </Link>
                                    <p style={{ color: "var(--color-charcoal)", marginBottom: "1.5rem", fontSize: "1.1rem" }}>{featuredPost.excerpt}</p>
                                    <div className="blog-meta" style={{ marginBottom: "2rem" }}>
                                        <span>
                                            <Calendar size={14} /> {featuredPost.publishedDate}
                                        </span>
                                        <span>
                                            <User size={14} /> {featuredPost.author}
                                        </span>
                                    </div>
                                    <Link href={`/blog/${featuredPost.slug}`} className="btn btn-primary" style={{ display: "inline-flex", gap: "8px" }}>
                                        Lire l'article <ArrowRight size={16} />
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </section>
                )}

                <section className="section" style={{ paddingTop: "2rem" }}>
                    <div className="container">
                        <div
                            className="category-filters"
                            style={{ display: "flex", gap: "1rem", marginBottom: "3rem", overflowX: "auto", paddingBottom: "10px" }}
                        >
                            {categories.map((category, index) => {
                                const isActive = category === activeCategory;
                                const linkHref = category === "All" ? "/blog" : `/blog?category=${encodeURIComponent(category)}`;

                                return (
                                    <Link
                                        key={index}
                                        href={linkHref}
                                        className={`btn-outline ${isActive ? "active" : ""}`}
                                        style={{
                                            padding: "8px 20px",
                                            borderRadius: "30px",
                                            whiteSpace: "nowrap",
                                            border: isActive ? "1px solid var(--color-gold)" : "1px solid var(--color-grey)",
                                            background: isActive ? "var(--color-gold)" : "transparent",
                                            color: isActive ? "white" : "var(--color-black)",
                                        }}
                                    >
                                        {category}
                                    </Link>
                                );
                            })}
                        </div>

                        <div className="blog-grid">
                            {regularPosts.map((post) => (
                                <article key={post.id} className="blog-card" style={{ border: "1px solid var(--color-light-grey)", borderRadius: "8px", overflow: "hidden" }}>
                                    <div className="blog-image-container">
                                        <Link href={`/blog/${post.slug}`} style={{ display: "block", width: "100%", height: "100%" }}>
                                            <img
                                                src={post.image}
                                                alt={post.title}
                                                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                                loading="lazy"
                                            />
                                        </Link>
                                        <span className="blog-category">{post.category}</span>
                                    </div>
                                    <div className="blog-content" style={{ padding: "1.5rem" }}>
                                        <div className="blog-meta">
                                            <span>
                                                <Calendar size={14} /> {post.publishedDate}
                                            </span>
                                        </div>
                                        <Link href={`/blog/${post.slug}`}>
                                            <h2 className="blog-title" style={{ fontSize: "1.3rem" }}>{post.title}</h2>
                                        </Link>
                                        <p className="blog-excerpt">{post.excerpt}</p>
                                        <Link href={`/blog/${post.slug}`} className="read-more">
                                            Lire l'article
                                        </Link>
                                    </div>
                                </article>
                            ))}
                        </div>
                    </div>
                </section>
            </main>
            <Footer />
        </>
    );
}

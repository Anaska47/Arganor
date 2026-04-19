import { ArrowLeft, Calendar, Star, User } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import { getBlogPostBySlug, getBlogPosts } from "@/lib/blog";
import { replaceMarkdownProductLinksWithAffiliateLinks, resolveBlogAffiliateTarget } from "@/lib/blog-affiliate";

interface BlogPostPageProps {
    params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
    const posts = getBlogPosts();
    return posts.map((post) => ({
        slug: post.slug,
    }));
}

export async function generateMetadata({ params }: BlogPostPageProps) {
    const { slug } = await params;
    const decodedSlug = decodeURIComponent(slug);
    const post = getBlogPostBySlug(decodedSlug);

    if (!post) return { title: "Article introuvable | Arganor" };

    return {
        title: `${post.title} | Journal Arganor`,
        description: post.metaDescription || post.excerpt,
        keywords: post.seoTags || [],
        alternates: {
            canonical: `/blog/${post.slug}`,
        },
        openGraph: {
            title: post.title,
            description: post.metaDescription || post.excerpt,
            images: [post.image],
        },
    };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
    const { slug } = await params;
    const decodedSlug = decodeURIComponent(slug);
    const post = getBlogPostBySlug(decodedSlug);

    if (!post) notFound();
    if (decodedSlug !== post.slug) {
        redirect(`/blog/${post.slug}`);
    }

    const affiliateTarget = resolveBlogAffiliateTarget(post);
    const contentHtml = replaceMarkdownProductLinksWithAffiliateLinks(post.content, post)
        .replace(/^# (.*)/gm, '<h2 style="font-size: 2rem; margin-top: 2.5rem; margin-bottom: 1.5rem; color: var(--color-black);">$1</h2>')
        .replace(/^## (.*)/gm, '<h3 style="font-size: 1.6rem; margin-top: 2rem; margin-bottom: 1rem;">$1</h3>')
        .replace(/^### (.*)/gm, '<h4 style="font-size: 1.3rem; margin-top: 1.5rem; margin-bottom: 1rem;">$1</h4>')
        .replace(/- \*\*(.*?)\*\*:/g, '<strong style="display:block; margin-top: 1rem; color: var(--color-gold-dark);">- $1:</strong>')
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
        .replace(
            /> "(.*?)"/g,
            '<blockquote style="font-size: 1.3rem; margin: 2rem 0; padding: 1.5rem; background: var(--color-light-grey); border-left: 4px solid var(--color-gold); font-style: italic;">"$1"</blockquote>',
        )
        .replace(/\n\n/g, "<br /><br />");

    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: post.title,
        image: post.image,
        datePublished: post.publishedDate,
        author: [
            {
                "@type": "Person",
                name: post.author,
            },
        ],
    };

    return (
        <>
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
            <Header />
            <main>
                <article className="blog-post-page">
                    <div className="post-header">
                        <div className="container post-header-content">
                            <Link href="/blog" className="back-link">
                                <ArrowLeft size={16} /> Retour au journal
                            </Link>
                            <span className="post-category">{post.category}</span>
                            <h1 className="post-title">{post.title}</h1>
                            <div className="post-meta">
                                <span>
                                    <Calendar size={16} /> {post.publishedDate}
                                </span>
                                <span>
                                    <User size={16} /> {post.author}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="post-hero-image">
                        <div className="container" style={{ maxWidth: "900px" }}>
                            <div
                                className="hero-img-wrapper"
                                style={{
                                    position: "relative",
                                    width: "100%",
                                    height: "500px",
                                    borderRadius: "12px",
                                    overflow: "hidden",
                                    marginTop: "20px",
                                }}
                            >
                                <img src={post.image} alt={post.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            </div>
                        </div>
                    </div>

                    <div className="container post-body-container" style={{ maxWidth: "800px", margin: "0 auto", padding: "3rem 1rem" }}>
                        <div className="post-content" style={{ fontSize: "1.15rem", lineHeight: "1.9", color: "#333" }}>
                            <p
                                className="lead"
                                style={{
                                    fontSize: "1.4rem",
                                    fontStyle: "italic",
                                    fontWeight: "300",
                                    marginBottom: "2.5rem",
                                    borderLeft: "3px solid var(--color-gold)",
                                    paddingLeft: "1.5rem",
                                }}
                            >
                                {post.excerpt}
                            </p>

                            <div className="content-text" style={{ marginBottom: "3rem" }} dangerouslySetInnerHTML={{ __html: contentHtml }} />

                            {post.pinterestImage && (
                                <div
                                    className="pinterest-share-box"
                                    style={{
                                        background: "#FFF5F5",
                                        padding: "2rem",
                                        borderRadius: "12px",
                                        border: "1px solid #FFDFDF",
                                        textAlign: "center",
                                        margin: "3rem 0",
                                        display: "flex",
                                        flexDirection: "column",
                                        alignItems: "center",
                                    }}
                                >
                                    <h3 style={{ fontSize: "1.4rem", color: "#E60023", marginBottom: "1rem", fontFamily: "var(--font-playfair)" }}>
                                        Epinglez pour lire plus tard !
                                    </h3>
                                    <p style={{ fontSize: "0.95rem", color: "#555", marginBottom: "1.5rem", maxWidth: "400px" }}>
                                        Utilisez l&apos;extension Pinterest ou la fonction &quot;Creer depuis une URL&quot; pour partager
                                        instantanement cette image avec votre communaute.
                                    </p>
                                    <div
                                        style={{
                                            maxWidth: "300px",
                                            width: "100%",
                                            boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
                                            borderRadius: "8px",
                                            overflow: "hidden",
                                        }}
                                    >
                                        <img
                                            src={post.pinterestImage}
                                            alt={`Epingle Pinterest : ${post.title}`}
                                            style={{ width: "100%", height: "auto", display: "block" }}
                                        />
                                    </div>
                                </div>
                            )}

                            {affiliateTarget.trackHref && (
                                <div
                                    className="affiliate-box"
                                    style={{
                                        background: "var(--color-cream)",
                                        padding: "2.5rem",
                                        borderRadius: "12px",
                                        border: "1px solid #E8D2A6",
                                        textAlign: "center",
                                        margin: "4rem 0",
                                    }}
                                >
                                    <span style={{ textTransform: "uppercase", fontSize: "0.8rem", letterSpacing: "2px", color: "var(--color-gold-dark)" }}>
                                        Le produit recommande dans cet article
                                    </span>
                                    <h3 style={{ fontSize: "1.8rem", margin: "1rem 0", fontFamily: "var(--font-heading)" }}>
                                        {affiliateTarget.displayName || "Voir sur Amazon"}
                                    </h3>

                                    <div style={{ display: "flex", justifyContent: "center", gap: "5px", color: "var(--color-gold)", marginBottom: "1.5rem" }}>
                                        <Star size={20} fill="var(--color-gold)" />
                                        <Star size={20} fill="var(--color-gold)" />
                                        <Star size={20} fill="var(--color-gold)" />
                                        <Star size={20} fill="var(--color-gold)" />
                                        <Star size={20} fill="var(--color-gold)" />
                                    </div>

                                    <a
                                        href={affiliateTarget.trackHref}
                                        className="btn btn-primary"
                                        style={{ padding: "1.2rem 3rem", fontSize: "1.1rem", backgroundColor: "#FF9900", color: "black", width: "100%", maxWidth: "400px" }}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        Commander sur Amazon
                                    </a>
                                    <p style={{ fontSize: "0.85rem", color: "#666", marginTop: "1rem" }}>Livraison Premium gratuite et retour garanti.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </article>
            </main>
            <Footer />
        </>
    );
}

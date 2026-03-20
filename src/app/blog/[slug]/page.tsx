import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { getBlogPostBySlug, getBlogPosts } from "@/lib/blog";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Calendar, User, ArrowLeft } from "lucide-react";
import { getProductById } from "@/lib/data";
import { getAffiliateLink } from "@/lib/affiliate";

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
    const post = getBlogPostBySlug(slug);

    if (!post) return { title: "Article Not Found" };

    return {
        title: `${post.title} | Arganor Journal`,
        description: post.excerpt,
        keywords: post.seoTags || [],
        openGraph: {
            title: post.title,
            description: post.excerpt,
            images: [post.image],
        },
    };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
    const { slug } = await params;
    const post = getBlogPostBySlug(slug);

    if (!post) notFound();

    const relatedProduct = post.relatedProductId ? getProductById(post.relatedProductId) : null;

    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": post.title,
        "image": post.image,
        "datePublished": post.publishedDate,
        "author": [{
            "@type": "Person",
            "name": post.author
        }]
    };

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <Header />
            <main>
                <article className="blog-post-page">
                    <div className="post-header">
                        <div className="container post-header-content">
                            <Link href="/blog" className="back-link"><ArrowLeft size={16} /> Back to Journal</Link>
                            <span className="post-category">{post.category}</span>
                            <h1 className="post-title">{post.title}</h1>
                            <div className="post-meta">
                                <span><Calendar size={16} /> {post.publishedDate}</span>
                                <span><User size={16} /> {post.author}</span>
                            </div>
                        </div>
                    </div>

                    <div className="post-hero-image">
                        <div className="container">
                            <div className="hero-img-wrapper">
                                <Image
                                    src={post.image}
                                    alt={post.title}
                                    fill
                                    className="img"
                                    sizes="100vw"
                                    priority
                                />
                            </div>
                        </div>
                    </div>

                    <div className="container post-body-container">
                        <div className="post-content">
                            <p className="lead">{post.excerpt}</p>
                            <div className="content-text" dangerouslySetInnerHTML={{
                                __html: post.content
                                    .replace(/^# (.*)/gm, '<h2>$1</h2>')
                                    .replace(/^## (.*)/gm, '<h3>$1</h3>')
                                    .replace(/^### (.*)/gm, '<h4>$1</h4>')
                                    .replace(/- \*\*(.*?)\*\*:/g, '<strong>• $1:</strong>')
                                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                    .replace(/> "(.*?)"/g, '<blockquote>"$1"</blockquote>')
                                    .replace(/\n\n/g, '<br /><br />')
                            }} />

                            {/* Affiliate Block */}
                            {relatedProduct && (
                                <div className="affiliate-box">
                                    <h4>Recommended for this Routine</h4>
                                    <p>Experience the pure benefits mentioned in this article.</p>
                                    <h3 style={{ marginBottom: "1rem" }}>{relatedProduct.name}</h3>
                                    <a href={getAffiliateLink(relatedProduct, 'fr')} className="btn btn-primary" target="_blank" rel="noopener noreferrer">
                                        Voir le produit sur Amazon
                                    </a>
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

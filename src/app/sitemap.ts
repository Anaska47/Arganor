import { MetadataRoute } from 'next';
import { getPublicProducts } from '@/lib/data';
import { getBlogPosts } from '@/lib/blog';
import { getSiteUrl } from '@/lib/site';

export default function sitemap(): MetadataRoute.Sitemap {
    const baseUrl = getSiteUrl();

    // Get all products
    const products = getPublicProducts();
    const productUrls = products.map((product) => ({
        url: `${baseUrl}/products/${product.slug}`,
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.8,
    }));

    // Get all blog posts
    const posts = getBlogPosts();
    const postUrls = posts.map((post) => ({
        url: `${baseUrl}/blog/${post.slug}`,
        lastModified: new Date(post.publishedDate),
        changeFrequency: 'monthly' as const,
        priority: 0.7,
    }));

    // Categories
    const categories = ['face', 'hair', 'body', 'skincare', 'anti-aging'];
    const categoryUrls = categories.map((cat) => ({
        url: `${baseUrl}/category/${cat}`,
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.6,
    }));

    // Base routes
    const routes = [
        '',
        '/products',
        '/blog',
        '/about',
        '/contact',
    ].map((route) => ({
        url: `${baseUrl}${route}`,
        lastModified: new Date(),
        changeFrequency: 'daily' as const,
        priority: 1.0,
    }));

    return [...routes, ...productUrls, ...postUrls, ...categoryUrls];
}

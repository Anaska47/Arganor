import { NextResponse } from 'next/server';
import { getBlogPosts } from '@/lib/blog';

export async function GET() {
    const posts = getBlogPosts();
    
    // Fallback à Vercel en production, localhost sinon
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://arganor.vercel.app';

    let rssItems = '';

    // Ne prendre que les 50 derniers posts pour ne pas surcharger le flux
    const recentPosts = posts.slice(0, 50);

    recentPosts.forEach(post => {
        // Encodage strict de l'URL pour être valide selon les standards RSS (Pinterest rejette les caractères accentués purs)
        const url = encodeURI(`${siteUrl}/blog/${post.slug}`);
        
        // On s'assure d'avoir l'URL absolue pour l'image (obligatoire pour Pinterest)
        let imageUrl = '';
        if (post.pinterestImage) {
            imageUrl = post.pinterestImage.startsWith('http') ? post.pinterestImage : `${siteUrl}${post.pinterestImage}`;
        } else if (post.image) {
            imageUrl = post.image.startsWith('http') ? post.image : `${siteUrl}${post.image}`;
        }
        
        // Encoder l'image URL pour Pinterest
        imageUrl = encodeURI(imageUrl);

        rssItems += `
        <item>
            <title><![CDATA[${post.title}]]></title>
            <link>${url}</link>
            <guid isPermaLink="true">${url}</guid>
            <pubDate>${new Date(post.publishedDate).toUTCString()}</pubDate>
            <description><![CDATA[${post.metaDescription || post.excerpt}]]></description>
            ${imageUrl ? `<enclosure url="${imageUrl.replace(/&/g, '&amp;')}" type="image/jpeg" />` : ''}
            ${imageUrl ? `<media:content url="${imageUrl.replace(/&/g, '&amp;')}" type="image/jpeg" medium="image" />` : ''}
        </item>`;
    });

    const rssFeed = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/" xmlns:atom="http://www.w3.org/2005/Atom">
    <channel>
        <title>Arganor Beauté Naturelle</title>
        <link>${siteUrl}</link>
        <description>Le meilleur de la cosmétique naturelle et des routines beauté luxueuses.</description>
        <language>fr</language>
        <atom:link href="${siteUrl}/feed.xml" rel="self" type="application/rss+xml" />
        ${rssItems}
    </channel>
</rss>`;

    return new NextResponse(rssFeed, {
        headers: {
            'Content-Type': 'text/xml',
            // Mise en cache CDN d'une heure pour être très rapide pour les bots Pinterest
            'Cache-Control': 's-maxage=3600, stale-while-revalidate',
        },
    });
}

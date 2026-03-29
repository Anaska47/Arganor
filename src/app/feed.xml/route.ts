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
        const url = encodeURI(`${siteUrl}/blog/${post.slug}`);
        
        // S'il y a plusieurs images (méga-scale de 5 pins), on les publie toutes comme entités distinctes
        const imagesToPin = post.pinterestImages && post.pinterestImages.length > 0 
            ? post.pinterestImages 
            : [post.pinterestImage || post.image];

        imagesToPin.forEach((pinPath: string | undefined, index: number) => {
            if (!pinPath) return;

            // URL absolue de l'image
            let imageUrl = pinPath.startsWith('http') ? pinPath : `${siteUrl}${pinPath}`;
            imageUrl = encodeURI(imageUrl);

            // Pour que Pinterest ne les voit pas comme des doublons absolus, on ajoute l'index au lien permaLink (tout en redirigeant vers le même article)
            const uniqueGuid = index > 0 ? `${url}?pin=${index}` : url;
            // On peut même faire varier légèrement le titre !
            const variantTitle = index > 0 ? `${post.title} (Astuce #${index + 1})` : post.title;

            rssItems += `
        <item>
            <title><![CDATA[${variantTitle}]]></title>
            <link>${url}</link>
            <guid isPermaLink="true">${uniqueGuid}</guid>
            <pubDate>${new Date(post.publishedDate).toUTCString()}</pubDate>
            <description><![CDATA[${post.metaDescription || post.excerpt}]]></description>
            <enclosure url="${imageUrl.replace(/&/g, '&amp;')}" type="image/jpeg" />
            <media:content url="${imageUrl.replace(/&/g, '&amp;')}" type="image/jpeg" medium="image" />
        </item>`;
        });
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

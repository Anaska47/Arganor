import { NextResponse } from "next/server";

import { getBlogPosts } from "@/lib/blog";
import { getSiteUrl, toAbsoluteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

function escapeXml(value: string) {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

export async function GET() {
    const posts = getBlogPosts();
    const siteUrl = getSiteUrl();
    let rssItems = "";

    const recentPosts = posts.slice(0, 50);

    recentPosts.forEach((post) => {
        const url = encodeURI(`${siteUrl}/blog/${post.slug}`);
        const imagesToPin =
            post.pinterestImages && post.pinterestImages.length > 0
                ? post.pinterestImages
                : [post.pinterestImage || post.image];

        imagesToPin.forEach((pinPath: string | undefined, index: number) => {
            if (!pinPath) return;

            let imageUrl = toAbsoluteUrl(pinPath, siteUrl);
            imageUrl = encodeURI(imageUrl);

            const uniqueGuid = index > 0 ? `${url}?pin=${index}` : url;
            const variantTitle = index > 0 ? `${post.title} (Astuce #${index + 1})` : post.title;

            rssItems += `
        <item>
            <title><![CDATA[${variantTitle}]]></title>
            <link>${escapeXml(url)}</link>
            <guid isPermaLink="true">${escapeXml(uniqueGuid)}</guid>
            <pubDate>${new Date(post.publishedDate).toUTCString()}</pubDate>
            <description><![CDATA[${post.metaDescription || post.excerpt}]]></description>
            <enclosure url="${escapeXml(imageUrl)}" type="image/jpeg" />
            <media:content url="${escapeXml(imageUrl)}" type="image/jpeg" medium="image" />
        </item>`;
        });
    });

    const rssFeed = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/" xmlns:atom="http://www.w3.org/2005/Atom">
    <channel>
        <title>Arganor Beaute Naturelle</title>
        <link>${escapeXml(siteUrl)}</link>
        <description>Guides, routines et selections produits autour de la beaute naturelle.</description>
        <language>fr</language>
        <atom:link href="${escapeXml(`${siteUrl}/feed.xml`)}" rel="self" type="application/rss+xml" />
        ${rssItems}
    </channel>
</rss>`;

    return new NextResponse(rssFeed, {
        headers: {
            "Content-Type": "application/rss+xml; charset=utf-8",
            "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=300",
        },
    });
}

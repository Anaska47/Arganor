import { getProducts } from "@/lib/data";
import fs from 'fs';
import path from 'path';
import { NextResponse } from "next/server";

export async function GET() {
    // 1. Get products count
    const products = getProducts();
    const totalProducts = products.length;

    // 2. Get real clicks count
    let realClicks = 0;
    let recentActivities: any[] = [];
    try {
        const clicksPath = path.join(process.cwd(), 'src/data/clicks.json');
        if (fs.existsSync(clicksPath)) {
            const clicksData = JSON.parse(fs.readFileSync(clicksPath, 'utf8'));
            realClicks = clicksData.totalClicks || 0;
            recentActivities = clicksData.recentClicks || [];
        }
    } catch (e) {
        console.error("Error reading clicks:", e);
    }

    // 3. Get blog posts count
    let blogPosts = 0;
    try {
        const postsPath = path.join(process.cwd(), 'src/data/posts.json');
        const postsData = JSON.parse(fs.readFileSync(postsPath, 'utf8'));
        blogPosts = Array.isArray(postsData) ? postsData.length : 0;
    } catch (e) {
        console.error("Error reading posts:", e);
    }

    const totalReviews = products.reduce((acc, p) => acc + (p.reviews || 0), 0);
    const avgRating = (products.reduce((acc, p) => acc + (p.rating || 0), 0) / (totalProducts || 1)).toFixed(1);

    // Revenue estimation: based on real clicks * avg price * 5% commission
    const avgPrice = 35;
    const revenue = (realClicks * avgPrice * 0.05).toFixed(2);

    return NextResponse.json({
        totalProducts,
        blogPosts,
        totalReviews,
        avgRating,
        revenue,
        clicks: realClicks,
        activities: recentActivities.map((c: any) => ({
            type: "sale",
            text: `Clic sur ${c.productName} (${c.source})`,
            time: formatTime(c.time),
            status: "info"
        })),
        isLive: true
    });
}

function formatTime(isoDate: string) {
    const diff = Date.now() - new Date(isoDate).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "à l'instant";
    if (mins < 60) return `il y a ${mins} min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `il y a ${hours}h`;
    return new Date(isoDate).toLocaleDateString();
}

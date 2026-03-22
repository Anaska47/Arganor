import { NextResponse } from "next/server";

export async function GET() {
    // In production, you would add a session check here (NextAuth/Clerk/Supabase)
    // For now, we return the key from server-side env to keep it out of the JS bundle files
    return NextResponse.json({
        apiKey: process.env.ARGANOR_API_KEY || "fallback_key"
    });
}

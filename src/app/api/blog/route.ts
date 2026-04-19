import { NextResponse } from "next/server";

import { isAuthorizedRequest, unauthorizedJson } from "@/lib/api-auth";
import { appendRuntimePost, readRuntimePosts } from "@/lib/runtime-content-store";

export async function GET() {
    try {
        const posts = await readRuntimePosts<unknown>();
        return NextResponse.json(posts);
    } catch {
        return NextResponse.json({ error: "Failed to fetch posts" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    if (!isAuthorizedRequest(request)) {
        return unauthorizedJson();
    }

    try {
        const newPost = await request.json();
        await appendRuntimePost(newPost, "api:blog");

        return NextResponse.json({ message: "Post created successfully", post: newPost });
    } catch {
        return NextResponse.json({ error: "Failed to create post" }, { status: 500 });
    }
}

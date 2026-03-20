import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const dataFilePath = path.join(process.cwd(), 'src/data/posts.json');

export async function GET() {
    try {
        const fileContents = await fs.readFile(dataFilePath, 'utf8');
        const posts = JSON.parse(fileContents);
        return NextResponse.json(posts);
    } catch {
        return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const newPost = await request.json();
        const fileContents = await fs.readFile(dataFilePath, 'utf8');
        const posts = JSON.parse(fileContents);

        // Add new post
        posts.push(newPost);

        await fs.writeFile(dataFilePath, JSON.stringify(posts, null, 2));

        return NextResponse.json({ message: 'Post created successfully', post: newPost });
    } catch {
        return NextResponse.json({ error: 'Failed to create post' }, { status: 500 });
    }
}

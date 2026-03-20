import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const dataFilePath = path.join(process.cwd(), 'src/data/products.json');

export async function GET() {
    try {
        const fileContents = await fs.readFile(dataFilePath, 'utf8');
        const products = JSON.parse(fileContents);
        return NextResponse.json(products);
    } catch {
        return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const newProduct = await request.json();
        const fileContents = await fs.readFile(dataFilePath, 'utf8');
        const products = JSON.parse(fileContents);

        // Add new product
        products.push(newProduct);

        await fs.writeFile(dataFilePath, JSON.stringify(products, null, 2));

        return NextResponse.json({ message: 'Product created successfully', product: newProduct });
    } catch {
        return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
    }
}

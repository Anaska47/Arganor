import { NextResponse } from "next/server";

import { isAuthorizedRequest, unauthorizedJson } from "@/lib/api-auth";
import { appendRuntimeProduct, readRuntimeProducts } from "@/lib/runtime-content-store";

export async function GET() {
    try {
        const products = await readRuntimeProducts<unknown>();
        return NextResponse.json(products);
    } catch {
        return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    if (!isAuthorizedRequest(request)) {
        return unauthorizedJson();
    }

    try {
        const newProduct = await request.json();
        await appendRuntimeProduct(newProduct, "api:products");

        return NextResponse.json({ message: "Product created successfully", product: newProduct });
    } catch {
        return NextResponse.json({ error: "Failed to create product" }, { status: 500 });
    }
}

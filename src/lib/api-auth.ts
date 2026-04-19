import { NextResponse } from "next/server";

export function getAdminApiKey(): string {
    return (process.env.ARGANOR_API_KEY || "").trim();
}

export function requiresApiKey(): boolean {
    return process.env.NODE_ENV === "production" || !!getAdminApiKey();
}

export function isAuthorizedRequest(req: Request): boolean {
    const apiKey = getAdminApiKey();

    if (!requiresApiKey()) {
        return true;
    }

    if (!apiKey) {
        return false;
    }

    const authHeader = req.headers.get("authorization") || "";
    const headerKey = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (headerKey === apiKey) {
        return true;
    }

    const xApiKey = req.headers.get("x-api-key") || "";
    if (xApiKey.trim() === apiKey) {
        return true;
    }

    const queryKey = new URL(req.url).searchParams.get("key") || "";
    return queryKey.trim() === apiKey;
}

export function unauthorizedJson() {
    return NextResponse.json(
        { success: false, error: "Unauthorized. Provide a valid ARGANOR_API_KEY." },
        { status: 401 },
    );
}

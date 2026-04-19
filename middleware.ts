import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const ADMIN_COOKIE_NAME = "arganor_admin_session";

function getAdminApiKey() {
    return (process.env.ARGANOR_API_KEY || "").trim();
}

function shouldProtectAdmin() {
    return process.env.NODE_ENV === "production" || Boolean(getAdminApiKey());
}

function readProvidedKey(request: NextRequest) {
    const bearer = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
    if (bearer) {
        return bearer;
    }

    const headerKey = (request.headers.get("x-api-key") || "").trim();
    if (headerKey) {
        return headerKey;
    }

    const queryKey = (request.nextUrl.searchParams.get("key") || "").trim();
    if (queryKey) {
        return queryKey;
    }

    return (request.cookies.get(ADMIN_COOKIE_NAME)?.value || "").trim();
}

function buildUnauthorizedResponse(status: number, message: string) {
    return new NextResponse(message, {
        status,
        headers: {
            "content-type": "text/plain; charset=utf-8",
            "cache-control": "no-store",
        },
    });
}

export function middleware(request: NextRequest) {
    if (!shouldProtectAdmin()) {
        return NextResponse.next();
    }

    const apiKey = getAdminApiKey();
    if (!apiKey) {
        return buildUnauthorizedResponse(503, "Admin access is locked. Configure ARGANOR_API_KEY in production.");
    }

    const providedKey = readProvidedKey(request);
    if (providedKey !== apiKey) {
        return buildUnauthorizedResponse(
            401,
            "Unauthorized admin access. Open /admin?key=YOUR_ARGANOR_API_KEY or send Bearer/x-api-key.",
        );
    }

    const cleanUrl = request.nextUrl.clone();
    const hadQueryKey = cleanUrl.searchParams.has("key");
    if (hadQueryKey) {
        cleanUrl.searchParams.delete("key");
    }

    const response = hadQueryKey ? NextResponse.redirect(cleanUrl) : NextResponse.next();
    response.cookies.set({
        name: ADMIN_COOKIE_NAME,
        value: apiKey,
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/admin",
        maxAge: 60 * 60 * 8,
    });

    return response;
}

export const config = {
    matcher: ["/admin/:path*"],
};

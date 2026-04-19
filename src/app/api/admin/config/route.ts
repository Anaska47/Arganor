import { NextResponse } from "next/server";
import { getAdminApiKey, requiresApiKey } from "@/lib/api-auth";

export async function GET() {
    return NextResponse.json({
        apiKeyConfigured: !!getAdminApiKey(),
        requiresApiKey: requiresApiKey(),
        keyStorageName: "arganorAdminApiKey",
    });
}

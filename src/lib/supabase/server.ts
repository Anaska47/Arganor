import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "./types";

const SUPABASE_URL_ENV = "SUPABASE_URL";
const SUPABASE_SERVICE_ROLE_ENV = "SUPABASE_SERVICE_ROLE_KEY";

let serverClient: SupabaseClient<Database> | null = null;

function readEnv(name: string): string {
    const value = process.env[name]?.trim();

    if (!value) {
        throw new Error(`[supabase] Missing required server environment variable: ${name}`);
    }

    return value;
}

export function hasSupabaseServerConfig(): boolean {
    return Boolean(process.env[SUPABASE_URL_ENV]?.trim() && process.env[SUPABASE_SERVICE_ROLE_ENV]?.trim());
}

export function getSupabaseServerClient(): SupabaseClient<Database> {
    if (serverClient) {
        return serverClient;
    }

    const supabaseUrl = readEnv(SUPABASE_URL_ENV);
    const serviceRoleKey = readEnv(SUPABASE_SERVICE_ROLE_ENV);

    serverClient = createClient<Database>(supabaseUrl, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
        global: {
            headers: {
                "X-Client-Info": "arganor-growth-machine-phase1",
            },
        },
    });

    return serverClient;
}

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "../..");
const ENV_FILES = [".env.local", ".env"];

let envLoaded = false;
let missingConfigWarned = false;
let localSyncDisabledWarned = false;
let supabaseClientPromise = null;

function loadScriptEnv() {
    if (envLoaded) {
        return;
    }

    envLoaded = true;

    for (const filename of ENV_FILES) {
        const filePath = path.join(ROOT, filename);
        if (!fs.existsSync(filePath)) {
            continue;
        }

        try {
            process.loadEnvFile(filePath);
        } catch (error) {
            console.warn(`[growth-machine-supabase] Failed to load ${filename}:`, error);
        }
    }
}

function hasSupabaseConfig() {
    loadScriptEnv();
    return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function isSupabaseSyncDisabled() {
    loadScriptEnv();
    return process.env.ARGANOR_DISABLE_SUPABASE_SYNC === "1" || process.env.ARGANOR_LOCAL_MODE === "1";
}

function warnMissingConfig() {
    if (missingConfigWarned) {
        return;
    }

    missingConfigWarned = true;
    console.warn("[growth-machine-supabase] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing. Dual-write skipped.");
}

function warnLocalSyncDisabled() {
    if (localSyncDisabledWarned) {
        return;
    }

    localSyncDisabledWarned = true;
    console.warn("[growth-machine-supabase] Supabase sync disabled for local-only autopilot mode.");
}

async function getSupabaseClient() {
    if (isSupabaseSyncDisabled()) {
        warnLocalSyncDisabled();
        return null;
    }

    if (!hasSupabaseConfig()) {
        warnMissingConfig();
        return null;
    }

    if (!supabaseClientPromise) {
        supabaseClientPromise = import("@supabase/supabase-js").then(({ createClient }) =>
            createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false,
                },
                global: {
                    headers: {
                        "X-Client-Info": "arganor-growth-machine-script",
                    },
                },
            }),
        );
    }

    return supabaseClientPromise;
}

module.exports = {
    getSupabaseClient,
    hasSupabaseConfig,
    isSupabaseSyncDisabled,
};

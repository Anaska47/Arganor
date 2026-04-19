const fs = require("fs");
const path = require("path");

const { getSupabaseClient, hasSupabaseConfig } = require("./growth-machine-supabase.js");
const { upsertAgentMemory } = require("./growth-machine-memory.js");

const ROOT = path.join(__dirname, "../..");
const MODE = (process.argv[2] || "both").toLowerCase();

const TARGETS = [
    {
        key: "posts",
        filePath: path.join(ROOT, "src/data/posts.json"),
        memoryKey: "hook:content:posts",
        scopeRef: "runtime:posts",
    },
    {
        key: "products",
        filePath: path.join(ROOT, "src/data/products.json"),
        memoryKey: "hook:content:products",
        scopeRef: "runtime:products",
    },
];

function isSupportedMode(value) {
    return value === "pull" || value === "push" || value === "both";
}

function readLocalArray(filePath) {
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
}

function writeLocalArray(filePath, items) {
    fs.writeFileSync(filePath, `${JSON.stringify(items, null, 2)}\n`, "utf8");
}

function normalizeJson(value) {
    return JSON.stringify(value);
}

function buildSnapshot(items, source) {
    return {
        version: 1,
        updatedAt: new Date().toISOString(),
        source,
        items,
    };
}

function summarizeChange(prefix, targetKey, localItems, remoteItems) {
    console.log(
        `[runtime-sync] ${prefix} ${targetKey}: local=${localItems.length}, remote=${remoteItems.length}`,
    );
}

async function readRemoteSnapshot(client, memoryKey) {
    const { data, error } = await client
        .from("agent_memory")
        .select("memory_key,value,updated_at")
        .eq("memory_key", memoryKey)
        .maybeSingle();

    if (error) {
        throw error;
    }

    return data;
}

async function pullTarget(client, target) {
    const localItems = readLocalArray(target.filePath);
    const remoteRecord = await readRemoteSnapshot(client, target.memoryKey);
    const remoteItems = Array.isArray(remoteRecord?.value?.items) ? remoteRecord.value.items : null;

    if (!remoteItems) {
        console.log(`[runtime-sync] pull ${target.key}: no remote snapshot found, keeping local file.`);
        return { changed: false, skipped: true };
    }

    summarizeChange("pull", target.key, localItems, remoteItems);

    if (remoteItems.length < localItems.length) {
        console.log(
            `[runtime-sync] pull ${target.key}: remote snapshot looks older (fewer items), skip overwrite.`,
        );
        return { changed: false, skipped: true };
    }

    if (normalizeJson(localItems) === normalizeJson(remoteItems)) {
        console.log(`[runtime-sync] pull ${target.key}: already in sync.`);
        return { changed: false, skipped: false };
    }

    writeLocalArray(target.filePath, remoteItems);
    console.log(`[runtime-sync] pull ${target.key}: local file updated from runtime store.`);
    return { changed: true, skipped: false };
}

async function pushTarget(target) {
    const localItems = readLocalArray(target.filePath);
    const snapshot = buildSnapshot(localItems, "sync-runtime-content.js");

    await upsertAgentMemory({
        memory_key: target.memoryKey,
        memory_type: "note",
        scope_ref: target.scopeRef,
        source: "sync-runtime-content.js",
        summary: `${target.key} snapshot synced with ${localItems.length} item(s).`,
        last_seen_at: snapshot.updatedAt,
        value: snapshot,
    });

    console.log(`[runtime-sync] push ${target.key}: runtime store updated with ${localItems.length} item(s).`);
    return { changed: true, skipped: false };
}

async function main() {
    if (!isSupportedMode(MODE)) {
        console.error(`[runtime-sync] Unsupported mode "${MODE}". Use pull, push or both.`);
        process.exit(1);
    }

    if (!hasSupabaseConfig()) {
        console.log("[runtime-sync] Supabase config missing. Nothing to sync.");
        return;
    }

    const client = await getSupabaseClient();
    if (!client) {
        console.log("[runtime-sync] Supabase sync disabled. Nothing to sync.");
        return;
    }

    for (const target of TARGETS) {
        if (MODE === "pull" || MODE === "both") {
            await pullTarget(client, target);
        }

        if (MODE === "push" || MODE === "both") {
            await pushTarget(target);
        }
    }
}

main().catch((error) => {
    console.error("[runtime-sync] Failed:", error);
    process.exit(1);
});

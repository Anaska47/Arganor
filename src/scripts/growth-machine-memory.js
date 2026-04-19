const { getSupabaseClient } = require("./growth-machine-supabase.js");

const NAMESPACED_MEMORY_KEY_PATTERN = /^(product|post|cluster|hook):.+/;

function optionalText(value) {
    if (typeof value !== "string") {
        return null;
    }

    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
}

function assertNamespacedMemoryKey(memoryKey) {
    if (!NAMESPACED_MEMORY_KEY_PATTERN.test(memoryKey)) {
        throw new Error(
            `[growth-machine-memory] agent_memory.memory_key must be namespaced (product:..., post:..., cluster:..., hook:...). Received: ${memoryKey}`,
        );
    }
}

async function upsertAgentMemory(record) {
    assertNamespacedMemoryKey(record.memory_key);

    const client = await getSupabaseClient();
    if (!client) {
        return null;
    }

    const payload = {
        memory_type: "note",
        value: {},
        ...record,
        memory_key: record.memory_key,
        scope_ref: optionalText(record.scope_ref),
        product_ref: optionalText(record.product_ref),
        post_ref: optionalText(record.post_ref),
        cluster_ref: optionalText(record.cluster_ref),
        summary: optionalText(record.summary),
        source: optionalText(record.source),
    };

    const { data, error } = await client
        .from("agent_memory")
        .upsert(payload, { onConflict: "memory_key" })
        .select()
        .single();

    if (error) {
        throw error;
    }

    return data;
}

module.exports = {
    upsertAgentMemory,
};

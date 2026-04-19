const { getSupabaseClient, hasSupabaseConfig } = require("./growth-machine-supabase.js");

async function createAutopilotRun(record) {
    const client = await getSupabaseClient();
    if (!client) {
        return null;
    }

    const payload = {
        trigger_source: "manual_script",
        status: "queued",
        stats: {},
        errors: [],
        warnings: [],
        metadata: {},
        ...record,
    };

    const { data, error } = await client.from("autopilot_runs").insert(payload).select().single();

    if (error) {
        throw error;
    }

    return data;
}

async function getAutopilotRun(id) {
    if (!id) {
        return null;
    }

    const client = await getSupabaseClient();
    if (!client) {
        return null;
    }

    const { data, error } = await client
        .from("autopilot_runs")
        .select("*")
        .eq("id", id)
        .maybeSingle();

    if (error) {
        throw error;
    }

    return data;
}

async function updateAutopilotRun(id, patch) {
    if (!id) {
        return null;
    }

    const client = await getSupabaseClient();
    if (!client) {
        return null;
    }

    const { data, error } = await client
        .from("autopilot_runs")
        .update(patch)
        .eq("id", id)
        .select()
        .single();

    if (error) {
        throw error;
    }

    return data;
}

module.exports = {
    createAutopilotRun,
    getAutopilotRun,
    updateAutopilotRun,
    hasSupabaseConfig,
};

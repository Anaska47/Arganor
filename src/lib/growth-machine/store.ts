import "server-only";

import type { TableInsert, TableRow, TableUpdate } from "@/lib/supabase/types";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type ContentQueueRow = TableRow<"content_queue">;
type ContentQueueInsert = TableInsert<"content_queue">;
type ContentQueueUpdate = TableUpdate<"content_queue">;

type AutopilotRunRow = TableRow<"autopilot_runs">;
type AutopilotRunInsert = TableInsert<"autopilot_runs">;
type AutopilotRunUpdate = TableUpdate<"autopilot_runs">;

type AgentMemoryRow = TableRow<"agent_memory">;
type AgentMemoryInsert = TableInsert<"agent_memory">;
type AgentMemoryUpdate = TableUpdate<"agent_memory">;

type PromptVersionRow = TableRow<"prompt_versions">;
type PromptVersionInsert = TableInsert<"prompt_versions">;
type PromptVersionUpdate = TableUpdate<"prompt_versions">;

type ExperimentRow = TableRow<"experiments">;
type ExperimentInsert = TableInsert<"experiments">;
type ExperimentUpdate = TableUpdate<"experiments">;

type ListOptions = {
    limit?: number;
};

type ContentQueueListOptions = ListOptions & {
    status?: ContentQueueRow["status"];
    clusterRef?: string;
};

type AutopilotRunListOptions = ListOptions & {
    status?: AutopilotRunRow["status"];
};

type AgentMemoryListOptions = ListOptions & {
    prefix?: "product" | "post" | "cluster" | "hook";
    clusterRef?: string;
};

type PromptVersionListOptions = ListOptions & {
    module?: string;
    promptKey?: string;
    status?: PromptVersionRow["status"];
};

type ExperimentListOptions = ListOptions & {
    status?: ExperimentRow["status"];
    clusterRef?: string;
};

type GrowthMachineOverview = {
    queue: {
        total: number;
        draft: number;
        queued: number;
        running: number;
        completed: number;
        failed: number;
        recent: Array<{
            id: string;
            kind: string;
            status: string;
            title: string | null;
            clusterRef: string | null;
            createdAt: string;
        }>;
    };
    runs: {
        total: number;
        queued: number;
        running: number;
        completed: number;
        failed: number;
        recent: Array<{
            id: string;
            status: string;
            triggerSource: string;
            runLabel: string | null;
            clusterRef: string | null;
            createdAt: string;
            completedAt: string | null;
        }>;
    };
    memory: {
        total: number;
        patterns: number;
        constraints: number;
        recentKeys: string[];
    };
    prompts: {
        total: number;
        active: number;
        recent: Array<{
            id: string;
            module: string;
            promptKey: string;
            version: string;
            status: string;
        }>;
    };
    experiments: {
        total: number;
        running: number;
        recent: Array<{
            id: string;
            experimentKey: string;
            name: string;
            status: string;
        }>;
    };
};

const DEFAULT_LIMIT = 25;
const NAMESPACED_MEMORY_KEY_PATTERN = /^(product|post|cluster|hook):.+/;

function getLimit(limit?: number): number {
    return Math.min(Math.max(limit ?? DEFAULT_LIMIT, 1), 100);
}

function optionalText(value: string | null | undefined): string | null {
    if (typeof value !== "string") {
        return null;
    }

    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
}

function hasOwnValue<T extends object>(record: T, key: keyof T): boolean {
    return Object.prototype.hasOwnProperty.call(record, key);
}

function assertNamespacedMemoryKey(memoryKey: string) {
    if (!NAMESPACED_MEMORY_KEY_PATTERN.test(memoryKey)) {
        throw new Error(
            `[growth-machine] agent_memory.memory_key must be namespaced (product:..., post:..., cluster:..., hook:...). Received: ${memoryKey}`,
        );
    }
}

export async function enqueueContent(record: ContentQueueInsert): Promise<ContentQueueRow> {
    const client = getSupabaseServerClient();
    const { data, error } = await client
        .from("content_queue")
        .insert({
            priority: 0,
            payload: {},
            ...record,
            title: optionalText(record.title),
            topic: optionalText(record.topic),
            intent: optionalText(record.intent),
            product_ref: optionalText(record.product_ref),
            post_ref: optionalText(record.post_ref),
            cluster_ref: optionalText(record.cluster_ref),
            decision_reason: optionalText(record.decision_reason),
        })
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function updateContentQueue(id: string, patch: ContentQueueUpdate): Promise<ContentQueueRow> {
    const client = getSupabaseServerClient();
    const nextPatch: ContentQueueUpdate = {
        ...patch,
    };

    if (hasOwnValue(patch, "title")) nextPatch.title = optionalText(patch.title);
    if (hasOwnValue(patch, "topic")) nextPatch.topic = optionalText(patch.topic);
    if (hasOwnValue(patch, "intent")) nextPatch.intent = optionalText(patch.intent);
    if (hasOwnValue(patch, "product_ref")) nextPatch.product_ref = optionalText(patch.product_ref);
    if (hasOwnValue(patch, "post_ref")) nextPatch.post_ref = optionalText(patch.post_ref);
    if (hasOwnValue(patch, "cluster_ref")) nextPatch.cluster_ref = optionalText(patch.cluster_ref);
    if (hasOwnValue(patch, "decision_reason")) nextPatch.decision_reason = optionalText(patch.decision_reason);

    const { data, error } = await client
        .from("content_queue")
        .update(nextPatch)
        .eq("id", id)
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function getContentQueueItem(id: string): Promise<ContentQueueRow | null> {
    const client = getSupabaseServerClient();
    const { data, error } = await client.from("content_queue").select("*").eq("id", id).maybeSingle();

    if (error) throw error;
    return data;
}

export async function listContentQueue(options: ContentQueueListOptions = {}): Promise<ContentQueueRow[]> {
    const client = getSupabaseServerClient();
    let query = client.from("content_queue").select("*").order("created_at", { ascending: false }).limit(getLimit(options.limit));

    if (options.status) query = query.eq("status", options.status);
    if (options.clusterRef) query = query.eq("cluster_ref", options.clusterRef);

    const { data, error } = await query;
    if (error) throw error;
    return data;
}

export async function createAutopilotRun(record: AutopilotRunInsert): Promise<AutopilotRunRow> {
    const client = getSupabaseServerClient();
    const { data, error } = await client
        .from("autopilot_runs")
        .insert({
            trigger_source: "manual",
            status: "queued",
            stats: {},
            errors: [],
            warnings: [],
            metadata: {},
            ...record,
            workflow_ref: optionalText(record.workflow_ref),
            run_label: optionalText(record.run_label),
            commit_sha: optionalText(record.commit_sha),
            product_ref: optionalText(record.product_ref),
            post_ref: optionalText(record.post_ref),
            cluster_ref: optionalText(record.cluster_ref),
        })
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function updateAutopilotRun(id: string, patch: AutopilotRunUpdate): Promise<AutopilotRunRow> {
    const client = getSupabaseServerClient();
    const nextPatch: AutopilotRunUpdate = {
        ...patch,
    };

    if (hasOwnValue(patch, "workflow_ref")) nextPatch.workflow_ref = optionalText(patch.workflow_ref);
    if (hasOwnValue(patch, "run_label")) nextPatch.run_label = optionalText(patch.run_label);
    if (hasOwnValue(patch, "commit_sha")) nextPatch.commit_sha = optionalText(patch.commit_sha);
    if (hasOwnValue(patch, "product_ref")) nextPatch.product_ref = optionalText(patch.product_ref);
    if (hasOwnValue(patch, "post_ref")) nextPatch.post_ref = optionalText(patch.post_ref);
    if (hasOwnValue(patch, "cluster_ref")) nextPatch.cluster_ref = optionalText(patch.cluster_ref);

    const { data, error } = await client
        .from("autopilot_runs")
        .update(nextPatch)
        .eq("id", id)
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function getAutopilotRun(id: string): Promise<AutopilotRunRow | null> {
    const client = getSupabaseServerClient();
    const { data, error } = await client.from("autopilot_runs").select("*").eq("id", id).maybeSingle();

    if (error) throw error;
    return data;
}

export async function listAutopilotRuns(options: AutopilotRunListOptions = {}): Promise<AutopilotRunRow[]> {
    const client = getSupabaseServerClient();
    let query = client.from("autopilot_runs").select("*").order("created_at", { ascending: false }).limit(getLimit(options.limit));

    if (options.status) query = query.eq("status", options.status);

    const { data, error } = await query;
    if (error) throw error;
    return data;
}

export async function upsertAgentMemory(record: AgentMemoryInsert): Promise<AgentMemoryRow> {
    assertNamespacedMemoryKey(record.memory_key);

    const client = getSupabaseServerClient();
    const { data, error } = await client
        .from("agent_memory")
        .upsert(
            {
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
            },
            { onConflict: "memory_key" },
        )
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function updateAgentMemory(id: string, patch: AgentMemoryUpdate): Promise<AgentMemoryRow> {
    if (patch.memory_key) {
        assertNamespacedMemoryKey(patch.memory_key);
    }

    const client = getSupabaseServerClient();
    const nextPatch: AgentMemoryUpdate = {
        ...patch,
    };

    if (hasOwnValue(patch, "scope_ref")) nextPatch.scope_ref = optionalText(patch.scope_ref);
    if (hasOwnValue(patch, "product_ref")) nextPatch.product_ref = optionalText(patch.product_ref);
    if (hasOwnValue(patch, "post_ref")) nextPatch.post_ref = optionalText(patch.post_ref);
    if (hasOwnValue(patch, "cluster_ref")) nextPatch.cluster_ref = optionalText(patch.cluster_ref);
    if (hasOwnValue(patch, "summary")) nextPatch.summary = optionalText(patch.summary);
    if (hasOwnValue(patch, "source")) nextPatch.source = optionalText(patch.source);

    const { data, error } = await client
        .from("agent_memory")
        .update(nextPatch)
        .eq("id", id)
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function getAgentMemory(memoryKey: string): Promise<AgentMemoryRow | null> {
    assertNamespacedMemoryKey(memoryKey);

    const client = getSupabaseServerClient();
    const { data, error } = await client.from("agent_memory").select("*").eq("memory_key", memoryKey).maybeSingle();

    if (error) throw error;
    return data;
}

export async function listAgentMemory(options: AgentMemoryListOptions = {}): Promise<AgentMemoryRow[]> {
    const client = getSupabaseServerClient();
    let query = client.from("agent_memory").select("*").order("updated_at", { ascending: false }).limit(getLimit(options.limit));

    if (options.prefix) query = query.like("memory_key", `${options.prefix}:%`);
    if (options.clusterRef) query = query.eq("cluster_ref", options.clusterRef);

    const { data, error } = await query;
    if (error) throw error;
    return data;
}

export async function createPromptVersion(record: PromptVersionInsert): Promise<PromptVersionRow> {
    const client = getSupabaseServerClient();
    const { data, error } = await client
        .from("prompt_versions")
        .insert({
            status: "draft",
            variables: {},
            metadata: {},
            ...record,
            module: record.module.trim(),
            prompt_key: record.prompt_key.trim(),
            version: record.version.trim(),
            prompt_body: record.prompt_body,
            notes: optionalText(record.notes),
        })
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function upsertPromptVersion(record: PromptVersionInsert): Promise<PromptVersionRow> {
    const client = getSupabaseServerClient();
    const { data, error } = await client
        .from("prompt_versions")
        .upsert(
            {
                status: "draft",
                variables: {},
                metadata: {},
                ...record,
                module: record.module.trim(),
                prompt_key: record.prompt_key.trim(),
                version: record.version.trim(),
                prompt_body: record.prompt_body,
                notes: optionalText(record.notes),
            },
            { onConflict: "module,prompt_key,version" },
        )
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function updatePromptVersion(id: string, patch: PromptVersionUpdate): Promise<PromptVersionRow> {
    const client = getSupabaseServerClient();
    const nextPatch: PromptVersionUpdate = {
        ...patch,
    };

    if (hasOwnValue(patch, "module") && typeof patch.module === "string") nextPatch.module = patch.module.trim();
    if (hasOwnValue(patch, "prompt_key") && typeof patch.prompt_key === "string") nextPatch.prompt_key = patch.prompt_key.trim();
    if (hasOwnValue(patch, "version") && typeof patch.version === "string") nextPatch.version = patch.version.trim();
    if (hasOwnValue(patch, "notes")) nextPatch.notes = optionalText(patch.notes);

    const { data, error } = await client
        .from("prompt_versions")
        .update(nextPatch)
        .eq("id", id)
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function getPromptVersion(id: string): Promise<PromptVersionRow | null> {
    const client = getSupabaseServerClient();
    const { data, error } = await client.from("prompt_versions").select("*").eq("id", id).maybeSingle();

    if (error) throw error;
    return data;
}

export async function listPromptVersions(options: PromptVersionListOptions = {}): Promise<PromptVersionRow[]> {
    const client = getSupabaseServerClient();
    let query = client.from("prompt_versions").select("*").order("created_at", { ascending: false }).limit(getLimit(options.limit));

    if (options.module) query = query.eq("module", options.module);
    if (options.promptKey) query = query.eq("prompt_key", options.promptKey);
    if (options.status) query = query.eq("status", options.status);

    const { data, error } = await query;
    if (error) throw error;
    return data;
}

export async function createExperiment(record: ExperimentInsert): Promise<ExperimentRow> {
    const client = getSupabaseServerClient();
    const { data, error } = await client
        .from("experiments")
        .insert({
            status: "draft",
            variants: {},
            results: {},
            ...record,
            experiment_key: record.experiment_key.trim(),
            name: record.name.trim(),
            hypothesis: optionalText(record.hypothesis),
            product_ref: optionalText(record.product_ref),
            post_ref: optionalText(record.post_ref),
            cluster_ref: optionalText(record.cluster_ref),
            success_metric: optionalText(record.success_metric),
        })
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function updateExperiment(id: string, patch: ExperimentUpdate): Promise<ExperimentRow> {
    const client = getSupabaseServerClient();
    const nextPatch: ExperimentUpdate = {
        ...patch,
    };

    if (hasOwnValue(patch, "experiment_key") && typeof patch.experiment_key === "string") {
        nextPatch.experiment_key = patch.experiment_key.trim();
    }
    if (hasOwnValue(patch, "name") && typeof patch.name === "string") nextPatch.name = patch.name.trim();
    if (hasOwnValue(patch, "hypothesis")) nextPatch.hypothesis = optionalText(patch.hypothesis);
    if (hasOwnValue(patch, "product_ref")) nextPatch.product_ref = optionalText(patch.product_ref);
    if (hasOwnValue(patch, "post_ref")) nextPatch.post_ref = optionalText(patch.post_ref);
    if (hasOwnValue(patch, "cluster_ref")) nextPatch.cluster_ref = optionalText(patch.cluster_ref);
    if (hasOwnValue(patch, "success_metric")) nextPatch.success_metric = optionalText(patch.success_metric);

    const { data, error } = await client
        .from("experiments")
        .update(nextPatch)
        .eq("id", id)
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function getExperiment(id: string): Promise<ExperimentRow | null> {
    const client = getSupabaseServerClient();
    const { data, error } = await client.from("experiments").select("*").eq("id", id).maybeSingle();

    if (error) throw error;
    return data;
}

export async function getExperimentByKey(experimentKey: string): Promise<ExperimentRow | null> {
    const client = getSupabaseServerClient();
    const { data, error } = await client
        .from("experiments")
        .select("*")
        .eq("experiment_key", experimentKey.trim())
        .maybeSingle();

    if (error) throw error;
    return data;
}

export async function listExperiments(options: ExperimentListOptions = {}): Promise<ExperimentRow[]> {
    const client = getSupabaseServerClient();
    let query = client.from("experiments").select("*").order("created_at", { ascending: false }).limit(getLimit(options.limit));

    if (options.status) query = query.eq("status", options.status);
    if (options.clusterRef) query = query.eq("cluster_ref", options.clusterRef);

    const { data, error } = await query;
    if (error) throw error;
    return data;
}

async function countTableRows<T extends keyof import("@/lib/supabase/types").Database["public"]["Tables"]>(
    table: T,
    build?: (
        query: ReturnType<ReturnType<typeof getSupabaseServerClient>["from"]>,
    ) => ReturnType<ReturnType<typeof getSupabaseServerClient>["from"]>,
): Promise<number> {
    const client = getSupabaseServerClient();
    let query = client.from(table).select("*", { head: true, count: "exact" });

    if (build) {
        query = build(query);
    }

    const { count, error } = await query;
    if (error) throw error;
    return count ?? 0;
}

export async function getGrowthMachineOverview(): Promise<GrowthMachineOverview> {
    const [
        queueRecent,
        recentRuns,
        memoryRecent,
        promptRecent,
        recentExperiments,
        queueTotal,
        queueDraft,
        queueQueued,
        queueRunning,
        queueCompleted,
        queueFailed,
        runTotal,
        runQueued,
        runRunning,
        runCompleted,
        runFailed,
        memoryTotal,
        memoryPatterns,
        memoryConstraints,
        promptTotal,
        promptActive,
        experimentTotal,
        experimentRunning,
    ] = await Promise.all([
        listContentQueue({ limit: 5 }),
        listAutopilotRuns({ limit: 5 }),
        listAgentMemory({ limit: 5 }),
        listPromptVersions({ limit: 5 }),
        listExperiments({ limit: 5 }),
        countTableRows("content_queue"),
        countTableRows("content_queue", (query) => query.eq("status", "draft")),
        countTableRows("content_queue", (query) => query.eq("status", "queued")),
        countTableRows("content_queue", (query) => query.eq("status", "running")),
        countTableRows("content_queue", (query) => query.eq("status", "completed")),
        countTableRows("content_queue", (query) => query.eq("status", "failed")),
        countTableRows("autopilot_runs"),
        countTableRows("autopilot_runs", (query) => query.eq("status", "queued")),
        countTableRows("autopilot_runs", (query) => query.eq("status", "running")),
        countTableRows("autopilot_runs", (query) => query.eq("status", "completed")),
        countTableRows("autopilot_runs", (query) => query.eq("status", "failed")),
        countTableRows("agent_memory"),
        countTableRows("agent_memory", (query) => query.eq("memory_type", "pattern")),
        countTableRows("agent_memory", (query) => query.eq("memory_type", "constraint")),
        countTableRows("prompt_versions"),
        countTableRows("prompt_versions", (query) => query.eq("status", "active")),
        countTableRows("experiments"),
        countTableRows("experiments", (query) => query.eq("status", "running")),
    ]);

    return {
        queue: {
            total: queueTotal,
            draft: queueDraft,
            queued: queueQueued,
            running: queueRunning,
            completed: queueCompleted,
            failed: queueFailed,
            recent: queueRecent.map((item) => ({
                id: item.id,
                kind: String(item.kind),
                status: String(item.status),
                title: item.title,
                clusterRef: item.cluster_ref,
                createdAt: item.created_at,
            })),
        },
        runs: {
            total: runTotal,
            queued: runQueued,
            running: runRunning,
            completed: runCompleted,
            failed: runFailed,
            recent: recentRuns.map((item) => ({
                id: item.id,
                status: String(item.status),
                triggerSource: item.trigger_source,
                runLabel: item.run_label,
                clusterRef: item.cluster_ref,
                createdAt: item.created_at,
                completedAt: item.completed_at,
            })),
        },
        memory: {
            total: memoryTotal,
            patterns: memoryPatterns,
            constraints: memoryConstraints,
            recentKeys: memoryRecent.map((item) => item.memory_key),
        },
        prompts: {
            total: promptTotal,
            active: promptActive,
            recent: promptRecent.map((item) => ({
                id: item.id,
                module: item.module,
                promptKey: item.prompt_key,
                version: item.version,
                status: String(item.status),
            })),
        },
        experiments: {
            total: experimentTotal,
            running: experimentRunning,
            recent: recentExperiments.map((item) => ({
                id: item.id,
                experimentKey: item.experiment_key,
                name: item.name,
                status: String(item.status),
            })),
        },
    };
}

export type {
    AgentMemoryInsert,
    AgentMemoryRow,
    AgentMemoryUpdate,
    AutopilotRunInsert,
    AutopilotRunRow,
    AutopilotRunUpdate,
    ContentQueueInsert,
    ContentQueueRow,
    ContentQueueUpdate,
    ExperimentInsert,
    ExperimentRow,
    ExperimentUpdate,
    GrowthMachineOverview,
    PromptVersionInsert,
    PromptVersionRow,
    PromptVersionUpdate,
};

export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[];

export type QueueKind = "product" | "post" | "pin" | "cluster" | "hook" | "system" | "other";
export type QueueStatus = "draft" | "queued" | "scheduled" | "running" | "completed" | "failed" | "cancelled";
export type RunStatus = "queued" | "running" | "completed" | "failed" | "cancelled";
export type MemoryType = "note" | "score" | "pattern" | "constraint" | "decision";
export type PromptStatus = "draft" | "active" | "archived";
export type ExperimentStatus = "draft" | "running" | "paused" | "completed" | "cancelled";

export interface Database {
    public: {
        Tables: {
            content_queue: {
                Row: {
                    id: string;
                    kind: QueueKind | string;
                    status: QueueStatus | string;
                    priority: number;
                    title: string | null;
                    topic: string | null;
                    intent: string | null;
                    product_ref: string | null;
                    post_ref: string | null;
                    cluster_ref: string | null;
                    payload: Json;
                    decision_reason: string | null;
                    scheduled_for: string | null;
                    locked_at: string | null;
                    processed_at: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    kind?: QueueKind | string;
                    status?: QueueStatus | string;
                    priority?: number;
                    title?: string | null;
                    topic?: string | null;
                    intent?: string | null;
                    product_ref?: string | null;
                    post_ref?: string | null;
                    cluster_ref?: string | null;
                    payload?: Json;
                    decision_reason?: string | null;
                    scheduled_for?: string | null;
                    locked_at?: string | null;
                    processed_at?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    kind?: QueueKind | string;
                    status?: QueueStatus | string;
                    priority?: number;
                    title?: string | null;
                    topic?: string | null;
                    intent?: string | null;
                    product_ref?: string | null;
                    post_ref?: string | null;
                    cluster_ref?: string | null;
                    payload?: Json;
                    decision_reason?: string | null;
                    scheduled_for?: string | null;
                    locked_at?: string | null;
                    processed_at?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Relationships: [];
            };
            autopilot_runs: {
                Row: {
                    id: string;
                    trigger_source: string;
                    status: RunStatus | string;
                    workflow_ref: string | null;
                    run_label: string | null;
                    commit_sha: string | null;
                    product_ref: string | null;
                    post_ref: string | null;
                    cluster_ref: string | null;
                    started_at: string | null;
                    completed_at: string | null;
                    stats: Json;
                    errors: Json;
                    warnings: Json;
                    metadata: Json;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    trigger_source?: string;
                    status?: RunStatus | string;
                    workflow_ref?: string | null;
                    run_label?: string | null;
                    commit_sha?: string | null;
                    product_ref?: string | null;
                    post_ref?: string | null;
                    cluster_ref?: string | null;
                    started_at?: string | null;
                    completed_at?: string | null;
                    stats?: Json;
                    errors?: Json;
                    warnings?: Json;
                    metadata?: Json;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    trigger_source?: string;
                    status?: RunStatus | string;
                    workflow_ref?: string | null;
                    run_label?: string | null;
                    commit_sha?: string | null;
                    product_ref?: string | null;
                    post_ref?: string | null;
                    cluster_ref?: string | null;
                    started_at?: string | null;
                    completed_at?: string | null;
                    stats?: Json;
                    errors?: Json;
                    warnings?: Json;
                    metadata?: Json;
                    created_at?: string;
                    updated_at?: string;
                };
                Relationships: [];
            };
            agent_memory: {
                Row: {
                    id: string;
                    memory_key: string;
                    memory_type: MemoryType | string;
                    scope_ref: string | null;
                    product_ref: string | null;
                    post_ref: string | null;
                    cluster_ref: string | null;
                    value: Json;
                    summary: string | null;
                    confidence: number | null;
                    source: string | null;
                    last_seen_at: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    memory_key: string;
                    memory_type?: MemoryType | string;
                    scope_ref?: string | null;
                    product_ref?: string | null;
                    post_ref?: string | null;
                    cluster_ref?: string | null;
                    value?: Json;
                    summary?: string | null;
                    confidence?: number | null;
                    source?: string | null;
                    last_seen_at?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    memory_key?: string;
                    memory_type?: MemoryType | string;
                    scope_ref?: string | null;
                    product_ref?: string | null;
                    post_ref?: string | null;
                    cluster_ref?: string | null;
                    value?: Json;
                    summary?: string | null;
                    confidence?: number | null;
                    source?: string | null;
                    last_seen_at?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Relationships: [];
            };
            prompt_versions: {
                Row: {
                    id: string;
                    module: string;
                    prompt_key: string;
                    version: string;
                    status: PromptStatus | string;
                    prompt_body: string;
                    notes: string | null;
                    variables: Json;
                    metadata: Json;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    module: string;
                    prompt_key: string;
                    version: string;
                    status?: PromptStatus | string;
                    prompt_body: string;
                    notes?: string | null;
                    variables?: Json;
                    metadata?: Json;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    module?: string;
                    prompt_key?: string;
                    version?: string;
                    status?: PromptStatus | string;
                    prompt_body?: string;
                    notes?: string | null;
                    variables?: Json;
                    metadata?: Json;
                    created_at?: string;
                    updated_at?: string;
                };
                Relationships: [];
            };
            experiments: {
                Row: {
                    id: string;
                    experiment_key: string;
                    name: string;
                    hypothesis: string | null;
                    status: ExperimentStatus | string;
                    product_ref: string | null;
                    post_ref: string | null;
                    cluster_ref: string | null;
                    success_metric: string | null;
                    variants: Json;
                    results: Json;
                    started_at: string | null;
                    ended_at: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    experiment_key: string;
                    name: string;
                    hypothesis?: string | null;
                    status?: ExperimentStatus | string;
                    product_ref?: string | null;
                    post_ref?: string | null;
                    cluster_ref?: string | null;
                    success_metric?: string | null;
                    variants?: Json;
                    results?: Json;
                    started_at?: string | null;
                    ended_at?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    experiment_key?: string;
                    name?: string;
                    hypothesis?: string | null;
                    status?: ExperimentStatus | string;
                    product_ref?: string | null;
                    post_ref?: string | null;
                    cluster_ref?: string | null;
                    success_metric?: string | null;
                    variants?: Json;
                    results?: Json;
                    started_at?: string | null;
                    ended_at?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Relationships: [];
            };
        };
        Views: Record<string, never>;
        Functions: Record<string, never>;
        Enums: Record<string, never>;
        CompositeTypes: Record<string, never>;
    };
}

export type GrowthMachineTableName = keyof Database["public"]["Tables"];

export type TableRow<T extends GrowthMachineTableName> = Database["public"]["Tables"][T]["Row"];
export type TableInsert<T extends GrowthMachineTableName> = Database["public"]["Tables"][T]["Insert"];
export type TableUpdate<T extends GrowthMachineTableName> = Database["public"]["Tables"][T]["Update"];

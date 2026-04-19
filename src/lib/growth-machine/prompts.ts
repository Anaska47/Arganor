import "server-only";

import { hasSupabaseServerConfig } from "@/lib/supabase/server";

import { DEFAULT_PROMPT_VERSIONS } from "./prompt-registry";
import { listPromptVersions } from "./store";

type ResolvedPromptVersion = {
    source: "supabase" | "registry";
    module: string;
    promptKey: string;
    version: string;
    status: string;
    promptBody: string;
    notes: string | null;
    variables: unknown;
    metadata: unknown;
};

export async function resolvePromptVersion(module: string, promptKey: string): Promise<ResolvedPromptVersion> {
    const normalizedModule = module.trim();
    const normalizedPromptKey = promptKey.trim();

    if (hasSupabaseServerConfig()) {
        const [activePrompt] = await listPromptVersions({
            module: normalizedModule,
            promptKey: normalizedPromptKey,
            status: "active",
            limit: 1,
        });

        if (activePrompt) {
            return {
                source: "supabase",
                module: activePrompt.module,
                promptKey: activePrompt.prompt_key,
                version: activePrompt.version,
                status: String(activePrompt.status),
                promptBody: activePrompt.prompt_body,
                notes: activePrompt.notes,
                variables: activePrompt.variables,
                metadata: activePrompt.metadata,
            };
        }
    }

    const fallbackPrompt = DEFAULT_PROMPT_VERSIONS.find(
        (prompt) => prompt.module === normalizedModule && prompt.prompt_key === normalizedPromptKey,
    );

    if (!fallbackPrompt) {
        throw new Error(
            `[growth-machine] No prompt found for module="${normalizedModule}" promptKey="${normalizedPromptKey}".`,
        );
    }

    return {
        source: "registry",
        module: fallbackPrompt.module,
        promptKey: fallbackPrompt.prompt_key,
        version: fallbackPrompt.version,
        status: String(fallbackPrompt.status ?? "active"),
        promptBody: fallbackPrompt.prompt_body,
        notes: fallbackPrompt.notes ?? null,
        variables: fallbackPrompt.variables ?? {},
        metadata: fallbackPrompt.metadata ?? {},
    };
}

export type { ResolvedPromptVersion };

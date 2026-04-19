import "server-only";

type GrowthAiProvider = "openai";

type GrowthAiStatus = {
    enabled: boolean;
    provider: GrowthAiProvider;
    model: string;
};

type GenerateGrowthJsonOptions = {
    systemPrompt: string;
    userPrompt: string;
    temperature?: number;
    maxOutputTokens?: number;
};

type GenerateGrowthJsonResult<T> = {
    data: T;
    provider: GrowthAiProvider;
    model: string;
};

const OPENAI_API_KEY_ENV_CANDIDATES = ["OPENAI_API_KEY", "ARGANOR_OPENAI_API_KEY"];
const OPENAI_MODEL_ENV_CANDIDATES = ["ARGANOR_OPENAI_MODEL", "OPENAI_MODEL"];
const OPENAI_BASE_URL_ENV = "OPENAI_BASE_URL";
const ARGANOR_ENABLE_AI_ENV = "ARGANOR_ENABLE_AI_GENERATION";
const DEFAULT_OPENAI_MODEL = "gpt-5.4-mini";

function readOptionalEnv(candidates: string[]): string | null {
    for (const name of candidates) {
        const value = process.env[name]?.trim();
        if (value) {
            return value;
        }
    }

    return null;
}

function parseBooleanEnv(value: string | undefined): boolean | null {
    if (!value) {
        return null;
    }

    const normalized = value.trim().toLowerCase();
    if (["1", "true", "yes", "on"].includes(normalized)) {
        return true;
    }

    if (["0", "false", "no", "off"].includes(normalized)) {
        return false;
    }

    return null;
}

function getOpenAiApiKey(): string | null {
    return readOptionalEnv(OPENAI_API_KEY_ENV_CANDIDATES);
}

function getOpenAiModel(): string {
    return readOptionalEnv(OPENAI_MODEL_ENV_CANDIDATES) || DEFAULT_OPENAI_MODEL;
}

function getOpenAiBaseUrl(): string {
    return (process.env[OPENAI_BASE_URL_ENV]?.trim() || "https://api.openai.com/v1").replace(/\/+$/, "");
}

function extractJsonObject(raw: string): string {
    const trimmed = raw.trim();
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
        return trimmed;
    }

    const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]+?)\s*```/i);
    if (fencedMatch?.[1]) {
        return extractJsonObject(fencedMatch[1]);
    }

    const firstBrace = trimmed.indexOf("{");
    const lastBrace = trimmed.lastIndexOf("}");
    if (firstBrace >= 0 && lastBrace > firstBrace) {
        return trimmed.slice(firstBrace, lastBrace + 1);
    }

    throw new Error("[growth-ai] Model response did not contain a JSON object.");
}

export function getGrowthAiStatus(): GrowthAiStatus {
    const apiKey = getOpenAiApiKey();
    const explicitToggle = parseBooleanEnv(process.env[ARGANOR_ENABLE_AI_ENV]);
    const enabled = explicitToggle === false ? false : Boolean(apiKey);

    return {
        enabled,
        provider: "openai",
        model: getOpenAiModel(),
    };
}

export function hasGrowthAiConfig(): boolean {
    return getGrowthAiStatus().enabled;
}

export async function generateGrowthJson<T>(options: GenerateGrowthJsonOptions): Promise<GenerateGrowthJsonResult<T>> {
    const apiKey = getOpenAiApiKey();
    const status = getGrowthAiStatus();

    if (!status.enabled || !apiKey) {
        throw new Error("[growth-ai] AI generation is disabled or missing OPENAI_API_KEY.");
    }

    const response = await fetch(`${getOpenAiBaseUrl()}/chat/completions`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: status.model,
            temperature: options.temperature ?? 0.4,
            max_completion_tokens: options.maxOutputTokens ?? 1600,
            response_format: {
                type: "json_object",
            },
            messages: [
                {
                    role: "system",
                    content: options.systemPrompt,
                },
                {
                    role: "user",
                    content: options.userPrompt,
                },
            ],
        }),
        cache: "no-store",
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`[growth-ai] OpenAI request failed (${response.status}): ${errorText}`);
    }

    const payload = (await response.json()) as {
        choices?: Array<{
            message?: {
                content?: string | Array<{ type?: string; text?: string }>;
            };
        }>;
    };

    const rawContent = payload.choices?.[0]?.message?.content;
    const text =
        typeof rawContent === "string"
            ? rawContent
            : Array.isArray(rawContent)
              ? rawContent
                    .map((part) => (typeof part?.text === "string" ? part.text : ""))
                    .join("")
              : "";

    if (!text.trim()) {
        throw new Error("[growth-ai] OpenAI returned an empty completion.");
    }

    const data = JSON.parse(extractJsonObject(text)) as T;

    return {
        data,
        provider: "openai",
        model: status.model,
    };
}

export type { GenerateGrowthJsonOptions, GenerateGrowthJsonResult, GrowthAiProvider, GrowthAiStatus };

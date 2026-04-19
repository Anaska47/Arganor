import { NextRequest, NextResponse } from "next/server";

import { isAuthorizedRequest, unauthorizedJson } from "@/lib/api-auth";
import { DEFAULT_PROMPT_VERSIONS } from "@/lib/growth-machine/prompt-registry";
import { getPromptVersion, listPromptVersions, upsertPromptVersion } from "@/lib/growth-machine/store";
import type { PromptVersionInsert, PromptVersionRow } from "@/lib/growth-machine/store";

function parseLimit(value: string | null): number | undefined {
    if (!value) {
        return undefined;
    }

    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : undefined;
}

function toOptionalText(value: string | null | undefined): string | undefined {
    if (typeof value !== "string") {
        return undefined;
    }

    const normalized = value.trim();
    return normalized.length > 0 ? normalized : undefined;
}

type PromptPostBody = {
    seedDefaults?: boolean;
    module?: string;
    promptKey?: string;
    version?: string;
    status?: PromptVersionRow["status"];
    promptBody?: string;
    notes?: string | null;
    variables?: PromptVersionRow["variables"];
    metadata?: PromptVersionRow["metadata"];
};

function toPromptInsert(body: PromptPostBody): PromptVersionInsert | null {
    const promptModule = toOptionalText(body.module);
    const promptKey = toOptionalText(body.promptKey);
    const version = toOptionalText(body.version);
    const promptBody = toOptionalText(body.promptBody);

    if (!promptModule || !promptKey || !version || !promptBody) {
        return null;
    }

    return {
        module: promptModule,
        prompt_key: promptKey,
        version,
        status: body.status,
        prompt_body: promptBody,
        notes: body.notes,
        variables: body.variables,
        metadata: body.metadata,
    };
}

export async function GET(req: NextRequest) {
    if (!isAuthorizedRequest(req)) {
        return unauthorizedJson();
    }

    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        if (id) {
            const item = await getPromptVersion(id);
            return NextResponse.json({ success: true, item });
        }

        const activeOnly = searchParams.get("activeOnly") === "true";
        const promptModule = searchParams.get("module") || undefined;
        const promptKey = searchParams.get("promptKey") || undefined;
        const status = searchParams.get("status") || (activeOnly ? "active" : undefined);
        const limit = parseLimit(searchParams.get("limit"));

        const items = await listPromptVersions({
            module: promptModule,
            promptKey,
            status: status as PromptVersionRow["status"] | undefined,
            limit,
        });

        return NextResponse.json({
            success: true,
            count: items.length,
            items,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown prompt error";
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    if (!isAuthorizedRequest(req)) {
        return unauthorizedJson();
    }

    try {
        const body = (await req.json()) as PromptPostBody;

        if (body.seedDefaults) {
            const items = await Promise.all(DEFAULT_PROMPT_VERSIONS.map((record) => upsertPromptVersion(record)));

            return NextResponse.json({
                success: true,
                seeded: true,
                count: items.length,
                items,
            });
        }

        const record = toPromptInsert(body);

        if (!record) {
            return NextResponse.json(
                {
                    success: false,
                    error: "module, promptKey, version and promptBody are required when seedDefaults is false.",
                },
                { status: 400 },
            );
        }

        const item = await upsertPromptVersion(record);

        return NextResponse.json({
            success: true,
            item,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown prompt error";
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}

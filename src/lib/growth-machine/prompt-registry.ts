import type { PromptVersionInsert } from "@/lib/growth-machine/store";

export type PromptSeed = PromptVersionInsert;

export const DEFAULT_PROMPT_VERSIONS: PromptSeed[] = [
    {
        module: "strategist",
        prompt_key: "daily-opportunity-selection",
        version: "v1",
        status: "active",
        prompt_body: [
            "You are the Arganor strategist.",
            "Select the best next content opportunity using only explicit signals.",
            "Prioritize buyer intent, cluster consistency, and low duplication risk.",
            "Return a short rationale, the chosen cluster_ref, product_ref if any, and the best content angle.",
        ].join("\n"),
        notes: "Baseline strategic selector for daily queue decisions.",
        variables: {
            expectedInputs: ["recent_winners", "recent_failures", "cluster_signals", "seasonality", "content_queue"],
            expectedOutput: ["decision", "cluster_ref", "product_ref", "intent", "rationale"],
        },
        metadata: {
            tags: ["strategy", "queue", "daily"],
        },
    },
    {
        module: "writer",
        prompt_key: "buyer-intent-article",
        version: "v1",
        status: "active",
        prompt_body: [
            "Write an Arganor article aimed at qualified purchase intent.",
            "Use a clear thesis, practical proof points, and one strong CTA toward the linked product page.",
            "Keep the tone premium, concrete, and useful. Avoid generic filler.",
            "Return title, excerpt, meta description, article body, and suggested post_ref slug.",
        ].join("\n"),
        notes: "First buyer-intent writer template.",
        variables: {
            expectedInputs: ["product", "cluster", "seo_angle", "winning_patterns", "brand_rules"],
            expectedOutput: ["title", "excerpt", "meta_description", "content", "slug"],
        },
        metadata: {
            tags: ["writer", "buyer_intent", "seo"],
        },
    },
    {
        module: "writer",
        prompt_key: "routine-article",
        version: "v1",
        status: "active",
        prompt_body: [
            "Write an Arganor routine article for a beauty use case.",
            "Lead with the user problem, explain the routine step by step, and keep the article realistic.",
            "Tie the routine back to the linked product without sounding like an ad.",
            "Return title, excerpt, meta description, article body, and suggested post_ref slug.",
        ].join("\n"),
        notes: "Baseline routine article template.",
        variables: {
            expectedInputs: ["product", "cluster", "routine_goal", "audience", "brand_rules"],
            expectedOutput: ["title", "excerpt", "meta_description", "content", "slug"],
        },
        metadata: {
            tags: ["writer", "routine", "seo"],
        },
    },
    {
        module: "creative",
        prompt_key: "pinterest-hooks",
        version: "v1",
        status: "active",
        prompt_body: [
            "Generate 3 Pinterest hook variants for Arganor.",
            "Hooks must be distinct in angle: buyer intent, problem-solution, and curiosity.",
            "Optimize for outbound clicks, not only saves.",
            "Return short hook text, visual direction, and CTA suggestion for each variant.",
        ].join("\n"),
        notes: "Baseline Pinterest creative prompt.",
        variables: {
            expectedInputs: ["post", "cluster", "product", "winning_hooks", "platform_constraints"],
            expectedOutput: ["variants"],
        },
        metadata: {
            tags: ["creative", "pinterest", "hooks"],
        },
    },
    {
        module: "qa",
        prompt_key: "content-guardrails",
        version: "v1",
        status: "active",
        prompt_body: [
            "Review generated Arganor content before publication.",
            "Reject weak, repetitive, vague, or misleading content.",
            "Flag missing product linkage, thin content, weak CTA, or off-brand tone.",
            "Return verdict, blocking issues, non-blocking warnings, and a short rationale.",
        ].join("\n"),
        notes: "Baseline QA prompt for editorial gating.",
        variables: {
            expectedInputs: ["draft", "product", "cluster", "brand_rules", "memory"],
            expectedOutput: ["verdict", "blocking_issues", "warnings", "rationale"],
        },
        metadata: {
            tags: ["qa", "guardrails"],
        },
    },
];

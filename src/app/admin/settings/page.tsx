import { getGrowthAiStatus } from "@/lib/growth-machine/ai";
import { getSiteUrl } from "@/lib/site";
import { hasSupabaseServerConfig } from "@/lib/supabase/server";

function badgeStyles(ok: boolean) {
    return {
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        borderRadius: 999,
        padding: "6px 10px",
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: "0.04em",
        textTransform: "uppercase" as const,
        background: ok ? "#dcfce7" : "#fee2e2",
        color: ok ? "#166534" : "#991b1b",
    };
}

function cardStyles() {
    return {
        border: "1px solid #e5e7eb",
        borderRadius: 8,
        padding: 20,
        background: "#ffffff",
    };
}

export default function AdminSettingsPage() {
    const ai = getGrowthAiStatus();
    const siteUrl = getSiteUrl();
    const adminApiKeyConfigured = Boolean(process.env.ARGANOR_API_KEY?.trim());
    const checks = [
        {
            label: "Site URL",
            ok: Boolean(siteUrl),
            detail: siteUrl,
        },
        {
            label: "Supabase server",
            ok: hasSupabaseServerConfig(),
            detail: hasSupabaseServerConfig() ? "SUPABASE_URL + service role detects" : "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
        },
        {
            label: "Admin API key",
            ok: adminApiKeyConfigured,
            detail: adminApiKeyConfigured ? "Configured for admin actions and production lock" : "Missing ARGANOR_API_KEY",
        },
        {
            label: "Growth AI",
            ok: ai.enabled,
            detail: ai.enabled ? `${ai.provider} / ${ai.model}` : "AI disabled: add OPENAI_API_KEY to enable autonomous prompting",
        },
    ];

    const nextSteps = [
        "Add ARGANOR_API_KEY in Vercel production env before exposing /admin publicly.",
        "Add OPENAI_API_KEY if you want the growth layer to generate prompts and content autonomously.",
        "Keep SITE_URL and NEXT_PUBLIC_SITE_URL aligned with the live domain.",
        "Keep SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY server-side only.",
    ];

    return (
        <div style={{ display: "grid", gap: 24 }}>
            <section style={cardStyles()}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", marginBottom: 12 }}>
                    <div>
                        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#64748b" }}>Settings</p>
                        <h1 style={{ margin: "8px 0 0", fontSize: 40, lineHeight: 1.1 }}>Operational Readiness</h1>
                    </div>
                    <span style={badgeStyles(checks.every((check) => check.ok))}>
                        {checks.every((check) => check.ok) ? "ready" : "needs setup"}
                    </span>
                </div>
                <p style={{ margin: 0, color: "#475569", maxWidth: 720 }}>
                    This page is the quick reality check before switching the machine into fully autonomous mode.
                </p>
            </section>

            <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
                {checks.map((check) => (
                    <article key={check.label} style={cardStyles()}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: 12 }}>
                            <h2 style={{ margin: 0, fontSize: 18 }}>{check.label}</h2>
                            <span style={badgeStyles(check.ok)}>{check.ok ? "ok" : "missing"}</span>
                        </div>
                        <p style={{ margin: 0, color: "#475569" }}>{check.detail}</p>
                    </article>
                ))}
            </section>

            <section style={cardStyles()}>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#64748b" }}>Next steps</p>
                <ul style={{ margin: "14px 0 0", paddingLeft: 20, color: "#0f172a", display: "grid", gap: 10 }}>
                    {nextSteps.map((step) => (
                        <li key={step}>{step}</li>
                    ))}
                </ul>
            </section>
        </div>
    );
}

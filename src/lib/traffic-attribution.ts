export const ATTRIBUTION_COOKIE_NAME = "arganor_attribution";
export const SESSION_COOKIE_NAME = "arganor_session_id";

export type AttributionSnapshot = {
    source: string;
    channel: string;
    medium: string;
    campaign: string | null;
    content: string | null;
    term: string | null;
    landingPath: string | null;
    referrerHost: string | null;
    sessionId: string | null;
    firstSeenAt: string | null;
    lastSeenAt: string | null;
};

function normalizeToken(value: string | null | undefined) {
    return String(value || "")
        .trim()
        .replace(/\s+/g, " ")
        .slice(0, 120)
        .toLowerCase() || null;
}

function normalizeLabel(value: string | null | undefined) {
    return String(value || "")
        .trim()
        .replace(/\s+/g, " ")
        .slice(0, 180) || null;
}

export function normalizeTrackingPath(value: string | null | undefined) {
    const rawValue = String(value || "").trim();

    if (!rawValue) {
        return "/";
    }

    try {
        const url = new URL(rawValue);
        return `${url.pathname}${url.search}`.slice(0, 400) || "/";
    } catch {
        const prefixed = rawValue.startsWith("/") ? rawValue : `/${rawValue}`;
        return prefixed.slice(0, 400);
    }
}

export function normalizeHost(value: string | null | undefined) {
    if (!value) {
        return null;
    }

    try {
        return new URL(value).hostname.toLowerCase();
    } catch {
        return String(value)
            .trim()
            .replace(/^https?:\/\//i, "")
            .replace(/\/.*$/, "")
            .toLowerCase() || null;
    }
}

export function canonicalizeSource(value: string | null | undefined) {
    const token = normalizeToken(value);
    if (!token) {
        return "direct";
    }

    if (token.includes("pinterest") || token === "pin.it" || token.includes("pinimg")) {
        return "pinterest";
    }

    if (token.includes("instagram") || token === "ig" || token === "insta") {
        return "instagram";
    }

    if (token.includes("facebook") || token === "fb" || token.includes("meta")) {
        return "facebook";
    }

    if (token.includes("google")) {
        return "google";
    }

    if (token.includes("newsletter") || token.includes("email") || token.includes("mail")) {
        return "email";
    }

    return token;
}

export function detectAttributionChannel(
    source: string | null | undefined,
    medium: string | null | undefined,
    referrerHost: string | null | undefined,
) {
    const normalizedSource = canonicalizeSource(source);
    const normalizedMedium = normalizeToken(medium);
    const normalizedReferrerHost = normalizeHost(referrerHost);

    if (["pinterest", "instagram", "facebook", "google", "email"].includes(normalizedSource)) {
        return normalizedSource;
    }

    if (normalizedMedium === "social" || normalizedMedium === "social-organic" || normalizedMedium === "paid-social") {
        if (normalizedReferrerHost) {
            return detectAttributionChannel(normalizedReferrerHost, null, null);
        }
        return "social";
    }

    if (normalizedMedium === "email" || normalizedMedium === "newsletter") {
        return "email";
    }

    if (!normalizedSource || normalizedSource === "direct") {
        return "direct";
    }

    if (normalizedReferrerHost && normalizedReferrerHost !== normalizedSource) {
        return detectAttributionChannel(normalizedReferrerHost, normalizedMedium, null);
    }

    return "referral";
}

export function isSocialChannel(channel: string | null | undefined) {
    return ["pinterest", "instagram", "facebook", "social"].includes(normalizeToken(channel) || "");
}

export function normalizeAttributionSnapshot(value: Partial<AttributionSnapshot> | null | undefined): AttributionSnapshot {
    const referrerHost = normalizeHost(value?.referrerHost);
    const source = canonicalizeSource(value?.source || referrerHost || "direct");
    const medium = normalizeToken(value?.medium) || (source === "direct" ? "direct" : "referral");

    return {
        source,
        channel: detectAttributionChannel(value?.channel || source, medium, referrerHost),
        medium,
        campaign: normalizeLabel(value?.campaign),
        content: normalizeLabel(value?.content),
        term: normalizeLabel(value?.term),
        landingPath: value?.landingPath ? normalizeTrackingPath(value.landingPath) : null,
        referrerHost,
        sessionId: normalizeLabel(value?.sessionId),
        firstSeenAt: normalizeLabel(value?.firstSeenAt),
        lastSeenAt: normalizeLabel(value?.lastSeenAt),
    };
}

export function parseAttributionCookie(value: string | null | undefined) {
    if (!value) {
        return null;
    }

    try {
        return normalizeAttributionSnapshot(JSON.parse(value) as Partial<AttributionSnapshot>);
    } catch {
        try {
            return normalizeAttributionSnapshot(JSON.parse(decodeURIComponent(value)) as Partial<AttributionSnapshot>);
        } catch {
            return null;
        }
    }
}

export function encodeAttributionCookie(value: Partial<AttributionSnapshot>) {
    return encodeURIComponent(JSON.stringify(normalizeAttributionSnapshot(value)));
}

"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import {
    ATTRIBUTION_COOKIE_NAME,
    SESSION_COOKIE_NAME,
    canonicalizeSource,
    detectAttributionChannel,
    encodeAttributionCookie,
    normalizeAttributionSnapshot,
    normalizeHost,
    normalizeTrackingPath,
    parseAttributionCookie,
} from "@/lib/traffic-attribution";

declare global {
    interface Window {
        pintrk?: (...args: unknown[]) => void;
    }
}

type TrafficTrackerProps = {
    pinterestTagEnabled: boolean;
};

const COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

function getCookie(name: string) {
    const prefix = `${name}=`;
    const value = document.cookie
        .split(";")
        .map((item) => item.trim())
        .find((item) => item.startsWith(prefix));

    return value ? decodeURIComponent(value.slice(prefix.length)) : null;
}

function setCookie(name: string, value: string, maxAge = COOKIE_MAX_AGE) {
    document.cookie = `${name}=${value}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
}

function createSessionId() {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return crypto.randomUUID();
    }

    return `arganor-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function ensureSessionId() {
    const cookieValue = getCookie(SESSION_COOKIE_NAME);
    if (cookieValue) {
        return cookieValue;
    }

    const storedValue = window.localStorage.getItem(SESSION_COOKIE_NAME);
    if (storedValue) {
        setCookie(SESSION_COOKIE_NAME, encodeURIComponent(storedValue));
        return storedValue;
    }

    const nextValue = createSessionId();
    window.localStorage.setItem(SESSION_COOKIE_NAME, nextValue);
    setCookie(SESSION_COOKIE_NAME, encodeURIComponent(nextValue));
    return nextValue;
}

function readStoredAttribution() {
    const cookieValue = parseAttributionCookie(getCookie(ATTRIBUTION_COOKIE_NAME));
    if (cookieValue) {
        return cookieValue;
    }

    try {
        const rawValue = window.localStorage.getItem(ATTRIBUTION_COOKIE_NAME);
        return rawValue ? normalizeAttributionSnapshot(JSON.parse(rawValue) as Record<string, unknown>) : null;
    } catch {
        return null;
    }
}

function persistAttribution(snapshot: ReturnType<typeof normalizeAttributionSnapshot>) {
    setCookie(ATTRIBUTION_COOKIE_NAME, encodeAttributionCookie(snapshot));
    window.localStorage.setItem(ATTRIBUTION_COOKIE_NAME, JSON.stringify(snapshot));
}

function resolvePageType(pathname: string) {
    if (pathname.startsWith("/blog/")) {
        return "blog";
    }

    if (pathname.startsWith("/products/")) {
        return "product";
    }

    if (pathname.startsWith("/diagnostic")) {
        return "diagnostic";
    }

    return "other";
}

function sendPageVisit(payload: Record<string, unknown>) {
    const body = JSON.stringify(payload);

    if (navigator.sendBeacon) {
        const queued = navigator.sendBeacon(
            "/api/track/page",
            new Blob([body], { type: "application/json" }),
        );

        if (queued) {
            return;
        }
    }

    void fetch("/api/track/page", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
    });
}

export default function TrafficTracker({ pinterestTagEnabled }: TrafficTrackerProps) {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const lastTrackedPageKey = useRef("");

    useEffect(() => {
        if (!pathname || pathname.startsWith("/admin")) {
            return;
        }

        const sessionId = ensureSessionId();
        const search = searchParams?.toString() || "";
        const pagePath = normalizeTrackingPath(search ? `${pathname}?${search}` : pathname);
        const pageKey = `${pagePath}|${document.title}`;
        if (pageKey === lastTrackedPageKey.current) {
            return;
        }

        lastTrackedPageKey.current = pageKey;

        const params = new URLSearchParams(search);
        const existingAttribution = readStoredAttribution();
        const referrerHost = normalizeHost(document.referrer);
        const hasExternalReferrer = Boolean(referrerHost && referrerHost !== window.location.hostname);
        const querySource = params.get("utm_source") || params.get("source") || params.get("src");
        const queryMedium = params.get("utm_medium") || params.get("medium");
        const queryCampaign = params.get("utm_campaign") || params.get("campaign");
        const queryContent = params.get("utm_content") || params.get("content");
        const queryTerm = params.get("utm_term") || params.get("term");
        const shouldRefreshAttribution = Boolean(querySource || hasExternalReferrer);
        const now = new Date().toISOString();
        const source =
            canonicalizeSource(querySource || (hasExternalReferrer ? referrerHost : existingAttribution?.source) || "direct");

        const attribution = normalizeAttributionSnapshot({
            ...(existingAttribution || {}),
            source,
            medium: queryMedium || existingAttribution?.medium || (source === "direct" ? "direct" : "referral"),
            channel: detectAttributionChannel(source, queryMedium || existingAttribution?.medium || null, hasExternalReferrer ? referrerHost : existingAttribution?.referrerHost || null),
            campaign: queryCampaign || existingAttribution?.campaign,
            content: queryContent || existingAttribution?.content,
            term: queryTerm || existingAttribution?.term,
            referrerHost: hasExternalReferrer ? referrerHost : existingAttribution?.referrerHost || null,
            landingPath: shouldRefreshAttribution ? pagePath : existingAttribution?.landingPath || pagePath,
            sessionId,
            firstSeenAt: existingAttribution?.firstSeenAt || now,
            lastSeenAt: now,
        });

        persistAttribution(attribution);
        sendPageVisit({
            path: pagePath,
            pageType: resolvePageType(pathname),
            title: document.title,
            sessionId,
            attribution,
        });

        if (pinterestTagEnabled && window.pintrk) {
            window.pintrk("page");
        }
    }, [pathname, pinterestTagEnabled, searchParams]);

    useEffect(() => {
        function handleAffiliateClick(event: MouseEvent) {
            const target = event.target;
            if (!(target instanceof Element)) {
                return;
            }

            const anchor = target.closest("a[href]");
            if (!(anchor instanceof HTMLAnchorElement) || !anchor.href.includes("/api/track?")) {
                return;
            }

            const sessionId = ensureSessionId();
            const attribution = readStoredAttribution() || normalizeAttributionSnapshot({ sessionId });
            const url = new URL(anchor.href, window.location.origin);

            if (!url.searchParams.has("src")) {
                url.searchParams.set("src", attribution.source);
            }
            if (!url.searchParams.has("channel")) {
                url.searchParams.set("channel", attribution.channel);
            }
            if (attribution.campaign && !url.searchParams.has("campaign")) {
                url.searchParams.set("campaign", attribution.campaign);
            }
            if (!url.searchParams.has("session")) {
                url.searchParams.set("session", attribution.sessionId || sessionId);
            }
            if (!url.searchParams.has("page")) {
                url.searchParams.set("page", window.location.pathname);
            }

            anchor.href = url.toString();

            if (pinterestTagEnabled && window.pintrk) {
                window.pintrk("track", "lead", {
                    lead_type: "affiliate_click",
                    source: attribution.source,
                    channel: attribution.channel,
                    placement: url.searchParams.get("s") || "direct",
                    product_id: url.searchParams.get("id") || url.searchParams.get("q") || "unknown",
                    page_path: window.location.pathname,
                });
            }
        }

        document.addEventListener("click", handleAffiliateClick, true);
        return () => {
            document.removeEventListener("click", handleAffiliateClick, true);
        };
    }, [pinterestTagEnabled]);

    return null;
}

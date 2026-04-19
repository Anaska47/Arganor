export function getErrorMessage(error: unknown, fallback = "Unknown error"): string {
    const formatKnownNetworkError = (message: string): string | null => {
        const dnsMatch = message.match(/ENOTFOUND\s+([a-z0-9.-]+)/i);
        if (dnsMatch?.[1]) {
            return `Supabase host unreachable: ${dnsMatch[1]}. Verifie SUPABASE_URL ou l'etat du projet Supabase.`;
        }

        if (/fetch failed/i.test(message)) {
            return "Connexion distante echouee. Verifie SUPABASE_URL, le DNS local et l'accessibilite du projet Supabase.";
        }

        return null;
    };

    if (error instanceof Error) {
        const message = error.message?.trim();
        const knownNetworkError = message ? formatKnownNetworkError(message) : null;
        return knownNetworkError || message || fallback;
    }

    if (typeof error === "string") {
        const message = error.trim();
        const knownNetworkError = message ? formatKnownNetworkError(message) : null;
        return knownNetworkError || message || fallback;
    }

    if (error && typeof error === "object") {
        const candidate = error as Record<string, unknown>;
        const parts = [
            typeof candidate.message === "string" ? candidate.message.trim() : "",
            typeof candidate.error_description === "string" ? candidate.error_description.trim() : "",
            typeof candidate.details === "string" ? candidate.details.trim() : "",
            typeof candidate.hint === "string" ? candidate.hint.trim() : "",
        ].filter(Boolean);

        if (parts.length > 0) {
            const merged = parts.join(" | ");
            const knownNetworkError = formatKnownNetworkError(merged);
            return knownNetworkError || merged;
        }

        try {
            const serialized = JSON.stringify(error);
            if (serialized && serialized !== "{}") {
                return serialized;
            }
        } catch {
            return fallback;
        }
    }

    return fallback;
}

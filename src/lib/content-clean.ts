const MOJIBAKE_PATTERN = /(?:Ã.|Â.|â.|ðŸ|œ|Œ|€|™|�)/;

function scoreDecodedText(value: string): number {
    let score = 0;

    if (!MOJIBAKE_PATTERN.test(value)) {
        score += 5;
    }

    if (!value.includes("�")) {
        score += 3;
    }

    score += (value.match(/[a-zA-Z0-9]/g) || []).length;
    score += (value.match(/[àâçéèêëîïôûùüÿæœ]/gi) || []).length * 2;

    return score;
}

function decodeLatin1Mojibake(value: string): string {
    if (typeof Buffer !== "undefined") {
        return Buffer.from(value, "latin1").toString("utf8");
    }

    const bytes = Uint8Array.from(
        Array.from(value, (char) => {
            const code = char.charCodeAt(0);
            return code <= 255 ? code : 32;
        }),
    );

    return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
}

export function repairMojibake(value: string): string {
    let current = String(value || "");
    if (!current || !MOJIBAKE_PATTERN.test(current)) {
        return current.normalize("NFC");
    }

    for (let attempt = 0; attempt < 3; attempt += 1) {
        if (!MOJIBAKE_PATTERN.test(current)) {
            break;
        }

        try {
            const decoded = decodeLatin1Mojibake(current).normalize("NFC");
            if (decoded === current) {
                break;
            }

            current = scoreDecodedText(decoded) >= scoreDecodedText(current) ? decoded : current;
        } catch {
            break;
        }
    }

    return current.normalize("NFC");
}

export function normalizeInlineText(value: string): string {
    return repairMojibake(value).replace(/\s+/g, " ").trim();
}

export function slugifyDisplayText(value: string): string {
    return normalizeInlineText(value)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .replace(/-{2,}/g, "-");
}

export function normalizeIdentityKey(parts: Array<string | undefined | null>): string {
    return parts
        .map((part) => normalizeInlineText(part || "").toLowerCase())
        .join("|");
}

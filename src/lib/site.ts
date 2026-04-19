const DEFAULT_SITE_URL = "https://arganor.vercel.app";

export function getSiteUrl(): string {
    const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || DEFAULT_SITE_URL;
    return configuredUrl.replace(/\/+$/, "");
}

export function toAbsoluteUrl(pathOrUrl: string, baseUrl = getSiteUrl()): string {
    if (/^https?:\/\//i.test(pathOrUrl)) {
        return pathOrUrl;
    }

    return `${baseUrl}${pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`}`;
}

const euroPriceFormatter = new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
});

export function formatEuroPrice(price: number): string {
    return euroPriceFormatter.format(price);
}

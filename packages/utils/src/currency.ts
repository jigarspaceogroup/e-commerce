export function formatCurrency(
  amount: number,
  locale: "ar" | "en" = "en",
): string {
  return new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-SA", {
    style: "currency",
    currency: "SAR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
    .format(amount)
    // Normalize non-breaking spaces to regular spaces for consistent output
    .replace(/\u00A0|\u202F/g, " ");
}

export const formatCents = (cents: number) => {
  const value = cents / 100;
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    minimumFractionDigits: 2,
  }).format(value);
};

export const parseCents = (value: string) => {
  const normalized = value.replace(/[^0-9,.-]/g, "").replace(",", ".");
  const amount = Number.parseFloat(normalized || "0");
  return Math.round(amount * 100);
};

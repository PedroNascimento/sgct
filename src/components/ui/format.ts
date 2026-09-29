const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function formatDate(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value.includes("T") ? value : `${value}T12:00:00Z`);
  return dateFormatter.format(date).replace(/\./g, "");
}

export function formatCurrency(value: number): string {
  return currencyFormatter.format(value);
}

export function formatBoardingTime(value: string): string {
  const time = value.includes("T") ? value.split("T")[1]?.slice(0, 5) : value;
  if (!time) return value;
  const [hours, minutes] = time.split(":");
  return minutes === "00" ? `${hours}h` : `${hours}h${minutes}`;
}

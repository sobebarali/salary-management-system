const MINOR_UNITS_PER_MAJOR = 100;

export function toMinorUnits(major: string | number): number {
  return Math.round(Number(major) * MINOR_UNITS_PER_MAJOR);
}

export function toMajorUnits(minor: number): number {
  return minor / MINOR_UNITS_PER_MAJOR;
}

export function formatMoney(
  minor: number,
  currency: string,
  locale = "en-US"
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(toMajorUnits(minor));
}

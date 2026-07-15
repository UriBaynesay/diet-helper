/** Returns YYYY-MM-DD for "now" as seen in the given IANA timezone. */
export function todayInTimezone(timezone: string, now: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(now); // en-CA locale formats as YYYY-MM-DD
}

export function yesterdayInTimezone(timezone: string, now: Date = new Date()): string {
  const today = todayInTimezone(timezone, now);
  const [year, month, day] = today.split("-").map(Number);
  const asUtcMidnight = new Date(Date.UTC(year, month - 1, day));
  asUtcMidnight.setUTCDate(asUtcMidnight.getUTCDate() - 1);
  return asUtcMidnight.toISOString().slice(0, 10);
}

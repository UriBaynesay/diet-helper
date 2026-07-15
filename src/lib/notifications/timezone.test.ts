import { describe, expect, it } from "vitest";
import { todayInTimezone, yesterdayInTimezone } from "./timezone";

describe("todayInTimezone", () => {
  it("resolves the correct local date even when UTC has already rolled to the next day", () => {
    // 21:00 Asia/Jerusalem in summer (UTC+3) on 2026-07-14 is 18:00 UTC same day —
    // pick a container-UTC time just past midnight UTC to prove it doesn't use UTC's date.
    const containerUtcMidnightPlus1h = new Date("2026-07-15T00:30:00.000Z"); // 03:30 in Jerusalem, still 2026-07-15 there
    expect(todayInTimezone("Asia/Jerusalem", containerUtcMidnightPlus1h)).toBe("2026-07-15");
  });

  it("a 21:00 Jerusalem run reports the correct local day even though the container clock is UTC", () => {
    // 21:00 Asia/Jerusalem (UTC+3 in summer) = 18:00 UTC, same calendar day.
    const now = new Date("2026-07-14T18:00:00.000Z");
    expect(todayInTimezone("Asia/Jerusalem", now)).toBe("2026-07-14");
  });
});

describe("yesterdayInTimezone", () => {
  it("returns the day before today's local date", () => {
    const now = new Date("2026-07-14T18:00:00.000Z"); // 2026-07-14 in Jerusalem
    expect(yesterdayInTimezone("Asia/Jerusalem", now)).toBe("2026-07-13");
  });

  it("handles a month boundary", () => {
    const now = new Date("2026-08-01T00:30:00.000Z"); // 03:30 Jerusalem on 2026-08-01
    expect(yesterdayInTimezone("Asia/Jerusalem", now)).toBe("2026-07-31");
  });
});

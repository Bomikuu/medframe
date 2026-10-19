import test from "node:test";
import assert from "node:assert/strict";
import { dateLabel } from "../features/patients/calendar-date.ts";

test("API timestamps and calendar-only values render without a RangeError", () => {
  assert.equal(dateLabel("2026-10-20T01:31:00.000Z"), "Oct 20, 2026");
  assert.equal(dateLabel("2026-10-20"), "Oct 20, 2026");
});

test("calendar labels do not shift date of birth across timezones", () => {
  assert.equal(dateLabel("1993-04-12"), "Apr 12, 1993");
});

test("missing or invalid dates have a safe readable fallback", () => {
  for (const value of [null, undefined, "", "not a date", "2026-02-30"])
    assert.equal(dateLabel(value), "Not recorded");
});

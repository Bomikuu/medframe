import test from "node:test";
import assert from "node:assert/strict";
import { snapshotTime } from "../features/analytics/snapshot-time.ts";

test("snapshot date crosses midnight in the clinic timezone", () => {
  const value = "2026-10-19T16:30:00.000Z";
  assert.equal(snapshotTime(value, "Asia/Manila").split(" · ")[0], "Oct 20, 2026");
  assert.equal(snapshotTime(value, "America/New_York").split(" · ")[0], "Oct 19, 2026");
});

test("an invalid snapshot timestamp has an honest fallback", () => {
  assert.equal(snapshotTime("invalid", "Asia/Manila"), "Time unavailable");
});

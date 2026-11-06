import assert from "node:assert/strict";
import { test } from "node:test";
import { DURATION_CHOICES, MAX_DURATION_SEC, durationLabel, isDurationSec } from "../shared/durations.ts";
import { sanitizeDefaults } from "../server/channels.ts";

test("duration choices run from 15 s to 3 minutes", () => {
  assert.deepEqual([...DURATION_CHOICES], [15, 30, 45, 60, 90, 120, 150, 180]);
  assert.equal(MAX_DURATION_SEC, 180);
});

test("durationLabel: seconds below a minute, minutes with a decimal comma above", () => {
  assert.deepEqual(
    DURATION_CHOICES.map(durationLabel),
    ["15 s", "30 s", "45 s", "1 min", "1,5 min", "2 min", "2,5 min", "3 min"],
  );
});

test("isDurationSec accepts only the offered values", () => {
  assert.equal(isDurationSec(180), true);
  assert.equal(isDurationSec(150), true);
  assert.equal(isDurationSec(75), false);
  assert.equal(isDurationSec(240), false);
  assert.equal(isDurationSec("90"), false);
});

test("channel defaults keep the new long durations and drop unknown ones", () => {
  assert.equal(sanitizeDefaults({ durationSec: 150 })?.durationSec, 150);
  assert.equal(sanitizeDefaults({ durationSec: 60 })?.durationSec, 60);
  assert.equal(sanitizeDefaults({ durationSec: 200 })?.durationSec, undefined);
});

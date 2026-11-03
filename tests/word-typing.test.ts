import assert from "node:assert/strict";
import test from "node:test";
import { calculateWordPracticeMetrics } from "../client/src/lib/wordTyping.js";

test("calculates word practice speed and accuracy", () => {
  assert.deepEqual(calculateWordPracticeMetrics(30, 5, 60), {
    wordsPerMinute: 30,
    accuracy: 85.7,
    attempts: 35,
  });
});

test("handles empty and invalid word practice metrics safely", () => {
  assert.deepEqual(calculateWordPracticeMetrics(0, 0, 0), {
    wordsPerMinute: 0,
    accuracy: 0,
    attempts: 0,
  });
  assert.deepEqual(calculateWordPracticeMetrics(Number.NaN, -1, Number.POSITIVE_INFINITY), {
    wordsPerMinute: 0,
    accuracy: 0,
    attempts: 0,
  });
});

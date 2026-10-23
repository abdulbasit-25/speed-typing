import assert from "node:assert/strict";
import test from "node:test";
import { calculateScore, normalizeUsername } from "../server/services/scoring.js";

test("calculates authoritative typing metrics from typed text and elapsed time", () => {
  assert.deepEqual(calculateScore("abcde", "abcXe", 60), {
    typedCharacters: 5,
    correctCharacters: 4,
    incorrectCharacters: 1,
    errorCount: 1,
    grossWpm: 1,
    netWpm: 0.8,
    accuracy: 80,
    finalScore: 0.8,
  });
});

test("handles empty input and zero elapsed time without non-finite metrics", () => {
  const score = calculateScore("reference", "", 0);
  assert.equal(score.accuracy, 0);
  assert.equal(score.grossWpm, 0);
  assert.equal(score.netWpm, 0);
  assert.ok(Object.values(score).every(Number.isFinite));
});

test("counts extra characters as incorrect", () => {
  const score = calculateScore("abc", "abcd", 30);
  assert.equal(score.correctCharacters, 3);
  assert.equal(score.incorrectCharacters, 1);
  assert.equal(score.accuracy, 75);
});

test("normalizes usernames consistently without altering their display form", () => {
  assert.deepEqual(normalizeUsername("  Team_Vanguard  "), {
    username: "Team_Vanguard",
    normalized: "team_vanguard",
  });
});

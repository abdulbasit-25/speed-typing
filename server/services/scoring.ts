export interface ScoreResult {
  typedCharacters: number;
  correctCharacters: number;
  incorrectCharacters: number;
  errorCount: number;
  grossWpm: number;
  netWpm: number;
  accuracy: number;
  finalScore: number;
}

export function calculateScore(referenceText: string, typedText: string, elapsedSeconds: number): ScoreResult {
  const reference = Array.from(referenceText);
  const typed = Array.from(typedText);
  const correctCharacters = typed.reduce(
    (correct, character, index) => correct + (reference[index] === character ? 1 : 0),
    0,
  );
  const typedCharacters = typed.length;
  const incorrectCharacters = typedCharacters - correctCharacters;
  const elapsedMinutes = Math.max(1, elapsedSeconds) / 60;
  const grossWpm = typedCharacters === 0 ? 0 : typedCharacters / 5 / elapsedMinutes;
  const accuracy = typedCharacters === 0 ? 0 : (correctCharacters / typedCharacters) * 100;
  const netWpm = grossWpm * (accuracy / 100);

  return {
    typedCharacters,
    correctCharacters,
    incorrectCharacters,
    errorCount: incorrectCharacters,
    grossWpm: roundMetric(grossWpm),
    netWpm: roundMetric(netWpm),
    accuracy: roundMetric(accuracy),
    finalScore: roundMetric(netWpm),
  };
}

function roundMetric(value: number): number {
  return Number.isFinite(value) ? Math.round(value * 100) / 100 : 0;
}

export function normalizeUsername(value: string): { username: string; normalized: string } {
  const username = value.trim();
  return { username, normalized: username.toLocaleLowerCase("en-US") };
}

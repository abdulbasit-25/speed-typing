export interface WordPracticeMetrics {
  wordsPerMinute: number;
  accuracy: number;
  attempts: number;
}

export function calculateWordPracticeMetrics(
  correctWords: number,
  errors: number,
  elapsedSeconds: number,
): WordPracticeMetrics {
  const correct = Math.max(0, Number.isFinite(correctWords) ? correctWords : 0);
  const incorrect = Math.max(0, Number.isFinite(errors) ? errors : 0);
  const elapsed = Math.max(1, Number.isFinite(elapsedSeconds) ? elapsedSeconds : 0);
  const attempts = correct + incorrect;
  return {
    wordsPerMinute: Math.round((correct * 60 / elapsed) * 10) / 10,
    accuracy: attempts === 0 ? 0 : Math.round((correct / attempts) * 1000) / 10,
    attempts,
  };
}

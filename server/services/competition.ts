import { Competition } from "../models/Competition.js";
import { TypingPassage } from "../models/TypingPassage.js";
import { AppError } from "../utils/AppError.js";

const starterPassage = {
  title: "Clear thinking under pressure",
  difficulty: "intermediate" as const,
  text: "Good work begins with attention. A clear idea can travel far when people share it with care, listen to one another, and make room for a better answer. In a busy room, steady hands and a calm mind matter more than a hurried start. Each small choice adds to the whole: a precise word, a fair decision, a thoughtful question, and the patience to check the details. Progress is not noise or speed alone. It is the habit of returning to the task, learning from a mistake, and finishing with purpose. When a team trusts its process, it can move quickly without losing the care that makes the result worth sharing. The strongest performance is built one accurate action at a time, with focus that holds through the final line.",
};

export async function getCurrentCompetition() {
  let competition = await Competition.findOneAndUpdate(
    { isCurrent: true },
    { $setOnInsert: { isCurrent: true } },
    { returnDocument: "after", upsert: true, setDefaultsOnInsert: true },
  );

  if (!competition) {
    throw new AppError(503, "competition_unavailable", "The competition could not be initialized.");
  }

  try {
    await TypingPassage.updateOne(
      { competitionId: competition._id, title: starterPassage.title },
      { $setOnInsert: { ...starterPassage, competitionId: competition._id, active: true } },
      { upsert: true },
    );
  } catch (error) {
    if (!isDuplicateKeyError(error)) {
      throw error;
    }
  }

  return competition;
}

export function isDuplicateKeyError(error: unknown): error is { code: number } {
  return typeof error === "object" && error !== null && "code" in error && error.code === 11000;
}

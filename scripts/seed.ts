import "dotenv/config";
import mongoose from "mongoose";
import { connectToDatabase } from "../server/config/database.js";
import { getMongoUri } from "../server/config/env.js";
import { Competition } from "../server/models/Competition.js";
import { Participant } from "../server/models/Participant.js";
import { TypingAttempt } from "../server/models/TypingAttempt.js";
import { TypingPassage } from "../server/models/TypingPassage.js";
import { getCurrentCompetition, isDuplicateKeyError } from "../server/services/competition.js";
import { AppError } from "../server/utils/AppError.js";

const passages = [
  {
    title: "The discipline of practice",
    difficulty: "beginner" as const,
    text: "Skill grows through deliberate practice. A careful typist does not chase every keystroke at once; instead, attention settles on the next word, the rhythm of a sentence, and the small corrections that keep meaning clear. A steady pace is built by returning to the fundamentals: posture, light movement, accurate reaches, and a pause to reset when a mistake appears. Over time, those choices become natural. In a competition, preparation is visible not only in speed but in the ability to stay composed, recover quickly, and preserve accuracy as the clock moves forward. Each finished line is evidence of focus sustained under pressure.",
  },
  {
    title: "Ideas into action",
    difficulty: "intermediate" as const,
    text: "Strong teams turn careful observation into useful action. They ask clear questions, share evidence, and listen before choosing a direction. A plan becomes reliable when people can explain it simply, test it in small steps, and revise it when new information appears. Progress is rarely a single brilliant moment; it is the result of patient effort and honest review. When every member contributes with purpose, a difficult task becomes easier to understand and easier to complete. The best results combine thoughtful planning with the courage to begin, steady work, and attention to the details that matter.",
  },
];

async function seed(): Promise<void> {
  try {
    validateMongoUri(getMongoUri());
    await connectToDatabase();

    let competition = await Competition.findOne({ isCurrent: true });
    if (!competition) {
      try {
        competition = await getCurrentCompetition();
      } catch (error) {
        if (!isDuplicateKeyError(error)) throw error;
        competition = await Competition.findOne({ isCurrent: true });
      }
    }
    if (!competition) {
      throw new AppError(503, "competition_unavailable", "The current competition could not be initialized.");
    }
    if (competition.status !== "upcoming") {
      throw new AppError(409, "seed_round_not_upcoming", "Seeding is limited to an upcoming round so it cannot change an active competition.");
    }

    const [participantCount, attemptCount] = await Promise.all([
      Participant.countDocuments({ competitionId: competition._id }),
      TypingAttempt.countDocuments({ competitionId: competition._id }),
    ]);
    if (participantCount > 0 || attemptCount > 0) {
      throw new AppError(409, "seed_round_not_empty", "Seeding is limited to an upcoming round with no participants or attempts.");
    }

    let inserted = 0;
    let alreadyPresent = 0;
    for (const passage of passages) {
      const identity = { competitionId: competition._id, title: passage.title };
      let result;
      try {
        result = await TypingPassage.updateOne(
          identity,
          { $setOnInsert: { ...passage, competitionId: competition._id, active: true } },
          { upsert: true, setDefaultsOnInsert: true, runValidators: true },
        );
      } catch (error) {
        if (!isDuplicateKeyError(error) || !(await TypingPassage.exists(identity))) throw error;
        alreadyPresent += 1;
        continue;
      }
      if (result.upsertedCount > 0) inserted += 1;
      else alreadyPresent += 1;
    }

    console.info(`Seed complete: ${inserted} passage(s) added; ${alreadyPresent} already existed.`);
  } catch (error) {
    process.exitCode = 1;
    if (error instanceof AppError) {
      console.error(`Seed stopped: ${error.message}`);
    } else if (error instanceof mongoose.Error.ValidationError) {
      console.error(`Seed data failed schema validation: ${error.message}`);
    } else {
      const name = error instanceof Error ? error.name : "UnknownError";
      console.error(`Seed failed (${name}). Verify MONGODB_URI, Atlas network access, and database permissions. Connection details are not logged.`);
    }
  } finally {
    try {
      await mongoose.disconnect();
    } catch (error) {
      process.exitCode = 1;
      const name = error instanceof Error ? error.name : "UnknownError";
      console.error(`Mongoose could not disconnect cleanly (${name}).`);
    }
  }
}

function validateMongoUri(uri: string): void {
  let parsed: URL;
  try {
    parsed = new URL(uri);
  } catch {
    throw new AppError(503, "invalid_mongodb_uri", "MONGODB_URI must be a valid MongoDB connection string.");
  }

  if (
    (parsed.protocol !== "mongodb:" && parsed.protocol !== "mongodb+srv:") ||
    !parsed.hostname ||
    uri.includes("<") ||
    uri.includes(">")
  ) {
    throw new AppError(503, "invalid_mongodb_uri", "MONGODB_URI must be a configured, non-placeholder MongoDB connection string.");
  }
}

await seed();

import "dotenv/config";
import { createInterface, emitKeypressEvents } from "node:readline";
import { createInterface as createPrompt } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { connectToDatabase } from "../server/config/database.js";
import { Admin } from "../server/models/Admin.js";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function createAdmin(): Promise<void> {
  const emailInput = process.env.ADMIN_EMAIL?.trim() || await promptForEmail();
  const email = emailInput.toLowerCase();
  const passwordFromEnvironment = process.env.ADMIN_PASSWORD;
  const password = passwordFromEnvironment ?? await promptForHiddenInput("Administrator password: ");
  const confirmedPassword = passwordFromEnvironment === undefined
    ? await promptForHiddenInput("Confirm password: ")
    : password;

  if (!emailPattern.test(email) || email.length > 254) {
    throw new Error("Enter a valid administrator email address (maximum 254 characters).");
  }
  if (password.length < 12) {
    throw new Error("Administrator password must contain at least 12 characters.");
  }
  if (Buffer.byteLength(password, "utf8") > 72) {
    throw new Error("Administrator password cannot exceed bcrypt's 72-byte limit when encoded as UTF-8.");
  }
  if (password !== confirmedPassword) {
    throw new Error("The passwords do not match. No administrator was created.");
  }

  await connectToDatabase();
  if (await Admin.exists({ email })) {
    throw new Error(`An administrator account already exists for ${email}. No account was created.`);
  }

  try {
    await Admin.create({
      email,
      passwordHash: await bcrypt.hash(password, 12),
      role: "admin",
      active: true,
    });
  } catch (error) {
    if (error instanceof mongoose.mongo.MongoServerError && error.code === 11000) {
      throw new Error(`An administrator account already exists for ${email}. No account was created.`);
    }
    throw error;
  }
  console.info(`Administrator account created for ${email}. Sign in at /admin.`);
}

async function promptForEmail(): Promise<string> {
  if (!stdin.isTTY) {
    throw new Error("Set ADMIN_EMAIL and ADMIN_PASSWORD in .env, or run npm run admin:create in an interactive terminal.");
  }
  const prompt = createPrompt({ input: stdin, output: stdout });
  try {
    return (await prompt.question("Administrator email: ")).trim();
  } finally {
    prompt.close();
  }
}

function promptForHiddenInput(message: string): Promise<string> {
  if (!stdin.isTTY || typeof stdin.setRawMode !== "function") {
    throw new Error("Set ADMIN_EMAIL and ADMIN_PASSWORD in .env, or run npm run admin:create in an interactive terminal.");
  }

  return new Promise((resolve, reject) => {
    let value = "";
    let finished = false;
    const finish = (error?: Error) => {
      if (finished) return;
      finished = true;
      stdin.off("keypress", onKeypress);
      stdin.setRawMode(false);
      stdin.pause();
      stdout.write("\n");
      if (error) reject(error);
      else resolve(value);
    };
    const onKeypress = (character: string, key: { name?: string; ctrl?: boolean }) => {
      if (key.ctrl && key.name === "c") {
        finish(new Error("Administrator setup was cancelled."));
      } else if (key.name === "return" || key.name === "enter") {
        finish();
      } else if (key.name === "backspace" || key.name === "delete") {
        if (value.length > 0) {
          value = value.slice(0, -1);
          stdout.write("\b \b");
        }
      } else if (character && !key.ctrl && character >= " ") {
        value += character;
        stdout.write("*");
      }
    };

    emitKeypressEvents(stdin);
    stdin.on("keypress", onKeypress);
    stdin.setRawMode(true);
    stdin.resume();
    stdout.write(message);
  });
}

try {
  await createAdmin();
} catch (error) {
  process.exitCode = 1;
  console.error(error instanceof Error ? error.message : "Administrator setup failed.");
} finally {
  try {
    await mongoose.disconnect();
  } catch (error) {
    process.exitCode = 1;
    const name = error instanceof Error ? error.name : "UnknownError";
    console.error(`Mongoose could not disconnect cleanly (${name}).`);
  }
}

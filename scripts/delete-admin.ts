import "dotenv/config";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import mongoose from "mongoose";
import { connectToDatabase } from "../server/config/database.js";
import { Admin } from "../server/models/Admin.js";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function deleteAdmin(): Promise<void> {
  if (!stdin.isTTY) {
    throw new Error("Administrator deletion requires an interactive terminal so the confirmation can be verified.");
  }

  const prompt = createInterface({ input: stdin, output: stdout });
  try {
    const email = (await prompt.question("Administrator email to delete: ")).trim().toLowerCase();
    if (!emailPattern.test(email) || email.length > 254) {
      throw new Error("Enter a valid administrator email address.");
    }

    await connectToDatabase();
    const target = await Admin.findOne({ email }).select("email active");
    if (!target) {
      throw new Error(`No administrator account exists for ${email}.`);
    }

    const activeAdminCount = await Admin.countDocuments({ active: true });
    if (target.active && activeAdminCount <= 1) {
      throw new Error("The final active administrator cannot be deleted. Create another administrator first.");
    }

    stdout.write(`This permanently deletes the administrator account for ${target.email}.\n`);
    const confirmation = (await prompt.question('Type "DELETE" to continue: ')).trim();
    if (confirmation !== "DELETE") {
      throw new Error("Confirmation did not match. No account was deleted.");
    }

    const deleted = await Admin.findOneAndDelete({ _id: target._id, email });
    if (!deleted) {
      throw new Error("The administrator account changed before deletion. No account was deleted.");
    }

    console.info(`Administrator account deleted for ${email}.`);
  } finally {
    prompt.close();
  }
}

try {
  await deleteAdmin();
} catch (error) {
  process.exitCode = 1;
  console.error(error instanceof Error ? error.message : "Administrator deletion failed.");
} finally {
  try {
    await mongoose.disconnect();
  } catch (error) {
    process.exitCode = 1;
    const name = error instanceof Error ? error.name : "UnknownError";
    console.error(`Mongoose could not disconnect cleanly (${name}).`);
  }
}

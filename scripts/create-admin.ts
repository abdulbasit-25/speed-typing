import "dotenv/config";
import bcrypt from "bcryptjs";
import { connectToDatabase } from "../server/config/database.js";
import { Admin } from "../server/models/Admin.js";

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;

if (!email || !password || password.length < 12) {
  throw new Error("Set ADMIN_EMAIL and an ADMIN_PASSWORD of at least 12 characters before running npm run admin:create.");
}

if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  throw new Error("ADMIN_EMAIL must be a valid email address.");
}

await connectToDatabase();
if (await Admin.exists({})) {
  throw new Error("An administrator already exists. Create additional administrators through a controlled database operation.");
}

await Admin.create({
  email,
  passwordHash: await bcrypt.hash(password, 12),
  role: "admin",
  active: true,
});
console.info("Initial administrator created. Clear ADMIN_PASSWORD from the environment now.");

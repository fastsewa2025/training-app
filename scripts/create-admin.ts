/**
 * Create admin user from command line
 * Usage: npx tsx scripts/create-admin.ts <username> <password> <displayName>
 * Example: npx tsx scripts/create-admin.ts admin Admin@1234 "Site Admin"
 */
import "dotenv/config";
import { db } from "../server/db";
import { users } from "../shared/schema";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

const [, , username, password, displayName = "Admin"] = process.argv;

if (!username || !password) {
  console.error("Usage: npx tsx scripts/create-admin.ts <username> <password> [displayName]");
  process.exit(1);
}

if (password.length < 8) {
  console.error("Password must be at least 8 characters");
  process.exit(1);
}

async function run() {
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, username))
    .limit(1);

  if (existing.length > 0) {
    console.error(`User "${username}" already exists`);
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const [user] = await db
    .insert(users)
    .values({ username, passwordHash, displayName, role: "admin" })
    .returning({ id: users.id, username: users.username });

  console.log(`✅ Admin created: ${user.username} (id: ${user.id})`);
  process.exit(0);
}

run().catch((e) => {
  console.error("Failed:", e.message);
  process.exit(1);
});

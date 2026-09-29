import { eq } from "drizzle-orm";
import { db } from "./db/client.js";
import { users } from "./db/schema.js";
import type { Identity } from "./auth.js";

/** Idempotent: a retry after a temporary database error is safe. */
export async function syncProfile(identity: Identity) {
  const [user] = await db.insert(users)
    .values({ id: identity.uid, email: identity.email })
    .onConflictDoUpdate({ target: users.id, set: { email: identity.email } })
    .returning();
  if (!user) {
    throw new Error("Could not sync the user profile.");
  }
  return user;
}

export async function findProfile(uid: string) {
  const [user] = await db.select().from(users).where(eq(users.id, uid)).limit(1);
  return user;
}

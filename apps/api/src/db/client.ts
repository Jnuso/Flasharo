import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema.js";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required. Copy apps/api/.env.example to apps/api/.env.");
}

export const pool = new pg.Pool({ connectionString });
export const db = drizzle(pool, { schema });

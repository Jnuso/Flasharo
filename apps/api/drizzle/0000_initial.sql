CREATE TABLE IF NOT EXISTS "users" (
  "id" text PRIMARY KEY NOT NULL,
  "email" text NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "study_sets" (
  "id" uuid PRIMARY KEY NOT NULL,
  "owner_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "title" text NOT NULL,
  "description" text DEFAULT '' NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "study_sets_owner_updated_idx" ON "study_sets" ("owner_id", "updated_at");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cards" (
  "id" uuid PRIMARY KEY NOT NULL,
  "set_id" uuid NOT NULL REFERENCES "study_sets"("id") ON DELETE CASCADE,
  "term" text NOT NULL,
  "definition" text NOT NULL,
  "position" integer NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cards_set_position_idx" ON "cards" ("set_id", "position");

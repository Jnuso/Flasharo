ALTER TABLE "study_sets" ADD COLUMN "visibility" text DEFAULT 'private' NOT NULL;
--> statement-breakpoint
ALTER TABLE "study_sets" ADD CONSTRAINT "study_sets_visibility_check" CHECK ("visibility" IN ('private', 'public'));
--> statement-breakpoint
CREATE INDEX "study_sets_visibility_updated_idx" ON "study_sets" ("visibility", "updated_at");

ALTER TABLE "booking_sessions" ADD COLUMN IF NOT EXISTS "start_time" text;--> statement-breakpoint
ALTER TABLE "booking_sessions" ADD COLUMN IF NOT EXISTS "end_time" text;
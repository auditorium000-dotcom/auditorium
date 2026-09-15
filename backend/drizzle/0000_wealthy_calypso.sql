CREATE TYPE "public"."booking_session" AS ENUM('MORNING', 'EVENING');--> statement-breakpoint
CREATE TYPE "public"."booking_session_status" AS ENUM('BOOKED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."booking_status" AS ENUM('CONFIRMED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE', 'OTHER');--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_name" text NOT NULL,
	"contact_name" text NOT NULL,
	"contact_phone" text NOT NULL,
	"event_type" text NOT NULL,
	"total_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"status" "booking_status" DEFAULT 'CONFIRMED' NOT NULL,
	"notes" text,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "booking_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"booking_date" date NOT NULL,
	"session" "booking_session" NOT NULL,
	"status" "booking_session_status" DEFAULT 'BOOKED' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"payment_method" "payment_method" NOT NULL,
	"payment_date" timestamp with time zone DEFAULT now() NOT NULL,
	"received_by" text NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"action" text NOT NULL,
	"booking_id" uuid,
	"details" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "booking_sessions" ADD CONSTRAINT "booking_sessions_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_bookings_status" ON "bookings" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_bookings_contact_phone" ON "bookings" USING btree ("contact_phone");--> statement-breakpoint
CREATE INDEX "idx_bookings_created_by" ON "bookings" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "idx_bookings_created_at" ON "bookings" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_booking_sessions_booking_id" ON "booking_sessions" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "idx_booking_sessions_booking_date" ON "booking_sessions" USING btree ("booking_date");--> statement-breakpoint
CREATE INDEX "idx_booking_sessions_session" ON "booking_sessions" USING btree ("session");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_booking_sessions_unique_active" ON "booking_sessions" USING btree ("booking_date","session") WHERE "booking_sessions"."status" = 'BOOKED';--> statement-breakpoint
CREATE INDEX "idx_payments_booking_id" ON "payments" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "idx_payments_payment_date" ON "payments" USING btree ("payment_date");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_booking_id" ON "audit_logs" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_user_id" ON "audit_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_created_at" ON "audit_logs" USING btree ("created_at");
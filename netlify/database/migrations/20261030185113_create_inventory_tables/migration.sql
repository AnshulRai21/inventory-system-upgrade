CREATE TABLE "items" (
	"id" serial PRIMARY KEY,
	"name" text NOT NULL,
	"unit" text DEFAULT 'Nos' NOT NULL,
	"rate" double precision DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "movements" (
	"id" serial PRIMARY KEY,
	"item_id" integer,
	"item_name" text DEFAULT '' NOT NULL,
	"type" text NOT NULL,
	"qty" double precision NOT NULL,
	"date" date NOT NULL,
	"rate" double precision DEFAULT 0 NOT NULL,
	"location" text DEFAULT '' NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"created_by" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "opening_balances" (
	"id" serial PRIMARY KEY,
	"item_id" integer NOT NULL,
	"month" text NOT NULL,
	"qty" double precision DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sync_state" (
	"id" integer PRIMARY KEY,
	"version" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "movements_date_idx" ON "movements" ("date");--> statement-breakpoint
CREATE INDEX "movements_item_idx" ON "movements" ("item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "opening_item_month_idx" ON "opening_balances" ("item_id","month");--> statement-breakpoint
ALTER TABLE "movements" ADD CONSTRAINT "movements_item_id_items_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "opening_balances" ADD CONSTRAINT "opening_balances_item_id_items_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE CASCADE;
CREATE TABLE "meals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_by" uuid,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meal_ingredients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meal_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"quantity_g" numeric NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "diary_entries" ADD COLUMN "meal_id" uuid;--> statement-breakpoint
ALTER TABLE "meals" ADD CONSTRAINT "meals_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_ingredients" ADD CONSTRAINT "meal_ingredients_meal_id_meals_id_fk" FOREIGN KEY ("meal_id") REFERENCES "public"."meals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_ingredients" ADD CONSTRAINT "meal_ingredients_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "diary_entries" ADD CONSTRAINT "diary_entries_meal_id_meals_id_fk" FOREIGN KEY ("meal_id") REFERENCES "public"."meals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "diary_entries" ADD CONSTRAINT "diary_entries_exactly_one_source" CHECK (("diary_entries"."product_id" IS NOT NULL) <> ("diary_entries"."meal_id" IS NOT NULL));
ALTER TABLE "users" RENAME TO "profiles";--> statement-breakpoint
ALTER TABLE "profiles" RENAME CONSTRAINT "users_email_unique" TO "profiles_email_unique";--> statement-breakpoint
ALTER INDEX "users_pkey" RENAME TO "profiles_pkey";--> statement-breakpoint
ALTER TABLE "products" RENAME CONSTRAINT "products_created_by_users_id_fk" TO "products_created_by_profiles_id_fk";--> statement-breakpoint
ALTER TABLE "meals" RENAME CONSTRAINT "meals_created_by_users_id_fk" TO "meals_created_by_profiles_id_fk";--> statement-breakpoint
ALTER TABLE "diary_entries" RENAME CONSTRAINT "diary_entries_user_id_users_id_fk" TO "diary_entries_user_id_profiles_id_fk";--> statement-breakpoint
ALTER TABLE "weight_logs" RENAME CONSTRAINT "weight_logs_user_id_users_id_fk" TO "weight_logs_user_id_profiles_id_fk";--> statement-breakpoint
ALTER TABLE "goals" RENAME CONSTRAINT "goals_user_id_users_id_fk" TO "goals_user_id_profiles_id_fk";--> statement-breakpoint
ALTER TABLE "notification_logs" RENAME CONSTRAINT "notification_logs_user_id_users_id_fk" TO "notification_logs_user_id_profiles_id_fk";--> statement-breakpoint
ALTER TABLE "extraction_jobs" RENAME CONSTRAINT "extraction_jobs_user_id_users_id_fk" TO "extraction_jobs_user_id_profiles_id_fk";

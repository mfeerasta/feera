CREATE TYPE "public"."audit_actor_type" AS ENUM('user', 'club_staff', 'admin', 'system', 'service');--> statement-breakpoint
CREATE TYPE "public"."booking_participant_status" AS ENUM('invited', 'accepted', 'declined', 'removed', 'no_show', 'waitlisted');--> statement-breakpoint
CREATE TYPE "public"."booking_payment_status" AS ENUM('pending', 'partial', 'paid', 'refunded', 'waived');--> statement-breakpoint
CREATE TYPE "public"."booking_status" AS ENUM('pending', 'confirmed', 'cancelled', 'completed', 'no_show');--> statement-breakpoint
CREATE TYPE "public"."chat_message_kind" AS ENUM('text', 'image', 'system', 'location', 'booking_invite', 'score_card');--> statement-breakpoint
CREATE TYPE "public"."chat_type" AS ENUM('direct', 'group', 'booking', 'tournament', 'coaching', 'support');--> statement-breakpoint
CREATE TYPE "public"."club_staff_role" AS ENUM('owner', 'manager', 'staff', 'coach', 'front_desk');--> statement-breakpoint
CREATE TYPE "public"."coaching_session_status" AS ENUM('pending', 'confirmed', 'completed', 'cancelled', 'no_show');--> statement-breakpoint
CREATE TYPE "public"."edition_club_status" AS ENUM('pending', 'active', 'paused', 'terminated');--> statement-breakpoint
CREATE TYPE "public"."edition_membership_tier" AS ENUM('standard', 'patron', 'founding');--> statement-breakpoint
CREATE TYPE "public"."edition_status" AS ENUM('none', 'applicant', 'active', 'lapsed', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."gender_preference" AS ENUM('open', 'men_only', 'women_only', 'mixed');--> statement-breakpoint
CREATE TYPE "public"."gender_visibility" AS ENUM('public', 'friends', 'private');--> statement-breakpoint
CREATE TYPE "public"."locale" AS ENUM('en', 'ur', 'ar', 'es', 'fr', 'it', 'pt');--> statement-breakpoint
CREATE TYPE "public"."match_verification_status" AS ENUM('unverified', 'peer_verified', 'club_verified');--> statement-breakpoint
CREATE TYPE "public"."payment_provider" AS ENUM('raast', 'jazzcash', 'easypaisa', 'stripe', 'manual');--> statement-breakpoint
CREATE TYPE "public"."payment_purpose" AS ENUM('booking', 'tournament_entry', 'coaching_session', 'edition_membership', 'shop', 'other');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'processing', 'succeeded', 'failed', 'refunded', 'partially_refunded', 'disputed');--> statement-breakpoint
CREATE TYPE "public"."payout_status" AS ENUM('pending', 'processing', 'paid', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."tournament_format" AS ENUM('americano', 'mexicano', 'round_robin', 'single_elimination', 'double_elimination', 'king_of_the_court', 'pplp');--> statement-breakpoint
CREATE TYPE "public"."tournament_match_status" AS ENUM('scheduled', 'in_progress', 'completed', 'walkover', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."tournament_registration_status" AS ENUM('pending', 'confirmed', 'waitlisted', 'withdrawn', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."tournament_status" AS ENUM('draft', 'open', 'registration_closed', 'in_progress', 'completed', 'cancelled');--> statement-breakpoint
CREATE TABLE "user_ratings" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"rating_internal" double precision DEFAULT 1500 NOT NULL,
	"rating_display" double precision DEFAULT 3.5 NOT NULL,
	"rating_deviation" double precision DEFAULT 350 NOT NULL,
	"volatility" double precision DEFAULT 0.06 NOT NULL,
	"reliability_pct" integer DEFAULT 0 NOT NULL,
	"match_count" integer DEFAULT 0 NOT NULL,
	"last_match_at" timestamp with time zone,
	"women_only_pool_rating" double precision,
	"is_provisional" boolean DEFAULT true NOT NULL,
	"is_flagged_sandbag" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_social_scores" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"on_time_rate" double precision DEFAULT 1 NOT NULL,
	"no_show_rate" double precision DEFAULT 0 NOT NULL,
	"sportsmanship_avg" double precision,
	"response_time_minutes_avg" integer,
	"last_calculated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone" text,
	"email" text,
	"display_name" text NOT NULL,
	"locale" "locale" DEFAULT 'en' NOT NULL,
	"country_code" text NOT NULL,
	"city" text,
	"gender" text,
	"gender_visibility" "gender_visibility" DEFAULT 'private' NOT NULL,
	"date_of_birth" timestamp,
	"profile_photo_url" text,
	"bio" text,
	"is_verified_coach" boolean DEFAULT false NOT NULL,
	"federation_player_ids" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"preferred_payment_method" text,
	"edition_member_status" "edition_status" DEFAULT 'none' NOT NULL,
	"edition_member_since" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "users_phone_unique" UNIQUE("phone"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "clubs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"country_code" text NOT NULL,
	"city" text NOT NULL,
	"address" text,
	"lat" double precision,
	"lng" double precision,
	"phone" text,
	"email" text,
	"website_url" text,
	"logo_url" text,
	"photos" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"amenities" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"opening_hours" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"has_women_only_hours" boolean DEFAULT false NOT NULL,
	"women_only_schedule" jsonb,
	"has_indoor" boolean DEFAULT false NOT NULL,
	"has_outdoor" boolean DEFAULT true NOT NULL,
	"has_climate_control" boolean DEFAULT false NOT NULL,
	"has_panoramic" boolean DEFAULT false NOT NULL,
	"has_prayer_room" boolean DEFAULT false NOT NULL,
	"has_shower_facilities" boolean DEFAULT true NOT NULL,
	"has_parking" boolean DEFAULT false NOT NULL,
	"has_food_service" boolean DEFAULT false NOT NULL,
	"edition_partner_status" text DEFAULT 'none' NOT NULL,
	"platform_fee_pct" double precision DEFAULT 0.1 NOT NULL,
	"default_currency" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "court_pricing_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"court_id" uuid NOT NULL,
	"day_of_week" integer NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"price_per_slot" double precision NOT NULL,
	"currency" text NOT NULL,
	"is_member_only" boolean DEFAULT false NOT NULL,
	"is_peak" boolean DEFAULT false NOT NULL,
	"applies_to_edition_only" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "courts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"club_id" uuid NOT NULL,
	"name" text NOT NULL,
	"surface" text DEFAULT 'artificial_grass' NOT NULL,
	"is_indoor" boolean DEFAULT false NOT NULL,
	"is_climate_controlled" boolean DEFAULT false NOT NULL,
	"is_panoramic" boolean DEFAULT false NOT NULL,
	"court_dimensions" text DEFAULT 'standard' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"photos" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "booking_participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"status" "booking_participant_status" DEFAULT 'invited' NOT NULL,
	"paid_amount" double precision,
	"payment_status" "booking_payment_status" DEFAULT 'pending' NOT NULL,
	"paid_to_organizer_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"court_id" uuid NOT NULL,
	"organizer_user_id" uuid NOT NULL,
	"start_at" timestamp with time zone NOT NULL,
	"end_at" timestamp with time zone NOT NULL,
	"total_amount" double precision NOT NULL,
	"currency" text NOT NULL,
	"status" "booking_status" DEFAULT 'pending' NOT NULL,
	"is_open_match" boolean DEFAULT false NOT NULL,
	"required_level_min" double precision,
	"required_level_max" double precision,
	"gender_preference" "gender_preference" DEFAULT 'open' NOT NULL,
	"max_participants" integer DEFAULT 4 NOT NULL,
	"is_edition_priority" boolean DEFAULT false NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "matches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid,
	"team_a_player_1" uuid NOT NULL,
	"team_a_player_2" uuid NOT NULL,
	"team_b_player_1" uuid NOT NULL,
	"team_b_player_2" uuid NOT NULL,
	"team_a_sets_won" integer NOT NULL,
	"team_b_sets_won" integer NOT NULL,
	"raw_score" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_ranked" boolean DEFAULT true NOT NULL,
	"played_at" timestamp with time zone NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"recorded_by_user_id" uuid NOT NULL,
	"verification_status" "match_verification_status" DEFAULT 'unverified' NOT NULL,
	"rating_changes" jsonb,
	"tournament_match_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tournament_matches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tournament_id" uuid NOT NULL,
	"round_id" uuid,
	"court_id" uuid,
	"scheduled_at" timestamp with time zone,
	"team_a_registration_id" uuid,
	"team_b_registration_id" uuid,
	"team_a_sets_won" integer,
	"team_b_sets_won" integer,
	"raw_score" jsonb,
	"status" "tournament_match_status" DEFAULT 'scheduled' NOT NULL,
	"match_id" uuid,
	"next_match_id" uuid,
	"bracket_position" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tournament_registrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tournament_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"partner_user_id" uuid,
	"team_name" text,
	"seed" integer,
	"status" "tournament_registration_status" DEFAULT 'pending' NOT NULL,
	"payment_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tournament_rounds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tournament_id" uuid NOT NULL,
	"name" text NOT NULL,
	"ordinal" integer NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tournaments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"club_id" uuid,
	"organizer_user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"format" "tournament_format" NOT NULL,
	"status" "tournament_status" DEFAULT 'draft' NOT NULL,
	"country_code" text NOT NULL,
	"city" text,
	"start_at" timestamp with time zone NOT NULL,
	"end_at" timestamp with time zone NOT NULL,
	"registration_opens_at" timestamp with time zone,
	"registration_closes_at" timestamp with time zone,
	"max_teams" integer,
	"min_level" double precision,
	"max_level" double precision,
	"gender_preference" "gender_preference" DEFAULT 'open' NOT NULL,
	"entry_fee" double precision DEFAULT 0 NOT NULL,
	"currency" text NOT NULL,
	"prize_pool" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"rules_url" text,
	"is_edition_only" boolean DEFAULT false NOT NULL,
	"is_ranked" boolean DEFAULT true NOT NULL,
	"pplp_enabled" boolean DEFAULT false NOT NULL,
	"bracket" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "coaches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"primary_club_id" uuid,
	"bio" text,
	"languages" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"specialties" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"certifications" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"years_experience" integer,
	"hourly_rate" double precision NOT NULL,
	"currency" text NOT NULL,
	"accepts_women_only" boolean DEFAULT true NOT NULL,
	"accepts_juniors" boolean DEFAULT true NOT NULL,
	"is_accepting_bookings" boolean DEFAULT true NOT NULL,
	"is_verified_by_feera" boolean DEFAULT false NOT NULL,
	"average_rating" double precision,
	"rating_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "coaching_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"coach_id" uuid NOT NULL,
	"learner_user_id" uuid NOT NULL,
	"club_id" uuid,
	"court_id" uuid,
	"additional_learners" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"start_at" timestamp with time zone NOT NULL,
	"end_at" timestamp with time zone NOT NULL,
	"total_amount" double precision NOT NULL,
	"currency" text NOT NULL,
	"status" "coaching_session_status" DEFAULT 'pending' NOT NULL,
	"payment_id" uuid,
	"notes" text,
	"learner_rating" integer,
	"learner_review" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chat_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_read_at" timestamp with time zone,
	"is_muted" boolean DEFAULT false NOT NULL,
	"left_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chat_id" uuid NOT NULL,
	"sender_user_id" uuid,
	"kind" "chat_message_kind" DEFAULT 'text' NOT NULL,
	"body" text,
	"attachments" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"reply_to_message_id" uuid,
	"edited_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "chat_type" NOT NULL,
	"title" text,
	"context_table" text,
	"context_id" uuid,
	"created_by_user_id" uuid,
	"last_message_at" timestamp with time zone,
	"is_archived" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payer_user_id" uuid NOT NULL,
	"payee_club_id" uuid,
	"payee_user_id" uuid,
	"purpose" "payment_purpose" NOT NULL,
	"context_table" text NOT NULL,
	"context_id" uuid NOT NULL,
	"provider" "payment_provider" NOT NULL,
	"provider_payment_id" text,
	"provider_customer_id" text,
	"amount" double precision NOT NULL,
	"currency" text NOT NULL,
	"platform_fee" double precision DEFAULT 0 NOT NULL,
	"processor_fee" double precision DEFAULT 0 NOT NULL,
	"net_to_payee" double precision DEFAULT 0 NOT NULL,
	"status" "payment_status" DEFAULT 'pending' NOT NULL,
	"failure_code" text,
	"failure_message" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"paid_at" timestamp with time zone,
	"refunded_amount" double precision DEFAULT 0 NOT NULL,
	"refunded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payouts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payee_club_id" uuid,
	"payee_user_id" uuid,
	"provider" "payment_provider" NOT NULL,
	"provider_payout_id" text,
	"period_start" timestamp with time zone NOT NULL,
	"period_end" timestamp with time zone NOT NULL,
	"amount" double precision NOT NULL,
	"currency" text NOT NULL,
	"status" "payout_status" DEFAULT 'pending' NOT NULL,
	"payment_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"failure_message" text,
	"settled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "club_staff" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"club_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "club_staff_role" DEFAULT 'staff' NOT NULL,
	"permissions" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"invited_by_user_id" uuid,
	"invited_at" timestamp with time zone,
	"accepted_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "federation_player_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"federation_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"federation_player_id" text NOT NULL,
	"federation_rating" double precision,
	"federation_rank" text,
	"verified_at" timestamp with time zone,
	"last_synced_at" timestamp with time zone,
	"raw_profile" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "federations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"country_code" text,
	"website_url" text,
	"api_base_url" text,
	"api_auth_type" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "edition_clubs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"club_id" uuid NOT NULL,
	"status" "edition_club_status" DEFAULT 'pending' NOT NULL,
	"member_discount_pct" double precision DEFAULT 0 NOT NULL,
	"priority_booking_hours" double precision DEFAULT 0 NOT NULL,
	"reserved_slots_per_week" double precision,
	"contract_start_at" timestamp with time zone,
	"contract_end_at" timestamp with time zone,
	"contract_terms" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "edition_memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"tier" "edition_membership_tier" DEFAULT 'standard' NOT NULL,
	"status" "edition_status" DEFAULT 'applicant' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"decided_at" timestamp with time zone,
	"decided_by_user_id" uuid,
	"started_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"annual_fee" double precision,
	"currency" text,
	"payment_id" uuid,
	"application_answers" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"referral_user_id" uuid,
	"notes" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_type" "audit_actor_type" NOT NULL,
	"actor_user_id" uuid,
	"actor_label" text,
	"action" text NOT NULL,
	"target_table" text NOT NULL,
	"target_id" uuid,
	"diff" jsonb,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"request_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_account" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_session" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_user" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text,
	"email_verified" boolean DEFAULT false NOT NULL,
	"name" text,
	"image" text,
	"phone_number" text,
	"phone_number_verified" boolean DEFAULT false NOT NULL,
	"country_code" text,
	"locale" text DEFAULT 'en' NOT NULL,
	"edition_status" text DEFAULT 'none' NOT NULL,
	"is_coach" boolean DEFAULT false NOT NULL,
	"is_club_staff" boolean DEFAULT false NOT NULL,
	"feera_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_verification" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_ratings" ADD CONSTRAINT "user_ratings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_social_scores" ADD CONSTRAINT "user_social_scores_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "court_pricing_rules" ADD CONSTRAINT "court_pricing_rules_court_id_courts_id_fk" FOREIGN KEY ("court_id") REFERENCES "public"."courts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "courts" ADD CONSTRAINT "courts_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_participants" ADD CONSTRAINT "booking_participants_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_participants" ADD CONSTRAINT "booking_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_court_id_courts_id_fk" FOREIGN KEY ("court_id") REFERENCES "public"."courts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_organizer_user_id_users_id_fk" FOREIGN KEY ("organizer_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_team_a_player_1_users_id_fk" FOREIGN KEY ("team_a_player_1") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_team_a_player_2_users_id_fk" FOREIGN KEY ("team_a_player_2") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_team_b_player_1_users_id_fk" FOREIGN KEY ("team_b_player_1") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_team_b_player_2_users_id_fk" FOREIGN KEY ("team_b_player_2") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_recorded_by_user_id_users_id_fk" FOREIGN KEY ("recorded_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_matches" ADD CONSTRAINT "tournament_matches_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_matches" ADD CONSTRAINT "tournament_matches_round_id_tournament_rounds_id_fk" FOREIGN KEY ("round_id") REFERENCES "public"."tournament_rounds"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_matches" ADD CONSTRAINT "tournament_matches_team_a_registration_id_tournament_registrations_id_fk" FOREIGN KEY ("team_a_registration_id") REFERENCES "public"."tournament_registrations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_matches" ADD CONSTRAINT "tournament_matches_team_b_registration_id_tournament_registrations_id_fk" FOREIGN KEY ("team_b_registration_id") REFERENCES "public"."tournament_registrations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_registrations" ADD CONSTRAINT "tournament_registrations_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_registrations" ADD CONSTRAINT "tournament_registrations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_registrations" ADD CONSTRAINT "tournament_registrations_partner_user_id_users_id_fk" FOREIGN KEY ("partner_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_rounds" ADD CONSTRAINT "tournament_rounds_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournaments" ADD CONSTRAINT "tournaments_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournaments" ADD CONSTRAINT "tournaments_organizer_user_id_users_id_fk" FOREIGN KEY ("organizer_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coaches" ADD CONSTRAINT "coaches_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coaches" ADD CONSTRAINT "coaches_primary_club_id_clubs_id_fk" FOREIGN KEY ("primary_club_id") REFERENCES "public"."clubs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coaching_sessions" ADD CONSTRAINT "coaching_sessions_coach_id_coaches_id_fk" FOREIGN KEY ("coach_id") REFERENCES "public"."coaches"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coaching_sessions" ADD CONSTRAINT "coaching_sessions_learner_user_id_users_id_fk" FOREIGN KEY ("learner_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coaching_sessions" ADD CONSTRAINT "coaching_sessions_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coaching_sessions" ADD CONSTRAINT "coaching_sessions_court_id_courts_id_fk" FOREIGN KEY ("court_id") REFERENCES "public"."courts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_members" ADD CONSTRAINT "chat_members_chat_id_chats_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."chats"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_members" ADD CONSTRAINT "chat_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_chat_id_chats_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."chats"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_sender_user_id_users_id_fk" FOREIGN KEY ("sender_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chats" ADD CONSTRAINT "chats_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_payer_user_id_users_id_fk" FOREIGN KEY ("payer_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_payee_club_id_clubs_id_fk" FOREIGN KEY ("payee_club_id") REFERENCES "public"."clubs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_payee_user_id_users_id_fk" FOREIGN KEY ("payee_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_payee_club_id_clubs_id_fk" FOREIGN KEY ("payee_club_id") REFERENCES "public"."clubs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_payee_user_id_users_id_fk" FOREIGN KEY ("payee_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "club_staff" ADD CONSTRAINT "club_staff_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "club_staff" ADD CONSTRAINT "club_staff_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "club_staff" ADD CONSTRAINT "club_staff_invited_by_user_id_users_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "federation_player_links" ADD CONSTRAINT "federation_player_links_federation_id_federations_id_fk" FOREIGN KEY ("federation_id") REFERENCES "public"."federations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "federation_player_links" ADD CONSTRAINT "federation_player_links_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "edition_clubs" ADD CONSTRAINT "edition_clubs_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "edition_memberships" ADD CONSTRAINT "edition_memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "edition_memberships" ADD CONSTRAINT "edition_memberships_decided_by_user_id_users_id_fk" FOREIGN KEY ("decided_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "edition_memberships" ADD CONSTRAINT "edition_memberships_referral_user_id_users_id_fk" FOREIGN KEY ("referral_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_account" ADD CONSTRAINT "auth_account_user_id_auth_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_session" ADD CONSTRAINT "auth_session_user_id_auth_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_ratings_discovery_idx" ON "user_ratings" USING btree ("rating_display","is_provisional");--> statement-breakpoint
CREATE UNIQUE INDEX "users_phone_uq" ON "users" USING btree ("phone");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_uq" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "users_country_city_idx" ON "users" USING btree ("country_code","city");--> statement-breakpoint
CREATE UNIQUE INDEX "clubs_slug_uq" ON "clubs" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "clubs_geo_idx" ON "clubs" USING btree ("lat","lng");--> statement-breakpoint
CREATE INDEX "clubs_country_city_idx" ON "clubs" USING btree ("country_code","city");--> statement-breakpoint
CREATE INDEX "court_pricing_rules_court_day_idx" ON "court_pricing_rules" USING btree ("court_id","day_of_week");--> statement-breakpoint
CREATE INDEX "bookings_court_start_idx" ON "bookings" USING btree ("court_id","start_at");--> statement-breakpoint
CREATE INDEX "bookings_organizer_start_idx" ON "bookings" USING btree ("organizer_user_id","start_at");--> statement-breakpoint
CREATE INDEX "matches_played_at_idx" ON "matches" USING btree ("played_at");--> statement-breakpoint
CREATE INDEX "tournament_matches_tournament_status_idx" ON "tournament_matches" USING btree ("tournament_id","status");--> statement-breakpoint
CREATE INDEX "tournament_matches_scheduled_idx" ON "tournament_matches" USING btree ("scheduled_at");--> statement-breakpoint
CREATE UNIQUE INDEX "tournament_registrations_unique_user" ON "tournament_registrations" USING btree ("tournament_id","user_id");--> statement-breakpoint
CREATE INDEX "tournament_registrations_status_idx" ON "tournament_registrations" USING btree ("tournament_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "tournament_rounds_unique_ordinal" ON "tournament_rounds" USING btree ("tournament_id","ordinal");--> statement-breakpoint
CREATE UNIQUE INDEX "tournaments_slug_uq" ON "tournaments" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "tournaments_status_start_idx" ON "tournaments" USING btree ("status","start_at");--> statement-breakpoint
CREATE INDEX "tournaments_country_city_idx" ON "tournaments" USING btree ("country_code","city");--> statement-breakpoint
CREATE UNIQUE INDEX "coaches_user_uq" ON "coaches" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "coaches_club_idx" ON "coaches" USING btree ("primary_club_id");--> statement-breakpoint
CREATE INDEX "coaching_sessions_coach_start_idx" ON "coaching_sessions" USING btree ("coach_id","start_at");--> statement-breakpoint
CREATE INDEX "coaching_sessions_learner_idx" ON "coaching_sessions" USING btree ("learner_user_id","start_at");--> statement-breakpoint
CREATE UNIQUE INDEX "chat_members_chat_user_uq" ON "chat_members" USING btree ("chat_id","user_id");--> statement-breakpoint
CREATE INDEX "chat_members_user_idx" ON "chat_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "chat_messages_chat_created_idx" ON "chat_messages" USING btree ("chat_id","created_at");--> statement-breakpoint
CREATE INDEX "chats_context_idx" ON "chats" USING btree ("context_table","context_id");--> statement-breakpoint
CREATE INDEX "chats_last_message_idx" ON "chats" USING btree ("last_message_at");--> statement-breakpoint
CREATE UNIQUE INDEX "payments_provider_id_uq" ON "payments" USING btree ("provider","provider_payment_id");--> statement-breakpoint
CREATE INDEX "payments_payer_idx" ON "payments" USING btree ("payer_user_id","created_at");--> statement-breakpoint
CREATE INDEX "payments_payee_club_idx" ON "payments" USING btree ("payee_club_id","created_at");--> statement-breakpoint
CREATE INDEX "payments_context_idx" ON "payments" USING btree ("context_table","context_id");--> statement-breakpoint
CREATE INDEX "payments_status_idx" ON "payments" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "payouts_provider_id_uq" ON "payouts" USING btree ("provider","provider_payout_id");--> statement-breakpoint
CREATE INDEX "payouts_payee_club_period_idx" ON "payouts" USING btree ("payee_club_id","period_end");--> statement-breakpoint
CREATE INDEX "payouts_status_idx" ON "payouts" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "club_staff_club_user_uq" ON "club_staff" USING btree ("club_id","user_id");--> statement-breakpoint
CREATE INDEX "club_staff_user_idx" ON "club_staff" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "club_staff_club_role_idx" ON "club_staff" USING btree ("club_id","role");--> statement-breakpoint
CREATE UNIQUE INDEX "federation_player_links_unique" ON "federation_player_links" USING btree ("federation_id","federation_player_id");--> statement-breakpoint
CREATE UNIQUE INDEX "federation_player_links_user_fed_uq" ON "federation_player_links" USING btree ("federation_id","user_id");--> statement-breakpoint
CREATE INDEX "federation_player_links_user_idx" ON "federation_player_links" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "federations_code_uq" ON "federations" USING btree ("code");--> statement-breakpoint
CREATE INDEX "federations_country_idx" ON "federations" USING btree ("country_code");--> statement-breakpoint
CREATE UNIQUE INDEX "edition_clubs_club_uq" ON "edition_clubs" USING btree ("club_id");--> statement-breakpoint
CREATE INDEX "edition_clubs_status_idx" ON "edition_clubs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "edition_memberships_user_status_idx" ON "edition_memberships" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "edition_memberships_expires_idx" ON "edition_memberships" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "audit_log_actor_idx" ON "audit_log" USING btree ("actor_user_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_log_target_idx" ON "audit_log" USING btree ("target_table","target_id");--> statement-breakpoint
CREATE INDEX "audit_log_action_idx" ON "audit_log" USING btree ("action","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "auth_account_provider_uq" ON "auth_account" USING btree ("provider_id","account_id");--> statement-breakpoint
CREATE INDEX "auth_account_user_idx" ON "auth_account" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "auth_session_token_uq" ON "auth_session" USING btree ("token");--> statement-breakpoint
CREATE INDEX "auth_session_user_idx" ON "auth_session" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "auth_user_email_uq" ON "auth_user" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "auth_user_phone_uq" ON "auth_user" USING btree ("phone_number");--> statement-breakpoint
CREATE INDEX "auth_user_feera_id_idx" ON "auth_user" USING btree ("feera_user_id");--> statement-breakpoint
CREATE INDEX "auth_verification_identifier_idx" ON "auth_verification" USING btree ("identifier");
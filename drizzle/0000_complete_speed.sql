CREATE TABLE "alerts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"external_id" text,
	"pool_name" text NOT NULL,
	"type" text NOT NULL,
	"severity" text NOT NULL,
	"message" text NOT NULL,
	"status" text DEFAULT 'Active' NOT NULL,
	"timestamp" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "archived_alerts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"alert_id" text NOT NULL,
	"alert_type" text NOT NULL,
	"archived_at" timestamp DEFAULT now(),
	"archived_by" text,
	CONSTRAINT "archived_alerts_alert_id_unique" UNIQUE("alert_id")
);
--> statement-breakpoint
CREATE TABLE "channel_members" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channel_id" varchar NOT NULL,
	"user_id" text NOT NULL,
	"user_name" text NOT NULL,
	"role" text DEFAULT 'member',
	"joined_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "channel_messages" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channel_id" varchar NOT NULL,
	"parent_message_id" varchar,
	"author_id" text NOT NULL,
	"author_name" text NOT NULL,
	"content" text NOT NULL,
	"message_type" text DEFAULT 'text',
	"attachments" json DEFAULT '[]'::json,
	"mentions" json DEFAULT '[]'::json,
	"is_edited" boolean DEFAULT false,
	"is_pinned" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "channel_reactions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"message_id" varchar NOT NULL,
	"user_id" text NOT NULL,
	"emoji" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "channel_reads" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channel_id" varchar NOT NULL,
	"user_id" text NOT NULL,
	"last_read_at" timestamp DEFAULT now(),
	"last_read_message_id" varchar
);
--> statement-breakpoint
CREATE TABLE "chat_messages" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"model" text,
	"timestamp" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "completed_alerts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"alert_id" text NOT NULL,
	"category" text NOT NULL,
	"completed_at" timestamp DEFAULT now(),
	"reviewed_by" text,
	CONSTRAINT "completed_alerts_alert_id_unique" UNIQUE("alert_id")
);
--> statement-breakpoint
CREATE TABLE "customer_addresses" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" varchar NOT NULL,
	"external_id" text,
	"address_type" text DEFAULT 'primary',
	"address_line_1" text,
	"address_line_2" text,
	"city" text,
	"state" text,
	"zip" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "customer_contacts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" varchar NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"contact_type" text DEFAULT 'primary',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "customer_tag_assignments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" varchar NOT NULL,
	"tag_id" varchar NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "customer_tags" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"color" text DEFAULT '#6B7280',
	"is_prebuilt" boolean DEFAULT false,
	"is_warning_tag" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"external_id" text,
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"address" text,
	"city" text,
	"state" text,
	"zip" text,
	"status" text DEFAULT 'active',
	"pool_count" integer DEFAULT 0,
	"tags" text,
	"notes" text,
	"chemicals_budget" integer,
	"chemicals_budget_period" text DEFAULT 'monthly',
	"repairs_budget" integer,
	"repairs_budget_period" text DEFAULT 'monthly',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "emergencies" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" varchar,
	"property_name" text,
	"property_address" text,
	"submitted_by_id" varchar,
	"submitted_by_name" text,
	"submitter_role" text NOT NULL,
	"description" text NOT NULL,
	"total_amount" integer DEFAULT 0,
	"photos" text[],
	"original_service_date" timestamp,
	"converted_to_estimate_id" text,
	"converted_to_invoice_id" text,
	"converted_at" timestamp,
	"original_marked_complete_at" timestamp,
	"status" text DEFAULT 'pending_review' NOT NULL,
	"priority" text DEFAULT 'normal',
	"resolved_at" timestamp,
	"resolved_by_id" varchar,
	"resolved_by_name" text,
	"resolution_notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "equipment" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" varchar NOT NULL,
	"pool_id" varchar,
	"property_id" varchar,
	"category" text NOT NULL,
	"equipment_type" text NOT NULL,
	"brand" text,
	"model" text,
	"serial_number" text,
	"quantity" integer DEFAULT 1,
	"photos" text[],
	"install_date" timestamp,
	"warranty_expiry" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "equipment_pm_schedules" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"equipment_id" text NOT NULL,
	"equipment_name" text NOT NULL,
	"equipment_type" text NOT NULL,
	"property_id" text NOT NULL,
	"property_name" text NOT NULL,
	"body_of_water_id" text,
	"water_type" text NOT NULL,
	"pm_service_type_id" varchar NOT NULL,
	"interval_setting_id" varchar,
	"custom_interval_months" integer,
	"custom_interval_reason" text,
	"install_date" text,
	"last_service_date" text,
	"next_due_date" text NOT NULL,
	"status" text DEFAULT 'current' NOT NULL,
	"due_priority" integer DEFAULT 0,
	"notes" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "estimate_history_log" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"estimate_id" text NOT NULL,
	"estimate_number" text,
	"property_id" text,
	"property_name" text,
	"customer_id" text,
	"customer_name" text,
	"estimate_value" integer,
	"action_type" text NOT NULL,
	"action_description" text,
	"performed_by_user_id" text,
	"performed_by_user_name" text,
	"performed_at" timestamp DEFAULT now(),
	"approval_method" text,
	"approver_name" text,
	"approver_title" text,
	"approver_contact_method" text,
	"reason" text,
	"notes" text,
	"previous_status" text,
	"new_status" text,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "estimates" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" text NOT NULL,
	"property_name" text NOT NULL,
	"customer_name" text,
	"customer_email" text,
	"address" text,
	"estimate_number" text,
	"estimate_date" timestamp DEFAULT now(),
	"expiration_date" timestamp,
	"accepted_by" text,
	"accepted_date" timestamp,
	"location" text,
	"tags" text[],
	"source_type" text DEFAULT 'office_staff',
	"source_repair_job_id" text,
	"source_emergency_id" text,
	"service_repair_count" integer,
	"converted_by_user_id" text,
	"converted_by_user_name" text,
	"converted_at" timestamp,
	"title" text NOT NULL,
	"description" text,
	"items" json DEFAULT '[]'::json,
	"photos" text[],
	"attachments" json DEFAULT '[]'::json,
	"subtotal" integer DEFAULT 0,
	"discount_type" text DEFAULT 'percent',
	"discount_value" real DEFAULT 0,
	"discount_amount" integer DEFAULT 0,
	"taxable_subtotal" integer DEFAULT 0,
	"sales_tax_rate" real DEFAULT 0,
	"sales_tax_amount" integer DEFAULT 0,
	"deposit_type" text DEFAULT 'percent',
	"deposit_value" real DEFAULT 0,
	"deposit_amount" integer DEFAULT 0,
	"total_amount" integer DEFAULT 0,
	"parts_total" integer DEFAULT 0,
	"labor_total" integer DEFAULT 0,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_by_tech_id" text,
	"created_by_tech_name" text,
	"repair_tech_id" text,
	"repair_tech_name" text,
	"service_tech_id" text,
	"service_tech_name" text,
	"field_supervisor_id" text,
	"field_supervisor_name" text,
	"office_member_id" text,
	"office_member_name" text,
	"repair_foreman_id" text,
	"repair_foreman_name" text,
	"approved_by_manager_id" text,
	"approved_by_manager_name" text,
	"created_at" timestamp DEFAULT now(),
	"reported_date" timestamp,
	"sent_for_approval_at" timestamp,
	"approved_at" timestamp,
	"rejected_at" timestamp,
	"scheduled_date" timestamp,
	"completed_at" timestamp,
	"invoiced_at" timestamp,
	"tech_notes" text,
	"manager_notes" text,
	"rejection_reason" text,
	"customer_note" text,
	"memo_on_statement" text,
	"approval_token" text,
	"approval_token_expires_at" timestamp,
	"approval_sent_to" text,
	"approval_sent_at" timestamp,
	"customer_approver_name" text,
	"customer_approver_title" text,
	"verbal_approval_recorded_by" text,
	"verbal_approval_method" text,
	"verbal_approval_method_details" text,
	"job_id" text,
	"invoice_id" text,
	"assigned_repair_job_id" text,
	"scheduled_by_user_id" text,
	"scheduled_by_user_name" text,
	"scheduled_at" timestamp,
	"deadline_at" timestamp,
	"deadline_unit" text DEFAULT 'hours',
	"deadline_value" integer,
	"work_type" text DEFAULT 'repairs',
	"wo_required" boolean DEFAULT false,
	"wo_received" boolean DEFAULT false,
	"wo_number" text,
	"is_deleted" boolean DEFAULT false,
	"deleted_at" timestamp,
	"deleted_by_user_id" text,
	"deleted_by_user_name" text,
	"deleted_reason" text,
	"archived_at" timestamp,
	"archived_by_user_id" text,
	"archived_by_user_name" text,
	"archived_reason" text
);
--> statement-breakpoint
CREATE TABLE "field_entries" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"route_stop_id" text,
	"property_id" text,
	"technician_id" text,
	"technician_name" text,
	"entry_type" text NOT NULL,
	"payload" text,
	"submitted_at" timestamp DEFAULT now(),
	"sync_status" text DEFAULT 'synced',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "fleet_maintenance_records" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"truck_id" varchar NOT NULL,
	"truck_number" integer NOT NULL,
	"service_type" text NOT NULL,
	"service_date" text,
	"vendor" text,
	"mileage" integer,
	"cost" real,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "fleet_trucks" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"truck_number" integer NOT NULL,
	"current_mileage" integer,
	"registration_due" text,
	"smog_due" text,
	"smog_result" text,
	"notes" text,
	"status" text DEFAULT 'Active',
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "fleet_trucks_truck_number_unique" UNIQUE("truck_number")
);
--> statement-breakpoint
CREATE TABLE "message_read_receipts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"message_id" varchar NOT NULL,
	"user_id" text NOT NULL,
	"read_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "pay_periods" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "payroll_entries" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pay_period_id" varchar NOT NULL,
	"technician_id" text NOT NULL,
	"technician_name" text NOT NULL,
	"job_id" text NOT NULL,
	"job_title" text NOT NULL,
	"customer_name" text,
	"amount" integer NOT NULL,
	"commission_rate" integer DEFAULT 10,
	"commission_amount" integer NOT NULL,
	"notes" text,
	"added_by" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "pm_interval_settings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pm_service_type_id" varchar NOT NULL,
	"water_type" text NOT NULL,
	"recommended_interval_months" integer NOT NULL,
	"minimum_interval_months" integer NOT NULL,
	"maximum_interval_months" integer NOT NULL,
	"warning_threshold_days" integer DEFAULT 30,
	"industry_standard" text,
	"notes" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "pm_service_records" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"equipment_pm_schedule_id" varchar NOT NULL,
	"equipment_id" text NOT NULL,
	"equipment_name" text NOT NULL,
	"property_id" text NOT NULL,
	"property_name" text NOT NULL,
	"body_of_water_id" text,
	"pm_service_type_id" varchar NOT NULL,
	"service_date" text NOT NULL,
	"completed_by_name" text,
	"duration_minutes" integer,
	"service_reason" text NOT NULL,
	"work_notes" text,
	"issues_found" text,
	"condition_rating" text,
	"recommended_follow_up" text,
	"labor_cost" real,
	"parts_cost" real,
	"total_cost" real,
	"days_since_last_service" integer,
	"was_early_service" boolean DEFAULT false,
	"early_service_approved_by" text,
	"early_service_reason" text,
	"next_service_date" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "pm_service_types" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"category" text NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "pool_equipment" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pool_id" varchar NOT NULL,
	"equipment_type" text NOT NULL,
	"equipment_value" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "pools" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" varchar NOT NULL,
	"external_id" text,
	"name" text NOT NULL,
	"pool_type" text,
	"service_level" text,
	"water_type" text,
	"gallons" integer,
	"address" text,
	"city" text,
	"state" text,
	"zip" text,
	"latitude" real,
	"longitude" real,
	"notes" text,
	"wo_required" boolean DEFAULT false,
	"wo_notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "properties" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"external_id" text,
	"customer_id" text,
	"customer_name" text,
	"name" text NOT NULL,
	"address" text,
	"city" text,
	"state" text,
	"zip" text,
	"latitude" real,
	"longitude" real,
	"pool_count" integer DEFAULT 0,
	"service_level" text,
	"status" text DEFAULT 'active',
	"notes" text,
	"gate_code" text,
	"access_instructions" text,
	"billing_address" text,
	"billing_city" text,
	"billing_state" text,
	"billing_zip" text,
	"primary_contact_name" text,
	"primary_contact_phone" text,
	"primary_contact_email" text,
	"secondary_contact_name" text,
	"secondary_contact_phone" text,
	"secondary_contact_email" text,
	"zone" text,
	"tags" text[],
	"monthly_rate" integer,
	"account_balance" integer DEFAULT 0,
	"last_service_date" timestamp,
	"next_service_date" timestamp,
	"property_type" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "property_access_notes" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" varchar NOT NULL,
	"note_type" text NOT NULL,
	"title" text NOT NULL,
	"content" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "property_billing_contacts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" varchar NOT NULL,
	"contact_type" text NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "property_channels" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" text NOT NULL,
	"property_name" text NOT NULL,
	"customer_name" text,
	"address" text,
	"description" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "property_channels_property_id_unique" UNIQUE("property_id")
);
--> statement-breakpoint
CREATE TABLE "property_contacts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" varchar NOT NULL,
	"name" text NOT NULL,
	"role" text,
	"phone" text,
	"email" text,
	"is_primary" boolean DEFAULT false,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "quickbooks_tokens" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"realm_id" text NOT NULL,
	"access_token" text NOT NULL,
	"refresh_token" text NOT NULL,
	"access_token_expires_at" timestamp NOT NULL,
	"refresh_token_expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "route_assignments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"schedule_id" varchar NOT NULL,
	"day_of_week" integer NOT NULL,
	"technician_id" text NOT NULL,
	"technician_name" text,
	"route_name" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "route_moves" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stop_id" text NOT NULL,
	"original_route_id" text NOT NULL,
	"temporary_route_id" text NOT NULL,
	"move_date" timestamp NOT NULL,
	"is_permanent" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "route_schedules" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" varchar NOT NULL,
	"pool_id" varchar,
	"is_active" boolean DEFAULT false,
	"frequency" text DEFAULT 'weekly',
	"frequency_interval" integer DEFAULT 1,
	"visit_days" text[],
	"route_notes" text,
	"end_date" timestamp,
	"last_generated_through" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "route_stops" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"external_id" text,
	"route_id" text NOT NULL,
	"property_id" text NOT NULL,
	"property_name" text NOT NULL,
	"customer_id" text,
	"customer_name" text,
	"pool_id" text,
	"address" text,
	"city" text,
	"state" text,
	"zip" text,
	"pool_name" text,
	"job_type" text DEFAULT 'route_stop',
	"status" text DEFAULT 'not_started',
	"sort_order" integer DEFAULT 0,
	"estimated_time" integer DEFAULT 30,
	"notes" text,
	"frequency" text DEFAULT 'weekly',
	"frequency_weeks" integer DEFAULT 1,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "routes" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"external_id" text,
	"name" text NOT NULL,
	"date" timestamp,
	"day_of_week" integer NOT NULL,
	"color" text DEFAULT '#0891b2' NOT NULL,
	"technician_id" text,
	"technician_name" text,
	"is_locked" boolean DEFAULT false,
	"estimated_drive_time" integer DEFAULT 0,
	"estimated_miles" real DEFAULT 0,
	"estimated_on_site_time" integer DEFAULT 0,
	"start_location" text,
	"end_location" text,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "service_occurrences" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" varchar NOT NULL,
	"date" timestamp NOT NULL,
	"status" text DEFAULT 'unscheduled',
	"route_id" varchar,
	"technician_id" varchar,
	"source_schedule_id" varchar NOT NULL,
	"is_auto_generated" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "service_repair_jobs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"external_id" text,
	"job_number" text NOT NULL,
	"property_id" text NOT NULL,
	"property_name" text NOT NULL,
	"customer_id" text,
	"customer_name" text,
	"pool_id" text,
	"pool_name" text,
	"address" text,
	"technician_id" text,
	"technician_name" text,
	"job_date" timestamp DEFAULT now(),
	"description" text,
	"notes" text,
	"photos" text[],
	"labor_amount" integer DEFAULT 0,
	"parts_amount" integer DEFAULT 0,
	"total_amount" integer DEFAULT 0,
	"items" json DEFAULT '[]'::json,
	"status" text DEFAULT 'pending' NOT NULL,
	"estimate_id" text,
	"invoice_id" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"batched_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "service_tasks" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pool_id" varchar NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"description" text,
	"sort_order" integer DEFAULT 0,
	"is_completed" boolean DEFAULT false,
	"icons" text,
	"hidden_conditions" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pool_brain_api_key" text,
	"pool_brain_company_id" text,
	"default_ai_model" text DEFAULT 'goss-20b',
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tech_ops_entries" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entry_type" text NOT NULL,
	"technician_name" text NOT NULL,
	"technician_id" varchar,
	"property_id" varchar,
	"property_name" text,
	"property_address" text,
	"description" text,
	"notes" text,
	"priority" text DEFAULT 'normal',
	"status" text DEFAULT 'pending',
	"is_read" boolean DEFAULT false,
	"chemicals" text,
	"quantity" text,
	"issue_type" text,
	"photos" text[],
	"reviewed_by" text,
	"reviewed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "technicians" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"external_id" text,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"phone" text,
	"email" text,
	"photo_url" text,
	"role" text DEFAULT 'service',
	"supervisor_id" varchar,
	"active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "thread_messages" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"thread_id" varchar NOT NULL,
	"author_id" text NOT NULL,
	"author_name" text NOT NULL,
	"type" text DEFAULT 'update' NOT NULL,
	"text" text,
	"photo_urls" json DEFAULT '[]'::json,
	"tagged_user_ids" json DEFAULT '[]'::json,
	"tagged_roles" json DEFAULT '[]'::json,
	"visibility" text DEFAULT 'all',
	"pinned" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "threads" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" text NOT NULL,
	"account_name" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "threads_account_id_unique" UNIQUE("account_id")
);
--> statement-breakpoint
CREATE TABLE "truck_inventory" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"truck_id" varchar NOT NULL,
	"truck_number" integer NOT NULL,
	"item_name" text NOT NULL,
	"category" text NOT NULL,
	"quantity" integer DEFAULT 0 NOT NULL,
	"unit" text DEFAULT 'each',
	"min_quantity" integer DEFAULT 0,
	"max_quantity" integer,
	"last_restocked" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "unscheduled_stops" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" text NOT NULL,
	"property_name" text NOT NULL,
	"customer_name" text,
	"address" text,
	"pool_name" text,
	"job_type" text DEFAULT 'route_stop',
	"notes" text,
	"estimated_time" integer DEFAULT 30,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "workflows" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"trigger" text NOT NULL,
	"action" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"executions" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);

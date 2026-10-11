CREATE TABLE "transport_collections" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"service_id" text NOT NULL,
	"date" text NOT NULL,
	"amount" numeric NOT NULL,
	"method" text DEFAULT '' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transport_services" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"truck_id" text NOT NULL,
	"customer_id" text,
	"customer_name" text NOT NULL,
	"customer_phone" text DEFAULT '' NOT NULL,
	"customer_email" text,
	"customer_address" text,
	"customer_identification" text,
	"origin" text NOT NULL,
	"destination" text NOT NULL,
	"distance_km" numeric DEFAULT 0 NOT NULL,
	"estimated_time" text DEFAULT '' NOT NULL,
	"service_date" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"payment_status" text DEFAULT 'pending' NOT NULL,
	"total_freight_price" numeric DEFAULT 0 NOT NULL,
	"total_paid" numeric DEFAULT 0 NOT NULL,
	"driver_name" text DEFAULT '' NOT NULL,
	"driver_id" text DEFAULT '' NOT NULL,
	"driver_phone" text DEFAULT '' NOT NULL,
	"expenses" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"notes" text,
	"created_at" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "transport_services_status_check" CHECK (status in ('pending', 'in_progress', 'finished', 'cancelled')),
	CONSTRAINT "transport_services_payment_status_check" CHECK (payment_status in ('pending', 'partial', 'paid')),
	CONSTRAINT "transport_services_freight_non_negative" CHECK ("transport_services"."total_freight_price" >= 0)
);
--> statement-breakpoint
CREATE TABLE "trucks" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"plate" text NOT NULL,
	"model" text DEFAULT '' NOT NULL,
	"brand" text DEFAULT '' NOT NULL,
	"capacity_tons" numeric DEFAULT 0 NOT NULL,
	"fuel_type" text DEFAULT '' NOT NULL,
	"average_km_per_gallon" numeric DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'available' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "trucks_status_check" CHECK (status in ('available', 'in_service', 'maintenance'))
);
--> statement-breakpoint
ALTER TABLE "app_config" ADD COLUMN "contract_template_url" text;--> statement-breakpoint
ALTER TABLE "quotations" ADD COLUMN "approved" text;--> statement-breakpoint
ALTER TABLE "transport_collections" ADD CONSTRAINT "transport_collections_service_id_transport_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."transport_services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "transport_collections_service_id_idx" ON "transport_collections" USING btree ("service_id");--> statement-breakpoint
CREATE INDEX "transport_collections_date_idx" ON "transport_collections" USING btree ("date");--> statement-breakpoint
CREATE INDEX "transport_services_service_date_idx" ON "transport_services" USING btree ("service_date");--> statement-breakpoint
CREATE INDEX "transport_services_truck_id_idx" ON "transport_services" USING btree ("truck_id");--> statement-breakpoint
CREATE INDEX "trucks_plate_idx" ON "trucks" USING btree ("plate");
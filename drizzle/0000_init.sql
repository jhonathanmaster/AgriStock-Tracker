CREATE TABLE "animal_types" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app_config" (
	"id" text PRIMARY KEY NOT NULL,
	"critical_stock_threshold" numeric,
	"initial_capital" numeric,
	"company_name" text,
	"company_nit" text,
	"company_address" text,
	"company_phone" text,
	"company_email" text,
	"representative_name" text,
	"representative_position" text,
	"logo_url" text,
	"icon_url" text,
	"signature_url" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "credit_collections" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"credit_id" text NOT NULL,
	"date" text NOT NULL,
	"amount" numeric NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "credits" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"customer_id" text,
	"customer_name" text NOT NULL,
	"customer_phone" text DEFAULT '' NOT NULL,
	"items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"total_value" numeric DEFAULT 0 NOT NULL,
	"installments" integer DEFAULT 1 NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"created_at" text NOT NULL,
	"agreement_date" text,
	"expected_end_date" text,
	"notes" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "credits_status_check" CHECK (status in ('active', 'paid', 'cancelled'))
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"name" text NOT NULL,
	"identification_number" text,
	"phone" text,
	"email" text,
	"address" text,
	"last_purchase_date" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "data_versions" (
	"resource" text PRIMARY KEY NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expense_categories" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"date" text NOT NULL,
	"description" text NOT NULL,
	"category" text NOT NULL,
	"quantity" numeric DEFAULT 1 NOT NULL,
	"unit_value" numeric DEFAULT 0 NOT NULL,
	"iva_percentage" numeric DEFAULT 0 NOT NULL,
	"iva_value" numeric DEFAULT 0 NOT NULL,
	"sub_total" numeric DEFAULT 0 NOT NULL,
	"total" numeric NOT NULL,
	"supplier_id" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_audits" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"product_id" text,
	"product_name" text,
	"system_quantity" numeric,
	"verified_quantity" numeric NOT NULL,
	"difference" numeric,
	"unit" text,
	"audit_date" text NOT NULL,
	"performed_by" text,
	"performed_by_name" text,
	"notes" text,
	"applied" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_movements" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"product_id" text,
	"type" text NOT NULL,
	"quantity" numeric NOT NULL,
	"unit" text NOT NULL,
	"movement_date_time" text NOT NULL,
	"notes" text,
	"total_value" numeric,
	"sub_total" numeric,
	"iva_percentage" numeric,
	"iva_value" numeric,
	"customer_name" text,
	"customer_phone" text,
	"customer_email" text,
	"customer_address" text,
	"customer_identification" text,
	"performed_by" text,
	"performed_by_name" text,
	"source_ref" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inventory_movements_type_check" CHECK (type in ('entrada', 'salida', 'venta')),
	CONSTRAINT "inventory_movements_unit_check" CHECK (unit in ('libras', 'kilos', 'bultos', 'unidades'))
);
--> statement-breakpoint
CREATE TABLE "invitations" (
	"email" text PRIMARY KEY NOT NULL,
	"role" text DEFAULT 'operario' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"token_hash" text,
	"expires_at" text,
	"invited_at" text,
	"accepted_at" text,
	"opened_at" text,
	"last_email_body" text,
	"identification_number" text,
	"phone" text,
	"address" text,
	"photo_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invitations_email_lowercase" CHECK ("invitations"."email" = lower("invitations"."email")),
	CONSTRAINT "invitations_role_check" CHECK (role in ('admin', 'operario')),
	CONSTRAINT "invitations_status_check" CHECK (status in ('pending', 'accepted'))
);
--> statement-breakpoint
CREATE TABLE "legacy_import_map" (
	"collection" text NOT NULL,
	"source_id" text NOT NULL,
	"target_id" text NOT NULL,
	"imported_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "legacy_import_map_collection_source_id_pk" PRIMARY KEY("collection","source_id")
);
--> statement-breakpoint
CREATE TABLE "oauth_states" (
	"state" text PRIMARY KEY NOT NULL,
	"code_verifier" text NOT NULL,
	"nonce" text NOT NULL,
	"return_to" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"request_date" text NOT NULL,
	"delivery_date" text,
	"customer_id" text,
	"customer_name" text NOT NULL,
	"customer_phone" text DEFAULT '' NOT NULL,
	"customer_email" text,
	"customer_address" text,
	"customer_identification" text,
	"items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"payments" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"total_value" numeric DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orders_status_check" CHECK (status in ('pending', 'delivered', 'cancelled', 'paid'))
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"reference_code" text DEFAULT '' NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"animal_type" text DEFAULT 'No Aplica' NOT NULL,
	"category" text DEFAULT '' NOT NULL,
	"supplier_id" text,
	"image_url" text,
	"stock" numeric DEFAULT 0 NOT NULL,
	"stock_in_bundles" numeric DEFAULT 0 NOT NULL,
	"main_unit" text DEFAULT 'kilos' NOT NULL,
	"cost_price" numeric DEFAULT 0 NOT NULL,
	"profit_percentage" numeric DEFAULT 0 NOT NULL,
	"sale_price" numeric DEFAULT 0 NOT NULL,
	"transport_price_per_bundle" numeric DEFAULT 0 NOT NULL,
	"is_imported" boolean DEFAULT false NOT NULL,
	"origin" text,
	"import_cost" numeric,
	"created_at" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_main_unit_check" CHECK (main_unit in ('libras', 'kilos', 'bultos', 'unidades')),
	CONSTRAINT "products_prices_non_negative" CHECK ("products"."cost_price" >= 0 and "products"."sale_price" >= 0 and "products"."transport_price_per_bundle" >= 0)
);
--> statement-breakpoint
CREATE TABLE "purchase_order_statuses" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"color" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchase_orders" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"product_id" text,
	"supplier_id" text,
	"quantity" numeric NOT NULL,
	"unit" text NOT NULL,
	"status" text NOT NULL,
	"request_date" text NOT NULL,
	"delivery_date" text,
	"informed_date" text,
	"received_date" text,
	"expiration_days" integer,
	"notes" text,
	"unit_price" numeric,
	"transport_price" numeric,
	"total_cost" numeric,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "purchase_orders_unit_check" CHECK (unit in ('libras', 'kilos', 'bultos', 'unidades'))
);
--> statement-breakpoint
CREATE TABLE "quotation_collections" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"quotation_id" text NOT NULL,
	"date" text NOT NULL,
	"amount" numeric NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quotation_import_trackings" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"quotation_id" text NOT NULL,
	"date" text NOT NULL,
	"status" text NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quotations" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"date" text NOT NULL,
	"estimated_delivery_date" text,
	"customer_id" text,
	"customer_name" text NOT NULL,
	"customer_phone" text DEFAULT '' NOT NULL,
	"customer_email" text DEFAULT '' NOT NULL,
	"customer_address" text,
	"customer_identification" text,
	"items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"total_value" numeric DEFAULT 0 NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"absolute_expires_at" timestamp with time zone NOT NULL,
	"user_agent" text,
	"ip" text
);
--> statement-breakpoint
CREATE TABLE "suppliers" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"name" text NOT NULL,
	"identification_number" text,
	"contact_name" text,
	"phone" text,
	"email" text,
	"address" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "unit_conversions" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"from_unit" text NOT NULL,
	"to_unit" text NOT NULL,
	"factor" numeric NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "unit_conversions_from_check" CHECK (from_unit in ('libras', 'kilos', 'bultos', 'unidades')),
	CONSTRAINT "unit_conversions_to_check" CHECK (to_unit in ('libras', 'kilos', 'bultos', 'unidades')),
	CONSTRAINT "unit_conversions_factor_positive" CHECK ("unit_conversions"."factor" > 0)
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"email" text NOT NULL,
	"display_name" text,
	"photo_url" text,
	"password_hash" text,
	"google_sub" text,
	"enabled" boolean DEFAULT false NOT NULL,
	"role" text DEFAULT 'operario' NOT NULL,
	"last_login" timestamp with time zone,
	"access_history" timestamp with time zone[] DEFAULT '{}' NOT NULL,
	"identification_number" text,
	"phone" text,
	"address" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_lowercase" CHECK ("users"."email" = lower("users"."email")),
	CONSTRAINT "users_role_check" CHECK (role in ('admin', 'operario'))
);
--> statement-breakpoint
ALTER TABLE "credit_collections" ADD CONSTRAINT "credit_collections_credit_id_credits_id_fk" FOREIGN KEY ("credit_id") REFERENCES "public"."credits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_audits" ADD CONSTRAINT "inventory_audits_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_collections" ADD CONSTRAINT "quotation_collections_quotation_id_quotations_id_fk" FOREIGN KEY ("quotation_id") REFERENCES "public"."quotations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_import_trackings" ADD CONSTRAINT "quotation_import_trackings_quotation_id_quotations_id_fk" FOREIGN KEY ("quotation_id") REFERENCES "public"."quotations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "animal_types_name_idx" ON "animal_types" USING btree ("name");--> statement-breakpoint
CREATE INDEX "categories_name_idx" ON "categories" USING btree ("name");--> statement-breakpoint
CREATE INDEX "credit_collections_credit_id_idx" ON "credit_collections" USING btree ("credit_id");--> statement-breakpoint
CREATE INDEX "credit_collections_date_idx" ON "credit_collections" USING btree ("date");--> statement-breakpoint
CREATE INDEX "credits_created_at_idx" ON "credits" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "credits_customer_id_idx" ON "credits" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "customers_name_idx" ON "customers" USING btree ("name");--> statement-breakpoint
CREATE INDEX "customers_phone_digits_idx" ON "customers" USING btree (regexp_replace(coalesce("phone", ''), '\D', '', 'g'));--> statement-breakpoint
CREATE INDEX "customers_email_lower_idx" ON "customers" USING btree (lower("email"));--> statement-breakpoint
CREATE INDEX "expense_categories_name_idx" ON "expense_categories" USING btree ("name");--> statement-breakpoint
CREATE INDEX "expenses_date_idx" ON "expenses" USING btree ("date");--> statement-breakpoint
CREATE INDEX "inventory_audits_date_idx" ON "inventory_audits" USING btree ("audit_date");--> statement-breakpoint
CREATE INDEX "inventory_audits_product_id_idx" ON "inventory_audits" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "inventory_movements_product_id_idx" ON "inventory_movements" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "inventory_movements_date_idx" ON "inventory_movements" USING btree ("movement_date_time");--> statement-breakpoint
CREATE UNIQUE INDEX "inventory_movements_source_ref_key" ON "inventory_movements" USING btree ("source_ref");--> statement-breakpoint
CREATE INDEX "orders_delivery_date_idx" ON "orders" USING btree ("delivery_date");--> statement-breakpoint
CREATE INDEX "orders_customer_id_idx" ON "orders" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "products_name_idx" ON "products" USING btree ("name");--> statement-breakpoint
CREATE INDEX "products_supplier_id_idx" ON "products" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX "purchase_order_statuses_order_idx" ON "purchase_order_statuses" USING btree ("sort_order");--> statement-breakpoint
CREATE INDEX "purchase_orders_request_date_idx" ON "purchase_orders" USING btree ("request_date");--> statement-breakpoint
CREATE INDEX "purchase_orders_product_id_idx" ON "purchase_orders" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "purchase_orders_supplier_id_idx" ON "purchase_orders" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX "quotation_collections_quotation_id_idx" ON "quotation_collections" USING btree ("quotation_id");--> statement-breakpoint
CREATE INDEX "quotation_collections_date_idx" ON "quotation_collections" USING btree ("date");--> statement-breakpoint
CREATE INDEX "quotation_import_trackings_quotation_id_idx" ON "quotation_import_trackings" USING btree ("quotation_id");--> statement-breakpoint
CREATE INDEX "quotation_import_trackings_date_idx" ON "quotation_import_trackings" USING btree ("date");--> statement-breakpoint
CREATE INDEX "quotations_date_idx" ON "quotations" USING btree ("date");--> statement-breakpoint
CREATE INDEX "quotations_customer_id_idx" ON "quotations" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_expires_at_idx" ON "sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "suppliers_name_idx" ON "suppliers" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "unit_conversions_pair_key" ON "unit_conversions" USING btree ("from_unit","to_unit");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_key" ON "users" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "users_google_sub_key" ON "users" USING btree ("google_sub");
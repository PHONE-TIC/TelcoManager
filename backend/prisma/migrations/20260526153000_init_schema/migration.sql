-- CreateEnum
CREATE TYPE "Role" AS ENUM ('technicien', 'admin', 'gestionnaire');

-- CreateEnum
CREATE TYPE "StatutIntervention" AS ENUM ('planifiee', 'en_cours', 'terminee', 'annulee');

-- CreateEnum
CREATE TYPE "StatutStock" AS ENUM ('courant', 'hs', 'retour_fournisseur');

-- CreateTable
CREATE TABLE "clients" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "sousLieu" TEXT,
    "rue" TEXT NOT NULL,
    "code_postal" TEXT NOT NULL,
    "ville" TEXT NOT NULL,
    "contact" TEXT NOT NULL,
    "telephone" TEXT NOT NULL,
    "email" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "techniciens" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'technicien',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "last_login" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "techniciens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "push_subscriptions" (
    "id" TEXT NOT NULL,
    "technicien_id" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interventions" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "compteur" SERIAL NOT NULL,
    "client_id" TEXT NOT NULL,
    "client_nom" TEXT,
    "technicien_id" TEXT,
    "technicien_nom" TEXT,
    "titre" TEXT NOT NULL,
    "description" TEXT,
    "date_planifiee" TIMESTAMP(3) NOT NULL,
    "date_prise_en_charge" TIMESTAMP(3),
    "heure_arrivee" TIMESTAMP(3),
    "heure_depart" TIMESTAMP(3),
    "date_realisee" TIMESTAMP(3),
    "statut" "StatutIntervention" NOT NULL DEFAULT 'planifiee',
    "type" TEXT NOT NULL DEFAULT 'SAV',
    "notes" TEXT,
    "signature" TEXT,
    "signatureTechnicien" TEXT,
    "commentaireTechnicien" TEXT,
    "locked_at" TIMESTAMP(3),
    "locked_by" TEXT,
    "outlook_event_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "interventions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock" (
    "id" TEXT NOT NULL,
    "nom_materiel" TEXT NOT NULL,
    "marque" TEXT,
    "modele" TEXT,
    "reference" TEXT NOT NULL,
    "numero_serie" TEXT NOT NULL DEFAULT '',
    "code_barre" TEXT,
    "categorie" TEXT NOT NULL,
    "fournisseur" TEXT,
    "statut" "StatutStock" NOT NULL DEFAULT 'courant',
    "quantite" INTEGER NOT NULL DEFAULT 1,
    "low_stock_threshold" INTEGER DEFAULT 5,
    "date_entree" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_movements" (
    "id" TEXT NOT NULL,
    "stock_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "quantite" INTEGER NOT NULL,
    "quantite_avant" INTEGER NOT NULL,
    "quantite_apres" INTEGER NOT NULL,
    "reason" TEXT,
    "technicien_id" TEXT,
    "performed_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_equipments" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "client_nom" TEXT,
    "stock_id" TEXT NOT NULL,
    "reference_materiel" TEXT NOT NULL,
    "date_installation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "statut" TEXT NOT NULL DEFAULT 'installe',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_equipments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "intervention_equipments" (
    "id" TEXT NOT NULL,
    "intervention_id" TEXT NOT NULL,
    "stock_id" TEXT,
    "action" TEXT NOT NULL,
    "quantite" INTEGER NOT NULL DEFAULT 1,
    "nom" TEXT,
    "marque" TEXT,
    "modele" TEXT,
    "serial_number" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "intervention_equipments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "technician_stocks" (
    "id" TEXT NOT NULL,
    "technicien_id" TEXT NOT NULL,
    "stock_id" TEXT NOT NULL,
    "quantite" INTEGER NOT NULL DEFAULT 1,
    "etat" TEXT NOT NULL DEFAULT 'ok',
    "client_id" TEXT,
    "assigned_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "technician_stocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_sessions" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_items" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "stock_id" TEXT NOT NULL,
    "expectedQuantity" INTEGER NOT NULL DEFAULT 0,
    "countedQuantity" INTEGER,
    "notes" TEXT,

    CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_logs" (
    "id" TEXT NOT NULL,
    "technicien_id" TEXT,
    "action" TEXT NOT NULL,
    "details" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "link" TEXT,
    "metadata" JSONB,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "techniciens_username_key" ON "techniciens"("username");

-- CreateIndex
CREATE UNIQUE INDEX "push_subscriptions_endpoint_key" ON "push_subscriptions"("endpoint");

-- CreateIndex
CREATE INDEX "push_subscriptions_technicien_id_idx" ON "push_subscriptions"("technicien_id");

-- CreateIndex
CREATE UNIQUE INDEX "interventions_numero_key" ON "interventions"("numero");

-- CreateIndex
CREATE INDEX "interventions_client_id_idx" ON "interventions"("client_id");

-- CreateIndex
CREATE INDEX "interventions_technicien_id_idx" ON "interventions"("technicien_id");

-- CreateIndex
CREATE INDEX "interventions_date_planifiee_idx" ON "interventions"("date_planifiee");

-- CreateIndex
CREATE UNIQUE INDEX "stock_code_barre_key" ON "stock"("code_barre");

-- CreateIndex
CREATE INDEX "stock_statut_idx" ON "stock"("statut");

-- CreateIndex
CREATE INDEX "stock_code_barre_idx" ON "stock"("code_barre");

-- CreateIndex
CREATE INDEX "stock_movements_stock_id_idx" ON "stock_movements"("stock_id");

-- CreateIndex
CREATE INDEX "stock_movements_technicien_id_idx" ON "stock_movements"("technicien_id");

-- CreateIndex
CREATE INDEX "stock_movements_performed_by_id_idx" ON "stock_movements"("performed_by_id");

-- CreateIndex
CREATE INDEX "stock_movements_created_at_idx" ON "stock_movements"("created_at");

-- CreateIndex
CREATE INDEX "client_equipments_client_id_idx" ON "client_equipments"("client_id");

-- CreateIndex
CREATE INDEX "client_equipments_stock_id_idx" ON "client_equipments"("stock_id");

-- CreateIndex
CREATE INDEX "intervention_equipments_intervention_id_idx" ON "intervention_equipments"("intervention_id");

-- CreateIndex
CREATE INDEX "intervention_equipments_stock_id_idx" ON "intervention_equipments"("stock_id");

-- CreateIndex
CREATE INDEX "technician_stocks_technicien_id_idx" ON "technician_stocks"("technicien_id");

-- CreateIndex
CREATE INDEX "technician_stocks_stock_id_idx" ON "technician_stocks"("stock_id");

-- CreateIndex
CREATE INDEX "technician_stocks_client_id_idx" ON "technician_stocks"("client_id");

-- CreateIndex
CREATE UNIQUE INDEX "technician_stocks_technicien_id_stock_id_key" ON "technician_stocks"("technicien_id", "stock_id");

-- CreateIndex
CREATE INDEX "inventory_items_session_id_idx" ON "inventory_items"("session_id");

-- CreateIndex
CREATE INDEX "inventory_items_stock_id_idx" ON "inventory_items"("stock_id");

-- AddForeignKey
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_technicien_id_fkey" FOREIGN KEY ("technicien_id") REFERENCES "techniciens"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interventions" ADD CONSTRAINT "interventions_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interventions" ADD CONSTRAINT "interventions_technicien_id_fkey" FOREIGN KEY ("technicien_id") REFERENCES "techniciens"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_stock_id_fkey" FOREIGN KEY ("stock_id") REFERENCES "stock"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_technicien_id_fkey" FOREIGN KEY ("technicien_id") REFERENCES "techniciens"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_performed_by_id_fkey" FOREIGN KEY ("performed_by_id") REFERENCES "techniciens"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_equipments" ADD CONSTRAINT "client_equipments_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_equipments" ADD CONSTRAINT "client_equipments_stock_id_fkey" FOREIGN KEY ("stock_id") REFERENCES "stock"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intervention_equipments" ADD CONSTRAINT "intervention_equipments_intervention_id_fkey" FOREIGN KEY ("intervention_id") REFERENCES "interventions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intervention_equipments" ADD CONSTRAINT "intervention_equipments_stock_id_fkey" FOREIGN KEY ("stock_id") REFERENCES "stock"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "technician_stocks" ADD CONSTRAINT "technician_stocks_technicien_id_fkey" FOREIGN KEY ("technicien_id") REFERENCES "techniciens"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "technician_stocks" ADD CONSTRAINT "technician_stocks_stock_id_fkey" FOREIGN KEY ("stock_id") REFERENCES "stock"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "technician_stocks" ADD CONSTRAINT "technician_stocks_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "inventory_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_stock_id_fkey" FOREIGN KEY ("stock_id") REFERENCES "stock"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_technicien_id_fkey" FOREIGN KEY ("technicien_id") REFERENCES "techniciens"("id") ON DELETE SET NULL ON UPDATE CASCADE;


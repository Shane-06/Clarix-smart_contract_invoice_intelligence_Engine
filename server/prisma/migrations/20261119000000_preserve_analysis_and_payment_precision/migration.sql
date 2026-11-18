ALTER TABLE "Contract"
    ADD COLUMN "clientEmail" TEXT,
    ADD COLUMN "analysis" JSONB,
    ADD COLUMN "riskDetails" JSONB,
    ADD COLUMN "isDemo" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Invoice" ALTER COLUMN "amount" TYPE DECIMAL(14,2);
ALTER TABLE "Payment" ALTER COLUMN "amount" TYPE DECIMAL(14,2),
    ADD COLUMN "reference" TEXT;

CREATE UNIQUE INDEX "Payment_reference_key" ON "Payment"("reference");

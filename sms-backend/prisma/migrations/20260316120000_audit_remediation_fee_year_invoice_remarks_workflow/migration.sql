-- DropForeignKey
ALTER TABLE "fee_structures" DROP CONSTRAINT "fee_structures_termId_fkey";

-- DropIndex
DROP INDEX "fee_structures_feeCategoryId_classId_section_termId_key";

-- AlterTable
ALTER TABLE "fee_structures" DROP COLUMN "termId",
ADD COLUMN     "academicYearId" UUID NOT NULL;

-- AlterTable
ALTER TABLE "report_card_settings" ALTER COLUMN "whoCanGenerate" SET DEFAULT 'dos_and_admin';

-- CreateTable
CREATE TABLE "fee_invoices" (
    "id" UUID NOT NULL,
    "pupilId" UUID NOT NULL,
    "termId" UUID NOT NULL,
    "academicYearId" UUID NOT NULL,
    "invoiceNumber" VARCHAR(50) NOT NULL,
    "invoiceDate" DATE NOT NULL,
    "dueDate" DATE,
    "totalAmount" INTEGER NOT NULL,
    "bursaryDiscount" INTEGER NOT NULL DEFAULT 0,
    "previousArrears" INTEGER NOT NULL DEFAULT 0,
    "netTotal" INTEGER NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'draft',
    "pdfPath" VARCHAR(500),
    "generatedById" UUID,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "fee_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fee_invoice_line_items" (
    "id" UUID NOT NULL,
    "feeInvoiceId" UUID NOT NULL,
    "feeCategoryId" UUID NOT NULL,
    "description" VARCHAR(200) NOT NULL,
    "standardAmount" INTEGER NOT NULL,
    "bursaryDiscount" INTEGER NOT NULL DEFAULT 0,
    "netAmount" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "fee_invoice_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grade_remarks" (
    "id" UUID NOT NULL,
    "gradingScaleEntryId" UUID NOT NULL,
    "remarkNumber" SMALLINT NOT NULL,
    "remarkText" VARCHAR(500) NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "grade_remarks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "division_remarks" (
    "id" UUID NOT NULL,
    "divisionBoundaryId" UUID NOT NULL,
    "commentRole" VARCHAR(20) NOT NULL,
    "optionNumber" SMALLINT NOT NULL,
    "remarkText" VARCHAR(500) NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "division_remarks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "term_workflow_steps" (
    "id" UUID NOT NULL,
    "termId" UUID NOT NULL,
    "stepNumber" SMALLINT NOT NULL,
    "stepName" VARCHAR(80) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "completedAt" TIMESTAMPTZ(6),
    "completedById" UUID,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "term_workflow_steps_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "fee_invoices_invoiceNumber_key" ON "fee_invoices"("invoiceNumber");

-- CreateIndex
CREATE INDEX "fee_invoices_status_idx" ON "fee_invoices"("status");

-- CreateIndex
CREATE UNIQUE INDEX "fee_invoices_pupilId_termId_key" ON "fee_invoices"("pupilId", "termId");

-- CreateIndex
CREATE UNIQUE INDEX "grade_remarks_gradingScaleEntryId_remarkNumber_key" ON "grade_remarks"("gradingScaleEntryId", "remarkNumber");

-- CreateIndex
CREATE UNIQUE INDEX "division_remarks_divisionBoundaryId_commentRole_optionNumbe_key" ON "division_remarks"("divisionBoundaryId", "commentRole", "optionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "term_workflow_steps_termId_stepNumber_key" ON "term_workflow_steps"("termId", "stepNumber");

-- CreateIndex
CREATE UNIQUE INDEX "fee_structures_feeCategoryId_classId_section_academicYearId_key" ON "fee_structures"("feeCategoryId", "classId", "section", "academicYearId");

-- AddForeignKey
ALTER TABLE "fee_structures" ADD CONSTRAINT "fee_structures_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "academic_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_invoices" ADD CONSTRAINT "fee_invoices_pupilId_fkey" FOREIGN KEY ("pupilId") REFERENCES "pupils"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_invoices" ADD CONSTRAINT "fee_invoices_termId_fkey" FOREIGN KEY ("termId") REFERENCES "terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_invoices" ADD CONSTRAINT "fee_invoices_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "academic_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_invoices" ADD CONSTRAINT "fee_invoices_generatedById_fkey" FOREIGN KEY ("generatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_invoice_line_items" ADD CONSTRAINT "fee_invoice_line_items_feeInvoiceId_fkey" FOREIGN KEY ("feeInvoiceId") REFERENCES "fee_invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_invoice_line_items" ADD CONSTRAINT "fee_invoice_line_items_feeCategoryId_fkey" FOREIGN KEY ("feeCategoryId") REFERENCES "fee_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grade_remarks" ADD CONSTRAINT "grade_remarks_gradingScaleEntryId_fkey" FOREIGN KEY ("gradingScaleEntryId") REFERENCES "grading_scale_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "division_remarks" ADD CONSTRAINT "division_remarks_divisionBoundaryId_fkey" FOREIGN KEY ("divisionBoundaryId") REFERENCES "division_boundaries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "term_workflow_steps" ADD CONSTRAINT "term_workflow_steps_termId_fkey" FOREIGN KEY ("termId") REFERENCES "terms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "term_workflow_steps" ADD CONSTRAINT "term_workflow_steps_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "roles" (
    "id" UUID NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "displayName" VARCHAR(120) NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "fullName" VARCHAR(150) NOT NULL,
    "username" VARCHAR(100) NOT NULL,
    "email" VARCHAR(200),
    "passwordHash" VARCHAR(255) NOT NULL,
    "roleId" UUID NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMPTZ(6),
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "id" UUID NOT NULL,
    "roleId" UUID NOT NULL,
    "permission" VARCHAR(120) NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "refreshTokenHash" VARCHAR(255) NOT NULL,
    "ipAddress" VARCHAR(45),
    "userAgent" TEXT,
    "expiresAt" TIMESTAMPTZ(6) NOT NULL,
    "revokedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "userId" UUID,
    "action" VARCHAR(120) NOT NULL,
    "entityType" VARCHAR(80) NOT NULL,
    "entityId" UUID,
    "oldValue" JSONB,
    "newValue" JSONB,
    "ipAddress" VARCHAR(45),
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "school_settings" (
    "id" UUID NOT NULL,
    "schoolName" VARCHAR(200) NOT NULL,
    "schoolMotto" VARCHAR(200),
    "addressLine1" VARCHAR(200),
    "addressLine2" VARCHAR(200),
    "phonePrimary" VARCHAR(30),
    "phoneSecondary" VARCHAR(30),
    "email" VARCHAR(200),
    "website" VARCHAR(200),
    "logoPath" VARCHAR(500),
    "mobileMoneyMtn" VARCHAR(30),
    "mobileMoneyAirtel" VARCHAR(30),
    "mobileMoneyAccountName" VARCHAR(150),
    "invoiceFineAfterDueDate" INTEGER,
    "stampNotice" TEXT,
    "reportFooterMotto" VARCHAR(200),
    "gradeGuideText" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "school_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academic_years" (
    "id" UUID NOT NULL,
    "yearLabel" VARCHAR(20) NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "createdById" UUID,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "academic_years_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "terms" (
    "id" UUID NOT NULL,
    "academicYearId" UUID NOT NULL,
    "termNumber" SMALLINT NOT NULL,
    "termLabel" VARCHAR(40) NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "nextTermStartDay" DATE,
    "nextTermStartBoarding" DATE,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "feesDueDate" DATE,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "terms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "school_sections" (
    "id" UUID NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "rankingMethod" VARCHAR(20) NOT NULL DEFAULT 'aggregate',
    "classesDescription" VARCHAR(100),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "school_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "classes" (
    "id" UUID NOT NULL,
    "schoolSectionId" UUID NOT NULL,
    "name" VARCHAR(40) NOT NULL,
    "levelOrder" SMALLINT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "classes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "streams" (
    "id" UUID NOT NULL,
    "classId" UUID NOT NULL,
    "name" VARCHAR(60) NOT NULL,
    "academicYearId" UUID NOT NULL,
    "classTeacherId" UUID,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "streams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subjects" (
    "id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "subjects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "class_subject_assignments" (
    "id" UUID NOT NULL,
    "classId" UUID NOT NULL,
    "subjectId" UUID NOT NULL,
    "termId" UUID NOT NULL,
    "displayOrder" SMALLINT NOT NULL DEFAULT 1,
    "maxScore" SMALLINT NOT NULL DEFAULT 100,
    "createdById" UUID,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "class_subject_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subject_section_rules" (
    "id" UUID NOT NULL,
    "schoolSectionId" UUID NOT NULL,
    "subjectId" UUID NOT NULL,
    "includeInAggregate" BOOLEAN NOT NULL DEFAULT true,
    "isPenaltyTrigger" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "subject_section_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grading_scales" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "createdById" UUID,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "grading_scales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grading_scale_entries" (
    "id" UUID NOT NULL,
    "gradingScaleId" UUID NOT NULL,
    "gradeLabel" VARCHAR(10) NOT NULL,
    "pointsValue" SMALLINT NOT NULL,
    "minScore" SMALLINT NOT NULL,
    "maxScore" SMALLINT NOT NULL,
    "displayOrder" SMALLINT NOT NULL,
    "isFail" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "grading_scale_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "division_boundaries" (
    "id" UUID NOT NULL,
    "gradingScaleId" UUID NOT NULL,
    "divisionLabel" VARCHAR(20) NOT NULL,
    "romanNumeral" VARCHAR(10) NOT NULL,
    "minAggregate" SMALLINT NOT NULL,
    "maxAggregate" SMALLINT NOT NULL,
    "isUngraded" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" SMALLINT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "division_boundaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_type_configs" (
    "id" UUID NOT NULL,
    "code" VARCHAR(30) NOT NULL,
    "label" VARCHAR(80) NOT NULL,
    "appearsOnReportCard" BOOLEAN NOT NULL DEFAULT true,
    "contributesToAggregate" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" SMALLINT NOT NULL,
    "isSystemDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" UUID,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "assessment_type_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "houses" (
    "id" UUID NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "colourHex" VARCHAR(10),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "houses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pupils" (
    "id" UUID NOT NULL,
    "pupilIdCode" VARCHAR(30) NOT NULL,
    "lin" VARCHAR(50),
    "schoolpayCode" VARCHAR(50),
    "firstName" VARCHAR(80) NOT NULL,
    "lastName" VARCHAR(80) NOT NULL,
    "otherNames" VARCHAR(80),
    "dateOfBirth" DATE NOT NULL,
    "gender" VARCHAR(10) NOT NULL,
    "religion" VARCHAR(60),
    "houseId" UUID,
    "medicalConditions" TEXT,
    "formerSchool" VARCHAR(200),
    "streamId" UUID,
    "section" VARCHAR(20) NOT NULL,
    "enrolmentDate" DATE NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMPTZ(6),
    "createdById" UUID,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "pupils_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pupil_parents" (
    "id" UUID NOT NULL,
    "pupilId" UUID NOT NULL,
    "parentType" VARCHAR(10) NOT NULL,
    "fullName" VARCHAR(150) NOT NULL,
    "phone" VARCHAR(30),
    "email" VARCHAR(200),
    "address" TEXT,
    "nin" VARCHAR(50),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "pupil_parents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_persons" (
    "id" UUID NOT NULL,
    "fullName" VARCHAR(150) NOT NULL,
    "relationship" VARCHAR(60) NOT NULL,
    "primaryPhone" VARCHAR(30) NOT NULL,
    "secondaryPhone" VARCHAR(30),
    "whatsappIndicator" VARCHAR(10) NOT NULL DEFAULT 'primary',
    "email" VARCHAR(200),
    "physicalAddress" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "contact_persons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pupil_contact_persons" (
    "id" UUID NOT NULL,
    "pupilId" UUID NOT NULL,
    "contactPersonId" UUID NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pupil_contact_persons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pupil_photos" (
    "id" UUID NOT NULL,
    "pupilId" UUID NOT NULL,
    "filePath" VARCHAR(500) NOT NULL,
    "fileSizeBytes" INTEGER,
    "uploadedById" UUID,
    "uploadedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "pupil_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fee_categories" (
    "id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "code" VARCHAR(30) NOT NULL,
    "isTuition" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "fee_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fee_structures" (
    "id" UUID NOT NULL,
    "feeCategoryId" UUID NOT NULL,
    "classId" UUID NOT NULL,
    "section" VARCHAR(20) NOT NULL,
    "termId" UUID NOT NULL,
    "amount" INTEGER NOT NULL,
    "isMandatory" BOOLEAN NOT NULL DEFAULT true,
    "createdById" UUID,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "fee_structures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bursary_schemes" (
    "id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "appliesToCategoryId" UUID,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" UUID,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "bursary_schemes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pupil_bursaries" (
    "id" UUID NOT NULL,
    "pupilId" UUID NOT NULL,
    "bursarySchemeId" UUID NOT NULL,
    "standardFeesAtAward" INTEGER NOT NULL,
    "discountUgx" INTEGER NOT NULL,
    "agreedNetFeesUgx" INTEGER NOT NULL,
    "sectionAtAward" VARCHAR(20) NOT NULL,
    "awardedDate" DATE NOT NULL,
    "expiryDate" DATE,
    "lastRecalculatedAt" TIMESTAMPTZ(6),
    "recalculationNotes" TEXT,
    "notes" TEXT,
    "awardedById" UUID,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "pupil_bursaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pupil_bills" (
    "id" UUID NOT NULL,
    "pupilId" UUID NOT NULL,
    "termId" UUID NOT NULL,
    "totalAmount" INTEGER NOT NULL,
    "totalPaid" INTEGER NOT NULL DEFAULT 0,
    "balance" INTEGER NOT NULL,
    "arrearsFromPrevious" INTEGER NOT NULL DEFAULT 0,
    "billingStatus" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "generatedById" UUID,
    "generatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "pupil_bills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bill_line_items" (
    "id" UUID NOT NULL,
    "pupilBillId" UUID NOT NULL,
    "feeCategoryId" UUID NOT NULL,
    "standardAmount" INTEGER NOT NULL,
    "bursaryDiscount" INTEGER NOT NULL DEFAULT 0,
    "manualDiscount" INTEGER NOT NULL DEFAULT 0,
    "netAmount" INTEGER NOT NULL,
    "lineStatus" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "bill_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "pupilBillId" UUID NOT NULL,
    "amount" INTEGER NOT NULL,
    "paymentDate" DATE NOT NULL,
    "paymentMethod" VARCHAR(30) NOT NULL,
    "referenceNumber" VARCHAR(100),
    "source" VARCHAR(20) NOT NULL DEFAULT 'manual',
    "schoolpayTransactionId" VARCHAR(100),
    "notes" TEXT,
    "recordedById" UUID,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_plans" (
    "id" UUID NOT NULL,
    "pupilBillId" UUID NOT NULL,
    "totalInstalments" SMALLINT NOT NULL,
    "notes" TEXT,
    "createdById" UUID,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "payment_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_plan_instalments" (
    "id" UUID NOT NULL,
    "paymentPlanId" UUID NOT NULL,
    "instalmentNumber" SMALLINT NOT NULL,
    "dueDate" DATE NOT NULL,
    "expectedAmount" INTEGER NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'upcoming',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "payment_plan_instalments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fee_statements" (
    "id" UUID NOT NULL,
    "pupilId" UUID NOT NULL,
    "termId" UUID NOT NULL,
    "previousBalance" INTEGER NOT NULL DEFAULT 0,
    "nextTermTotal" INTEGER NOT NULL,
    "grandTotal" INTEGER NOT NULL,
    "pdfPath" VARCHAR(500),
    "generatedById" UUID,
    "generatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "fee_statements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fee_structure_adjustments" (
    "id" UUID NOT NULL,
    "termId" UUID NOT NULL,
    "adjustmentType" VARCHAR(30) NOT NULL,
    "feeCategoryId" UUID,
    "classId" UUID,
    "section" VARCHAR(20),
    "oldAmount" INTEGER NOT NULL,
    "newAmount" INTEGER NOT NULL,
    "recalculationTriggered" BOOLEAN NOT NULL DEFAULT false,
    "pupilsRecalculated" INTEGER,
    "notes" TEXT,
    "adjustedById" UUID NOT NULL,
    "adjustedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "fee_structure_adjustments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_periods" (
    "id" UUID NOT NULL,
    "termId" UUID NOT NULL,
    "assessmentTypeId" UUID NOT NULL,
    "label" VARCHAR(80) NOT NULL,
    "assessmentDate" DATE,
    "scoreEntryOpen" BOOLEAN NOT NULL DEFAULT false,
    "scoreEntryLocked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "assessment_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pupil_scores" (
    "id" UUID NOT NULL,
    "pupilId" UUID NOT NULL,
    "subjectId" UUID NOT NULL,
    "assessmentPeriodId" UUID NOT NULL,
    "score" SMALLINT,
    "gradeLabel" VARCHAR(10),
    "gradePoints" SMALLINT,
    "teacherRemarks" TEXT,
    "teacherInitials" VARCHAR(10),
    "enteredById" UUID,
    "lastEditedById" UUID,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "pupil_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pupil_term_results" (
    "id" UUID NOT NULL,
    "pupilId" UUID NOT NULL,
    "termId" UUID NOT NULL,
    "assessmentPeriodId" UUID NOT NULL,
    "aggregatePoints" SMALLINT,
    "rawDivisionLabel" VARCHAR(10),
    "finalDivisionLabel" VARCHAR(10),
    "f9PenaltyApplied" BOOLEAN NOT NULL DEFAULT false,
    "f9PenaltySubject" VARCHAR(120),
    "averageScore" DECIMAL(5,2),
    "classRank" SMALLINT,
    "totalPupilsInStream" SMALLINT,
    "promotionNote" TEXT,
    "computedAt" TIMESTAMPTZ(6),
    "computedById" UUID,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "pupil_term_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_card_settings" (
    "id" UUID NOT NULL,
    "showBotOnReport" BOOLEAN NOT NULL DEFAULT true,
    "showMotOnReport" BOOLEAN NOT NULL DEFAULT true,
    "showEotOnReport" BOOLEAN NOT NULL DEFAULT true,
    "averagePeriods" BOOLEAN NOT NULL DEFAULT false,
    "showClassRank" BOOLEAN NOT NULL DEFAULT true,
    "rankingFormat" VARCHAR(30) NOT NULL DEFAULT 'ordinal',
    "showGradeGuide" BOOLEAN NOT NULL DEFAULT true,
    "showSchoolRequirements" BOOLEAN NOT NULL DEFAULT true,
    "showNextTermDates" BOOLEAN NOT NULL DEFAULT true,
    "whoCanGenerate" VARCHAR(20) NOT NULL DEFAULT 'dos_admin',
    "updatedById" UUID,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "report_card_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_cards" (
    "id" UUID NOT NULL,
    "pupilId" UUID NOT NULL,
    "termId" UUID NOT NULL,
    "assessmentPeriodId" UUID NOT NULL,
    "reportType" VARCHAR(20) NOT NULL,
    "pdfPath" VARCHAR(500),
    "generatedById" UUID NOT NULL,
    "generatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "report_cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "term_requirements" (
    "id" UUID NOT NULL,
    "termId" UUID NOT NULL,
    "classId" UUID,
    "itemNumber" SMALLINT NOT NULL,
    "itemDescription" VARCHAR(300) NOT NULL,
    "createdById" UUID,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "term_requirements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "communication_logs" (
    "id" UUID NOT NULL,
    "pupilId" UUID NOT NULL,
    "contactPersonId" UUID,
    "channel" VARCHAR(20) NOT NULL,
    "direction" VARCHAR(10) NOT NULL DEFAULT 'outbound',
    "phoneNumberUsed" VARCHAR(30),
    "messageBody" TEXT,
    "callOutcome" VARCHAR(80),
    "deliveryStatus" VARCHAR(20) DEFAULT 'sent',
    "egoSmsMessageId" VARCHAR(100),
    "staffNotes" TEXT,
    "nextFollowupDate" DATE,
    "initiatedById" UUID,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "communication_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_templates" (
    "id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "channel" VARCHAR(20) NOT NULL,
    "body" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" UUID,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "message_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "demand_notes" (
    "id" UUID NOT NULL,
    "pupilId" UUID NOT NULL,
    "pupilBillId" UUID NOT NULL,
    "outstandingAmount" INTEGER NOT NULL,
    "pdfPath" VARCHAR(500),
    "generatedById" UUID NOT NULL,
    "generatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "communicationLogId" UUID,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "demand_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_settings" (
    "id" UUID NOT NULL,
    "key" VARCHAR(120) NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "updatedById" UUID,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scheduled_job_logs" (
    "id" UUID NOT NULL,
    "jobName" VARCHAR(100) NOT NULL,
    "startedAt" TIMESTAMPTZ(6) NOT NULL,
    "completedAt" TIMESTAMPTZ(6),
    "status" VARCHAR(20) NOT NULL,
    "recordsProcessed" INTEGER,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "scheduled_job_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_refreshTokenHash_key" ON "sessions"("refreshTokenHash");

-- CreateIndex
CREATE INDEX "sessions_refreshTokenHash_idx" ON "sessions"("refreshTokenHash");

-- CreateIndex
CREATE INDEX "sessions_userId_revokedAt_idx" ON "sessions"("userId", "revokedAt");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "academic_years_yearLabel_key" ON "academic_years"("yearLabel");

-- CreateIndex
CREATE UNIQUE INDEX "school_sections_name_key" ON "school_sections"("name");

-- CreateIndex
CREATE UNIQUE INDEX "school_sections_code_key" ON "school_sections"("code");

-- CreateIndex
CREATE UNIQUE INDEX "subjects_name_key" ON "subjects"("name");

-- CreateIndex
CREATE UNIQUE INDEX "subjects_code_key" ON "subjects"("code");

-- CreateIndex
CREATE UNIQUE INDEX "class_subject_assignments_classId_subjectId_termId_key" ON "class_subject_assignments"("classId", "subjectId", "termId");

-- CreateIndex
CREATE UNIQUE INDEX "subject_section_rules_schoolSectionId_subjectId_key" ON "subject_section_rules"("schoolSectionId", "subjectId");

-- CreateIndex
CREATE INDEX "grading_scales_isActive_idx" ON "grading_scales"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "grading_scale_entries_gradingScaleId_gradeLabel_key" ON "grading_scale_entries"("gradingScaleId", "gradeLabel");

-- CreateIndex
CREATE UNIQUE INDEX "grading_scale_entries_gradingScaleId_pointsValue_key" ON "grading_scale_entries"("gradingScaleId", "pointsValue");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_type_configs_code_key" ON "assessment_type_configs"("code");

-- CreateIndex
CREATE UNIQUE INDEX "houses_name_key" ON "houses"("name");

-- CreateIndex
CREATE UNIQUE INDEX "pupils_pupilIdCode_key" ON "pupils"("pupilIdCode");

-- CreateIndex
CREATE UNIQUE INDEX "pupils_lin_key" ON "pupils"("lin");

-- CreateIndex
CREATE UNIQUE INDEX "pupils_schoolpayCode_key" ON "pupils"("schoolpayCode");

-- CreateIndex
CREATE INDEX "pupils_pupilIdCode_idx" ON "pupils"("pupilIdCode");

-- CreateIndex
CREATE INDEX "pupils_lin_idx" ON "pupils"("lin");

-- CreateIndex
CREATE INDEX "pupils_schoolpayCode_idx" ON "pupils"("schoolpayCode");

-- CreateIndex
CREATE INDEX "pupils_streamId_idx" ON "pupils"("streamId");

-- CreateIndex
CREATE INDEX "pupils_isActive_deletedAt_idx" ON "pupils"("isActive", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "pupil_parents_pupilId_parentType_key" ON "pupil_parents"("pupilId", "parentType");

-- CreateIndex
CREATE INDEX "contact_persons_primaryPhone_idx" ON "contact_persons"("primaryPhone");

-- CreateIndex
CREATE UNIQUE INDEX "pupil_contact_persons_pupilId_contactPersonId_key" ON "pupil_contact_persons"("pupilId", "contactPersonId");

-- CreateIndex
CREATE UNIQUE INDEX "pupil_photos_pupilId_key" ON "pupil_photos"("pupilId");

-- CreateIndex
CREATE UNIQUE INDEX "fee_categories_name_key" ON "fee_categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "fee_categories_code_key" ON "fee_categories"("code");

-- CreateIndex
CREATE UNIQUE INDEX "fee_structures_feeCategoryId_classId_section_termId_key" ON "fee_structures"("feeCategoryId", "classId", "section", "termId");

-- CreateIndex
CREATE UNIQUE INDEX "bursary_schemes_name_key" ON "bursary_schemes"("name");

-- CreateIndex
CREATE INDEX "pupil_bills_billingStatus_idx" ON "pupil_bills"("billingStatus");

-- CreateIndex
CREATE UNIQUE INDEX "pupil_bills_pupilId_termId_key" ON "pupil_bills"("pupilId", "termId");

-- CreateIndex
CREATE UNIQUE INDEX "payments_schoolpayTransactionId_key" ON "payments"("schoolpayTransactionId");

-- CreateIndex
CREATE INDEX "payments_schoolpayTransactionId_idx" ON "payments"("schoolpayTransactionId");

-- CreateIndex
CREATE INDEX "payments_pupilBillId_idx" ON "payments"("pupilBillId");

-- CreateIndex
CREATE UNIQUE INDEX "payment_plans_pupilBillId_key" ON "payment_plans"("pupilBillId");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_periods_termId_assessmentTypeId_key" ON "assessment_periods"("termId", "assessmentTypeId");

-- CreateIndex
CREATE INDEX "pupil_scores_pupilId_assessmentPeriodId_idx" ON "pupil_scores"("pupilId", "assessmentPeriodId");

-- CreateIndex
CREATE INDEX "pupil_scores_assessmentPeriodId_subjectId_idx" ON "pupil_scores"("assessmentPeriodId", "subjectId");

-- CreateIndex
CREATE UNIQUE INDEX "pupil_scores_pupilId_subjectId_assessmentPeriodId_key" ON "pupil_scores"("pupilId", "subjectId", "assessmentPeriodId");

-- CreateIndex
CREATE INDEX "pupil_term_results_pupilId_termId_idx" ON "pupil_term_results"("pupilId", "termId");

-- CreateIndex
CREATE UNIQUE INDEX "pupil_term_results_pupilId_termId_assessmentPeriodId_key" ON "pupil_term_results"("pupilId", "termId", "assessmentPeriodId");

-- CreateIndex
CREATE UNIQUE INDEX "report_cards_pupilId_termId_assessmentPeriodId_reportType_key" ON "report_cards"("pupilId", "termId", "assessmentPeriodId", "reportType");

-- CreateIndex
CREATE INDEX "communication_logs_pupilId_createdAt_idx" ON "communication_logs"("pupilId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "system_settings_key_key" ON "system_settings"("key");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academic_years" ADD CONSTRAINT "academic_years_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "terms" ADD CONSTRAINT "terms_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "academic_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classes" ADD CONSTRAINT "classes_schoolSectionId_fkey" FOREIGN KEY ("schoolSectionId") REFERENCES "school_sections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "streams" ADD CONSTRAINT "streams_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "streams" ADD CONSTRAINT "streams_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "academic_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "streams" ADD CONSTRAINT "streams_classTeacherId_fkey" FOREIGN KEY ("classTeacherId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_subject_assignments" ADD CONSTRAINT "class_subject_assignments_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_subject_assignments" ADD CONSTRAINT "class_subject_assignments_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_subject_assignments" ADD CONSTRAINT "class_subject_assignments_termId_fkey" FOREIGN KEY ("termId") REFERENCES "terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_subject_assignments" ADD CONSTRAINT "class_subject_assignments_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subject_section_rules" ADD CONSTRAINT "subject_section_rules_schoolSectionId_fkey" FOREIGN KEY ("schoolSectionId") REFERENCES "school_sections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subject_section_rules" ADD CONSTRAINT "subject_section_rules_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grading_scales" ADD CONSTRAINT "grading_scales_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grading_scale_entries" ADD CONSTRAINT "grading_scale_entries_gradingScaleId_fkey" FOREIGN KEY ("gradingScaleId") REFERENCES "grading_scales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "division_boundaries" ADD CONSTRAINT "division_boundaries_gradingScaleId_fkey" FOREIGN KEY ("gradingScaleId") REFERENCES "grading_scales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_type_configs" ADD CONSTRAINT "assessment_type_configs_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pupils" ADD CONSTRAINT "pupils_streamId_fkey" FOREIGN KEY ("streamId") REFERENCES "streams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pupils" ADD CONSTRAINT "pupils_houseId_fkey" FOREIGN KEY ("houseId") REFERENCES "houses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pupils" ADD CONSTRAINT "pupils_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pupil_parents" ADD CONSTRAINT "pupil_parents_pupilId_fkey" FOREIGN KEY ("pupilId") REFERENCES "pupils"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pupil_contact_persons" ADD CONSTRAINT "pupil_contact_persons_pupilId_fkey" FOREIGN KEY ("pupilId") REFERENCES "pupils"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pupil_contact_persons" ADD CONSTRAINT "pupil_contact_persons_contactPersonId_fkey" FOREIGN KEY ("contactPersonId") REFERENCES "contact_persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pupil_photos" ADD CONSTRAINT "pupil_photos_pupilId_fkey" FOREIGN KEY ("pupilId") REFERENCES "pupils"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pupil_photos" ADD CONSTRAINT "pupil_photos_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_structures" ADD CONSTRAINT "fee_structures_feeCategoryId_fkey" FOREIGN KEY ("feeCategoryId") REFERENCES "fee_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_structures" ADD CONSTRAINT "fee_structures_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_structures" ADD CONSTRAINT "fee_structures_termId_fkey" FOREIGN KEY ("termId") REFERENCES "terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_structures" ADD CONSTRAINT "fee_structures_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bursary_schemes" ADD CONSTRAINT "bursary_schemes_appliesToCategoryId_fkey" FOREIGN KEY ("appliesToCategoryId") REFERENCES "fee_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bursary_schemes" ADD CONSTRAINT "bursary_schemes_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pupil_bursaries" ADD CONSTRAINT "pupil_bursaries_pupilId_fkey" FOREIGN KEY ("pupilId") REFERENCES "pupils"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pupil_bursaries" ADD CONSTRAINT "pupil_bursaries_bursarySchemeId_fkey" FOREIGN KEY ("bursarySchemeId") REFERENCES "bursary_schemes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pupil_bursaries" ADD CONSTRAINT "pupil_bursaries_awardedById_fkey" FOREIGN KEY ("awardedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pupil_bills" ADD CONSTRAINT "pupil_bills_pupilId_fkey" FOREIGN KEY ("pupilId") REFERENCES "pupils"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pupil_bills" ADD CONSTRAINT "pupil_bills_termId_fkey" FOREIGN KEY ("termId") REFERENCES "terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pupil_bills" ADD CONSTRAINT "pupil_bills_generatedById_fkey" FOREIGN KEY ("generatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bill_line_items" ADD CONSTRAINT "bill_line_items_pupilBillId_fkey" FOREIGN KEY ("pupilBillId") REFERENCES "pupil_bills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bill_line_items" ADD CONSTRAINT "bill_line_items_feeCategoryId_fkey" FOREIGN KEY ("feeCategoryId") REFERENCES "fee_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_pupilBillId_fkey" FOREIGN KEY ("pupilBillId") REFERENCES "pupil_bills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_plans" ADD CONSTRAINT "payment_plans_pupilBillId_fkey" FOREIGN KEY ("pupilBillId") REFERENCES "pupil_bills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_plans" ADD CONSTRAINT "payment_plans_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_plan_instalments" ADD CONSTRAINT "payment_plan_instalments_paymentPlanId_fkey" FOREIGN KEY ("paymentPlanId") REFERENCES "payment_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_statements" ADD CONSTRAINT "fee_statements_pupilId_fkey" FOREIGN KEY ("pupilId") REFERENCES "pupils"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_statements" ADD CONSTRAINT "fee_statements_termId_fkey" FOREIGN KEY ("termId") REFERENCES "terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_statements" ADD CONSTRAINT "fee_statements_generatedById_fkey" FOREIGN KEY ("generatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_structure_adjustments" ADD CONSTRAINT "fee_structure_adjustments_termId_fkey" FOREIGN KEY ("termId") REFERENCES "terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_structure_adjustments" ADD CONSTRAINT "fee_structure_adjustments_feeCategoryId_fkey" FOREIGN KEY ("feeCategoryId") REFERENCES "fee_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_structure_adjustments" ADD CONSTRAINT "fee_structure_adjustments_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_structure_adjustments" ADD CONSTRAINT "fee_structure_adjustments_adjustedById_fkey" FOREIGN KEY ("adjustedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_periods" ADD CONSTRAINT "assessment_periods_termId_fkey" FOREIGN KEY ("termId") REFERENCES "terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_periods" ADD CONSTRAINT "assessment_periods_assessmentTypeId_fkey" FOREIGN KEY ("assessmentTypeId") REFERENCES "assessment_type_configs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pupil_scores" ADD CONSTRAINT "pupil_scores_pupilId_fkey" FOREIGN KEY ("pupilId") REFERENCES "pupils"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pupil_scores" ADD CONSTRAINT "pupil_scores_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pupil_scores" ADD CONSTRAINT "pupil_scores_assessmentPeriodId_fkey" FOREIGN KEY ("assessmentPeriodId") REFERENCES "assessment_periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pupil_scores" ADD CONSTRAINT "pupil_scores_enteredById_fkey" FOREIGN KEY ("enteredById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pupil_scores" ADD CONSTRAINT "pupil_scores_lastEditedById_fkey" FOREIGN KEY ("lastEditedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pupil_term_results" ADD CONSTRAINT "pupil_term_results_pupilId_fkey" FOREIGN KEY ("pupilId") REFERENCES "pupils"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pupil_term_results" ADD CONSTRAINT "pupil_term_results_termId_fkey" FOREIGN KEY ("termId") REFERENCES "terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pupil_term_results" ADD CONSTRAINT "pupil_term_results_assessmentPeriodId_fkey" FOREIGN KEY ("assessmentPeriodId") REFERENCES "assessment_periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pupil_term_results" ADD CONSTRAINT "pupil_term_results_computedById_fkey" FOREIGN KEY ("computedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_card_settings" ADD CONSTRAINT "report_card_settings_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_cards" ADD CONSTRAINT "report_cards_pupilId_fkey" FOREIGN KEY ("pupilId") REFERENCES "pupils"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_cards" ADD CONSTRAINT "report_cards_termId_fkey" FOREIGN KEY ("termId") REFERENCES "terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_cards" ADD CONSTRAINT "report_cards_assessmentPeriodId_fkey" FOREIGN KEY ("assessmentPeriodId") REFERENCES "assessment_periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_cards" ADD CONSTRAINT "report_cards_generatedById_fkey" FOREIGN KEY ("generatedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "term_requirements" ADD CONSTRAINT "term_requirements_termId_fkey" FOREIGN KEY ("termId") REFERENCES "terms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "term_requirements" ADD CONSTRAINT "term_requirements_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "term_requirements" ADD CONSTRAINT "term_requirements_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communication_logs" ADD CONSTRAINT "communication_logs_pupilId_fkey" FOREIGN KEY ("pupilId") REFERENCES "pupils"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communication_logs" ADD CONSTRAINT "communication_logs_contactPersonId_fkey" FOREIGN KEY ("contactPersonId") REFERENCES "contact_persons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communication_logs" ADD CONSTRAINT "communication_logs_initiatedById_fkey" FOREIGN KEY ("initiatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_templates" ADD CONSTRAINT "message_templates_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "demand_notes" ADD CONSTRAINT "demand_notes_pupilId_fkey" FOREIGN KEY ("pupilId") REFERENCES "pupils"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "demand_notes" ADD CONSTRAINT "demand_notes_pupilBillId_fkey" FOREIGN KEY ("pupilBillId") REFERENCES "pupil_bills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "demand_notes" ADD CONSTRAINT "demand_notes_generatedById_fkey" FOREIGN KEY ("generatedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "demand_notes" ADD CONSTRAINT "demand_notes_communicationLogId_fkey" FOREIGN KEY ("communicationLogId") REFERENCES "communication_logs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_settings" ADD CONSTRAINT "system_settings_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

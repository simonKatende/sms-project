-- AlterTable
ALTER TABLE "classes" ADD COLUMN     "classSubGroupId" UUID;

-- CreateTable
CREATE TABLE "class_groups" (
    "id" UUID NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "displayOrder" SMALLINT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "class_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "class_sub_groups" (
    "id" UUID NOT NULL,
    "classGroupId" UUID NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "displayOrder" SMALLINT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "class_sub_groups_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "class_groups_name_key" ON "class_groups"("name");

-- CreateIndex
CREATE UNIQUE INDEX "class_sub_groups_classGroupId_name_key" ON "class_sub_groups"("classGroupId", "name");

-- AddForeignKey
ALTER TABLE "class_sub_groups" ADD CONSTRAINT "class_sub_groups_classGroupId_fkey" FOREIGN KEY ("classGroupId") REFERENCES "class_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classes" ADD CONSTRAINT "classes_classSubGroupId_fkey" FOREIGN KEY ("classSubGroupId") REFERENCES "class_sub_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

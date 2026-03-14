**SCHOOL MANAGEMENT SYSTEM**

Database Design Document --- Update v1.1

Prepared by: Development Team

Client: School Representative

Version: Version 1.1

Date: March 2026

**Document Revision History**

  ---------- ---------- -------------------------- ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  **Ver.**   **Date**   **Author**                 **Summary of Changes**
  1.0        Mar 2026   Dev Team                   Full initial database schema --- 35 tables across 8 entity groups.
  1.1        Mar 2026   Dev Team / Simon Katende   Updated: bursary\_schemes (UGX-only model), pupil\_bursaries (agreed\_net\_fees\_ugx, net\_fees\_anchor). Added: fee\_structure\_adjustments table. Updated: grading engine section to include bursary recalculation workflow. Terminology: \'pupil\' throughout. All other tables from v1.0 remain unchanged.
  ---------- ---------- -------------------------- ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

**1. Scope of This Update (v1.1)**

This document is a targeted update to the Database Design Document. Only the tables and sections that have changed from v1.0 are reproduced here in full. All other tables, relationships, indexes, and design principles from v1.0 remain in force and should be read alongside this document.

> **Reading Instruction** This v1.1 update document should be read together with the v1.0 Database Design Document. Where a table appears in both versions, the v1.1 definition supersedes v1.0.

  --------------------------------------- --------------------------------------------------------------------------------------------------------------------------------
  **Change**                              **Tables / Sections Affected**
  **bursary\_schemes redesigned**         Discount model changed to UGX fixed amount only. Percentage option removed. Agreed net fees is the commercial anchor.
  **pupil\_bursaries updated**            Added agreed\_net\_fees\_ugx (the fixed amount pupil pays per term), net\_fees\_anchor (flag), and section\_at\_award columns.
  **fee\_structure\_adjustments added**   New table to record each time the standard fee structure is changed. Drives the bursary recalculation workflow.
  **Grading engine section updated**      Added bursary recalculation step to scheduled job documentation.
  **Terminology**                         \'student\' replaced by \'pupil\' throughout all column descriptions and table names.
  --------------------------------------- --------------------------------------------------------------------------------------------------------------------------------

**2. Updated Tables --- Group E (Fees)**

**E3. bursary\_schemes (UPDATED --- replaces v1.0 definition)**

Defines named bursary types available at the school. The bursary scheme defines the type/name only. The actual UGX discount amount is set per individual pupil in pupil\_bursaries, not here. This separates the scheme definition from the individual arrangement.

  --------------------------- --------------- ------------------------------- -------------------------------------------------------------------------------------------------------
  **Column**                  **Data Type**   **Constraints**                 **Description**
  id                          UUID            PK, NN                          
  name                        VARCHAR(150)    UQ, NN                          Named bursary type. E.g. \'Staff Bursary\', \'Full Bursary\', \'Half Bursary\', \'Founders Bursary\'.
  description                 TEXT            NULL                            Description of who qualifies for this bursary type.
  applies\_to\_category\_id   UUID            FK → fee\_categories.id, NULL   NULL = applies to the tuition category by default. Non-null = targets a specific fee category.
  is\_active                  BOOLEAN         NN, DEF true                    Inactive schemes cannot be assigned to new pupils.
  created\_by                 UUID            FK → users.id, NULL             
  created\_at                 TIMESTAMPTZ     NN, DEF now()                   
  updated\_at                 TIMESTAMPTZ     NN, DEF now()                   
  --------------------------- --------------- ------------------------------- -------------------------------------------------------------------------------------------------------

> **Design Decision** The discount amount is NOT stored on the scheme --- it is stored on each individual pupil\_bursaries record. Two pupils on \'Staff Bursary\' can have different agreed discount amounts. The scheme is just a label/category; the financial agreement is pupil-specific.

**E4. pupil\_bursaries (UPDATED --- replaces v1.0 definition)**

Links a pupil to a bursary scheme and records the exact financial agreement: the standard fee at the time of award, the UGX discount, and the agreed net fees the pupil will pay per term. The agreed\_net\_fees\_ugx column is the commercial anchor --- it is what is protected when fee structures change.

  --------------------------- --------------- ------------------------------ --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  **Column**                  **Data Type**   **Constraints**                **Description**
  id                          UUID            PK, NN                         
  pupil\_id                   UUID            FK → pupils.id, NN             
  bursary\_scheme\_id         UUID            FK → bursary\_schemes.id, NN   The bursary type this pupil is on.
  standard\_fees\_at\_award   INTEGER         NN                             The standard tuition fee (in UGX) at the time the bursary was awarded. Stored for historical reference.
  discount\_ugx               INTEGER         NN                             The UGX discount amount agreed with the guardian. This is the discount applied to the standard tuition fee. discount\_ugx = standard\_fees\_at\_award - agreed\_net\_fees\_ugx.
  agreed\_net\_fees\_ugx      INTEGER         NN                             The fixed amount in UGX the pupil is to pay per term for tuition. This is the anchor. When the fee structure changes, this value is preserved and the discount\_ugx is recalculated.
  section\_at\_award          VARCHAR(20)     NN                             \'Day\' or \'Boarding\'. Section when the bursary was first set. Used to validate section-change fee reviews.
  awarded\_date               DATE            NN                             Date the bursary was formally agreed and recorded.
  expiry\_date                DATE            NULL                           Optional expiry date. NULL = indefinite.
  last\_recalculated\_at      TIMESTAMPTZ     NULL                           Timestamp of the most recent automatic discount recalculation triggered by a fee structure adjustment.
  recalculation\_notes        TEXT            NULL                           System-generated note on the last recalculation. E.g. \'Discount adjusted from 321,200 to 400,000 to maintain net fees of 50,000 after fee structure update of Mar 2026.\'
  notes                       TEXT            NULL                           Manual notes on the bursary arrangement (context, conditions, etc.).
  awarded\_by                 UUID            FK → users.id, NULL            Bursar or Admin who set up this bursary.
  is\_active                  BOOLEAN         NN, DEF true                   False = bursary has been revoked or expired.
  created\_at                 TIMESTAMPTZ     NN, DEF now()                  
  updated\_at                 TIMESTAMPTZ     NN, DEF now()                  
  --------------------------- --------------- ------------------------------ --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

> **Agreed Net Fees Example** Standard fee = UGX 371,200. Discount = UGX 321,200. Agreed net fees = UGX 50,000. When standard fee rises to UGX 450,000 in next term: system recalculates discount to UGX 400,000, agreed\_net\_fees\_ugx remains UGX 50,000 unchanged.

**E11. fee\_structure\_adjustments (NEW TABLE)**

Records every event where the standard fee structure is changed. This table is the trigger for the bursary recalculation workflow. Two distinct adjustment types are supported: a standard update (protects continuing bursary pupils) and a general increment (affects all pupils).

  -------------------------- --------------- ------------------------------- ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  **Column**                 **Data Type**   **Constraints**                 **Description**
  id                         UUID            PK, NN                          
  term\_id                   UUID            FK → terms.id, NN               The term whose fee structure was adjusted.
  adjustment\_type           VARCHAR(30)     NN                              \'structure\_update\' = protect continuing bursary pupils (recalculate discounts). \'general\_increment\' = affect all pupils including bursary pupils (do not recalculate discounts).
  fee\_category\_id          UUID            FK → fee\_categories.id, NULL   NULL = affects all categories. Non-null = affects one specific category.
  class\_id                  UUID            FK → classes.id, NULL           NULL = affects all classes. Non-null = class-specific adjustment.
  section                    VARCHAR(20)     NULL                            NULL = affects both. \'Day\' or \'Boarding\' for section-specific adjustments.
  old\_amount                INTEGER         NN                              Standard fee amount before this adjustment.
  new\_amount                INTEGER         NN                              Standard fee amount after this adjustment.
  recalculation\_triggered   BOOLEAN         NN, DEF false                   True if bursary discount recalculation was executed for this adjustment event.
  pupils\_recalculated       INTEGER         NULL                            Number of bursary pupil records updated during recalculation.
  notes                      TEXT            NULL                            Admin notes on why this adjustment was made.
  adjusted\_by               UUID            FK → users.id, NN               Admin or Bursar who made this adjustment.
  adjusted\_at               TIMESTAMPTZ     NN, DEF now()                   
  -------------------------- --------------- ------------------------------- ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

**3. Bursary Recalculation Workflow**

The following documents the exact workflow the BursaryService executes when a fee structure is adjusted. This is a critical business logic process and must be implemented precisely.

  ----------------------------------------- ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  **Step**                                  **Logic**
  **1. Admin triggers adjustment**          Bursar or Admin updates a fee\_structure entry (e.g. raises Tuition from 371,200 to 450,000 for P.5 Day pupils for Term 2 2026). Selects adjustment\_type: \'structure\_update\' or \'general\_increment\'.
  **2. Record adjustment event**            System inserts a row into fee\_structure\_adjustments with old\_amount, new\_amount, adjustment\_type, and all filter fields.
  **3. Check adjustment type**              IF adjustment\_type = \'general\_increment\': update fee\_structure only. Do NOT recalculate any bursary discounts. All pupils (bursary or not) will be billed at the new rate. Set recalculation\_triggered = false. STOP.
  **4. Identify affected bursary pupils**   IF adjustment\_type = \'structure\_update\': query pupil\_bursaries WHERE is\_active = true. Join to pupils to filter by the same class and section as the adjusted fee structure. These are the continuing bursary pupils who need protection.
  **5. Recalculate discount per pupil**     For each affected pupil\_bursary record: new\_discount\_ugx = new\_amount - agreed\_net\_fees\_ugx. Validate: new\_discount\_ugx must be \>= 0 (cannot discount more than the standard fee). If validation fails for any pupil, flag for manual review and skip that record.
  **6. Update pupil\_bursaries**            Update discount\_ugx to new\_discount\_ugx. Update last\_recalculated\_at to now(). Write a recalculation\_notes entry. Do NOT change agreed\_net\_fees\_ugx --- this is the anchor and must never be automatically modified.
  **7. Update adjustment record**           Set recalculation\_triggered = true. Set pupils\_recalculated = count of updated records.
  **8. Audit log**                          AuditService writes a BURSARY\_DISCOUNT\_RECALCULATED entry per affected pupil, recording old discount, new discount, and the fee\_structure\_adjustments.id that triggered it.
  **9. Next bill generation**               When bills are generated for the term, bill\_line\_items.bursary\_discount reads the updated discount\_ugx from pupil\_bursaries. Net amount = standard\_amount - bursary\_discount = agreed\_net\_fees\_ugx. The pupil pays their agreed amount.
  ----------------------------------------- ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

> **Validation Flag** If the new standard fee is LESS than a pupil\'s agreed\_net\_fees\_ugx (meaning the fee dropped below what they agreed to pay), the system flags this pupil for manual review. The Bursar is notified to review and update the arrangement manually.

**4. Updated Grading Engine --- Scheduled Job Context**

In addition to the 10-step grading computation documented in v1.0, the following scheduled jobs now run in the system:

  ------------------------------------ -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  **Job Name**                         **Schedule & Logic**
  **schoolpay\_sync**                  Every 30 minutes during school hours. Queries SchoolPay API per active pupil SchoolPay code. Inserts new payment records. Updates pupil\_bills.total\_paid and balance. Flags overdue payment\_plan\_instalments.
  **overdue\_flag\_check**             Daily at 06:00. Queries payment\_plan\_instalments WHERE due\_date \< TODAY and status = \'upcoming\'. Updates status to \'overdue\'. Updates parent pupil\_bills.billing\_status if needed.
  **bursary\_recalculation\_review**   Weekly. Queries pupil\_bursaries WHERE last\_recalculated\_at IS NULL and is\_active = true, or where the pupil has changed section since award. Generates a review report for the Bursar to action manually.
  ------------------------------------ -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

**5. Document Approval**

  ---------- ------------------------------------ --------------- ----------
  **Name**   **Role**                             **Signature**   **Date**
             **School Representative (Client)**                   
             **Lead Developer**                                   
             **Bursar / Accounts Staff**                          
             **System Administrator**                             
  ---------- ------------------------------------ --------------- ----------

**--- End of Document ---**

**SCHOOL MANAGEMENT SYSTEM**

Database Design Amendment v1.2

Prepared by: Development Team

Client: School Representative

Version: Version 1.2

Date: March 2026

**1. Scope of This Update (v1.2)**

This is a targeted amendment to the Database Design Document. Only new and changed tables resulting from AAN-002 are documented here. All tables from DB Design v1.0 and v1.1 not listed below remain unchanged and in force.

  -------------------------------------- -----------------------------------------------------------------------------------------------------------------------------------------------------
  **Change**                             **Tables / Sections Affected**
  **Parent/guardian model redesigned**   pupil\_parents (new), contact\_persons (new). Replaces guardians + pupil\_guardians tables.
  **Class hierarchy expanded**           class\_groups (new), class\_sub\_groups (new). classes table gains class\_sub\_group\_id FK.
  **House names configurable**           houses (new). pupils.house\_id FK replaces the free-text house column.
  **Institution profile expanded**       school\_settings gains: logo\_path, website, secondary\_phone, bank\_name, mobile\_money\_mtn, mobile\_money\_airtel, mobile\_money\_account\_name.
  **Auto-comments: grade remarks**       grade\_remarks (new).
  **Auto-comments: division comments**   division\_remarks (new).
  **Fee invoice tables**                 fee\_invoices (new), fee\_invoice\_line\_items (new).
  **Fee structure: per academic year**   fee\_structures.term\_id → fee\_structures.academic\_year\_id (change). Fee structure is now set per academic year, not per term.
  **Academics stepper state**            term\_workflow\_steps (new). Tracks completion of each of the 8 workflow steps per term.
  -------------------------------------- -----------------------------------------------------------------------------------------------------------------------------------------------------

**2. New and Changed Tables**

**houses --- NEW**

Configurable house names managed by system admin in settings.

  ------------- --------------- ----------------- ----------------------------------------------------------
  **Column**    **Data Type**   **Constraints**   **Description**
  id            UUID            PK, NN            
  name          VARCHAR(60)     UQ, NN            E.g. \'Yellow\', \'Red\', \'Blue\', \'Green\'.
  colour\_hex   VARCHAR(7)      NULL              Optional display colour for UI badge. E.g. \'\#F59E0B\'.
  is\_active    BOOLEAN         NN, DEF true      Inactive houses do not appear in dropdowns.
  created\_at   TIMESTAMPTZ     NN, DEF now()     
  updated\_at   TIMESTAMPTZ     NN, DEF now()     
  ------------- --------------- ----------------- ----------------------------------------------------------

**class\_groups --- NEW**

Top level of class hierarchy. E.g. Kindergarten, Primary.

  ---------------- --------------- ----------------- -------------------------------------
  **Column**       **Data Type**   **Constraints**   **Description**
  id               UUID            PK, NN            
  name             VARCHAR(80)     UQ, NN            E.g. \'Kindergarten\', \'Primary\'.
  display\_order   SMALLINT        NN                Controls sort order in UI.
  is\_active       BOOLEAN         NN, DEF true      
  created\_at      TIMESTAMPTZ     NN, DEF now()     
  updated\_at      TIMESTAMPTZ     NN, DEF now()     
  ---------------- --------------- ----------------- -------------------------------------

**class\_sub\_groups --- NEW**

Second level of class hierarchy. E.g. PrePrimary, LowerPrimary, UpperPrimary.

  ------------------ --------------- --------------------------- ----------------------------------------------------------
  **Column**         **Data Type**   **Constraints**             **Description**
  id                 UUID            PK, NN                      
  class\_group\_id   UUID            FK → class\_groups.id, NN   Parent class group.
  name               VARCHAR(80)     NN                          E.g. \'PrePrimary\', \'LowerPrimary\', \'UpperPrimary\'.
  display\_order     SMALLINT        NN                          
  is\_active         BOOLEAN         NN, DEF true                
  created\_at        TIMESTAMPTZ     NN, DEF now()               
  updated\_at        TIMESTAMPTZ     NN, DEF now()               
  UNIQUE                             (class\_group\_id, name)    
  ------------------ --------------- --------------------------- ----------------------------------------------------------

> **classes table update** The existing classes table gains: class\_sub\_group\_id UUID FK → class\_sub\_groups.id. This replaces the old school\_section\_id FK on the classes table for navigation purposes. School sections (Lower/Upper Primary) still exist on school\_sections for grading rules. The class hierarchy drives UI navigation; school sections drive academic computation rules.

**pupil\_parents --- NEW**

Stores mother and father details per pupil. Both are optional. Replaces the old guardians table for parent biography.

  -------------- --------------- --------------------------- ---------------------------------------------------------
  **Column**     **Data Type**   **Constraints**             **Description**
  id             UUID            PK, NN                      
  pupil\_id      UUID            FK → pupils.id, NN          
  parent\_type   VARCHAR(10)     NN                          \'mother\' or \'father\'. Enforced by check constraint.
  full\_name     VARCHAR(150)    NN                          
  phone          VARCHAR(30)     NULL                        
  email          VARCHAR(200)    NULL                        
  address        TEXT            NULL                        
  nin            VARCHAR(30)     NULL                        National Identification Number.
  created\_at    TIMESTAMPTZ     NN, DEF now()               
  updated\_at    TIMESTAMPTZ     NN, DEF now()               
  UNIQUE                         (pupil\_id, parent\_type)   One mother and one father record per pupil maximum.
  -------------- --------------- --------------------------- ---------------------------------------------------------

**contact\_persons --- NEW**

The designated school contact for all fees communication (SMS, calls, demand notes). Replaces guardians as the communication anchor. Can be the mother, father, or a third-party guardian. Multiple pupils can share the same contact person (family linking --- detected by matching primary\_phone).

  --------------------- --------------- --------------------- ----------------------------------------------------------------------------------------------------------------------------------------------------------------------
  **Column**            **Data Type**   **Constraints**       **Description**
  id                    UUID            PK, NN                
  full\_name            VARCHAR(150)    NN                    
  relationship          VARCHAR(60)     NN                    E.g. \'Mother\', \'Father\', \'Uncle\', \'Legal Guardian\'.
  primary\_phone        VARCHAR(30)     NN                    Primary contact number. Used for calls and default SMS.
  secondary\_phone      VARCHAR(30)     NULL                  Second number. Many Ugandan parents have two lines.
  whatsapp\_indicator   VARCHAR(10)     NN, DEF \'primary\'   Which number is on WhatsApp: \'primary\', \'secondary\', or \'none\'. Determines which number the future WhatsApp adapter uses. Avoids a separate third phone field.
  email                 VARCHAR(200)    NULL                  
  physical\_address     TEXT            NULL                  
  is\_active            BOOLEAN         NN, DEF true          
  deleted\_at           TIMESTAMPTZ     NULL                  Soft delete.
  created\_at           TIMESTAMPTZ     NN, DEF now()         
  updated\_at           TIMESTAMPTZ     NN, DEF now()         
  --------------------- --------------- --------------------- ----------------------------------------------------------------------------------------------------------------------------------------------------------------------

> **Family linking** Family linking logic: when registering a new pupil, if a contact\_persons record already exists with the same primary\_phone, the new pupil is linked to that existing contact person record via pupil\_contact\_persons junction. This groups siblings under one contact person automatically.

**pupil\_contact\_persons --- NEW (junction)**

Links pupils to their contact person. Replaces pupil\_guardians.

  --------------------- --------------- ---------------------------------- --------------------------------------------------------------------------------------------------
  **Column**            **Data Type**   **Constraints**                    **Description**
  id                    UUID            PK, NN                             
  pupil\_id             UUID            FK → pupils.id, NN                 
  contact\_person\_id   UUID            FK → contact\_persons.id, NN       
  is\_primary           BOOLEAN         NN, DEF true                       True = this is the primary contact for this pupil. A pupil can have at most one primary contact.
  created\_at           TIMESTAMPTZ     NN, DEF now()                      
  UNIQUE                                (pupil\_id, contact\_person\_id)   
  --------------------- --------------- ---------------------------------- --------------------------------------------------------------------------------------------------

**grade\_remarks --- NEW**

Admin-configured subject remark options per grade band (D1-F9). Up to 5 remarks per grade. Used for per-subject remarks on report cards.

  --------------------------- --------------- --------------------------------------------- --------------------------------------------------------------------------------
  **Column**                  **Data Type**   **Constraints**                               **Description**
  id                          UUID            PK, NN                                        
  grading\_scale\_entry\_id   UUID            FK → grading\_scale\_entries.id, NN           Links remark to a specific grade band (D1, D2, etc.) within a grading scale.
  remark\_number              SMALLINT        NN                                            1 through 5. Remark 1 is auto-selected. Others are selectable alternatives.
  remark\_text                TEXT            NN                                            The remark text shown on the report card. E.g. \'Excellent work, keep it up.\'
  is\_active                  BOOLEAN         NN, DEF true                                  
  created\_at                 TIMESTAMPTZ     NN, DEF now()                                 
  updated\_at                 TIMESTAMPTZ     NN, DEF now()                                 
  UNIQUE                                      (grading\_scale\_entry\_id, remark\_number)   One remark slot per number per grade.
  --------------------------- --------------- --------------------------------------------- --------------------------------------------------------------------------------

**division\_remarks --- NEW**

Admin-configured Class Teacher and Headteacher comment options per division. Up to 5 options per role per division. Used for the COMMENTS section at the bottom of the report card.

  ------------------------ --------------- --------------------------------------------------------- --------------------------------------------------------------------------------------
  **Column**               **Data Type**   **Constraints**                                           **Description**
  id                       UUID            PK, NN                                                    
  division\_boundary\_id   UUID            FK → division\_boundaries.id, NN                          Links comment to a specific division (I, II, III, IV, or U).
  comment\_role            VARCHAR(20)     NN                                                        \'class\_teacher\' or \'headteacher\'. Separate option sets for each.
  option\_number           SMALLINT        NN                                                        1 through 5. Option 1 is auto-selected.
  comment\_text            TEXT            NN                                                        The comment text. E.g. \'Excellent performance! Well done, keep up the great work.\'
  is\_active               BOOLEAN         NN, DEF true                                              
  created\_at              TIMESTAMPTZ     NN, DEF now()                                             
  updated\_at              TIMESTAMPTZ     NN, DEF now()                                             
  UNIQUE                                   (division\_boundary\_id, comment\_role, option\_number)   
  ------------------------ --------------- --------------------------------------------------------- --------------------------------------------------------------------------------------

**fee\_invoices --- NEW**

One invoice record per pupil per term. Generated after billing is confirmed.

  ------------------------ --------------- -------------------------- --------------------------------------------------------------------
  **Column**               **Data Type**   **Constraints**            **Description**
  id                       UUID            PK, NN                     
  pupil\_bill\_id          UUID            FK → pupil\_bills.id, NN   The bill this invoice is generated from.
  pupil\_id                UUID            FK → pupils.id, NN         Denormalised for easy querying.
  term\_id                 UUID            FK → terms.id, NN          
  invoice\_date            DATE            NN                         Date the invoice was generated.
  due\_date                DATE            NN                         Payment due date shown on invoice.
  fine\_after\_due\_date   INTEGER         NN, DEF 0                  Fine amount in UGX if paid after due date. 0 = no fine.
  total\_due               INTEGER         NN                         Total amount shown on invoice (includes arrears, minus discounts).
  pdf\_path                VARCHAR(500)    NULL                       Path to generated PDF file in storage/pdfs/invoices/.
  generated\_by            UUID            FK → users.id, NN          Staff member who generated this invoice.
  generated\_at            TIMESTAMPTZ     NN, DEF now()              
  ------------------------ --------------- -------------------------- --------------------------------------------------------------------

**fee\_invoice\_line\_items --- NEW**

Individual fee line items that appear on the printed invoice.

  ------------------ --------------- --------------------------- -------------------------------------------------------------------------------
  **Column**         **Data Type**   **Constraints**             **Description**
  id                 UUID            PK, NN                      
  fee\_invoice\_id   UUID            FK → fee\_invoices.id, NN   
  description        VARCHAR(150)    NN                          Line item label. E.g. \'Tuition Fees\', \'Transport\', \'UNEB Registration\'.
  amount             INTEGER         NN                          Amount in UGX. Can be negative for discount lines.
  is\_discount       BOOLEAN         NN, DEF false               True for bursary discount lines (displayed differently on invoice).
  display\_order     SMALLINT        NN                          Controls sort order on printed invoice.
  ------------------ --------------- --------------------------- -------------------------------------------------------------------------------

**term\_workflow\_steps --- NEW**

Tracks completion status of each of the 8 Academics workflow steps per term. Drives the stepper UI in the Academics module.

  --------------- --------------- -------------------------- ----------------------------------------------------------------
  **Column**      **Data Type**   **Constraints**            **Description**
  id              UUID            PK, NN                     
  term\_id        UUID            FK → terms.id, NN          
  step\_number    SMALLINT        NN                         1 through 8 corresponding to the 8 Academics workflow steps.
  step\_name      VARCHAR(80)     NN                         E.g. \'Setup Subjects\', \'Assign Teachers\'.
  is\_complete    BOOLEAN         NN, DEF false              Set to true when the step is marked complete by the DOS/Admin.
  completed\_by   UUID            FK → users.id, NULL        
  completed\_at   TIMESTAMPTZ     NULL                       
  UNIQUE                          (term\_id, step\_number)   One status record per step per term.
  --------------- --------------- -------------------------- ----------------------------------------------------------------

**fee\_structures --- CHANGED**

The term\_id FK is replaced by academic\_year\_id FK. Fee structures are now configured per academic year, not per term. This reflects how the school actually works --- fees are set annually and apply for the whole year.

  -------------------------------- -----------------------------------------------------------------------------
  **Column**                       **Change**
  **term\_id (removed)**           FK → terms.id removed. Fee structures no longer tied to a specific term.
  **academic\_year\_id (added)**   UUID FK → academic\_years.id, NN. Fee structures are set per academic year.
  **All other columns**            Unchanged.
  -------------------------------- -----------------------------------------------------------------------------

> **Migration note** Existing fee\_structures records with term\_id must be migrated to academic\_year\_id. Use the academic year of the term to determine the correct academic\_year\_id. This is a one-time data migration step handled in the Sprint 1 back-fill.

**school\_settings --- UPDATED COLUMNS**

Additional columns added to the single-row school\_settings table to support the institution profile and invoice generation features.

  ----------------------------------------------- -------------------------------------------------------------------------------------------
  **New Column**                                  **Description**
  **logo\_path VARCHAR(500)**                     File path to the school logo image. Displayed on login page and all PDF headers.
  **website VARCHAR(200)**                        School website URL. Shown on invoice and report headers.
  **secondary\_phone VARCHAR(30)**                Secondary school contact number.
  **mobile\_money\_mtn VARCHAR(30)**              MTN Mobile Money number for fee payments. Shown on invoices.
  **mobile\_money\_airtel VARCHAR(30)**           Airtel Money number for fee payments. Shown on invoices.
  **mobile\_money\_account\_name VARCHAR(150)**   Account name for mobile money (e.g. \'Highfield Primary School\'). Shown on invoices.
  **invoice\_fine\_after\_due\_date INTEGER**     Default fine amount in UGX applied after invoice due date. Can be overridden per invoice.
  ----------------------------------------------- -------------------------------------------------------------------------------------------

**3. Pupils Table --- Column Updates**

Two changes to the pupils table resulting from AAN-002:

  ---------------------------------------- ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  **Column**                               **Change**
  **house VARCHAR(60) → house\_id UUID**   The free-text house column is replaced with a FK to the houses table. house\_id FK → houses.id, nullable. NULL = no house assigned.
  **guardian fields removed**              The guardian\_name, guardian\_phone, guardian\_relationship columns (if they existed as inline columns) are removed. All guardian/parent data is now in pupil\_parents, contact\_persons, and pupil\_contact\_persons.
  ---------------------------------------- ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

**4. Document Approval**

  ---------- ----------------------------- --------------- ----------
  **Name**   **Role**                      **Signature**   **Date**
             **School Representative**                     
             **Lead Developer**                            
             **Bursar / Accounts Staff**                   
  ---------- ----------------------------- --------------- ----------

**--- End of Database Design Amendment v1.2 ---**

**SCHOOL MANAGEMENT SYSTEM**

Database Design Document

Prepared by: Development Team

Client: School Representative

Version: 1.0 (Draft)

Date: March 2026

1. Introduction
===============

1.1 Purpose
-----------

This Database Design Document (DDD) defines the complete relational database schema for the School Management System (SMS). It specifies every table, column, data type, constraint, relationship, and index required to store and manage all school data reliably, securely, and efficiently. It is the authoritative reference for backend development and serves as the contract between the database layer and the application service layer.

1.2 Scope
---------

This document covers the full database schema for all six SMS modules:

-   Module 1: Pupil Information Management

-   Module 2: School Fees Billing and Payment Management

-   Module 3: Parent Communication and Follow-Up Management

-   Module 4: Academic Performance Management

-   Module 5: Parent Portal (schema future-proofed for upcoming release)

-   Module 6: System Administration, Configuration, and Audit

1.3 Document Overview
---------------------

  --------------------- -------------------------------------------------------------------------------
  **Attribute**         **Detail**
  **Project**           School Management System (SMS)
  **Document Type**     Database Design Document (DDD)
  **Version**           1.0 (Draft)
  **Database Engine**   PostgreSQL 15+
  **ORM**               Prisma ORM v5+
  **Based On**          RAD v1.1 · System Architecture v1.0 · UI/UX Design v1.0 · Report Card Samples
  **Date**              March 2026
  **Author**            Development Team
  --------------------- -------------------------------------------------------------------------------

2. Database Design Principles
=============================

The following principles govern every design decision in this schema. They are non-negotiable and must be respected throughout development and any future schema changes.

  ----------------------------- -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  **Principle**                 **Application in This Schema**
  **UUID Primary Keys**         All tables use UUID v4 as their primary key. This prevents sequential ID enumeration, supports future data migration, and enables offline ID generation on the client.
  **Soft Deletion**             Pupil, guardian, user, and class records are never hard-deleted. A deleted\_at TIMESTAMPTZ column (null = active, non-null = deleted) is used throughout. Queries always filter WHERE deleted\_at IS NULL.
  **Temporal Audit Columns**    Every table includes created\_at and updated\_at TIMESTAMPTZ columns, managed automatically by Prisma. Key tables also include created\_by UUID referencing users.
  **Integer Currency**          All monetary amounts are stored as INTEGER in the smallest currency unit (Uganda Shillings have no decimal subdivision). This eliminates floating-point rounding errors in financial calculations.
  **Nullable vs Zero Scores**   A pupil\'s exam score is stored as SMALLINT NULL. NULL means the exam was not sat (missed). Zero (0) means the pupil sat and scored zero. These are semantically different and must not be conflated.
  **Configurable Rules**        No grading boundaries, fee structures, subject lists, or report card settings are hardcoded in the schema. All are stored as data rows in configuration tables, readable and editable by the System Administrator at runtime.
  **Append-Only Audit Log**     The audit\_logs table is append-only. No row is ever updated or deleted from it. It provides a tamper-evident record of all significant system actions.
  **Referential Integrity**     All foreign key relationships are enforced at the database level with explicit ON DELETE RESTRICT or ON DELETE CASCADE rules, preventing orphaned records.
  **Normalisation**             The schema is normalised to Third Normal Form (3NF) to eliminate data redundancy. Computed values (aggregates, divisions, ranks) are stored in result tables after calculation --- not recalculated on every query.
  **Terminology**               A learner in Pre-Primary or Primary (P.1--P.7) is a PUPIL throughout this schema. Column names, table names, and comments use \'pupil\' not \'student\'.
  ----------------------------- -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

3. Entity Groups Overview
=========================

The schema is organised into eight logical entity groups. Each group contains all tables relevant to a particular domain. The groups map directly to the SMS modules.

  -------- -------------------------- ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ ----------------------------------------------------------------------------------------------------------------------------------------------------------------------
  **\#**   **Group**                  **Tables**                                                                                                                                                                     **Purpose**
  **A**    **Users & Access**         users, roles, user\_roles, sessions, audit\_logs                                                                                                                               System user accounts, role-based access control, session tracking, and full audit trail.
  **B**    **School Configuration**   school\_settings, academic\_years, terms, school\_sections, classes, streams                                                                                                   Core school identity, academic calendar, class structure, and section definitions.
  **C**    **Subjects & Grading**     subjects, class\_subject\_assignments, subject\_section\_rules, grading\_scales, grading\_scale\_entries, assessment\_type\_configs                                            Configurable subject assignments per class, per-section aggregate rules, admin-defined grading scale, and assessment type management.
  **D**    **Pupils & Families**      pupils, guardians, pupil\_guardians, pupil\_photos                                                                                                                             Central pupil registry, guardian profiles, family-linking, and pupil photo storage.
  **E**    **Fees**                   fee\_categories, fee\_structures, bursary\_schemes, pupil\_bursaries, pupil\_bills, bill\_line\_items, payments, payment\_plans, payment\_plan\_instalments, fee\_statements   Complete fees lifecycle: category and structure configuration, bursary management, per-pupil billing, payment recording, instalment plans, and printable statements.
  **F**    **Academic Performance**   assessment\_periods, pupil\_scores, pupil\_term\_results, report\_cards, report\_card\_settings, term\_requirements                                                            Score entry, automated grading engine output, report card generation records, and configurable report card settings.
  **G**    **Communication**          communication\_logs, message\_templates, demand\_notes                                                                                                                         Full parent interaction history, message templates, and demand note records.
  **H**    **System**                 system\_settings, scheduled\_job\_logs                                                                                                                                         School-wide configurable settings and background job execution records.
  -------- -------------------------- ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ ----------------------------------------------------------------------------------------------------------------------------------------------------------------------

4. Complete Table Schema
========================

> **Convention** Column names use snake\_case. PK = Primary Key. FK = Foreign Key. UQ = Unique. NN = Not Null. DEF = Default value. All UUIDs generated via gen\_random\_uuid(). All timestamps stored as TIMESTAMPTZ (timezone-aware).

+------------------------------------------------------+
| **GROUP A --- USERS & ACCESS**                       |
|                                                      |
| users · roles · user\_roles · sessions · audit\_logs |
+------------------------------------------------------+

### A1. users

Stores all system user accounts. Each user has exactly one role. Passwords are stored as bcrypt hashes --- never plaintext.

  ------------------------ --------------- --------------------------------- --------------------------------------------------
  **Column**               **Data Type**   **Constraints**                   **Description**
  id                       UUID            PK, NN, DEF gen\_random\_uuid()   Unique system identifier for the user.
  full\_name               VARCHAR(150)    NN                                Full name of the staff member or parent.
  username                 VARCHAR(100)    UQ, NN                            Login username. Lowercase, no spaces.
  email                    VARCHAR(200)    UQ                                Email address. Used for password reset.
  password\_hash           VARCHAR(255)    NN                                bcrypt hash of the user\'s password.
  role\_id                 UUID            FK → roles.id, NN                 The role assigned to this user.
  is\_active               BOOLEAN         NN, DEF true                      False = account deactivated. User cannot log in.
  last\_login\_at          TIMESTAMPTZ     NULL                              Timestamp of the most recent successful login.
  must\_change\_password   BOOLEAN         NN, DEF false                     True = user must change password on next login.
  deleted\_at              TIMESTAMPTZ     NULL                              Soft delete. NULL = active.
  created\_at              TIMESTAMPTZ     NN, DEF now()                     Record creation timestamp.
  updated\_at              TIMESTAMPTZ     NN, DEF now()                     Last update timestamp.
  ------------------------ --------------- --------------------------------- --------------------------------------------------

### A2. roles

Defines the available user roles in the system. Roles are seeded at deployment and managed by the System Administrator.

  --------------- --------------- ----------------- ------------------------------------------------------------------------------------
  **Column**      **Data Type**   **Constraints**   **Description**
  id              UUID            PK, NN            Unique role identifier.
  name            VARCHAR(80)     UQ, NN            Role name. E.g. system\_admin, head\_teacher, bursar, class\_teacher, dos, parent.
  display\_name   VARCHAR(120)    NN                Human-readable role label. E.g. \'Director of Studies\'.
  description     TEXT            NULL              Optional description of the role\'s responsibilities.
  created\_at     TIMESTAMPTZ     NN, DEF now()     
  --------------- --------------- ----------------- ------------------------------------------------------------------------------------

> **Roles Seeded at Deployment** system\_admin · head\_teacher · bursar · class\_teacher · dos (Director of Studies) · parent

### A3. user\_roles --- Role Permission Reference

Supplementary table that maps roles to named permission strings, enabling fine-grained feature-level access control beyond the base role.

  ------------- --------------- ------------------- -----------------------------------------------------------------------------------------------
  **Column**    **Data Type**   **Constraints**     **Description**
  id            UUID            PK, NN              
  role\_id      UUID            FK → roles.id, NN   The role this permission applies to.
  permission    VARCHAR(120)    NN                  Permission string. E.g. \'scores.edit\', \'report\_cards.generate\', \'fees.discount.apply\'.
  created\_at   TIMESTAMPTZ     NN, DEF now()       
  ------------- --------------- ------------------- -----------------------------------------------------------------------------------------------

### A4. sessions

Tracks active authenticated sessions via Refresh Tokens. Revoked on logout or expiry.

  ---------------------- --------------- ------------------- ---------------------------------------------------
  **Column**             **Data Type**   **Constraints**     **Description**
  id                     UUID            PK, NN              
  user\_id               UUID            FK → users.id, NN   The authenticated user.
  refresh\_token\_hash   VARCHAR(255)    UQ, NN              Hashed refresh token. Never stored in plain text.
  ip\_address            VARCHAR(45)     NULL                IPv4 or IPv6 address of the client at login.
  user\_agent            TEXT            NULL                Browser/client user agent string.
  expires\_at            TIMESTAMPTZ     NN                  When this refresh token expires.
  revoked\_at            TIMESTAMPTZ     NULL                Set on logout. NULL = session still valid.
  created\_at            TIMESTAMPTZ     NN, DEF now()       
  ---------------------- --------------- ------------------- ---------------------------------------------------

### A5. audit\_logs

Append-only record of all significant system actions. Never updated or deleted.

  -------------- --------------- --------------------- --------------------------------------------------------------------------------------------------------------
  **Column**     **Data Type**   **Constraints**       **Description**
  id             UUID            PK, NN                
  user\_id       UUID            FK → users.id, NULL   The user who performed the action. NULL for system-triggered events.
  action         VARCHAR(120)    NN                    Action code. E.g. \'PUPIL\_CREATED\', \'PAYMENT\_RECORDED\', \'SCORE\_EDITED\', \'REPORT\_CARD\_GENERATED\'.
  entity\_type   VARCHAR(80)     NN                    The affected entity type. E.g. \'pupil\', \'payment\', \'score\'.
  entity\_id     UUID            NULL                  The UUID of the affected record.
  old\_value     JSONB           NULL                  Previous state of the record (for updates). Stored as JSON.
  new\_value     JSONB           NULL                  New state of the record (for creates/updates). Stored as JSON.
  ip\_address    VARCHAR(45)     NULL                  Client IP address at the time of the action.
  notes          TEXT            NULL                  Optional contextual note for the audit entry.
  created\_at    TIMESTAMPTZ     NN, DEF now()         Timestamp of the action.
  -------------- --------------- --------------------- --------------------------------------------------------------------------------------------------------------

+-----------------------------------------------------------------------------------+
| **GROUP B --- SCHOOL CONFIGURATION**                                              |
|                                                                                   |
| school\_settings · academic\_years · terms · school\_sections · classes · streams |
+-----------------------------------------------------------------------------------+

### B1. school\_settings

Single-row table holding the school\'s identity and configurable system-wide settings. Managed exclusively by the System Administrator.

  ----------------------- --------------- ----------------- ----------------------------------------------------------------------------------------
  **Column**              **Data Type**   **Constraints**   **Description**
  id                      UUID            PK, NN            Always a single row.
  school\_name            VARCHAR(200)    NN                Full official school name.
  school\_motto           VARCHAR(200)    NULL              School motto displayed on reports and UI.
  address\_line1          VARCHAR(200)    NULL              Physical address line 1.
  address\_line2          VARCHAR(200)    NULL              Physical address line 2 / PO Box.
  phone\_primary          VARCHAR(30)     NULL              Primary contact phone number.
  phone\_secondary        VARCHAR(30)     NULL              Secondary contact phone number.
  email                   VARCHAR(200)    NULL              School email address.
  logo\_path              VARCHAR(500)    NULL              File path or URL to the school crest/logo image.
  stamp\_notice           TEXT            NULL              Footer notice on report cards e.g. \'Not valid without official school stamp\'.
  report\_footer\_motto   VARCHAR(200)    NULL              Motivational quote shown at the bottom of report cards.
  grade\_guide\_text      TEXT            NULL              Configurable grade guide line shown on report cards. E.g. \'90-100=D1, 80-89=D2 \...\'
  created\_at             TIMESTAMPTZ     NN, DEF now()     
  updated\_at             TIMESTAMPTZ     NN, DEF now()     
  ----------------------- --------------- ----------------- ----------------------------------------------------------------------------------------

### B2. academic\_years

Represents a single academic year. All terms, fees, and results are scoped to an academic year.

  ------------- --------------- --------------------- ---------------------------------------------------------------------------------
  **Column**    **Data Type**   **Constraints**       **Description**
  id            UUID            PK, NN                
  year\_label   VARCHAR(20)     UQ, NN                E.g. \'2026\'. Used as display label throughout the system.
  start\_date   DATE            NN                    Official start date of the academic year.
  end\_date     DATE            NN                    Official end date of the academic year.
  is\_current   BOOLEAN         NN, DEF false         Only one academic year can be current at a time. Enforced by application logic.
  created\_by   UUID            FK → users.id, NULL   Admin who created this record.
  created\_at   TIMESTAMPTZ     NN, DEF now()         
  updated\_at   TIMESTAMPTZ     NN, DEF now()         
  ------------- --------------- --------------------- ---------------------------------------------------------------------------------

### B3. terms

Represents a single school term within an academic year. Holds all term-specific dates including separate Day and Boarding next-term start dates for the report card footer.

  ----------------------------- --------------- ----------------------------- --------------------------------------------------------------------
  **Column**                    **Data Type**   **Constraints**               **Description**
  id                            UUID            PK, NN                        
  academic\_year\_id            UUID            FK → academic\_years.id, NN   The academic year this term belongs to.
  term\_number                  SMALLINT        NN                            1, 2, or 3.
  term\_label                   VARCHAR(40)     NN                            Display label. E.g. \'Term 1, 2026\'.
  start\_date                   DATE            NN                            Term start date.
  end\_date                     DATE            NN                            Term end date.
  next\_term\_start\_day        DATE            NULL                          Next term start date for Day pupils (printed on report card).
  next\_term\_start\_boarding   DATE            NULL                          Next term start date for Boarding pupils (printed on report card).
  is\_current                   BOOLEAN         NN, DEF false                 Only one term can be current at a time.
  fees\_due\_date               DATE            NULL                          Default fees payment due date for this term.
  created\_at                   TIMESTAMPTZ     NN, DEF now()                 
  updated\_at                   TIMESTAMPTZ     NN, DEF now()                 
  ----------------------------- --------------- ----------------------------- --------------------------------------------------------------------

### B4. school\_sections

Defines the two primary school sections. Each section has its own ranking method and aggregate inclusion rules.

  ---------------------- --------------- ----------------------- ---------------------------------------------------------------
  **Column**             **Data Type**   **Constraints**         **Description**
  id                     UUID            PK, NN                  
  name                   VARCHAR(80)     UQ, NN                  E.g. \'Lower Primary\', \'Upper Primary\'.
  code                   VARCHAR(20)     UQ, NN                  Short code. E.g. \'LOWER\', \'UPPER\'.
  ranking\_method        VARCHAR(20)     NN, DEF \'aggregate\'   \'aggregate\' (upper primary) or \'average\' (lower primary).
  classes\_description   VARCHAR(100)    NULL                    Informational. E.g. \'P.1 -- P.3\'.
  created\_at            TIMESTAMPTZ     NN, DEF now()           
  ---------------------- --------------- ----------------------- ---------------------------------------------------------------

### B5. classes

Represents a class level (e.g. P.5). Each class belongs to a school section. Classes are configured by the System Administrator.

  --------------------- --------------- ------------------------------ --------------------------------------------------------------
  **Column**            **Data Type**   **Constraints**                **Description**
  id                    UUID            PK, NN                         
  school\_section\_id   UUID            FK → school\_sections.id, NN   The section this class belongs to (Lower or Upper Primary).
  name                  VARCHAR(40)     NN                             Class name. E.g. \'P.5\'.
  level\_order          SMALLINT        NN                             Numeric order for sorting. E.g. 1 for Baby Class, 7 for P.7.
  is\_active            BOOLEAN         NN, DEF true                   Inactive classes are hidden from assignment dropdowns.
  created\_at           TIMESTAMPTZ     NN, DEF now()                  
  updated\_at           TIMESTAMPTZ     NN, DEF now()                  
  --------------------- --------------- ------------------------------ --------------------------------------------------------------

### B6. streams

A stream is a named division within a class (e.g. \'Crane\', \'Eagle\'). A class can have one or more streams. Each stream has one assigned class teacher per term.

  -------------------- --------------- ----------------------------- ------------------------------------------------------------------
  **Column**           **Data Type**   **Constraints**               **Description**
  id                   UUID            PK, NN                        
  class\_id            UUID            FK → classes.id, NN           The class this stream belongs to.
  name                 VARCHAR(60)     NN                            Stream name. E.g. \'Crane\', \'Eagle\'.
  academic\_year\_id   UUID            FK → academic\_years.id, NN   Streams are re-configured each academic year.
  class\_teacher\_id   UUID            FK → users.id, NULL           The class teacher assigned to this stream for the academic year.
  is\_active           BOOLEAN         NN, DEF true                  
  created\_at          TIMESTAMPTZ     NN, DEF now()                 
  updated\_at          TIMESTAMPTZ     NN, DEF now()                 
  -------------------- --------------- ----------------------------- ------------------------------------------------------------------

+------------------------------------------------------------------------------------------------------------------------------------------+
| **GROUP C --- SUBJECTS & GRADING**                                                                                                       |
|                                                                                                                                          |
| subjects · class\_subject\_assignments · subject\_section\_rules · grading\_scales · grading\_scale\_entries · assessment\_type\_configs |
+------------------------------------------------------------------------------------------------------------------------------------------+

### C1. subjects

Master list of all subjects the school can offer. Which subjects a class actually takes is defined in class\_subject\_assignments.

  ------------- --------------- ----------------- ------------------------------------------------------------------
  **Column**    **Data Type**   **Constraints**   **Description**
  id            UUID            PK, NN            
  name          VARCHAR(120)    UQ, NN            Subject name. E.g. \'English\', \'Mathematics\', \'Literacy I\'.
  code          VARCHAR(20)     UQ, NN            Short code. E.g. \'ENG\', \'MATH\', \'LIT1\'.
  is\_active    BOOLEAN         NN, DEF true      Inactive subjects cannot be assigned to classes.
  created\_at   TIMESTAMPTZ     NN, DEF now()     
  updated\_at   TIMESTAMPTZ     NN, DEF now()     
  ------------- --------------- ----------------- ------------------------------------------------------------------

### C2. class\_subject\_assignments

Defines exactly which subjects a specific class takes in a specific term. Only assigned subjects appear on the report card. This replaces all hardcoded subject lists.

  ---------------- --------------- ------------------------------------ ----------------------------------------------------------
  **Column**       **Data Type**   **Constraints**                      **Description**
  id               UUID            PK, NN                               
  class\_id        UUID            FK → classes.id, NN                  The class receiving this subject.
  subject\_id      UUID            FK → subjects.id, NN                 The subject being assigned.
  term\_id         UUID            FK → terms.id, NN                    The term this assignment is active for.
  display\_order   SMALLINT        NN, DEF 1                            Order in which the subject appears on the report card.
  max\_score       SMALLINT        NN, DEF 100                          Maximum achievable score for this subject in this class.
  created\_by      UUID            FK → users.id, NULL                  Admin who created this assignment.
  created\_at      TIMESTAMPTZ     NN, DEF now()                        
  UNIQUE                           (class\_id, subject\_id, term\_id)   A subject can only be assigned once per class per term.
  ---------------- --------------- ------------------------------------ ----------------------------------------------------------

### C3. subject\_section\_rules

Defines per-section rules for each subject --- specifically whether the subject is included in the aggregate or average calculation. This is what enforces the \'Religious Education excluded from aggregate\' rule and all similar rules, without hardcoding.

  ------------------------ --------------- ------------------------------------ ----------------------------------------------------------------------------------------------------------
  **Column**               **Data Type**   **Constraints**                      **Description**
  id                       UUID            PK, NN                               
  school\_section\_id      UUID            FK → school\_sections.id, NN         The section this rule applies to.
  subject\_id              UUID            FK → subjects.id, NN                 The subject this rule applies to.
  include\_in\_aggregate   BOOLEAN         NN, DEF true                         False = excluded from aggregate/average calculation. E.g. Religious Education = false.
  is\_penalty\_trigger     BOOLEAN         NN, DEF false                        True = F9 in this subject triggers automatic division demotion. E.g. English = true, Mathematics = true.
  created\_at              TIMESTAMPTZ     NN, DEF now()                        
  UNIQUE                                   (school\_section\_id, subject\_id)   One rule per subject per section.
  ------------------------ --------------- ------------------------------------ ----------------------------------------------------------------------------------------------------------

### C4. grading\_scales

A named grading scale that can be activated by the System Administrator. Multiple scales can exist but only one is active at a time. This allows the admin to change grade boundaries (e.g. D1 from 90-100 to 85-100) without code changes.

  ------------- --------------- --------------------- ----------------------------------------------------------------------------------
  **Column**    **Data Type**   **Constraints**       **Description**
  id            UUID            PK, NN                
  name          VARCHAR(100)    NN                    Name of the scale. E.g. \'Standard Uganda MoES Scale\', \'Modified 2026 Scale\'.
  is\_active    BOOLEAN         NN, DEF false         Only one scale can be active. Enforced by application logic before save.
  description   TEXT            NULL                  Optional notes on why this scale was created or when it applies.
  created\_by   UUID            FK → users.id, NULL   
  created\_at   TIMESTAMPTZ     NN, DEF now()         
  updated\_at   TIMESTAMPTZ     NN, DEF now()         
  ------------- --------------- --------------------- ----------------------------------------------------------------------------------

### C5. grading\_scale\_entries

The individual grade bands within a grading scale. Each row defines one grade. The grading engine reads these rows at runtime to compute grade labels and points from raw scores.

  -------------------- --------------- ------------------------------------- -----------------------------------------------------------
  **Column**           **Data Type**   **Constraints**                       **Description**
  id                   UUID            PK, NN                                
  grading\_scale\_id   UUID            FK → grading\_scales.id, NN           The scale this entry belongs to.
  grade\_label         VARCHAR(10)     NN                                    Grade label. E.g. \'D1\', \'D2\', \'C3\', \'P7\', \'F9\'.
  points\_value        SMALLINT        NN                                    Points awarded for this grade. E.g. D1=1, D2=2, F9=9.
  min\_score           SMALLINT        NN                                    Minimum score (inclusive) for this grade band.
  max\_score           SMALLINT        NN                                    Maximum score (inclusive) for this grade band.
  display\_order       SMALLINT        NN                                    Render order on the grade guide (1=best, 9=worst).
  is\_fail             BOOLEAN         NN, DEF false                         True = this grade is a failing grade (F9).
  UNIQUE                               (grading\_scale\_id, grade\_label)    A label can only appear once per scale.
  UNIQUE                               (grading\_scale\_id, points\_value)   A points value can only appear once per scale.
  -------------------- --------------- ------------------------------------- -----------------------------------------------------------

> **Grading Engine Rule** The grading engine always queries the single active grading\_scale and its entries to compute grade labels and points. Changing the active scale or its entries immediately affects all future score computations.

### C6. division\_boundaries

Defines the aggregate point ranges that correspond to each Division. These are also admin-configurable, separate from per-subject grading.

  -------------------- --------------- ----------------------------- --------------------------------------------------------------------
  **Column**           **Data Type**   **Constraints**               **Description**
  id                   UUID            PK, NN                        
  grading\_scale\_id   UUID            FK → grading\_scales.id, NN   The scale these boundaries belong to.
  division\_label      VARCHAR(20)     NN                            E.g. \'I\', \'II\', \'III\', \'IV\', \'U\'.
  roman\_numeral       VARCHAR(10)     NN                            Roman numeral display. E.g. \'I\', \'II\', \'III\', \'IV\', \'U\'.
  min\_aggregate       SMALLINT        NN                            Minimum aggregate points for this division (lower is better).
  max\_aggregate       SMALLINT        NN                            Maximum aggregate points for this division.
  is\_ungraded         BOOLEAN         NN, DEF false                 True = this is the fail/ungraded band (35-36 points).
  display\_order       SMALLINT        NN                            Render order (1=Division I).
  -------------------- --------------- ----------------------------- --------------------------------------------------------------------

### C7. assessment\_type\_configs

Defines all assessment types available in the system. BOT, MOT, and EOT are seeded. Additional types (e.g. PLE Mock, Topical Test) can be added by the System Administrator at any time.

  ---------------------------- --------------- --------------------- ---------------------------------------------------------------------------------------------
  **Column**                   **Data Type**   **Constraints**       **Description**
  id                           UUID            PK, NN                
  code                         VARCHAR(30)     UQ, NN                Internal code. E.g. \'BOT\', \'MOT\', \'EOT\', \'PLE\_MOCK\', \'TOPICAL\'.
  label                        VARCHAR(80)     NN                    Display name. E.g. \'Beginning of Term\', \'PLE Mock Examination\'.
  appears\_on\_report\_card    BOOLEAN         NN, DEF true          True = this assessment type\'s scores appear on the report card.
  contributes\_to\_aggregate   BOOLEAN         NN, DEF false         True = this assessment\'s score contributes to the term aggregate. Typically only EOT does.
  display\_order               SMALLINT        NN                    Column order on the report card.
  is\_system\_default          BOOLEAN         NN, DEF false         True = BOT/MOT/EOT. Cannot be deleted, only deactivated.
  is\_active                   BOOLEAN         NN, DEF true          Inactive types are hidden from score entry screens.
  created\_by                  UUID            FK → users.id, NULL   NULL for system-seeded defaults.
  created\_at                  TIMESTAMPTZ     NN, DEF now()         
  ---------------------------- --------------- --------------------- ---------------------------------------------------------------------------------------------

+-------------------------------------------------------+
| **GROUP D --- PUPILS & FAMILIES**                     |
|                                                       |
| pupils · guardians · pupil\_guardians · pupil\_photos |
+-------------------------------------------------------+

### D1. pupils

The central pupil registry. Every enrolled pupil has exactly one record in this table. This is the most critical table in the schema.

  --------------------- --------------- ----------------------- ---------------------------------------------------------------------------------------------------
  **Column**            **Data Type**   **Constraints**         **Description**
  id                    UUID            PK, NN                  Unique internal pupil identifier.
  pupil\_id\_code       VARCHAR(30)     UQ, NN                  System-generated internal ID. E.g. \'SMS-2024-001\'. Format configurable in school\_settings.
  lin                   VARCHAR(50)     UQ, NULL                Learner Identification Number issued by Uganda MoES. Nullable as new pupils may not have one yet.
  schoolpay\_code       VARCHAR(50)     UQ, NULL                SchoolPay payment code assigned by the SchoolPay platform.
  first\_name           VARCHAR(80)     NN                      
  last\_name            VARCHAR(80)     NN                      
  other\_names          VARCHAR(80)     NULL                    Middle names or other names.
  date\_of\_birth       DATE            NN                      
  gender                VARCHAR(10)     NN                      \'Male\' or \'Female\'.
  religion              VARCHAR(60)     NULL                    E.g. \'Catholic\', \'Muslim\', \'Protestant\'.
  house                 VARCHAR(60)     NULL                    School house assignment if applicable.
  medical\_conditions   TEXT            NULL                    Any known medical conditions or allergies.
  former\_school        VARCHAR(200)    NULL                    Previous school attended before enrolment.
  stream\_id            UUID            FK → streams.id, NULL   The stream the pupil is currently enrolled in.
  section               VARCHAR(20)     NN                      \'Day\' or \'Boarding\'.
  enrolment\_date       DATE            NN                      Date the pupil was enrolled at this school.
  is\_active            BOOLEAN         NN, DEF true            False = withdrawn or transferred pupil.
  deleted\_at           TIMESTAMPTZ     NULL                    Soft delete. NULL = active.
  created\_by           UUID            FK → users.id, NULL     Staff member who registered this pupil.
  created\_at           TIMESTAMPTZ     NN, DEF now()           
  updated\_at           TIMESTAMPTZ     NN, DEF now()           
  --------------------- --------------- ----------------------- ---------------------------------------------------------------------------------------------------

### D2. guardians

Parent or guardian profiles. A single guardian can be linked to multiple pupils (siblings). Storing the guardian once and linking avoids data duplication across siblings.

  ------------------- --------------- ----------------- -------------------------------------------------------------
  **Column**          **Data Type**   **Constraints**   **Description**
  id                  UUID            PK, NN            
  full\_name          VARCHAR(150)    NN                
  relationship        VARCHAR(60)     NN                E.g. \'Father\', \'Mother\', \'Uncle\', \'Legal Guardian\'.
  phone\_call         VARCHAR(30)     NN                Primary phone number used for voice calls.
  phone\_whatsapp     VARCHAR(30)     NULL              WhatsApp number (may differ from call number).
  email               VARCHAR(200)    NULL              
  physical\_address   TEXT            NULL              Home or work physical address.
  occupation          VARCHAR(100)    NULL              Optional. Useful for contextual communication.
  is\_active          BOOLEAN         NN, DEF true      
  deleted\_at         TIMESTAMPTZ     NULL              Soft delete.
  created\_at         TIMESTAMPTZ     NN, DEF now()     
  updated\_at         TIMESTAMPTZ     NN, DEF now()     
  ------------------- --------------- ----------------- -------------------------------------------------------------

### D3. pupil\_guardians

Junction table linking pupils to their guardians. A pupil can have multiple guardians (e.g. both parents). One guardian is designated as primary for communication purposes.

  ---------------------- --------------- --------------------------- ---------------------------------------------------------------------------------
  **Column**             **Data Type**   **Constraints**             **Description**
  id                     UUID            PK, NN                      
  pupil\_id              UUID            FK → pupils.id, NN          
  guardian\_id           UUID            FK → guardians.id, NN       
  is\_primary\_contact   BOOLEAN         NN, DEF false               True = this guardian is the first contact for fees follow-up and communication.
  created\_at            TIMESTAMPTZ     NN, DEF now()               
  UNIQUE                                 (pupil\_id, guardian\_id)   A guardian is linked to a pupil only once.
  ---------------------- --------------- --------------------------- ---------------------------------------------------------------------------------

### D4. pupil\_photos

Stores the file reference for a pupil\'s passport photo. Separated from the main pupils table to keep the core record lightweight. If no photo exists, the UI renders initials.

  ------------------- --------------- ------------------------ ------------------------------------------------------------
  **Column**          **Data Type**   **Constraints**          **Description**
  id                  UUID            PK, NN                   
  pupil\_id           UUID            FK → pupils.id, UQ, NN   One photo record per pupil.
  file\_path          VARCHAR(500)    NN                       Server file path or object storage key for the photo file.
  file\_size\_bytes   INTEGER         NULL                     File size for storage management.
  uploaded\_by        UUID            FK → users.id, NULL      
  uploaded\_at        TIMESTAMPTZ     NN, DEF now()            
  ------------------- --------------- ------------------------ ------------------------------------------------------------

+---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| **GROUP E --- FEES**                                                                                                                                                                  |
|                                                                                                                                                                                       |
| fee\_categories · fee\_structures · bursary\_schemes · pupil\_bursaries · pupil\_bills · bill\_line\_items · payments · payment\_plans · payment\_plan\_instalments · fee\_statements |
+---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+

### E1. fee\_categories

Admin-defined fee category master list. E.g. Tuition, Transport, UNEB, Development. Categories are reused across terms.

  ------------- --------------- ----------------- -------------------------------------------------------------------------------
  **Column**    **Data Type**   **Constraints**   **Description**
  id            UUID            PK, NN            
  name          VARCHAR(120)    UQ, NN            E.g. \'Tuition Fees\', \'Transport Fees\', \'UNEB Examination Fees\'.
  code          VARCHAR(30)     UQ, NN            Short code. E.g. \'TUITION\', \'TRANSPORT\', \'UNEB\'.
  is\_tuition   BOOLEAN         NN, DEF false     True = this is the core tuition category. Used for bursary and billing logic.
  is\_active    BOOLEAN         NN, DEF true      
  created\_at   TIMESTAMPTZ     NN, DEF now()     
  ------------- --------------- ----------------- -------------------------------------------------------------------------------

### E2. fee\_structures

Defines the standard fee amount for a specific category, class, section, and term. This is the school\'s published fee schedule. Since fees differ by class and section (Day vs Boarding), each combination has its own row.

  ------------------- --------------- --------------------------------------------------- -----------------------------------------------------------------
  **Column**          **Data Type**   **Constraints**                                     **Description**
  id                  UUID            PK, NN                                              
  fee\_category\_id   UUID            FK → fee\_categories.id, NN                         The fee category this structure entry applies to.
  class\_id           UUID            FK → classes.id, NN                                 The class this fee applies to.
  section             VARCHAR(20)     NN                                                  \'Day\' or \'Boarding\'. Tuition differs by section.
  term\_id            UUID            FK → terms.id, NN                                   The term this fee structure is valid for.
  amount              INTEGER         NN                                                  Standard fee amount in Uganda Shillings (integer, no decimals).
  is\_mandatory       BOOLEAN         NN, DEF true                                        False = optional fee (e.g. transport for day pupils only).
  created\_by         UUID            FK → users.id, NULL                                 
  created\_at         TIMESTAMPTZ     NN, DEF now()                                       
  UNIQUE                              (fee\_category\_id, class\_id, section, term\_id)   One fee per category per class per section per term.
  ------------------- --------------- --------------------------------------------------- -----------------------------------------------------------------

### E3. bursary\_schemes

Admin-defined bursary types. A bursary is a structured discount scheme with a named type. Separate from ad-hoc discounts.

  --------------------------- --------------- ------------------------------- ----------------------------------------------------------------------------------------------
  **Column**                  **Data Type**   **Constraints**                 **Description**
  id                          UUID            PK, NN                          
  name                        VARCHAR(150)    UQ, NN                          E.g. \'Full Bursary\', \'Half Bursary\', \'Staff Child Discount\', \'50% Sibling Discount\'.
  discount\_type              VARCHAR(20)     NN                              \'percentage\' or \'fixed\_amount\'.
  discount\_value             INTEGER         NN                              If percentage: 0--100. If fixed\_amount: amount in UGX.
  applies\_to\_category\_id   UUID            FK → fee\_categories.id, NULL   NULL = applies to all categories. Non-null = applies to one specific category only.
  is\_active                  BOOLEAN         NN, DEF true                    
  created\_at                 TIMESTAMPTZ     NN, DEF now()                   
  --------------------------- --------------- ------------------------------- ----------------------------------------------------------------------------------------------

### E4. pupil\_bursaries

Links a pupil to a bursary scheme. A pupil can have at most one active bursary at a time. This drives automatic discount calculation during bulk billing.

  --------------------- --------------- ------------------------------ ------------------------------------------
  **Column**            **Data Type**   **Constraints**                **Description**
  id                    UUID            PK, NN                         
  pupil\_id             UUID            FK → pupils.id, NN             
  bursary\_scheme\_id   UUID            FK → bursary\_schemes.id, NN   
  awarded\_date         DATE            NN                             Date the bursary was formally awarded.
  expiry\_date          DATE            NULL                           Optional expiry. NULL = indefinite.
  notes                 TEXT            NULL                           Context or reason for the bursary award.
  awarded\_by           UUID            FK → users.id, NULL            
  is\_active            BOOLEAN         NN, DEF true                   
  created\_at           TIMESTAMPTZ     NN, DEF now()                  
  --------------------- --------------- ------------------------------ ------------------------------------------

### E5. pupil\_bills

The top-level fees bill for a single pupil for a single term. Generated by the bulk billing process or individually by the Bursar.

  ------------------------- --------------- ----------------------- ------------------------------------------------------------------
  **Column**                **Data Type**   **Constraints**         **Description**
  id                        UUID            PK, NN                  
  pupil\_id                 UUID            FK → pupils.id, NN      
  term\_id                  UUID            FK → terms.id, NN       The term this bill is for.
  total\_amount             INTEGER         NN                      Total amount billed (sum of line items after discounts). In UGX.
  total\_paid               INTEGER         NN, DEF 0               Running total of all payments recorded. Updated on each payment.
  balance                   INTEGER         NN                      Computed: total\_amount - total\_paid. Updated on each payment.
  arrears\_from\_previous   INTEGER         NN, DEF 0               Outstanding balance carried over from the previous term.
  billing\_status           VARCHAR(20)     NN, DEF \'pending\'     \'pending\', \'partial\', \'paid\', \'overdue\'.
  generated\_by             UUID            FK → users.id, NULL     Staff member or system process that generated this bill.
  generated\_at             TIMESTAMPTZ     NN, DEF now()           
  created\_at               TIMESTAMPTZ     NN, DEF now()           
  updated\_at               TIMESTAMPTZ     NN, DEF now()           
  UNIQUE                                    (pupil\_id, term\_id)   A pupil has only one bill per term.
  ------------------------- --------------- ----------------------- ------------------------------------------------------------------

### E6. bill\_line\_items

Individual line items within a pupil\'s bill. One row per fee category. Stores the standard amount, bursary discount applied, and the net amount charged.

  ------------------- --------------- ----------------------------- --------------------------------------------------------------------
  **Column**          **Data Type**   **Constraints**               **Description**
  id                  UUID            PK, NN                        
  pupil\_bill\_id     UUID            FK → pupil\_bills.id, NN      The parent bill this line item belongs to.
  fee\_category\_id   UUID            FK → fee\_categories.id, NN   The fee category for this line item.
  standard\_amount    INTEGER         NN                            Amount from the fee\_structures table before any discount.
  bursary\_discount   INTEGER         NN, DEF 0                     Discount amount applied (from pupil\_bursaries). In UGX.
  manual\_discount    INTEGER         NN, DEF 0                     Any additional manual discount applied by the Bursar.
  net\_amount         INTEGER         NN                            Computed: standard\_amount - bursary\_discount - manual\_discount.
  line\_status        VARCHAR(20)     NN, DEF \'pending\'           \'pending\', \'partial\', \'paid\'.
  created\_at         TIMESTAMPTZ     NN, DEF now()                 
  ------------------- --------------- ----------------------------- --------------------------------------------------------------------

### E7. payments

Records every individual payment transaction. One row per payment event. Supports both SchoolPay auto-sync and manual cash/cheque entries.

  ---------------------------- --------------- -------------------------- ----------------------------------------------------------------------------
  **Column**                   **Data Type**   **Constraints**            **Description**
  id                           UUID            PK, NN                     
  pupil\_bill\_id              UUID            FK → pupil\_bills.id, NN   The bill this payment is applied to.
  amount                       INTEGER         NN                         Payment amount in UGX.
  payment\_date                DATE            NN                         Date the payment was made.
  payment\_method              VARCHAR(30)     NN                         \'schoolpay\', \'cash\', \'cheque\', \'bank\_transfer\'.
  reference\_number            VARCHAR(100)    NULL                       SchoolPay transaction ref, cheque number, or receipt number.
  source                       VARCHAR(20)     NN, DEF \'manual\'         \'manual\' (Bursar-entered) or \'schoolpay\_sync\' (automated).
  schoolpay\_transaction\_id   VARCHAR(100)    UQ, NULL                   Unique SchoolPay transaction ID. Used for duplicate detection during sync.
  notes                        TEXT            NULL                       Optional Bursar notes on this payment.
  recorded\_by                 UUID            FK → users.id, NULL        Staff member who recorded this payment. NULL for auto-synced.
  created\_at                  TIMESTAMPTZ     NN, DEF now()              
  ---------------------------- --------------- -------------------------- ----------------------------------------------------------------------------

### E8. payment\_plans

An instalment plan for a pupil\'s bill. A plan defines how many instalments the parent has agreed to pay and by when.

  -------------------- --------------- ------------------------------ ----------------------------------------
  **Column**           **Data Type**   **Constraints**                **Description**
  id                   UUID            PK, NN                         
  pupil\_bill\_id      UUID            FK → pupil\_bills.id, UQ, NN   One plan per bill.
  total\_instalments   SMALLINT        NN                             Number of planned instalments.
  notes                TEXT            NULL                           Agreed terms or context for this plan.
  created\_by          UUID            FK → users.id, NULL            
  created\_at          TIMESTAMPTZ     NN, DEF now()                  
  updated\_at          TIMESTAMPTZ     NN, DEF now()                  
  -------------------- --------------- ------------------------------ ----------------------------------------

### E9. payment\_plan\_instalments

Individual instalment milestones within a payment plan. Each row defines a due date and expected amount.

  -------------------- --------------- ---------------------------- ---------------------------------------------
  **Column**           **Data Type**   **Constraints**              **Description**
  id                   UUID            PK, NN                       
  payment\_plan\_id    UUID            FK → payment\_plans.id, NN   
  instalment\_number   SMALLINT        NN                           1, 2, 3\... in sequence.
  due\_date            DATE            NN                           Expected payment date for this instalment.
  expected\_amount     INTEGER         NN                           Amount expected for this instalment in UGX.
  status               VARCHAR(20)     NN, DEF \'upcoming\'         \'upcoming\', \'paid\', \'overdue\'.
  updated\_at          TIMESTAMPTZ     NN, DEF now()                Automatically updated when status changes.
  -------------------- --------------- ---------------------------- ---------------------------------------------

### E10. fee\_statements

Records of generated fee statements. A fee statement is a printable document showing next term\'s bill and any outstanding balance. Can be generated per pupil or in bulk per class. Attached to report card envelopes.

  ------------------- --------------- --------------------- -----------------------------------------------------
  **Column**          **Data Type**   **Constraints**       **Description**
  id                  UUID            PK, NN                
  pupil\_id           UUID            FK → pupils.id, NN    
  term\_id            UUID            FK → terms.id, NN     The term the statement is billing for (next term).
  previous\_balance   INTEGER         NN, DEF 0             Outstanding balance from the current/previous term.
  next\_term\_total   INTEGER         NN                    Total amount billed for the next term.
  grand\_total        INTEGER         NN                    previous\_balance + next\_term\_total.
  pdf\_path           VARCHAR(500)    NULL                  File path of the generated PDF statement.
  generated\_by       UUID            FK → users.id, NULL   
  generated\_at       TIMESTAMPTZ     NN, DEF now()         
  ------------------- --------------- --------------------- -----------------------------------------------------

+--------------------------------------------------------------------------------------------------------------------------+
| **GROUP F --- ACADEMIC PERFORMANCE**                                                                                     |
|                                                                                                                          |
| assessment\_periods · pupil\_scores · pupil\_term\_results · report\_cards · report\_card\_settings · term\_requirements |
+--------------------------------------------------------------------------------------------------------------------------+

### F1. assessment\_periods

Represents a specific assessment period instance within a term (e.g. EOT of Term 1 2026). Links an assessment type configuration to a specific term.

  ---------------------- --------------- --------------------------------------- ---------------------------------------------------------
  **Column**             **Data Type**   **Constraints**                         **Description**
  id                     UUID            PK, NN                                  
  term\_id               UUID            FK → terms.id, NN                       The term this assessment period belongs to.
  assessment\_type\_id   UUID            FK → assessment\_type\_configs.id, NN   The type of assessment (BOT, MOT, EOT, etc.).
  label                  VARCHAR(80)     NN                                      Display label. E.g. \'End of Term 1, 2026\'.
  assessment\_date       DATE            NULL                                    Optional date of the examination.
  score\_entry\_open     BOOLEAN         NN, DEF false                           True = class teachers can enter scores for this period.
  score\_entry\_locked   BOOLEAN         NN, DEF false                           True = scores are locked. Only DOS or Admin can edit.
  created\_at            TIMESTAMPTZ     NN, DEF now()                           
  UNIQUE                                 (term\_id, assessment\_type\_id)        One instance of each assessment type per term.
  ---------------------- --------------- --------------------------------------- ---------------------------------------------------------

### F2. pupil\_scores

Stores a single score for one pupil, for one subject, in one assessment period. This is the atomic unit of academic data. NULL score = missed exam. Zero = sat and scored zero.

  ------------------------ --------------- -------------------------------------------------- ------------------------------------------------------------------------------------------------------
  **Column**               **Data Type**   **Constraints**                                    **Description**
  id                       UUID            PK, NN                                             
  pupil\_id                UUID            FK → pupils.id, NN                                 
  subject\_id              UUID            FK → subjects.id, NN                               
  assessment\_period\_id   UUID            FK → assessment\_periods.id, NN                    
  score                    SMALLINT        NULL                                               Raw score. NULL = absent/not sat. 0 = sat and scored zero.
  grade\_label             VARCHAR(10)     NULL                                               Computed grade label (e.g. \'D1\', \'C3\', \'F9\'). Stored after computation for report performance.
  grade\_points            SMALLINT        NULL                                               Computed grade points (e.g. 1 for D1, 9 for F9). Stored for aggregate calculation.
  teacher\_remarks         TEXT            NULL                                               Remarks entered by the class teacher for this subject on the report card.
  teacher\_initials        VARCHAR(10)     NULL                                               Teacher initials as shown on the report card.
  entered\_by              UUID            FK → users.id, NULL                                User who first entered this score.
  last\_edited\_by         UUID            FK → users.id, NULL                                User who last modified this score. Must be DOS or Admin.
  created\_at              TIMESTAMPTZ     NN, DEF now()                                      
  updated\_at              TIMESTAMPTZ     NN, DEF now()                                      
  UNIQUE                                   (pupil\_id, subject\_id, assessment\_period\_id)   One score per pupil per subject per period.
  ------------------------ --------------- -------------------------------------------------- ------------------------------------------------------------------------------------------------------

> **Score Edit Security** The entered\_by column is set on first entry (class teacher). The last\_edited\_by column is set on any subsequent edit. Application-level RBAC ensures that only DOS and System Admin roles can write to last\_edited\_by. Class teachers can only write to entered\_by on first save.

### F3. pupil\_term\_results

Stores the computed academic results for a pupil for a specific term and assessment period. This table is populated by the grading engine after scores are entered and locked. It caches computed aggregates and divisions so report cards do not require live recalculation.

  --------------------------- --------------- ----------------------------------------------- ---------------------------------------------------------------------------------------------------
  **Column**                  **Data Type**   **Constraints**                                 **Description**
  id                          UUID            PK, NN                                          
  pupil\_id                   UUID            FK → pupils.id, NN                              
  term\_id                    UUID            FK → terms.id, NN                               
  assessment\_period\_id      UUID            FK → assessment\_periods.id, NN                 
  aggregate\_points           SMALLINT        NULL                                            Sum of grade points for included subjects. Lower = better. NULL if not yet computed.
  raw\_division\_label        VARCHAR(10)     NULL                                            Division before F9 penalty rule. E.g. \'I\'.
  final\_division\_label      VARCHAR(10)     NULL                                            Division after F9 penalty applied. E.g. \'II\' (demoted). This is what prints on the report card.
  f9\_penalty\_applied        BOOLEAN         NN, DEF false                                   True = the F9 in English/Math rule was triggered and division was demoted.
  f9\_penalty\_subject        VARCHAR(120)    NULL                                            Name of the subject that triggered the F9 penalty.
  average\_score              NUMERIC(5,2)    NULL                                            Average score used for ranking in Lower Primary. NULL for Upper Primary.
  class\_rank                 SMALLINT        NULL                                            Pupil\'s rank within their stream for this period.
  total\_pupils\_in\_stream   SMALLINT        NULL                                            Total number of pupils in the stream at time of ranking.
  promotion\_note             TEXT            NULL                                            E.g. \'PROMOTED TO P.7\'. Set by DOS/Admin at end of year.
  computed\_at                TIMESTAMPTZ     NULL                                            When the grading engine last computed these results.
  computed\_by                UUID            FK → users.id, NULL                             System user or admin who triggered recomputation.
  UNIQUE                                      (pupil\_id, term\_id, assessment\_period\_id)   One result record per pupil per period.
  --------------------------- --------------- ----------------------------------------------- ---------------------------------------------------------------------------------------------------

### F4. report\_card\_settings

Single-row configuration table controlling exactly how report cards are generated and printed. Fully configurable by the System Administrator.

  ---------------------------- --------------- ------------------------ ----------------------------------------------------------------------------------
  **Column**                   **Data Type**   **Constraints**          **Description**
  id                           UUID            PK, NN                   Always a single active configuration row.
  show\_bot\_on\_report        BOOLEAN         NN, DEF true             Whether BOT scores appear on the report card.
  show\_mot\_on\_report        BOOLEAN         NN, DEF true             Whether MOT scores appear on the report card.
  show\_eot\_on\_report        BOOLEAN         NN, DEF true             Whether EOT scores appear on the report card.
  average\_periods             BOOLEAN         NN, DEF false            True = show averaged scores across periods instead of individual.
  show\_class\_rank            BOOLEAN         NN, DEF true             Whether class rank is printed on the report card.
  ranking\_format              VARCHAR(30)     NN, DEF \'ordinal\'      \'ordinal\' (1st, 2nd) or \'numeric\' (1 OUT OF 44 PUPILS).
  show\_grade\_guide           BOOLEAN         NN, DEF true             Whether the grade guide is printed at the bottom of the card.
  show\_school\_requirements   BOOLEAN         NN, DEF true             Whether the School Requirements for Next Term section is printed.
  show\_next\_term\_dates      BOOLEAN         NN, DEF true             Whether next term start dates (Day/Boarding) are printed.
  who\_can\_generate           VARCHAR(20)     NN, DEF \'dos\_admin\'   \'dos\_admin\' = only DOS and Admin. \'all\_teachers\' = all class teachers too.
  updated\_by                  UUID            FK → users.id, NULL      
  updated\_at                  TIMESTAMPTZ     NN, DEF now()            
  ---------------------------- --------------- ------------------------ ----------------------------------------------------------------------------------

### F5. report\_cards

Records metadata about each generated report card PDF. The actual PDF is stored in the file system / object storage; this table tracks what was generated and where the file lives.

  ------------------------ --------------- ------------------------------------------------------------- --------------------------------------------------------
  **Column**               **Data Type**   **Constraints**                                               **Description**
  id                       UUID            PK, NN                                                        
  pupil\_id                UUID            FK → pupils.id, NN                                            
  term\_id                 UUID            FK → terms.id, NN                                             
  assessment\_period\_id   UUID            FK → assessment\_periods.id, NN                               The period this report card is for.
  report\_type             VARCHAR(20)     NN                                                            \'midterm\' or \'endofterm\'.
  pdf\_path                VARCHAR(500)    NULL                                                          File path or object storage key for the generated PDF.
  generated\_by            UUID            FK → users.id, NN                                             DOS or Admin who generated this report card.
  generated\_at            TIMESTAMPTZ     NN, DEF now()                                                 
  UNIQUE                                   (pupil\_id, term\_id, assessment\_period\_id, report\_type)   One report card record per pupil per period per type.
  ------------------------ --------------- ------------------------------------------------------------- --------------------------------------------------------

### F6. term\_requirements

Admin-configurable list of items pupils should bring next term. Printed in the \'School Requirements for Next Term\' section of the report card.

  ------------------- --------------- ----------------------- ------------------------------------------------------------------
  **Column**          **Data Type**   **Constraints**         **Description**
  id                  UUID            PK, NN                  
  term\_id            UUID            FK → terms.id, NN       The term this requirements list applies to.
  class\_id           UUID            FK → classes.id, NULL   NULL = applies to all classes. Non-null = class-specific list.
  item\_number        SMALLINT        NN                      Display order number (1, 2, 3\...).
  item\_description   VARCHAR(300)    NN                      E.g. \'24 Exercise Books\', \'12 Pencils\', \'Holiday Package\'.
  created\_by         UUID            FK → users.id, NULL     
  created\_at         TIMESTAMPTZ     NN, DEF now()           
  ------------------- --------------- ----------------------- ------------------------------------------------------------------

+----------------------------------------------------------+
| **GROUP G --- COMMUNICATION**                            |
|                                                          |
| communication\_logs · message\_templates · demand\_notes |
+----------------------------------------------------------+

### G1. communication\_logs

The complete, chronological record of every parent interaction initiated by staff regarding a pupil\'s fees. This is the interaction history visible to all Bursar and Admin staff.

  ---------------------- --------------- ------------------------- -------------------------------------------------------------------------------------------------------
  **Column**             **Data Type**   **Constraints**           **Description**
  id                     UUID            PK, NN                    
  pupil\_id              UUID            FK → pupils.id, NN        The pupil this interaction is about.
  guardian\_id           UUID            FK → guardians.id, NULL   The specific guardian contacted. NULL if logged generically.
  channel                VARCHAR(20)     NN                        \'sms\', \'whatsapp\', \'call\', \'letter\', \'demand\_note\', \'in\_person\'.
  direction              VARCHAR(10)     NN, DEF \'outbound\'      \'outbound\' (school to parent) or \'inbound\' (parent called school).
  phone\_number\_used    VARCHAR(30)     NULL                      The number contacted. Stored for reference even if guardian record changes later.
  message\_body          TEXT            NULL                      Message text sent (for SMS/WhatsApp). NULL for calls.
  call\_outcome          VARCHAR(80)     NULL                      For calls: \'connected\_promised\', \'connected\_no\_commitment\', \'no\_answer\', \'wrong\_number\'.
  delivery\_status       VARCHAR(20)     NULL, DEF \'sent\'        \'sent\', \'delivered\', \'failed\'. Updated by AT delivery webhook.
  at\_message\_id        VARCHAR(100)    NULL                      Africa\'s Talking message ID for delivery tracking.
  staff\_notes           TEXT            NULL                      Internal notes from the staff member on the outcome.
  next\_followup\_date   DATE            NULL                      Optional scheduled next follow-up date.
  initiated\_by          UUID            FK → users.id, NULL       Staff member who initiated or logged this interaction.
  created\_at            TIMESTAMPTZ     NN, DEF now()             
  ---------------------- --------------- ------------------------- -------------------------------------------------------------------------------------------------------

### G2. message\_templates

Reusable message templates for SMS and WhatsApp communications. Templates support placeholders like {{pupil\_name}}, {{outstanding\_amount}}, {{school\_name}}.

  ------------- --------------- --------------------- -------------------------------------------------------------------------------------------------------
  **Column**    **Data Type**   **Constraints**       **Description**
  id            UUID            PK, NN                
  name          VARCHAR(120)    NN                    Template name. E.g. \'Payment Reminder\', \'Balance Overdue\'.
  channel       VARCHAR(20)     NN                    \'sms\', \'whatsapp\', or \'both\'.
  body          TEXT            NN                    Template text with placeholders. E.g. \'Dear {{guardian\_name}}, {{outstanding\_amount}} is due\...\'
  is\_active    BOOLEAN         NN, DEF true          
  created\_by   UUID            FK → users.id, NULL   
  created\_at   TIMESTAMPTZ     NN, DEF now()         
  updated\_at   TIMESTAMPTZ     NN, DEF now()         
  ------------- --------------- --------------------- -------------------------------------------------------------------------------------------------------

### G3. demand\_notes

Records of generated demand note PDF documents. These are formal printed letters requesting payment of outstanding fees.

  ------------------------ --------------- ----------------------------------- ---------------------------------------------------------------------------
  **Column**               **Data Type**   **Constraints**                     **Description**
  id                       UUID            PK, NN                              
  pupil\_id                UUID            FK → pupils.id, NN                  
  pupil\_bill\_id          UUID            FK → pupil\_bills.id, NN            The bill this demand note relates to.
  outstanding\_amount      INTEGER         NN                                  Outstanding amount at the time of generation, in UGX.
  pdf\_path                VARCHAR(500)    NULL                                File path of the generated demand note PDF.
  generated\_by            UUID            FK → users.id, NN                   
  generated\_at            TIMESTAMPTZ     NN, DEF now()                       
  communication\_log\_id   UUID            FK → communication\_logs.id, NULL   Link to the communication log entry created when this note was generated.
  ------------------------ --------------- ----------------------------------- ---------------------------------------------------------------------------

+-----------------------------------------+
| **GROUP H --- SYSTEM**                  |
|                                         |
| system\_settings · scheduled\_job\_logs |
+-----------------------------------------+

### H1. system\_settings

Flexible key-value store for miscellaneous system-wide settings that do not warrant their own table. Used for feature flags, integration configuration references, and UI preferences.

  ------------- --------------- --------------------- -------------------------------------------------------------------------------------------------------
  **Column**    **Data Type**   **Constraints**       **Description**
  id            UUID            PK, NN                
  key           VARCHAR(120)    UQ, NN                Setting key. E.g. \'schoolpay\_sync\_interval\_minutes\', \'sms\_sender\_id\', \'pupil\_id\_prefix\'.
  value         TEXT            NN                    Setting value as string. Application layer casts to correct type.
  description   TEXT            NULL                  Human-readable explanation of what this setting controls.
  updated\_by   UUID            FK → users.id, NULL   
  updated\_at   TIMESTAMPTZ     NN, DEF now()         
  ------------- --------------- --------------------- -------------------------------------------------------------------------------------------------------

### H2. scheduled\_job\_logs

Records execution history of all automated background jobs (SchoolPay sync, overdue instalment flagging, etc.) for monitoring and debugging.

  -------------------- --------------- ----------------- -----------------------------------------------------
  **Column**           **Data Type**   **Constraints**   **Description**
  id                   UUID            PK, NN            
  job\_name            VARCHAR(100)    NN                E.g. \'schoolpay\_sync\', \'overdue\_flag\_check\'.
  started\_at          TIMESTAMPTZ     NN                
  completed\_at        TIMESTAMPTZ     NULL              NULL = still running or failed before completion.
  status               VARCHAR(20)     NN                \'running\', \'success\', \'failed\'.
  records\_processed   INTEGER         NULL              Number of records processed in this run.
  error\_message       TEXT            NULL              Error details if status = \'failed\'.
  created\_at          TIMESTAMPTZ     NN, DEF now()     
  -------------------- --------------- ----------------- -----------------------------------------------------

5. Key Table Relationships
==========================

The following table summarises all primary foreign key relationships, their cardinality, and the referential integrity rule applied at the database level.

  ----------------------------- --------------------------- ----------------- ------------------------------------------------
  **From Table**                **To Table**                **Cardinality**   **ON DELETE Rule**
  users                         roles                       Many → One        RESTRICT (cannot delete a role with users)
  streams                       classes                     Many → One        RESTRICT
  streams                       users (teacher)             Many → One        SET NULL (stream remains if teacher removed)
  pupils                        streams                     Many → One        SET NULL (pupil record kept if stream deleted)
  pupil\_guardians              pupils                      Many → One        CASCADE (delete links if pupil deleted)
  pupil\_guardians              guardians                   Many → One        CASCADE
  pupil\_photos                 pupils                      One → One         CASCADE (delete photo if pupil soft-deleted)
  class\_subject\_assignments   classes                     Many → One        RESTRICT
  class\_subject\_assignments   subjects                    Many → One        RESTRICT
  class\_subject\_assignments   terms                       Many → One        RESTRICT
  subject\_section\_rules       school\_sections            Many → One        RESTRICT
  subject\_section\_rules       subjects                    Many → One        RESTRICT
  grading\_scale\_entries       grading\_scales             Many → One        CASCADE (delete entries with scale)
  division\_boundaries          grading\_scales             Many → One        CASCADE
  fee\_structures               fee\_categories             Many → One        RESTRICT
  fee\_structures               classes                     Many → One        RESTRICT
  fee\_structures               terms                       Many → One        RESTRICT
  pupil\_bursaries              pupils                      Many → One        RESTRICT
  pupil\_bursaries              bursary\_schemes            Many → One        RESTRICT
  pupil\_bills                  pupils                      Many → One        RESTRICT
  pupil\_bills                  terms                       Many → One        RESTRICT
  bill\_line\_items             pupil\_bills                Many → One        CASCADE (delete items with bill)
  payments                      pupil\_bills                Many → One        RESTRICT (cannot delete billed with payments)
  payment\_plans                pupil\_bills                One → One         CASCADE
  payment\_plan\_instalments    payment\_plans              Many → One        CASCADE
  fee\_statements               pupils                      Many → One        RESTRICT
  assessment\_periods           terms                       Many → One        RESTRICT
  assessment\_periods           assessment\_type\_configs   Many → One        RESTRICT
  pupil\_scores                 pupils                      Many → One        RESTRICT
  pupil\_scores                 subjects                    Many → One        RESTRICT
  pupil\_scores                 assessment\_periods         Many → One        RESTRICT
  pupil\_term\_results          pupils                      Many → One        RESTRICT
  pupil\_term\_results          terms                       Many → One        RESTRICT
  report\_cards                 pupils                      Many → One        RESTRICT
  term\_requirements            terms                       Many → One        CASCADE
  communication\_logs           pupils                      Many → One        RESTRICT
  communication\_logs           guardians                   Many → One        SET NULL
  demand\_notes                 pupil\_bills                Many → One        RESTRICT
  ----------------------------- --------------------------- ----------------- ------------------------------------------------

6. Indexing Strategy
====================

Indexes are created on all foreign key columns (automatic in Prisma) and on additional columns that are frequently used in WHERE clauses, JOIN conditions, or ORDER BY expressions.

  --------------------------------------------------------- -----------------------------------------------------------------------------
  **Table & Column(s)**                                     **Reason for Index**
  **pupils (lin)**                                          Frequent search by Learner ID Number during registration and record lookup.
  **pupils (schoolpay\_code)**                              Used on every SchoolPay sync to match incoming payment to a pupil.
  **pupils (pupil\_id\_code)**                              Used in all search bars and API filters.
  **pupils (stream\_id)**                                   Bulk operations per class (billing, score entry, report cards).
  **pupils (is\_active, deleted\_at)**                      All active-pupil queries filter on both these columns.
  **pupil\_bills (pupil\_id, term\_id)**                    Unique constraint already creates this. Used in all fees lookups.
  **pupil\_bills (billing\_status)**                        Defaulters report filters by \'partial\' and \'pending\' status.
  **payments (pupil\_bill\_id)**                            All payment history queries join on this.
  **payments (schoolpay\_transaction\_id)**                 Duplicate detection during SchoolPay sync.
  **pupil\_scores (pupil\_id, assessment\_period\_id)**     Score retrieval for report card generation.
  **pupil\_scores (assessment\_period\_id, subject\_id)**   Class-wide score entry grid loads by period and subject.
  **pupil\_term\_results (pupil\_id, term\_id)**            Report card data retrieval.
  **communication\_logs (pupil\_id, created\_at DESC)**     Interaction history ordered by most recent first.
  **audit\_logs (entity\_type, entity\_id)**                Audit history lookup by record type and ID.
  **audit\_logs (created\_at DESC)**                        System-wide audit log sorted by time.
  **grading\_scales (is\_active)**                          Grading engine always queries the single active scale.
  **sessions (refresh\_token\_hash)**                       Token lookup on every authenticated API request.
  **sessions (user\_id, revoked\_at)**                      Active session check on login and auth middleware.
  --------------------------------------------------------- -----------------------------------------------------------------------------

7. Grading Engine --- Business Logic Reference
==============================================

This section documents the exact sequence of operations performed by the grading engine service when computing a pupil\'s results for a given assessment period. The engine reads all grading rules from the database and applies them in order.

  --------------------------------------- ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  **Step**                                **Logic**
  **1. Load active grading scale**        Query grading\_scales WHERE is\_active = true. Load all entries from grading\_scale\_entries ordered by display\_order.
  **2. Load division boundaries**         Query division\_boundaries for the same active grading scale, ordered by display\_order.
  **3. Load subject rules for section**   Query subject\_section\_rules for the pupil\'s class school\_section\_id. Identify: (a) subjects included in aggregate, (b) subjects that are F9 penalty triggers.
  **4. Load pupil scores**                Query pupil\_scores for this pupil and assessment\_period\_id. Join with class\_subject\_assignments to confirm which subjects are assigned to this class this term.
  **5. Compute grade per subject**        For each score: if score IS NULL → grade\_label = NULL, grade\_points = NULL (missed exam --- handled separately). If score IS NOT NULL → match score range against grading\_scale\_entries to find grade\_label and grade\_points. Store both in pupil\_scores.
  **6. Compute aggregate**                Sum grade\_points for all subjects WHERE include\_in\_aggregate = true in subject\_section\_rules. This gives the raw aggregate. For Lower Primary: compute average\_score = AVG(score) for included subjects instead.
  **7. Determine raw division**           For Upper Primary: match aggregate against division\_boundaries to find raw\_division\_label. For Lower Primary: use same division boundaries applied to average\_score.
  **8. Apply F9 penalty rule**            Check: does any included subject with is\_penalty\_trigger = true have grade\_label = \'F9\'? If YES: find the next division (one step lower/worse) from division\_boundaries. Set final\_division\_label to the demoted division. Set f9\_penalty\_applied = true, record the subject name in f9\_penalty\_subject. If the raw division is already the worst (Ungraded), no further demotion.
  **9. Compute class rank**               For Upper Primary: rank all pupils in the same stream for this period by aggregate\_points ASC (lower = better rank). For Lower Primary: rank by average\_score DESC (higher = better rank). Set class\_rank and total\_pupils\_in\_stream on each pupil\_term\_results row.
  **10. Persist results**                 Write all computed values to pupil\_term\_results. Update grade\_label and grade\_points on each pupil\_scores row. Set computed\_at timestamp.
  --------------------------------------- ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

> **Score Edit After Computation** If a score is edited after the grading engine has run, the engine must be re-triggered for that pupil\'s full period to recompute grades, aggregate, division, F9 penalty, and rankings. Only DOS and System Admin can trigger score edits after locking.

8. Document Approval
====================

This Database Design Document shall be reviewed and approved before database implementation begins. Approval confirms that the schema accurately reflects all functional requirements and business rules agreed upon during the design phase.

  ---------- ------------------------------------ --------------- ----------
  **Name**   **Role**                             **Signature**   **Date**
             **School Representative (Client)**                   
             **Lead Developer**                                   
             **Director of Studies (DOS)**                        
             **System Administrator**                             
  ---------- ------------------------------------ --------------- ----------

**--- End of Document ---**

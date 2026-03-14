**SCHOOL MANAGEMENT SYSTEM**

System Architecture Design Document

Prepared by: Development Team

Client: School Representative

Version: Version 1.1

Date: March 2026

**Document Revision History**

  ---------- ---------- -------------------------- -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  **Ver.**   **Date**   **Author**                 **Summary of Changes**
  1.0        Mar 2026   Dev Team                   Initial architecture design.
  1.1        Mar 2026   Dev Team / Simon Katende   Added: DOS role to RBAC; GradingEngineService, BulkBillingService, FeeStatementService to service layer; photo upload adapter; bursary net-fees recalculation service; configurable grading engine description; updated data flows for grading and bulk billing. Terminology: \'pupil\' throughout.
  ---------- ---------- -------------------------- -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

**1. Introduction**

**1.1 Purpose**

This System Architecture Design Document (SADD) v1.1 defines the technical architecture of the School Management System (SMS). It has been updated to reflect the additional requirements captured in RAD v1.2, including the Director of Studies role, the grading engine, bursary net-fees model, photo upload, bulk billing, and fee statement generation.

**1.2 Document Overview**

  ------------------- --------------------------------------------
  **Attribute**       **Detail**
  **Project**         School Management System (SMS)
  **Document Type**   System Architecture Design Document (SADD)
  **Version**         1.1
  **Based On**        Requirements Analysis Document v1.2
  **Date**            March 2026
  ------------------- --------------------------------------------

**2. Architectural Overview**

**2.1 Architectural Style**

The SMS adopts a layered REST API architecture with a clear separation of concerns across five layers: Presentation (React.js SPA), Application (Node.js/Express REST API), Service & Integration (business logic and external adapters), Grading Engine (dedicated academic computation module), and Data (PostgreSQL via Prisma ORM).

**2.2 System Architecture Diagram**

+-----------------------------------------------------------+
| **PRESENTATION LAYER**                                    |
|                                                           |
| React.js SPA \| Responsive Web Browser (Desktop & Mobile) |
+-----------------------------------------------------------+

  ---------------------------
  ↕ HTTPS / REST API (JSON)
  ---------------------------

+----------------------------------------------------------------------------------+
| **APPLICATION LAYER (Node.js + Express.js)**                                     |
|                                                                                  |
| Auth Middleware (JWT) \| RBAC Middleware \| Input Validation \| REST Controllers |
+----------------------------------------------------------------------------------+

  -----------------
  ↕ Service calls
  -----------------

+-------------------------------------------------------------------------------------------------+
| **SERVICE LAYER**                                                                               |
|                                                                                                 |
| PupilService \| FeesService \| BillingService \| BursaryService \| CommunicationService         |
|                                                                                                 |
| GradingEngineService \| ReportCardService \| FeeStatementService \| AuthService \| AuditService |
+-------------------------------------------------------------------------------------------------+

  -----------------------------------------
  ↕ DB queries / file I/O / external HTTP
  -----------------------------------------

+------------------------------------------------------------------------------------------------------------+
| **INTEGRATION & ADAPTER LAYER**                                                                            |
|                                                                                                            |
| SchoolPayAdapter \| AfricasTalkingAdapter \| PuppeteerPDFAdapter \| PhotoUploadAdapter \| SchedulerAdapter |
+------------------------------------------------------------------------------------------------------------+

  ----------------------------------
  ↕ PostgreSQL driver / filesystem
  ----------------------------------

+--------------------------------------------------+
| **DATA LAYER**                                   |
|                                                  |
| PostgreSQL 15 (Primary Database via Prisma ORM)  |
|                                                  |
| Local Filesystem / Object Storage (Photos, PDFs) |
+--------------------------------------------------+

  ------------------------------
  ↕ HTTP/HTTPS (external APIs)
  ------------------------------

+------------------------------------------------------------------------------------------+
| **EXTERNAL SERVICES**                                                                    |
|                                                                                          |
| SchoolPay REST API \| Africa\'s Talking API (SMS + WhatsApp) \| (Phase 2: Cloud Storage) |
+------------------------------------------------------------------------------------------+

**3. Technology Stack**

  ----------------------------- -------------------------------------------------------------------------------------------
  **Layer / Technology**        **Version & Justification**
  **React.js (Frontend SPA)**   v18+. Component-based, excellent for data-heavy dashboards, responsive by design.
  **Tailwind CSS**              v3+. Utility-first CSS for rapid, consistent, mobile-responsive UI.
  **React Query + Zustand**     Latest. Server-state caching and lightweight global state management.
  **Node.js**                   v20 LTS. Client-specified. Non-blocking I/O, full-stack JavaScript consistency.
  **Express.js**                v4+. Lightweight REST API framework for Node.js.
  **Prisma ORM**                v5+. Type-safe DB access, migration management, excellent PostgreSQL support.
  **PostgreSQL**                v15+. Robust relational DB for structured school data and complex queries.
  **JSON Web Tokens (JWT)**     Latest. Stateless authentication. Access token (15min) + Refresh token (7 days).
  **bcrypt**                    Latest. Industry-standard password hashing.
  **Puppeteer**                 Latest. Headless Chrome PDF generation for report cards, fee statements, demand notes.
  **Multer + Sharp**            Latest. File upload handling and image processing for pupil photos.
  **Africa\'s Talking API**     REST. SMS and WhatsApp messaging. Leading African communications gateway.
  **SchoolPay REST API**        REST. Payment sync via pupil SchoolPay codes.
  **node-cron**                 Latest. Scheduled jobs: SchoolPay sync, overdue flagging, bursary recalculation triggers.
  **express-validator**         Latest. Input validation and sanitisation middleware.
  **Swagger / OpenAPI**         v3. Auto-generated interactive API documentation.
  **dotenv**                    Latest. Secure environment variable management.
  ----------------------------- -------------------------------------------------------------------------------------------

**4. Component Architecture**

**4.1 Backend Service Layer --- Full Module Breakdown**

The service layer contains all business logic. Version 1.1 adds three new services and expands two existing ones.

  ------------------------------------- ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  **Service**                           **Responsibility**
  **PupilService**                      Pupil registration, profile management, family-linking, photo association, stream assignment, and pupil search/filter/export.
  **FeesService**                       Fee structure management, bill generation per pupil, payment recording, SchoolPay sync deduplication, balance calculations, and arrears carry-over.
  **BillingService (NEW)**              Bulk bill generation per class per term. Reads each pupil\'s class, section, and bursary net fees. Auto-computes each pupil\'s bill in a single atomic batch transaction. Provides preview before finalisation.
  **BursaryService (NEW)**              Bursary scheme management, agreed net fees recording at registration, discount recalculation when fee structures change (protecting continuing pupils), and general increment processing (affecting all pupils).
  **FeeStatementService (NEW)**         Generates per-pupil fee statements showing next term\'s bill + outstanding arrears. Invokes PuppeteerPDFAdapter for PDF output. Supports batch generation per class for report envelope insertion.
  **CommunicationService**              Parent follow-up management, SMS/WhatsApp dispatch via Africa\'s Talking, call logging, demand note generation, interaction history, and bulk messaging.
  **GradingEngineService (EXPANDED)**   Executes the full 10-step grading computation: loads active grading scale, computes grade label and points per score, calculates aggregate (Upper) or average (Lower), determines raw division, applies F9 penalty rule if triggered, computes class ranking, and persists results to pupil\_term\_results. Triggered by DOS/Admin after score-entry window closes.
  **ReportCardService**                 Assembles report card data from pupil\_term\_results and pupil\_scores. Applies report\_card\_settings (periods to show, averaging, rank display). Invokes PuppeteerPDFAdapter. Enforces DOS/Admin-only access.
  **AuthService**                       Login, token issuance, refresh, logout, session revocation, and password management.
  **AuditService**                      Writes to the append-only audit\_logs table for all significant actions. Called by every other service on data-modifying operations.
  ------------------------------------- ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

**4.2 Role-Based Access Control (RBAC)**

Every API endpoint is protected by two middleware layers: JWT verification and role permission checking. The table below shows the access scope per role for key feature areas.

  ------------------------------- ----------- ------------------ ---------- ------------ --------------- ------------
  **Feature Area**                **Admin**   **Head Teacher**   **DOS**    **Bursar**   **Teacher**     **Parent**
  **Pupil registration / edit**   **✔**       ✔ (view)           ✔ (view)   **✔**        ✔ (view)        ---
  **Pupil photo upload**          **✔**       ---                **✔**      **✔**        ---             ---
  **Bursary management**          **✔**       ---                ---        **✔**        ---             ---
  **Fee structure / billing**     **✔**       ✔ (view)           ---        **✔**        ---             ---
  **Bulk billing**                **✔**       ---                ---        **✔**        ---             ---
  **Fee statements**              **✔**       ---                ---        **✔**        ---             ---
  **Payment recording**           **✔**       ---                ---        **✔**        ---             ---
  **Parent communication**        **✔**       ---                ---        **✔**        ---             ---
  **Subject assignment**          **✔**       ---                **✔**      ---          ---             ---
  **Score entry (open window)**   **✔**       ---                **✔**      ---          ✔ (own class)   ---
  **Score editing (post-lock)**   **✔**       ---                **✔**      ---          ---             ---
  **Grading engine trigger**      **✔**       ---                **✔**      ---          ---             ---
  **Report card generation**      **✔**       ---                **✔**      ---          ---             ---
  **View all reports**            **✔**       **✔**              **✔**      ✔ (fees)     ✔ (academic)    ---
  **Grading scale config**        **✔**       ---                ---        ---          ---             ---
  **Report card settings**        **✔**       ---                **✔**      ---          ---             ---
  **User management**             **✔**       ---                ---        ---          ---             ---
  ------------------------------- ----------- ------------------ ---------- ------------ --------------- ------------

**5. Key Integration Architecture**

**5.1 SchoolPay Payment Sync**

  ------------------------- ----------------------------------------------------------------------------------
  **Attribute**             **Detail**
  **Adapter**               SchoolPayAdapter (/integrations/schoolpay.js)
  **Sync Method**           Scheduled polling via node-cron (every 30 min during school hours)
  **Duplicate Detection**   Unique schoolpay\_transaction\_id checked before inserting payment
  **Data Flow**             SchoolPay API → SchoolPayAdapter → FeesService → PaymentsRepository → PostgreSQL
  **Config**                SCHOOLPAY\_API\_URL, SCHOOLPAY\_API\_KEY in .env
  ------------------------- ----------------------------------------------------------------------------------

**5.2 Africa\'s Talking --- SMS & WhatsApp**

  ----------------------- ---------------------------------------------------------------------------------------------
  **Attribute**           **Detail**
  **Adapter**             AfricasTalkingAdapter (/integrations/africas-talking.js)
  **Channels**            SMS to call number. WhatsApp to WhatsApp number. Both stored separately on guardian record.
  **Delivery Receipts**   AT webhook → /api/v1/comms/delivery-callback → communication\_logs.delivery\_status update
  **Config**              AT\_API\_KEY, AT\_USERNAME, AT\_SENDER\_ID in .env
  ----------------------- ---------------------------------------------------------------------------------------------

**5.3 PDF Generation --- Puppeteer**

  ------------------- ------------------------------------------------------------------------------------------------------------------------------------------------------------
  **Attribute**       **Detail**
  **Adapter**         PuppeteerPDFAdapter (/integrations/pdf.js)
  **Templates**       reportCard.html, feeStatement.html, demandNote.html --- Handlebars templating
  **Report Card**     Renders school header, pupil photo (img src from file path), subjects table, aggregate/division/rank, comments, grade guide, requirements, next-term dates
  **Fee Statement**   Renders next-term bill breakdown, bursary discount line, arrears, and grand total
  **Output**          PDF buffer → HTTP download response or saved to /storage/pdfs/ with path stored in DB
  ------------------- ------------------------------------------------------------------------------------------------------------------------------------------------------------

**5.4 Photo Upload --- Multer + Sharp**

  ---------------- --------------------------------------------------------------------------------------------
  **Attribute**    **Detail**
  **Adapter**      PhotoUploadAdapter (/integrations/photo.js)
  **Upload**       Multer middleware accepts JPEG/PNG. Max 2MB. Stored in /storage/photos/pupils/
  **Processing**   Sharp resizes to standard passport dimensions (300×400px) and optimises for storage
  **DB Record**    File path stored in pupil\_photos table. Referenced by PDF report card template
  **Fallback**     If no photo: UI renders coloured initials avatar. Report card shows placeholder silhouette
  ---------------- --------------------------------------------------------------------------------------------

**6. Deployment Architecture**

**6.1 Phase 1 --- Local School PC Deployment**

The system runs on a dedicated school PC as a local server. All staff access via LAN browsers. Internet required only for SchoolPay sync and SMS/WhatsApp messaging.

-   Node.js + Express API serving the React SPA as static files

-   PostgreSQL running locally. Daily automated backup to external USB drive via pg\_dump cron job

-   Local filesystem for photos and PDFs (/storage/photos/, /storage/pdfs/)

-   School PC: dedicated machine with UPS, static LAN IP, kept powered on during school hours

**6.2 Phase 2 --- Cloud Deployment (Recommended Future)**

-   DigitalOcean VPS (min 2GB RAM, 2 vCPU). PM2 process manager. Nginx reverse proxy with HTTPS (Let\'s Encrypt).

-   DigitalOcean Managed PostgreSQL. Automatic daily backups, 7-day retention.

-   DigitalOcean Spaces (S3-compatible) for photo and PDF storage. Update PhotoUploadAdapter storage\_provider env var --- no code changes.

-   Public domain (e.g. sms.schoolname.ug). Enables Parent Portal module (Module 5).

**7. Document Approval**

  ---------- --------------------------- --------------- ----------
  **Name**   **Role**                    **Signature**   **Date**
             **School Representative**                   
             **Lead Developer**                          
             **Director of Studies**                     
  ---------- --------------------------- --------------- ----------

**--- End of Document ---**

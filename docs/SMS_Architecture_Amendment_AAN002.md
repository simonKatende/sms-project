**SCHOOL MANAGEMENT SYSTEM**

Architecture Amendment Note AAN-002

Prepared by: Development Team

Client: School Representative

Version: AAN-002

Date: March 2026

**1. Purpose and Scope**

Architecture Amendment Note AAN-002 formally records all additional requirements identified during the Sprint 0-1 review, from 14 document comments by the school representative, 8 current system screenshots, and client clarifications. It supersedes prior documents where conflicts exist. Sprints 0 and 1 are complete; these changes apply from Sprint 2 onwards with one targeted Sprint 1 back-fill.

  ---------------------- ------------------------------------------------------------------------------------------------
  **Attribute**          **Detail**
  **Amendment Ref**      AAN-002
  **Date**               March 2026
  **Sources**            14 comments in RAD v1.2 · 8 current system screenshots · Client clarifications
  **Sprints Affected**   Sprint 2 onwards. Sprint 1 back-fill: guardian/parent model only.
  **Affects**            RAD v1.2 · Architecture v1.1 · DB Design v1.0/1.1 · UI/UX v1.0/1.1 · CLAUDE.md · Session Guide
  ---------------------- ------------------------------------------------------------------------------------------------

**2. Full Change Register**

  ---------------- ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ ----------------------------------
  **Ref**          **Requirement**                                                                                                                                                                                                                                                                                                    **Type / Sprint**
  **AAN-002-01**   House names configurable in system settings. Admin defines names (e.g. Yellow, Red, Blue, Green). Not hardcoded. Appear as dropdown on pupil registration form.                                                                                                                                                    **New · Sprint 2**
  **AAN-002-02**   Parent/guardian model redesigned. Three levels: Mother record, Father record (both optional), and a Contact Person (required) who receives all SMS/calls/demand notes. Contact Person has primary phone + secondary phone + WhatsApp indicator flag on one of the two numbers.                                     **Changed · Sprint 1 back-fill**
  **AAN-002-03**   Class hierarchy redesigned. Three levels: Class Group (Kindergarten, Primary) → Sub Group (PrePrimary, LowerPrimary, UpperPrimary) → Class (Baby, Day Care, Middle, Top, P.1-P.7). All configurable in settings.                                                                                                   **Changed · Sprint 2**
  **AAN-002-04**   Fee grouping: Nursery (PrePrimary) = one rate group, P.1-P.6 = one rate group, P.7 = its own rate group. Tuition fees configured per academic year in system settings by system admin.                                                                                                                             **Changed · Sprint 3**
  **AAN-002-05**   Additional fee particulars (transport, UNEB, admission, books, uniform, art materials) configurable in system settings alongside tuition on the fee structure page.                                                                                                                                                **New · Sprint 3**
  **AAN-002-06**   Invoice workflow: (1) Bursar bills for next term (pupil-wise or class-wise). (2) Bill auto-activates when term is set active. (3) Bursar generates invoices (pupil-wise, class-wise, or family-wise). (4) Export PDF or print.                                                                                     **Changed · Sprint 3**
  **AAN-002-07**   Invoice PDF: A5 size, 2 per A4 page when printed. One copy per pupil. Contains: school header, pupil details, fee line items, bursary discount line, previous balance, total due, SchoolPay code, Mobile Money number for additional fees, fine after due date. No barcode. No bank details. No multiple copies.   **New · Sprint 3**
  **AAN-002-08**   Institution profile in system settings: school logo, name, primary/secondary contacts, email, website, address, motto. Used in all generated report and invoice headers.                                                                                                                                           **New · Sprint 2**
  **AAN-002-09**   Academics guided workflow stepper: 8 sequential steps shown as a visual progress stepper per term. Steps: Setup Subjects, Register Pupils, Assessable Subjects, Assign Teachers, Grades & Comments, Evaluate Sets, Process Reports, Promote.                                                                       **New · Sprint 4**
  **AAN-002-10**   Auto-comments per grade band (D1-F9): admin configures up to 5 subject remark options per grade. First remark auto-selected on report card per subject. Teacher can change via dropdown. If none configured, teacher types freely.                                                                                 **New · Sprint 4**
  **AAN-002-11**   Auto-comments per division (I-IV, U): admin configures up to 5 Class Teacher comment options AND up to 5 Headteacher comment options per division. First matching comment auto-selected. Selectable via dropdown.                                                                                                  **New · Sprint 4**
  **AAN-002-12**   UI design direction: modernise desktop-app feel into clean web-native interface. Keep dense grids, ribbon-style tabs, context toolbars, modals, sidebar. Improve: flat design, visual hierarchy, colour-as-meaning, typography, responsiveness. See Section 4.                                                     **New · All sprints**
  **AAN-002-13**   Priority upgrades: FR-SIM-09, FR-SIM-10, FR-FEE-10, FR-FEE-11, FR-FEE-12, FR-ACA-10 all changed to High priority.                                                                                                                                                                                                  **Changed · All sprints**
  ---------------- ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ ----------------------------------

**3. Detailed Specifications**

**3.1 Parent / Guardian Model Redesign (AAN-002-02)**

The single guardian model is replaced by a three-level family contact structure.

  ------------------------------- -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  **Level**                       **What is stored**
  **Mother (optional)**           Full name, phone, email, address, NIN. One record per pupil. Can be left blank.
  **Father (optional)**           Full name, phone, email, address, NIN. One record per pupil. Can be left blank.
  **Contact Person (required)**   Designated school contact for all communication. Can be mother, father, or third party. Fields: full name, relationship, primary\_phone, secondary\_phone, whatsapp\_indicator (\'primary\'\|\'secondary\'\|\'none\'), email, physical address.
  ------------------------------- -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

> **WhatsApp indicator** The whatsapp\_indicator flag on the contact\_persons table tells the system which of the two phone numbers to use for WhatsApp messages. \'primary\' uses primary\_phone. \'secondary\' uses secondary\_phone. \'none\' means not on WhatsApp. This avoids a separate third phone field and prevents data redundancy.

**3.2 Class Hierarchy (AAN-002-03)**

  ------------------ --------------- -----------------------------
  **Class Group**    **Sub Group**   **Classes**
  **Kindergarten**   PrePrimary      Baby, Day Care, Middle, Top
  **Primary**        LowerPrimary    P.1, P.2, P.3, P.4
  **Primary**        UpperPrimary    P.5, P.6, P.7
  ------------------ --------------- -----------------------------

> **Fee grouping from hierarchy** Nursery (all PrePrimary) = one tuition rate. P.1-P.6 = one tuition rate. P.7 = its own rate. Day and Boarding differ for all three. This grouping is derived from the class hierarchy configuration, not hardcoded.

**3.3 Auto-Comments (AAN-002-10 and AAN-002-11)**

**Grade-Based Subject Remarks**

-   Admin configures up to 5 remark options per grade (D1-F9) on the Grades & Comments screen.

-   On report card generation: first remark for the pupil\'s grade auto-populated per subject.

-   DOS sees a dropdown with all 5 options and can change, or type a custom remark.

-   All 9 grade bands have fully independent remark sets.

**Division-Based Report Comments**

-   Admin configures up to 5 Class Teacher comments AND 5 Headteacher comments per division (I, II, III, IV, U).

-   First matching comment auto-populated per section on report card.

-   DOS/HT selects from dropdown or types custom comment.

-   Applies to overall pupil division result --- not per subject.

**3.4 Fees Invoice (AAN-002-07)**

A5 size. Two invoices per A4 printed page (stacked, separated by a dashed cut line at the midpoint). One copy per pupil.

Invoice content order: (1) School header: crest, name, motto, address, phone. (2) Invoice label banner. (3) Pupil info: ID, name, father name, class, section, invoice date, due date. (4) Fee lines table: each fee category as a row, bursary discount as negative line, previous arrears if any. (5) Fine notice if applicable. (6) Total due --- bold. (7) SchoolPay code box --- prominent. (8) Mobile Money line for additional fees --- configurable in settings.

**3.5 Academics Workflow Stepper (AAN-002-09)**

  -------- ------------------------- --------------------------------------------------------------------------------
  **\#**   **Step**                  **What it covers**
  **1**    **Setup Subjects**        Define all subjects for the term.
  **2**    **Register Pupils**       Assign subjects to classes (entire class or individual).
  **3**    **Assessable Subjects**   Confirm which subjects are assessed and included in reports.
  **4**    **Assign Teachers**       Assign class teachers to streams.
  **5**    **Grades & Comments**     Configure grading scale and auto-comments (grade remarks + division comments).
  **6**    **Evaluate Sets**         Configure assessment types and open score-entry windows.
  **7**    **Process Reports**       Run grading engine, generate and print report cards (DOS/Admin only).
  **8**    **Promote**               End-of-year pupil promotion to next class.
  -------- ------------------------- --------------------------------------------------------------------------------

**4. UI Design Direction (AAN-002-12)**

The MVP prototype built in March 2026 establishes the visual benchmark. The following table summarises the design balance to strike.

  ----------------------- -------------------------------- ---------------------------------------------------------------------------------------------------
  **Design Element**      **Keep**                         **Improve**
  **Top navigation**      Tab/ribbon style per module      Flat horizontal tabs. Icon + label. Active tab has blue bottom border only. No gradients.
  **Data grids**          Dense tables with many columns   Alternating row shading. Sticky headers on scroll. 8px/12px cell padding. 12px minimum font.
  **Toolbars**            Context-sensitive actions        Clean action bar above each table. Clearly labelled buttons. Not Windows ribbon style.
  **Modals**              Focused task dialogs             Centred. Clean heading. Escape to close. Primary action button right-aligned.
  **Sidebar**             Left-side navigation             Dark navy 200px sidebar. Section labels. Active item: left border accent. User info at bottom.
  **Academics stepper**   Sequential workflow              Visual numbered stepper. Done=teal tick, Active=blue fill, Pending=grey outline. Clickable.
  **Colour**              Functional colours               Teal=paid/success. Amber=partial/pending. Red=overdue/error. Blue=primary actions. No decoration.
  **Typography**          Dense text                       12px tables, 13px forms, 18px page titles. Weight 400 and 500 only. Line-height 1.5 minimum.
  ----------------------- -------------------------------- ---------------------------------------------------------------------------------------------------

**5. Document Approval**

  ---------- --------------------------- --------------- ----------
  **Name**   **Role**                    **Signature**   **Date**
             **School Representative**                   
             **Lead Developer**                          
  ---------- --------------------------- --------------- ----------

**--- End of Amendment Note AAN-002 ---**

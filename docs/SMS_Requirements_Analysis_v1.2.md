**SCHOOL MANAGEMENT SYSTEM**

Requirements Analysis Document

Prepared by: Development Team

Client: School Representative

Version: Version 1.2

Date: March 2026

Document Revision History
=========================

  **Ver.**   **Date**   **Author**                 **Summary of Changes**
  ---------- ---------- -------------------------- ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  1.0        Mar 2026   Dev Team                   Initial draft.
  1.1        Mar 2026   Simon Katende / Dev Team   13 amendments across Modules 1, 2, 4, 5. See v1.1 release notes.
  1.2        Mar 2026   Simon Katende / Dev Team   Added: DOS role, pupil photo, guardian WhatsApp field, bursary UGX model with agreed net fees, fee structure adjustment protection, bulk billing, fee statements, configurable grading scale, 9-point grading correction, F9 penalty rule, Lower/Upper Primary section rules, configurable assessment types, report card security (DOS/Admin only generate). Terminology: \'pupil\' replaces \'student\' throughout.

1. Introduction
===============

1.1 Purpose
-----------

This Requirements Analysis Document (RAD) defines the functional and non-functional requirements for the School Management System (SMS). It has been updated to version 1.2 to incorporate additional requirements identified during the UI/UX design phase and report card analysis. It is the formal agreement between the school representative and the development team.

1.2 Project Background
----------------------

The school currently relies on an existing third-party system to manage pupil data and administrative operations. This system poses significant reliability and security risks, and does not meet the school\'s evolving needs. The school requires a purpose-built, in-house web-based School Management System that is secure, reliable, and fully tailored to its operational requirements including the Uganda MoES academic framework.

1.3 Project Scope
-----------------

The SMS covers the following functional domains:

-   Pupil Information Management

-   School Fees Billing, Bursary Management, Payment Tracking, and SchoolPay Integration

-   Parent Communication and Follow-Up Management

-   Academic Performance Management and Report Card Generation

-   Parent Portal (planned for a future release)

1.4 Document Conventions
------------------------

-   High --- Must be implemented in the first release.

-   Medium --- Important but can be implemented in a subsequent iteration.

-   Low --- Desirable feature for future consideration.

> **Terminology** In the Uganda education system, a learner in Pre-Primary or Primary (P.1--P.7) is correctly referred to as a PUPIL, not a student. Student applies to secondary and university level only. This distinction is applied consistently throughout all SMS documents and the system interface.

1.5 Project Overview
--------------------

  **Project Name**                 School Management System (SMS)
  -------------------------------- -------------------------------------------------------------------------------
  **Client**                       School Representative
  **Document Version**             1.2
  **Target Institution**           Nursery / Pre-Primary and Primary School (P.1--P.7)
  **Estimated Pupil Population**   200--500 Pupils
  **Academic Structure**           3 Terms per Academic Year (Uganda Standard Calendar)
  **Grading System**               Uganda MoES 9-Point Grading Scale (D1--F9) with admin-configurable boundaries
  **Date**                         March 2026

2. Stakeholders and User Roles
==============================

2.1 User Roles and Access Levels
--------------------------------

The system supports six distinct user roles. Version 1.2 adds the Director of Studies (DOS) role, which carries critical academic gatekeeping responsibilities.

  **User Role**                   **Access and Capabilities**
  ------------------------------- ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  **System Administrator**        Full system access. Manages users, roles, system settings, academic year and term configuration, class and stream setup, grading scale configuration, and report card settings.
  **Head Teacher / Principal**    Access to all reports (academic and financial). Reviews pupil records and class performance. Adds head teacher remarks on report cards. Cannot modify fee structures, scores, or generate report cards.
  **Director of Studies (DOS)**   Manages all academic operations. Can edit pupil scores after initial entry. Generates and prints report cards and Mid-Term reports. Configures subjects per class, assessment periods, and score-entry locking. Adds promotion notes.
  **Bursar / Accounts Staff**     Manages all fees operations: billing, bursary management, payment recording, instalment plans, bulk billing, fee statements, financial reports, and parent follow-up communication.
  **Class Teacher**               Enters scores for their assigned class during the open score-entry window. Cannot edit scores after submission. Cannot generate or print report cards.
  **Parent / Guardian**           Read-only portal access (future release). Views child\'s fees balance and academic results.

3. Functional Requirements
==========================

3.1 Module 1: Pupil Information Management
------------------------------------------

  **ID**      **Requirement**                                                                                                                                                                                                                                                                                                                                                                                                       **Priority**
  ----------- --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- --------------
  FR-SIM-01   The system shall allow authorised staff to register new pupils, capturing all required personal and enrolment information in a single registration form.                                                                                                                                                                                                                                                              **High**
  FR-SIM-02   Each pupil record shall store: full name, date of birth, gender, NIN (National Identification Number), LIN (Learner Identification Number), system-generated internal Pupil ID, former school, medical conditions/health status, class, stream, section (Day or Boarding), religion, house, co-curricular activities, country, and enrolment date.                                                                    **High**
  FR-SIM-03   Each pupil record shall store guardian information: full name, relationship, primary phone number (for calls), WhatsApp phone number (may differ from call number), email address (optional), and physical address. The system shall support linking pupils who share a guardian (family-linking) to enable consolidated communication and billing.                                                                   **High**
  FR-SIM-04   At the time of registration, the system shall capture the pupil\'s tuition fee arrangement: the applicable fee structure (derived from class and section) and, if the pupil is on a bursary scheme, the bursary type and the agreed net fees amount in Uganda Shillings. This agreed net amount is the fixed amount the pupil pays per term for tuition and is auto-applied to every term\'s bill without re-entry.   **High**
  FR-SIM-05   The system shall allow uploading a passport photo for each pupil at registration or at any subsequent time. If no photo has been uploaded, the system shall display the pupil\'s initials in a colour-coded avatar.                                                                                                                                                                                                   **High**
  FR-SIM-06   The system shall allow authorised staff to view, search, and filter pupil records by name, class, stream, section, house, Pupil ID, LIN, or enrolment status, and to export filtered lists to PDF or Excel.                                                                                                                                                                                                           **High**
  FR-SIM-07   The system shall allow authorised staff to update existing pupil records. All changes are logged to the audit trail with the user and timestamp.                                                                                                                                                                                                                                                                      **High**
  FR-SIM-08   The system shall support soft-deletion (deactivation) of pupil records, preserving all historical academic and financial data.                                                                                                                                                                                                                                                                                        **High**
  FR-SIM-09   Each pupil shall have a SchoolPay code (assigned by the SchoolPay platform) stored in their profile. The system shall also auto-generate a unique internal Pupil ID upon registration.                                                                                                                                                                                                                                **High**
  FR-SIM-10   The system shall support promotion of pupils to the next class at the end of each academic year.                                                                                                                                                                                                                                                                                                                      **Medium**
  FR-SIM-11   The system shall maintain a full audit log of all changes to pupil records.                                                                                                                                                                                                                                                                                                                                           **Medium**

3.2 Module 2: School Fees Billing and Payment Management
--------------------------------------------------------

  **ID**      **Requirement**                                                                                                                                                                                                                                                                                                                                                                       **Priority**
  ----------- ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- --------------
  FR-FEE-01   The system shall allow the Bursar to create and configure fee structures per term, per class, and per section (Day and Boarding). Tuition fees differ by class and section. Additional fee categories (Transport, UNEB, Development, etc.) are admin-defined and can be added at any time.                                                                                            **High**
  FR-FEE-02   The system shall support a bursary scheme model. Bursary schemes are defined by the admin (e.g. \'Staff Bursary\', \'Full Bursary\'). When a pupil is placed on a bursary, the system records the agreed net fees amount in Uganda Shillings --- the fixed amount the pupil will pay per term for tuition. This is set at registration and persists across all terms until updated.   **High**
  FR-FEE-03   When the standard fee structure is updated for a new term or academic year, the system shall automatically recalculate the tuition discount for all continuing bursary pupils so that their agreed net fees remain unchanged. New entrants are not protected and are billed at the new standard rate.                                                                                 **High**
  FR-FEE-04   The system shall provide an option for the administration to apply a general fee increment to all pupils, including those on bursary schemes. In this case, bursary pupils\' net fees increase and discounts are NOT recalculated to absorb the increment. This action is clearly distinguished from a standard fee structure adjustment and requires explicit admin confirmation.    **High**
  FR-FEE-05   The system shall allow the Bursar to generate term bills in bulk per class. Since each pupil\'s class, section, and bursary discount are already known, the system auto-computes each pupil\'s bill without manual per-pupil entry. The Bursar reviews and confirms before bills are finalised.                                                                                       **High**
  FR-FEE-06   The system shall generate a printable fee statement per pupil, showing next term\'s total bill (broken down by category), any outstanding balance carried from the current term, and the grand total due. This statement is designed to be inserted into the pupil\'s report card envelope.                                                                                           **High**
  FR-FEE-07   The system shall support partial (instalment) payments, updating the pupil\'s outstanding balance after each recorded payment.                                                                                                                                                                                                                                                        **High**
  FR-FEE-08   The system shall integrate with the SchoolPay platform using each pupil\'s assigned SchoolPay code to automatically sync payments received via mobile money on a scheduled basis.                                                                                                                                                                                                     **High**
  FR-FEE-09   The Bursar shall also be able to manually record cash, cheque, or bank transfer payments.                                                                                                                                                                                                                                                                                             **High**
  FR-FEE-10   The system shall display a real-time fees dashboard per pupil showing: amount billed, bursary discount applied, amount paid, outstanding balance, and percentage paid. A consolidated view shall also be available per family/guardian group.                                                                                                                                         **High**
  FR-FEE-11   The system shall generate: fees collection summary report, custom fees report filtered by category, outstanding balances/defaulters report (with instalment count, last payment date, % paid), and per-pupil fees statement.                                                                                                                                                          **High**
  FR-FEE-12   The system shall support payment plans with defined instalment due dates and flag overdue instalments automatically.                                                                                                                                                                                                                                                                  **Medium**
  FR-FEE-13   The system shall support carryover of unpaid balances from a previous term as arrears on the new term\'s bill.                                                                                                                                                                                                                                                                        **Medium**

3.3 Module 3: Parent Communication and Follow-Up Management
-----------------------------------------------------------

  **ID**      **Requirement**                                                                                                                                                                                                               **Priority**
  ----------- ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- --------------
  FR-COM-01   The system shall allow authorised staff to initiate follow-up actions against any pupil\'s outstanding fees record.                                                                                                           **High**
  FR-COM-02   The system shall support sending SMS text messages to the guardian\'s registered call phone number or WhatsApp number (whichever is selected), via Africa\'s Talking API.                                                     **High**
  FR-COM-03   The system shall allow staff to generate and print a formal demand note pre-filled with the pupil\'s name, outstanding amount, and term details.                                                                              **High**
  FR-COM-04   The system shall maintain a full communication interaction log per pupil, recording: date, time, channel (call/SMS/WhatsApp/letter), staff member, delivery status, and outcome notes. All staff can view the full history.   **High**
  FR-COM-05   The system shall allow staff to log manual phone call interactions, including call outcome and internal notes.                                                                                                                **High**
  FR-COM-06   The system shall support bulk SMS/WhatsApp reminders to all guardians with outstanding balances above a defined threshold.                                                                                                    **Medium**

3.4 Module 4: Academic Performance Management
---------------------------------------------

This module follows the Uganda MoES academic framework for primary schools, with separate rules for Lower Primary (P.1--P.3) and Upper Primary (P.4--P.7).

  **ID**      **Requirement**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    **Priority**
  ----------- ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ --------------
  FR-ACA-01   The system shall allow administrators and DOS to assign subjects to each class per term. Only assigned subjects appear on the report card. Subjects not assigned to a class do not appear at all --- they are not left blank.                                                                                                                                                                                                                                                                                      **High**
  FR-ACA-02   The system shall define two primary school sections with different academic rules: Upper Primary (P.4--P.7) --- ranked by aggregate points, and Lower Primary (P.1--P.3) --- ranked by average score across core subjects.                                                                                                                                                                                                                                                                                         **High**
  FR-ACA-03   The system shall use a configurable 9-point grading scale. The System Administrator can adjust the score range for any grade band (e.g. change D1 from 90--100 to 85--100). The active grading scale is applied to all score computations at runtime. Default scale: D1(90--100, 1pt), D2(80--89, 2pt), C3(75--79, 3pt), C4(70--74, 4pt), C5(60--69, 5pt), C6(50--59, 6pt), P7(40--49, 7pt), P8(30--39, 8pt), F9(0--29, 9pt).                                                                                      **High**
  FR-ACA-04   For Upper Primary: the aggregate is the sum of grade points for the 4 core subjects (English, Mathematics, Science, Social Studies). Religious Education is excluded. Division boundaries: I(4--12), II(13--23), III(24--29), IV(30--34), U/Ungraded(35--36). Division boundaries are admin-configurable.                                                                                                                                                                                                          **High**
  FR-ACA-05   The system shall enforce the F9 penalty rule: if a pupil scores F9 in English OR Mathematics, their division is automatically demoted by one level, regardless of their aggregate. E.g. Division I becomes Division II. A pupil already at Ungraded cannot be demoted further. This rule applies per assessment period independently.                                                                                                                                                                              **High**
  FR-ACA-06   A missed exam (pupil was absent) is recorded as NULL --- not zero. Zero means the pupil sat and scored zero. Both affect the grade and aggregate. The system shall clearly distinguish these in the score entry interface.                                                                                                                                                                                                                                                                                         **High**
  FR-ACA-07   The system shall allow the DOS to configure which subjects are excluded from the aggregate/average calculation per school section, and which subjects trigger the F9 penalty rule.                                                                                                                                                                                                                                                                                                                                 **High**
  FR-ACA-08   The system shall allow class teachers to record pupil scores for all configured assessment types (BOT, MOT, EOT) during the open score-entry window. Class teachers cannot edit scores after the window is closed.                                                                                                                                                                                                                                                                                                 **High**
  FR-ACA-09   Only the DOS and System Administrator can edit pupil scores after the score-entry window is closed. All such edits are logged to the audit trail with the user, timestamp, old value, and new value.                                                                                                                                                                                                                                                                                                               **High**
  FR-ACA-10   The system shall support admin-configurable additional assessment types beyond BOT/MOT/EOT (e.g. PLE Mock exams, Topical Tests). These are defined by the System Administrator and can be added at any time without code changes.                                                                                                                                                                                                                                                                                  **High**
  FR-ACA-11   The system shall generate both Mid-Term and End-of-Term report cards in PDF format. The DOS and System Administrator are the only roles that can generate and print report cards. The System Administrator configures which assessment periods appear on each report type and whether results are averaged or shown individually.                                                                                                                                                                                  **High**
  FR-ACA-12   Each report card shall display: school header (name, crest, motto, address, phone), pupil name, Reg No, class, SCH PAY NO., term and year, pupil photo, class position, subjects table (BOT/MOT/EOT score and grade per subject, teacher remarks, teacher initials), aggregate, division (Roman numeral), promotion note, class teacher comment + signature, head teacher comment + signature, grade guide, School Requirements for Next Term, and next term start dates (separate for Day and Boarding pupils).   **High**
  FR-ACA-13   The System Administrator shall be able to customise all configurable elements of the report card layout: which sections appear, the grade guide text, school requirements list (per term, per class), next term start dates, stamp notice, and footer motto.                                                                                                                                                                                                                                                       **High**
  FR-ACA-14   The system shall maintain historical academic records across all terms and academic years.                                                                                                                                                                                                                                                                                                                                                                                                                         **Medium**
  FR-ACA-15   Authorised staff shall be able to view a pupil\'s performance trend across multiple terms.                                                                                                                                                                                                                                                                                                                                                                                                                         **Low**

3.5 Module 5: Parent Portal
---------------------------

The parent portal is planned for a future release. All requirements in this module are classified as Low priority.

  **ID**      **Requirement**                                                                          **Priority**
  ----------- ---------------------------------------------------------------------------------------- --------------
  FR-PAR-01   Secure web-based parent portal accessible via desktop and mobile browsers.               **Low**
  FR-PAR-02   Parents authenticate using Pupil ID or SchoolPay code combined with a password or OTP.   **Low**
  FR-PAR-03   A parent with multiple pupils shall access all their children under one login.           **Low**
  FR-PAR-04   Portal displays current fees balance, payment history, and academic results.             **Low**
  FR-PAR-05   Parents can download Mid-Term and End-of-Term report cards as PDF.                       **Low**
  FR-PAR-06   Parent portal is read-only --- no data modification permitted.                           **Low**

3.6 Module 6: System Administration
-----------------------------------

  **ID**      **Requirement**                                                                                                                                                                                                                                  **Priority**
  ----------- ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ --------------
  FR-ADM-01   The system shall allow the System Administrator to create, edit, deactivate, and reset passwords for all user accounts including the DOS role.                                                                                                   **High**
  FR-ADM-02   The system shall enforce role-based access control, with permission-level granularity (e.g. \'scores.edit\', \'report\_cards.generate\', \'fees.bursary.manage\').                                                                               **High**
  FR-ADM-03   The system shall allow the administrator to configure the academic year, terms, and term dates including separate Day and Boarding next-term start dates.                                                                                        **High**
  FR-ADM-04   The system shall allow the administrator to configure the grading scale --- adjusting grade labels, score ranges, and points values for any grade band. Only one scale is active at a time.                                                      **High**
  FR-ADM-05   The system shall allow the administrator to configure division boundaries (aggregate point ranges for Division I--IV and Ungraded).                                                                                                              **High**
  FR-ADM-06   The system shall allow the administrator to configure report card settings: which periods appear, averaging on/off, rank display on/off, ranking format, grade guide text, school requirements per term/class, stamp notice, and footer motto.   **High**
  FR-ADM-07   The system shall allow the administrator to configure which subjects are excluded from aggregate calculations and which subjects trigger the F9 penalty rule, per school section.                                                                **High**
  FR-ADM-08   The system shall maintain a system-wide activity audit log with user, timestamp, action, old value, and new value for all significant events.                                                                                                    **Medium**
  FR-ADM-09   The system shall support periodic data backups configurable by the administrator.                                                                                                                                                                **High**

4. Non-Functional Requirements
==============================

4.1 Security
------------

-   All traffic encrypted via HTTPS/TLS. Passwords stored using bcrypt.

-   Session timeouts enforced. JWT-based stateless authentication.

-   Score editing restricted to DOS and System Admin roles, enforced at both API and database levels.

-   Report card generation restricted to DOS and System Admin roles.

-   All sensitive actions logged to the append-only audit trail.

4.2 Reliability and Data Integrity
----------------------------------

-   Target uptime of 99.5% or above during school operational hours.

-   Automated daily database backups stored securely.

-   All financial transactions and score submissions are atomic --- fully committed or fully rolled back on error.

-   Bursary discount recalculation on fee structure changes is a transactional batch operation --- partial updates are not permitted.

4.3 Performance
---------------

-   Standard page loads and queries complete within 3 seconds under normal conditions.

-   Bulk billing generation for a full class completes within 10 seconds.

-   PDF report card generation (single pupil) completes within 5 seconds. Batch (full class) within 60 seconds.

-   Grading engine computation for a full class completes within 10 seconds.

4.4 Usability
-------------

-   Interface is intuitive for non-technical staff with minimal training.

-   Fully responsive --- consistent experience on desktop, tablet, and mobile browsers.

-   All forms include input validation with clear, user-friendly error messages.

-   Key documents (report cards, fee statements, demand notes) are printable directly from the browser.

5. Glossary
===========

  **Term**              **Definition**
  --------------------- ------------------------------------------------------------------------------------------------------------------------------------------------------------
  **Pupil**             A learner enrolled in Pre-Primary or Primary (P.1--P.7). The correct Ugandan education system term. \'Student\' is not used for this level.
  **DOS**               Director of Studies --- the academic administrator responsible for managing assessments, scores, and report card generation.
  **Agreed Net Fees**   The fixed Uganda Shillings amount a bursary pupil pays per term for tuition, set at registration and protected against standard fee structure adjustments.
  **Bursary Scheme**    A named structured discount arrangement (e.g. \'Staff Bursary\'). The discount is expressed as a fixed UGX amount per pupil, not a percentage.
  **F9 Penalty Rule**   A rule whereby a pupil scoring F9 (0--29%) in English or Mathematics is automatically demoted one division, regardless of their aggregate.
  **Aggregate**         For Upper Primary: the sum of grade points across the 4 core subjects (lower = better). Best possible = 4 (all D1). Worst passing = 34.
  **LIN**               Learner Identification Number --- unique national identifier assigned by Uganda MoES.
  **SchoolPay**         Ugandan payment platform that assigns each pupil a unique payment code. Parents pay via mobile money.
  **BOT / MOT / EOT**   Beginning of Term / Middle of Term / End of Term --- the three standard assessment periods per term.
  **Fee Statement**     A printable document showing next term\'s bill and current outstanding balance, inserted into the report card envelope.
  **Soft Deletion**     Marking a record inactive rather than permanently deleting it, preserving all historical data.

6. Document Approval
====================

This updated Requirements Analysis Document v1.2 requires sign-off before implementation of any changed requirements begins.

  **Name**   **Role**                             **Signature**   **Date**
  ---------- ------------------------------------ --------------- ----------
             **School Representative (Client)**                   
             **Lead Developer**                                   
             **Director of Studies (DOS)**                        
             **System Administrator**                             

**--- End of Document ---**

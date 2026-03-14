**SCHOOL MANAGEMENT SYSTEM**

UI/UX Design Document

Prepared by: Development Team

Client: School Representative

Version: 1.0 (Draft)

Date: March 2026

1. Introduction
===============

1.1 Purpose
-----------

This UI/UX Design Document defines the visual design language, interaction principles, navigation structure, and screen-level wireframe specifications for the School Management System (SMS). It serves as the design blueprint for frontend development and ensures a consistent, accessible, and user-friendly interface across all modules.

1.2 Scope
---------

This document covers the design for the following five priority screens/modules, as agreed with the client:

-   Main Dashboard (overview)

-   Student Registration and Profile

-   Fees Management and Billing

-   Parent Communication and Follow-Up

-   Academic Results and Report Cards

The Login Screen and System Administration screens are also documented as supporting components. The Parent Portal (Module 5) is noted for future design consideration.

1.3 Document Overview
---------------------

  ------------------- --------------------------------------------------------------
  **Attribute**       **Detail**
  **Project**         School Management System (SMS)
  **Document Type**   UI/UX Design Document
  **Version**         1.0 (Draft)
  **Based On**        Requirements Analysis v1.1 & System Architecture Design v1.0
  **Date**            March 2026
  **Author**          Development Team
  ------------------- --------------------------------------------------------------

2. Design Principles
====================

The SMS user interface is designed around five core principles. Every design decision in this document is traceable back to at least one of these principles.

  -------------------------- ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- ---------------------------------
  **\#**                     **Principle**                                                                                                                                                                                                                 **What This Means in Practice**
  **1. Clarity First**       Every screen has one clear primary action. Labels are plain language --- no technical jargon. Icons are always accompanied by text labels.                                                                                    
  **2. Role-Appropriate**    Each user role sees only the navigation and actions relevant to their work. Bursars see fees-heavy layouts; Teachers see academic-heavy layouts. Clutter is eliminated per role.                                              
  **3. Efficiency**          Frequent tasks (recording a payment, entering scores, logging a call) are reachable in two clicks or fewer from the main navigation. Bulk actions are supported wherever practical.                                           
  **4. Trustworthy Data**    Financial and academic figures are always prominently displayed with clear labels and units. Status badges (Paid, Partial, Overdue, Division 1, etc.) use consistent colour coding so staff can interpret data at a glance.   
  **5. Mobile Responsive**   All layouts adapt gracefully to smaller screens. Staff using phones or tablets on the school premises have the same access as those at a desk. Touch targets are a minimum of 44×44px.                                        
  -------------------------- ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- ---------------------------------

3. Design System
================

3.1 Colour Palette
------------------

The recommended colour palette is professional, accessible, and suitable for a school administrative environment. Colours carry semantic meaning and are used consistently across all screens.

  ----------------------- -------------------- ------------------------- -------------------------- ----------------------- ---------------------
  Primary Blue \#2471A3   Dark Blue \#1A3C5E   Teal / Success \#148F77   Amber / Warning \#F39C12   Red / Danger \#C0392B   Background \#F4F6F9
  ----------------------- -------------------- ------------------------- -------------------------- ----------------------- ---------------------

  ------------------------ --------------- -----------------------------------------------------------------------------------
  **Colour Token**         **Hex Value**   **Usage**
  **Primary Blue**         \#2471A3        Primary action buttons, active navigation items, hyperlinks, page headings.
  **Dark Blue**            \#1A3C5E        Sidebar background, top-level headers, document titles.
  **Teal / Success**       \#148F77        Success states, paid status badges, positive indicators, confirm buttons.
  **Amber / Warning**      \#F39C12        Warning states, partial payment badges, overdue flags, caution alerts.
  **Red / Danger**         \#C0392B        Error messages, unpaid/defaulter badges, destructive action buttons, form errors.
  **Page Background**      \#F4F6F9        Overall application background. Light grey-blue for comfortable long-session use.
  **Card Background**      \#FFFFFF        Content cards, modals, form panels, table backgrounds.
  **Text --- Primary**     \#1A1A2E        All body text, table data, form labels.
  **Text --- Secondary**   \#7F8C8D        Subtitles, metadata, placeholder text, breadcrumbs.
  **Border / Divider**     \#D5DBDB        Card borders, table dividers, input field borders.
  ------------------------ --------------- -----------------------------------------------------------------------------------

3.2 Typography
--------------

A single typeface family is used throughout the application for visual consistency. Inter is the recommended primary font --- it is a humanist sans-serif designed specifically for screen readability, available free via Google Fonts.

  ------------------- ------------------------------------- -----------------------------------------------------------------------
  **Style Token**     **Specification**                     **Usage**
  **Page Title**      Inter, Bold, 28px / 2.0 line-height   Main page headings (e.g. \'Student Management\', \'Fees Dashboard\').
  **Section Title**   Inter, SemiBold, 20px / 1.6           Card titles, section headings within a page.
  **Subsection**      Inter, SemiBold, 16px / 1.5           Sub-card headers, table section labels, sidebar group labels.
  **Body Text**       Inter, Regular, 14px / 1.6            All paragraph text, descriptions, form field help text.
  **Data / Labels**   Inter, Medium, 14px / 1.4             Table cell data, form labels, badge text, stat numbers.
  **Large Stat**      Inter, Bold, 32px / 1.2               Dashboard KPI numbers (e.g. total collected, number of students).
  **Small / Meta**    Inter, Regular, 12px / 1.4            Timestamps, record IDs, secondary metadata, tooltips.
  **Code / Mono**     JetBrains Mono, Regular, 13px         Student ID, SchoolPay codes, system-generated reference numbers.
  ------------------- ------------------------------------- -----------------------------------------------------------------------

3.3 Spacing & Layout Grid
-------------------------

-   Base spacing unit: 8px. All margins, paddings, and gaps are multiples of 8px (8, 16, 24, 32, 48, 64).

-   Content area maximum width: 1280px, centred. Below 768px (tablet/mobile), the layout collapses to a single column.

-   Sidebar width (desktop): 240px fixed. On tablet: collapses to an icon-only rail (64px). On mobile: hidden behind a hamburger menu overlay.

-   Page content padding: 32px horizontal, 24px vertical on desktop. 16px on mobile.

-   Card border-radius: 12px. Button border-radius: 8px. Badge border-radius: 20px (pill).

3.4 Component Library
---------------------

The following reusable UI components form the foundation of all screens. Consistent use of these components ensures visual coherence and reduces development time.

  ----------------------- ---------------------------------------------------------------------------------------------------------------------------------- ----------------------------------------------------------------------------
  **Component**           **Variants**                                                                                                                       **Notes**
  **Button**              Primary (filled blue), Secondary (outlined), Danger (red), Ghost (text-only), Icon Button                                          Primary is the main CTA per screen. Only one Primary button per view.
  **Input Field**         Text, Number, Date, Select/Dropdown, Multi-select, Textarea, Search                                                                All fields have label above, helper text and error message below.
  **Data Table**          Standard, Sortable columns, Expandable rows, Paginated                                                                             Fixed header rows on scroll. Row hover highlight. Bulk checkbox selection.
  **Status Badge**        Paid (teal), Partial (amber), Overdue (red), Pending (grey), Active (teal), Inactive (grey), Division 1--4 (blue/teal/amber/red)   Pill-shaped, colour-coded. Used in tables and profiles.
  **Card**                Stat Card (dashboard KPI), Content Card (forms/tables), Summary Card (student/fee overview)                                        White background, subtle box-shadow, 12px border-radius.
  **Modal / Drawer**      Confirmation modal, Form modal, Info drawer (slides in from right)                                                                 Backdrop overlay dims the page. ESC key or Cancel button closes.
  **Alert / Toast**       Success (teal), Warning (amber), Error (red), Info (blue)                                                                          Toasts auto-dismiss after 4s. Inline alerts persist until resolved.
  **Tabs**                Horizontal tab bar for switching between sub-sections of a page                                                                    Active tab highlighted with Primary Blue underline.
  **Breadcrumb**          Home \> Section \> Page                                                                                                            Displayed below the top navbar on all inner pages.
  **Avatar / Initials**   Circular avatar with student/staff initials and colour coding by class                                                             Used in student list rows and profile headers.
  **Progress Bar**        Horizontal bar showing % fees paid                                                                                                 Teal fill (\>75% paid), Amber (25--75%), Red (\<25%).
  **Sidebar Nav**         Collapsible left sidebar with icon + text items, role-filtered                                                                     Active item highlighted. Supports nested sub-items.
  ----------------------- ---------------------------------------------------------------------------------------------------------------------------------- ----------------------------------------------------------------------------

3.5 Status Badge Colour Reference
---------------------------------

  ---------------- ---------------- ---------------- ---------------- ------------ --------------
  **PAID**         **PARTIAL**      **OVERDUE**      **PENDING**      **ACTIVE**   **INACTIVE**
  **DIVISION 1**   **DIVISION 2**   **DIVISION 3**   **DIVISION 4**   **Day**      **Boarding**
  ---------------- ---------------- ---------------- ---------------- ------------ --------------

4. Navigation and Information Architecture
==========================================

4.1 Global Layout Structure
---------------------------

Every authenticated screen (except Login) follows a consistent three-zone layout:

  --------------------------------- -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  **Zone**                          **Description**
  **Sidebar (Left, 240px)**         Fixed vertical navigation with the school system logo/name at the top, followed by role-filtered navigation items. Active item is highlighted in Primary Blue. Bottom of sidebar shows the logged-in user\'s name, role, and a Logout button.
  **Top Bar (Right, full width)**   Horizontal bar at the top of the content area. Shows the current page breadcrumb on the left, and on the right: a search icon, notification bell (future), and the user avatar/name.
  **Content Area (Centre)**         The main working area. Fills all remaining space. Contains the page title, action buttons, and the page\'s primary content (tables, forms, cards). Scrollable independently of the sidebar.
  --------------------------------- -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

4.2 Sidebar Navigation by Role
------------------------------

Navigation items are filtered based on the logged-in user\'s role. The table below shows which navigation items are visible to each role.

  -------------------------------- ----------- ------------------ ------------ -------------- ------------
  **Navigation Item**              **Admin**   **Head Teacher**   **Bursar**   **Teacher**    **Parent**
  **⊞ Dashboard**                  **✔**       **✔**              **✔**        **✔**          **✔**
  **👤 Students**                   **✔**       ✔ (view)           **✔**        ✔ (view)       ---
  **💰 Fees & Billing**             **✔**       ✔ (view)           **✔**        ---            ---
  **📞 Communication**              **✔**       ---                **✔**        ---            ---
  **📊 Academics**                  **✔**       **✔**              ---          **✔**          ---
  **📋 Reports**                    **✔**       **✔**              **✔**        ✔ (academic)   ---
  **⚙ Administration**             **✔**       ---                ---          ---            ---
  **👨‍👩‍👧 My Children (Portal)**   ---         ---                ---          ---            ✔ (future)
  -------------------------------- ----------- ------------------ ------------ -------------- ------------

4.3 Site Map
------------

The hierarchy below defines all pages and sub-pages in the system, organised by module.

  ---------------------------- -------------------------------------------------------------------------------------------------------------------------------
  **Module / Page**            **Sub-Pages**
  **Login**                    --- (single page)
  **Dashboard**                Overview (role-specific cards and stats)
  **Students**                 Student List → Student Profile → Edit Student → Register New Student → Family Group View
  **Fees & Billing**           Fees Overview → Fee Structures → Student Bill → Record Payment → Payment Plans → Payment History → Discounts
  **Communication**            Follow-Up Queue → Student Interaction Log → Send SMS → Send WhatsApp → Print Demand Note → Log Call
  **Academics**                My Classes → Class Score Entry (by assessment type) → Student Academic Profile → Report Card Preview
  **Reports**                  Fees Collection Summary → Custom Fees Report → Defaulters Report → Class Performance → School Performance → Report Card Batch
  **Administration**           User Management → Class & Stream Setup → Academic Year & Terms → System Settings → Audit Log
  **Parent Portal (future)**   Child Dashboard → Fees Statement → Academic Results → Download Report Card
  ---------------------------- -------------------------------------------------------------------------------------------------------------------------------

5. Screen Wireframe Specifications
==================================

This section defines the layout, components, and behaviour of each priority screen. Wireframes are presented as structured layout specifications describing the exact positioning and content of every element on each screen. These specifications are the basis for high-fidelity UI implementation.

> **Design Note** All wireframes assume the standard desktop layout (sidebar + top bar + content area). Responsive adaptations are described per screen where applicable.

5.1 Login Screen
----------------

The Login screen is the entry point for all user roles. It is intentionally minimal --- no sidebar or top bar. It is the only unauthenticated screen in the system.

### Login Screen Layout

+----------------------------------------------------------------------------------------------+
| **LOGIN SCREEN --- Full Viewport (No Sidebar)**                                              |
+----------------------------------------------------------------------------------------------+
| **LEFT PANEL (50% width on desktop, full width on mobile)**                                  |
|                                                                                              |
| *School crest / logo placeholder (centre-aligned)*                                           |
|                                                                                              |
| School Name --- Bold, 28px, Dark Blue                                                        |
|                                                                                              |
| Tagline / motto --- Regular, 14px, Grey                                                      |
+----------------------------------------------------------------------------------------------+
| **RIGHT PANEL (50% width on desktop, full width on mobile) --- White Card, centred**         |
|                                                                                              |
| Welcome Back --- Bold, 24px                                                                  |
|                                                                                              |
| Sign in to continue --- Regular, 14px, Grey                                                  |
|                                                                                              |
| \[ Username / Email --- Text Input Field \]                                                  |
|                                                                                              |
| \[ Password --- Password Input Field (show/hide toggle) \]                                   |
|                                                                                              |
| **\[ SIGN IN --- Primary Blue Full-Width Button \]**                                         |
|                                                                                              |
| Forgot password? --- Ghost text link                                                         |
|                                                                                              |
| *Error state: Red inline alert below password field --- \'Incorrect username or password.\'* |
+----------------------------------------------------------------------------------------------+

  ------------------------- --------------------------------------------------------------------- -----------------------------------------------------------------------------
  **Element**               **Behaviour / State**                                                 **Notes**
  **Username field**        Accepts email or username. Auto-focused on page load.                 No username hint shown on the public login page.
  **Password field**        Masked by default. Eye icon toggles visibility.                       
  **Sign In button**        Disabled until both fields are non-empty. Shows spinner on submit.    
  **Error alert**           Shown inline below the form on failed login. Cleared on next input.   Generic message --- does not reveal whether username or password was wrong.
  **Forgot password**       Links to a Reset Password page (sends email to registered address).   Out of scope for Phase 1 --- admin resets manually.
  **Redirect on success**   Redirected to the Dashboard appropriate for the user\'s role.         
  ------------------------- --------------------------------------------------------------------- -----------------------------------------------------------------------------

5.2 Main Dashboard
------------------

The Dashboard is the first screen users see after login. It is role-aware --- each role sees a different set of KPI cards and quick-action shortcuts. The layout below shows the Bursar/Administrator view, which is the most comprehensive.

### Dashboard --- Top Bar & Sidebar

+----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| **FULL SCREEN LAYOUT --- Sidebar (left) + Content Area (right)**                                                                                                                                               |
+----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| **SIDEBAR (240px, Dark Blue background)**                                                                                                                                                                      |
|                                                                                                                                                                                                                |
| SMS Logo + School Name (top)                                                                                                                                                                                   |
|                                                                                                                                                                                                                |
| Nav items: Dashboard \[ACTIVE\], Students, Fees, Communication, Academics, Reports, Admin                                                                                                                      |
|                                                                                                                                                                                                                |
| Bottom: User avatar + name + role + Logout button                                                                                                                                                              |
+----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| **TOP BAR (full content-area width, white, subtle bottom border)**                                                                                                                                             |
|                                                                                                                                                                                                                |
| Left: Breadcrumb \'Home \> Dashboard\' \| Right: Search icon + Notification bell + User avatar                                                                                                                 |
+----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| **CONTENT AREA --- Row 1: Page Title + Current Term Badge**                                                                                                                                                    |
|                                                                                                                                                                                                                |
| Dashboard --- Bold, 28px \| Badge: \'Term 1, 2026\' (blue pill)                                                                                                                                                |
+----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| **CONTENT AREA --- Row 2: KPI STAT CARDS (4-column grid)**                                                                                                                                                     |
|                                                                                                                                                                                                                |
| \[ Total Students: 342 \] \[ Fees Collected: UGX 48.2M \] \[ Outstanding: UGX 12.7M \] \[ Collection Rate: 79% \]                                                                                              |
|                                                                                                                                                                                                                |
| *Each card: White background, icon top-left, large bold number, label below, trend arrow (↑↓)*                                                                                                                 |
+----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| **CONTENT AREA --- Row 3: TWO-COLUMN SECTION**                                                                                                                                                                 |
|                                                                                                                                                                                                                |
| LEFT (60%): Fees Collection Chart --- horizontal bar chart per class showing % fees collected. Colour-coded: Teal (\>75%), Amber (50--75%), Red (\<50%).                                                       |
|                                                                                                                                                                                                                |
| RIGHT (40%): Recent Payments --- scrollable list of the 10 most recent payment entries. Each row: student name, amount, payment method, time ago.                                                              |
+----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| **CONTENT AREA --- Row 4: TWO-COLUMN SECTION**                                                                                                                                                                 |
|                                                                                                                                                                                                                |
| LEFT (50%): Pending Follow-Ups --- list of students with overdue instalments or no recent contact. Each row: student name, class, outstanding amount, days since last contact. \[ FOLLOW UP \] button per row. |
|                                                                                                                                                                                                                |
| RIGHT (50%): Quick Actions shortcut panel --- 4 buttons: \[ + Register Student \] \[ + Record Payment \] \[ + Log Follow-Up \] \[ + Enter Scores \]                                                            |
+----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+

  -------------------------------- ------------------------------------------------ ------------------------------------------------------
  **Dashboard Element**            **Data Source**                                  **Visible To**
  **Total Students KPI**           COUNT of active students                         All roles
  **Fees Collected KPI**           SUM of payments for current term                 Admin, Head Teacher, Bursar
  **Outstanding KPI**              SUM of unpaid balances for current term          Admin, Head Teacher, Bursar
  **Collection Rate KPI**          Collected / Total Billed × 100                   Admin, Head Teacher, Bursar
  **Fees Collection Chart**        Per-class fees payment aggregation               Admin, Head Teacher, Bursar
  **Recent Payments List**         Latest 10 payment records                        Admin, Bursar
  **Pending Follow-Ups List**      Students with overdue plans or no contact \>7d   Admin, Bursar
  **Quick Actions Panel**          Shortcut buttons to key flows                    Role-filtered (each user sees only relevant actions)
  **My Classes (Teacher view)**    Classes assigned to the logged-in teacher        Class Teacher only
  **Academic Summary (HT view)**   Average division per class this term             Head Teacher, Admin
  -------------------------------- ------------------------------------------------ ------------------------------------------------------

5.3 Student Registration and Profile
------------------------------------

### 5.3.1 Student List Page

The Student List is the primary landing page for the Students module. It presents all enrolled students in a searchable, filterable, and exportable data table.

### Student List Page Layout

+----------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| **STUDENTS MODULE --- Student List**                                                                                                                                 |
+----------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| **TOP ROW: Page Title + Actions**                                                                                                                                    |
|                                                                                                                                                                      |
| Left: \'Student Management\' (Page Title) \| Right: \[ + Register New Student \] (Primary Button) \[ ⬇ Export \] (Secondary Button)                                  |
+----------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| **FILTER BAR (horizontal, below title)**                                                                                                                             |
|                                                                                                                                                                      |
| \[ 🔍 Search by name, LIN, Student ID \] \| \[ Class: All ▼ \] \[ Stream: All ▼ \] \[ Section: All ▼ \] \[ Status: Active ▼ \] \[ Clear Filters \]                    |
+----------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| **DATA TABLE**                                                                                                                                                       |
|                                                                                                                                                                      |
| Columns: Avatar+Name \| Student ID \| Class & Stream \| Section \| Guardian Name \| Guardian Phone \| SchoolPay Code \| Fees Status (Badge) \| Actions               |
|                                                                                                                                                                      |
| Row example: \[MK\] Mukasa Kevin \| SMS-2024-001 \| P.5 Crane \| Day \| Mukasa John \| +256 77x xxx xxx \| SPY-XXXXX \| \[PARTIAL ▓▓░\] \| \[ 👁 View \] \[ ✏ Edit \] |
|                                                                                                                                                                      |
| *Fees Status column: Progress bar pill showing % paid. Colour: Teal \>75%, Amber 25--75%, Red \<25%.*                                                                |
+----------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| **PAGINATION (bottom of table)**                                                                                                                                     |
|                                                                                                                                                                      |
| Showing 1--20 of 342 students \| \[ \< Prev \] \[ 1 \] \[ 2 \] \[ 3 \] \... \[ Next \> \] \| Rows per page: \[ 20 ▼ \]                                               |
+----------------------------------------------------------------------------------------------------------------------------------------------------------------------+

### 5.3.2 Student Registration Form

The registration form is a multi-section, single-page form accessed by clicking \'+ Register New Student\'. It is divided into clear labelled sections using card containers.

### Student Registration Form Layout

+------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| **REGISTER NEW STUDENT --- Multi-Section Form**                                                                                                                                                                                                            |
+------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| **SECTION 1: Personal Information (Card)**                                                                                                                                                                                                                 |
|                                                                                                                                                                                                                                                            |
| Full Name\* \| Date of Birth\* \| Gender\* (Radio: Male / Female) \| Learner ID (LIN) \| Class\* (Dropdown) \| Stream\* (Dropdown, filtered by class) \| Section\* (Day / Boarding) \| Religion \| House \| Former School \| Medical Conditions (Textarea) |
+------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| **SECTION 2: Parent / Guardian Information (Card)**                                                                                                                                                                                                        |
|                                                                                                                                                                                                                                                            |
| Guardian Full Name\* \| Relationship\* \| Primary Phone\* \| Secondary Phone \| Email \| Physical Address                                                                                                                                                  |
|                                                                                                                                                                                                                                                            |
| *Family Linking: \[ 🔍 Search existing guardian by phone \] --- if match found: \'Guardian already registered. Link this student to existing guardian record?\' \[YES --- Link\] \[NO --- Create New\]*                                                     |
+------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| **SECTION 3: Enrolment & Payment Details (Card)**                                                                                                                                                                                                          |
|                                                                                                                                                                                                                                                            |
| Enrolment Date\* (Date picker) \| SchoolPay Code\* (Text input with tooltip: \'Assigned by SchoolPay platform\') \| Internal Student ID: \[ AUTO-GENERATED --- displayed as read-only after save \]                                                        |
+------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| **FORM ACTIONS (bottom, sticky on scroll)**                                                                                                                                                                                                                |
|                                                                                                                                                                                                                                                            |
| \[ Cancel --- Ghost Button \] \[ Save Student --- Primary Blue Button \]                                                                                                                                                                                   |
+------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+

### 5.3.3 Student Profile Page

The Student Profile is a read-only view of a single student\'s full record, organised into tabs for easy navigation between information categories.

### Student Profile Page Layout

+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| **STUDENT PROFILE**                                                                                                                                                                                             |
+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| **PROFILE HEADER CARD**                                                                                                                                                                                         |
|                                                                                                                                                                                                                 |
| Left: Large avatar circle (student initials, colour by class) + Full Name (Bold 28px) + Student ID (mono, grey) + \[ ACTIVE badge \]                                                                            |
|                                                                                                                                                                                                                 |
| Right: Class + Stream \| Section badge \| \[ ✏ Edit Student \] button \| \[ Deactivate \] danger button                                                                                                         |
+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| **TAB BAR (below header)**                                                                                                                                                                                      |
|                                                                                                                                                                                                                 |
| \[ Personal Info \] \[ Guardian & Family \] \[ Fees History \] \[ Academic History \] \[ Communication Log \]                                                                                                   |
+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| **TAB: Personal Info**                                                                                                                                                                                          |
|                                                                                                                                                                                                                 |
| Two-column key-value grid: LIN \| DOB \| Gender \| Religion \| House \| Section \| Former School \| Medical Conditions \| Enrolment Date \| SchoolPay Code                                                      |
+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| **TAB: Guardian & Family**                                                                                                                                                                                      |
|                                                                                                                                                                                                                 |
| Guardian card: Name \| Relationship \| Phone (click-to-call link on mobile) \| Email \| Physical Address                                                                                                        |
|                                                                                                                                                                                                                 |
| Family Group: \'Siblings enrolled at this school\' --- list of sibling names, classes, and their fees status badges.                                                                                            |
+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| **TAB: Fees History**                                                                                                                                                                                           |
|                                                                                                                                                                                                                 |
| Current term summary bar (billed / paid / outstanding / % bar). Below: table of all payment records (date, amount, method, reference, recorded by).                                                             |
+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| **TAB: Academic History**                                                                                                                                                                                       |
|                                                                                                                                                                                                                 |
| Term selector dropdown. Per-term: subject scores table (BOT \| MOT \| EOT \| Total \| Grade). Aggregate, Division badge, Class Rank. \[ Download Report Card \] button.                                         |
+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| **TAB: Communication Log**                                                                                                                                                                                      |
|                                                                                                                                                                                                                 |
| Chronological timeline of all interactions. Each entry: date/time \| channel icon (📱 SMS / 💬 WhatsApp / 📞 Call / 📄 Letter) \| staff member \| status badge \| notes. \[ + New Follow-Up \] button at top right. |
+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+

5.4 Fees Management and Billing
-------------------------------

### 5.4.1 Fees Dashboard Page

The Fees Dashboard gives the Bursar an at-a-glance view of the school\'s financial position for the current term, with quick access to all fees-related actions.

### Fees Dashboard Layout

+------------------------------------------------------------------------------------------------------------------------------------------------+
| **FEES & BILLING MODULE --- Dashboard**                                                                                                        |
+------------------------------------------------------------------------------------------------------------------------------------------------+
| **ROW 1: KPI STAT CARDS (4-column grid)**                                                                                                      |
|                                                                                                                                                |
| \[ Total Billed: UGX 61.0M \] \[ Total Collected: UGX 48.2M \] \[ Outstanding: UGX 12.7M \] \[ Collection Rate: 79% + progress ring \]         |
+------------------------------------------------------------------------------------------------------------------------------------------------+
| **ROW 2: FEES BREAKDOWN BY CATEGORY (Card)**                                                                                                   |
|                                                                                                                                                |
| Horizontal bar chart: Tuition \| Transport \| UNEB \| Other --- each showing amount billed vs. collected. Teal = collected, Red = outstanding. |
+------------------------------------------------------------------------------------------------------------------------------------------------+
| **ROW 3: LEFT --- Outstanding By Class \| RIGHT --- Quick Actions**                                                                            |
|                                                                                                                                                |
| LEFT (60%): Table --- Class \| Students Billed \| Fully Paid \| Partial \| Outstanding Amount \| Collection %. Sortable.                       |
|                                                                                                                                                |
| RIGHT (40%): \[ + Record Payment \] \[ 📋 View Defaulters \] \[ 📤 Send Bulk Reminder \] \[ ⚙ Manage Fee Structures \]                           |
+------------------------------------------------------------------------------------------------------------------------------------------------+
| **ROW 4: DEFAULTERS ALERT PANEL**                                                                                                              |
|                                                                                                                                                |
| Red-tinted alert card: \'X students have not made any payment this term.\' with \[ View Defaulters Report \] button.                           |
+------------------------------------------------------------------------------------------------------------------------------------------------+

### 5.4.2 Record Payment / Student Bill Page

### Student Bill & Payment Recording Layout

+----------------------------------------------------------------------------------------------------------------------------------------------------+
| **STUDENT BILL --- \[Student Name\] --- Term 1, 2026**                                                                                             |
+----------------------------------------------------------------------------------------------------------------------------------------------------+
| **BILL SUMMARY CARD (top)**                                                                                                                        |
|                                                                                                                                                    |
| Student: \[Name\] \| Class \| SchoolPay Code \| Section                                                                                            |
|                                                                                                                                                    |
| **Bill Total: UGX 1,250,000 \| Paid: UGX 800,000 \| Balance: UGX 450,000 \| \[PARTIAL ▓▓▓░░\] 64%**                                                |
|                                                                                                                                                    |
| *Discount Applied: UGX 50,000 (Sibling discount) --- shown in amber if applicable*                                                                 |
+----------------------------------------------------------------------------------------------------------------------------------------------------+
| **BILL LINE ITEMS TABLE**                                                                                                                          |
|                                                                                                                                                    |
| Columns: Fee Category \| Standard Amount \| Discount \| Net Amount \| Status (Badge). Rows: Tuition \| Transport \| UNEB \| Other                  |
+----------------------------------------------------------------------------------------------------------------------------------------------------+
| **PAYMENT HISTORY TABLE**                                                                                                                          |
|                                                                                                                                                    |
| Columns: Date \| Amount \| Method (SchoolPay / Cash / Cheque) \| Reference \| Recorded By. Latest payments at top.                                 |
+----------------------------------------------------------------------------------------------------------------------------------------------------+
| **RECORD PAYMENT PANEL (Card, right side or drawer)**                                                                                              |
|                                                                                                                                                    |
| Amount Paid\* (Number input) \| Payment Date\* (Date picker, defaults to today)                                                                    |
|                                                                                                                                                    |
| Payment Method\* (Radio: SchoolPay / Cash / Cheque) \| Reference / Receipt No. (Text) \| Notes (Textarea, optional)                                |
|                                                                                                                                                    |
| **\[ RECORD PAYMENT --- Teal Primary Button \] \| \[ Print Receipt --- Secondary \]**                                                              |
+----------------------------------------------------------------------------------------------------------------------------------------------------+
| **PAYMENT PLAN SECTION (collapsible)**                                                                                                             |
|                                                                                                                                                    |
| Active plan: shows each instalment (due date \| amount \| status badge: Paid / Overdue / Upcoming). \[ + Create Plan \] or \[ Edit Plan \] button. |
+----------------------------------------------------------------------------------------------------------------------------------------------------+

5.5 Parent Communication and Follow-Up
--------------------------------------

### 5.5.1 Follow-Up Queue Page

The Follow-Up Queue is the Bursar\'s primary working tool for managing outstanding fees communications. It lists all students requiring attention, ordered by urgency.

### Follow-Up Queue Layout

+-------------------------------------------------------------------------------------------------------------------------------------------------+
| **COMMUNICATION MODULE --- Follow-Up Queue**                                                                                                    |
+-------------------------------------------------------------------------------------------------------------------------------------------------+
| **TOP ROW: Title + Actions**                                                                                                                    |
|                                                                                                                                                 |
| Left: \'Follow-Up Queue\' \| Right: \[ 📤 Send Bulk SMS Reminder \] (Secondary) \[ 📤 Send Bulk WhatsApp \] (Secondary) \[ ⬇ Export List \]       |
+-------------------------------------------------------------------------------------------------------------------------------------------------+
| **FILTER BAR**                                                                                                                                  |
|                                                                                                                                                 |
| \[ Class ▼ \] \[ Outstanding \> UGX: \_\_\_\_\_ \] \[ Last Contact: Never / \>7 days / \>14 days ▼ \] \[ Has Payment Plan: All ▼ \] \[ Clear \] |
+-------------------------------------------------------------------------------------------------------------------------------------------------+
| **DEFAULTERS TABLE**                                                                                                                            |
|                                                                                                                                                 |
| Columns: Student Name \| Class \| Outstanding Balance \| Instalments Made \| Last Payment Date \| % Paid (bar) \| Last Contact \| Actions       |
|                                                                                                                                                 |
| *Actions column: \[ 📱 SMS \] \[ 💬 WhatsApp \] \[ 📄 Demand Note \] \[ 📞 Log Call \] --- icon buttons with tooltips*                              |
|                                                                                                                                                 |
| *Row urgency colouring: Red left-border = no payment ever \| Amber = last payment \>14 days ago \| Normal = recent activity*                    |
+-------------------------------------------------------------------------------------------------------------------------------------------------+

### 5.5.2 Send Message / Log Call Modal

When a Bursar clicks any communication action (SMS, WhatsApp, Demand Note, Log Call), a modal dialog slides in with the relevant form.

### Communication Action Modal

+-----------------------------------------------------------------------------------------------------------------------------+
| **MODAL: Send SMS to Parent (slides over the current page)**                                                                |
+-----------------------------------------------------------------------------------------------------------------------------+
| **MODAL HEADER**                                                                                                            |
|                                                                                                                             |
| Send SMS --- \[Student Name\] --- \[Guardian Name\] \| \[ × Close \]                                                        |
+-----------------------------------------------------------------------------------------------------------------------------+
| **MODAL BODY**                                                                                                              |
|                                                                                                                             |
| To: +256 77x xxx xxx (Guardian phone --- read-only)                                                                         |
|                                                                                                                             |
| Template: \[ Select template ▼ \] --- e.g. \'Payment Reminder\', \'Balance Overdue\', \'Custom\'                            |
|                                                                                                                             |
| Message: \[ Textarea --- auto-populated from template, editable. Character count: 0/160 \]                                  |
|                                                                                                                             |
| Notes / Outcome: \[ Textarea --- internal note saved to interaction log \]                                                  |
+-----------------------------------------------------------------------------------------------------------------------------+
| **MODAL FOOTER**                                                                                                            |
|                                                                                                                             |
| \[ Cancel --- Ghost \] \[ SEND MESSAGE --- Primary Blue Button \]                                                           |
+-----------------------------------------------------------------------------------------------------------------------------+
| **MODAL: Log Phone Call (same pattern --- no message field, only outcome notes)**                                           |
+-----------------------------------------------------------------------------------------------------------------------------+
| **CALL LOG MODAL BODY**                                                                                                     |
|                                                                                                                             |
| Called: +256 77x xxx xxx (read-only) \| Date & Time: \[auto-filled, editable\] \| Duration: \[optional text\]               |
|                                                                                                                             |
| Call Outcome: \[ Connected --- payment promised / Connected --- no commitment / No answer / Wrong number \] (Radio buttons) |
|                                                                                                                             |
| Notes: \[ Textarea \] --- detail of what was discussed                                                                      |
|                                                                                                                             |
| Next Follow-Up Date: \[ Date picker, optional \]                                                                            |
|                                                                                                                             |
| \[ Cancel \] \[ SAVE LOG --- Teal Button \]                                                                                 |
+-----------------------------------------------------------------------------------------------------------------------------+

5.6 Academic Results and Report Cards
-------------------------------------

### 5.6.1 Score Entry Page

The Score Entry page allows a Class Teacher to enter student scores for a selected subject and assessment type in a fast, spreadsheet-style data entry grid.

### Score Entry Page Layout

+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| **ACADEMICS MODULE --- Score Entry**                                                                                                                                  |
+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| **SELECTION BAR (top --- Card)**                                                                                                                                      |
|                                                                                                                                                                       |
| Class: \[ P.5 Crane ▼ \] \| Term: \[ Term 1, 2026 ▼ \] \| Assessment Type: \[ End of Term ▼ \] \| Subject: \[ Mathematics ▼ \] \| \[ LOAD STUDENTS --- Blue Button \] |
+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| **SCORE ENTRY GRID (spreadsheet-style)**                                                                                                                              |
|                                                                                                                                                                       |
| Columns: \# \| Student Name \| Student ID \| Score (input field, max 100) \| Grade (auto-computed, read-only)                                                         |
|                                                                                                                                                                       |
| *Tab key moves to next score input. Enter key saves and moves down. Scores outside 0--100 shown with red border.*                                                     |
|                                                                                                                                                                       |
| *P7 note: if P7 class selected, an additional section \'PLE Mock Exams\' appears below the standard assessment grid.*                                                 |
+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| **AGGREGATE SUMMARY ROW (pinned at bottom of table)**                                                                                                                 |
|                                                                                                                                                                       |
| Class Average: 68.4 \| Highest: 97 (Namazzi A.) \| Lowest: 32 (Okot B.) \| Not Yet Entered: 3 students                                                                |
+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| **FORM ACTIONS**                                                                                                                                                      |
|                                                                                                                                                                       |
| \[ Cancel \] \[ SAVE SCORES --- Primary Blue Button \] --- shows confirmation toast on success                                                                        |
+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------+

### 5.6.2 Report Card Preview and Generation Page

This page allows a teacher to preview individual report cards before generating the final PDF batch for the entire class.

### Report Card Generation Page Layout

+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| **REPORT CARDS --- P.5 Crane \| Term 1, 2026 --- End of Term**                                                                                                                                                                                                                                              |
+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| **REPORT SETTINGS CARD (top)**                                                                                                                                                                                                                                                                              |
|                                                                                                                                                                                                                                                                                                             |
| Report Type: End of Term \| Periods shown: BOT + MOT + EOT \| Averaging: OFF \| Rank on card: ON --- (Set by Admin --- read-only here)                                                                                                                                                                      |
+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| **CLASS STATUS TABLE**                                                                                                                                                                                                                                                                                      |
|                                                                                                                                                                                                                                                                                                             |
| Columns: Student Name \| Aggregate \| Division \| Rank \| Remarks Status (Teacher) \| Remarks Status (HT) \| Preview                                                                                                                                                                                        |
|                                                                                                                                                                                                                                                                                                             |
| *Rows coloured by division: Teal (Div 1), Blue (Div 2), Amber (Div 3), Red (Div 4).*                                                                                                                                                                                                                        |
|                                                                                                                                                                                                                                                                                                             |
| *Warning badge next to any student with incomplete scores. \[ 👁 Preview \] button opens individual report card preview.*                                                                                                                                                                                    |
+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| **REPORT CARD PREVIEW (right-side drawer --- opens on \[ 👁 Preview \] click)**                                                                                                                                                                                                                              |
|                                                                                                                                                                                                                                                                                                             |
| Rendered HTML preview of the report card showing: School header/logo \| Student name & class \| Term \| Subject score table (BOT \| MOT \| EOT \| Grade per subject) \| Aggregate \| Division badge \| Class Rank \| Teacher Remarks (editable inline) \| Head Teacher Remarks (editable inline if HT role) |
+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| **GENERATION ACTIONS (sticky bottom bar)**                                                                                                                                                                                                                                                                  |
|                                                                                                                                                                                                                                                                                                             |
| \[ Generate Report Cards for Entire Class --- Teal Primary Button \] \[ Download Individual PDF --- Secondary \] \[ Print Preview --- Secondary \]                                                                                                                                                          |
+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+

6. Key User Flows
=================

The following user flow diagrams trace the step-by-step journey of a user completing a key task, including decision points and error paths.

6.1 Flow: Record a School Fees Payment
--------------------------------------

  ---------- ---------------------------------------------------------------------------- -------------------------------------------------------------------
  **Step**   **Action / Decision**                                                        **Next Step**
  **1**      Bursar navigates to Fees & Billing → clicks \[ + Record Payment \]           → 2
  **2**      Search for student by name, LIN, or Student ID                               → 3 (found) or Error: \'No student found\' → retry
  **3**      System displays student\'s current bill: billed / paid / outstanding         → 4
  **4**      Bursar enters: amount, date, method (SchoolPay / Cash / Cheque), reference   → 5
  **5**      Decision: Does amount exceed outstanding balance?                            YES → Warning modal \'Overpayment --- confirm?\' → 6 \| NO → 6
  **6**      Bursar clicks \[ RECORD PAYMENT \]                                           → 7
  **7**      System saves payment, updates balance, logs to audit trail                   → 8
  **8**      Success toast: \'Payment of UGX X recorded for \[Student Name\]\'            → 9
  **9**      Decision: Print receipt?                                                     YES → PDF receipt opens in new tab \| NO → Return to student bill
  ---------- ---------------------------------------------------------------------------- -------------------------------------------------------------------

6.2 Flow: Generate End-of-Term Report Cards
-------------------------------------------

  ---------- ----------------------------------------------------------------------------------- --------------------------------------------------------------------------------------
  **Step**   **Action / Decision**                                                               **Next Step**
  **1**      Teacher navigates to Academics → Report Cards                                       → 2
  **2**      Selects Class, Term, Report Type (End of Term) → \[ Load \]                         → 3
  **3**      System checks completeness: are all EOT scores entered?                             Incomplete → Warning: \'X students have missing scores\' (with list) \| Complete → 4
  **4**      Teacher reviews class table: aggregates, divisions, ranks                           → 5
  **5**      Teacher adds remarks for students that need them (inline editable)                  → 6
  **6**      Head Teacher logs in, reviews and adds HT remarks                                   → 7 (or Teacher proceeds if HT has already done so)
  **7**      Teacher clicks \[ Generate Report Cards for Entire Class \]                         → 8
  **8**      System generates PDF batch (Puppeteer) --- progress indicator shown                 → 9
  **9**      Success: \'Report cards ready\' --- \[ Download ZIP \] or \[ Print All \] buttons   → Done
  ---------- ----------------------------------------------------------------------------------- --------------------------------------------------------------------------------------

6.3 Flow: Parent Follow-Up via SMS
----------------------------------

  ---------- ------------------------------------------------------------------------------- ---------------
  **Step**   **Action / Decision**                                                           **Next Step**
  **1**      Bursar opens Communication → Follow-Up Queue                                    → 2
  **2**      Reviews queue --- identifies high-priority student (red row: no payment ever)   → 3
  **3**      Clicks \[ 📱 SMS \] action for the student                                       → 4
  **4**      SMS modal opens --- Bursar selects \'Payment Reminder\' template                → 5
  **5**      Message auto-populated --- Bursar reviews and edits if needed                   → 6
  **6**      Bursar adds internal note: \'First reminder sent\'                              → 7
  **7**      Clicks \[ SEND MESSAGE \]                                                       → 8
  **8**      System sends via Africa\'s Talking API --- log entry created (status: SENT)     → 9
  **9**      AT delivery report received → log updated to DELIVERED                          → 10
  **10**     Student row in queue updated: \'Last Contact: Today\'                           → Done
  ---------- ------------------------------------------------------------------------------- ---------------

7. Responsive Design Guidelines
===============================

The SMS must work on desktop computers (primary use), tablets, and mobile phones (secondary use, especially for the follow-up queue and checking student information on the go).

  ----------------------- ------------------ ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  **Breakpoint**          **Screen Width**   **Layout Adaptations**
  **Desktop (default)**   \>= 1024px         Full sidebar (240px) + top bar + content area. All tables show all columns. Multi-column card grids (2--4 columns).
  **Tablet**              768px -- 1023px    Sidebar collapses to icon-only rail (64px). Content area expands. Tables: secondary columns hidden (toggle to show). Card grids: max 2 columns.
  **Mobile**              \< 768px           Sidebar hidden, revealed by hamburger icon as full-width overlay. Content is single-column. Tables show only primary columns (name, status, balance). Touch-optimised buttons (min 44×44px). Score entry grid scrollable horizontally.
  ----------------------- ------------------ ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

> **Mobile Priority Screens** The Follow-Up Queue and Student Bill pages are the most frequently accessed on mobile. These screens receive extra attention to ensure all critical actions (Send SMS, Record Payment, View Balance) are reachable without horizontal scrolling on a phone screen.

8. Accessibility Guidelines
===========================

The SMS will be used daily by school staff who may have varying levels of digital literacy and may access the system on older hardware or slower connections. The following accessibility requirements are non-negotiable:

  ---------------------------- -----------------------------------------------------------------------------------------------------------------------------------------------------------------------
  **Requirement**              **Implementation Guidance**
  **Colour contrast**          All text and interactive elements must meet WCAG AA contrast ratio (minimum 4.5:1 for body text, 3:1 for large text). The recommended palette meets this standard.
  **Keyboard navigation**      All interactive elements (buttons, inputs, dropdowns, table rows) must be navigable and activatable via keyboard (Tab, Enter, Space, Arrow keys).
  **Focus indicators**         A visible focus ring must appear on all focused elements. Custom focus ring: 2px solid Primary Blue (\#2471A3) with 2px offset.
  **Form labels**              Every input field must have an associated \<label\> element. Required fields marked with a red asterisk (\*) and \'required\' in the ARIA label.
  **Error messaging**          Error messages must be clear, specific, and positioned adjacent to the field that caused the error. Not only colour-coded --- also include an icon and text.
  **Status badges**            Status badges use both colour AND text --- never colour alone --- to convey meaning (e.g. green \'PAID\' badge always shows the word \'PAID\', not just a green dot).
  **Loading states**           All async operations (data loads, form submits, PDF generation) show a visible loading indicator to prevent users from double-clicking.
  **Session timeout notice**   Users receive a visible warning 2 minutes before their session expires, with the option to extend it without losing in-progress form data.
  ---------------------------- -----------------------------------------------------------------------------------------------------------------------------------------------------------------------

9. Document Approval
====================

This UI/UX Design Document shall be reviewed and approved by the client before frontend development begins. Approval confirms that the proposed design language, navigation structure, and screen layouts meet the school\'s expectations and operational requirements.

  ---------- ------------------------------------ --------------- ----------
  **Name**   **Role**                             **Signature**   **Date**
             **School Representative (Client)**                   
             **Lead Developer / UI Designer**                     
             **Head Teacher / Principal**                         
  ---------- ------------------------------------ --------------- ----------

**--- End of Document ---**

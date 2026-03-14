**SCHOOL MANAGEMENT SYSTEM**

Architecture Amendment Note AAN-001

Prepared by: Development Team

Client: School Representative

Version: AAN-001

Date: March 2026

1. Purpose of This Amendment
============================

This Architecture Amendment Note (AAN-001) formally records the decision to replace Africa\'s Talking as the SMS gateway provider with EgoSMS by Pahappa Limited, and to defer WhatsApp integration to a future release. It updates the System Architecture Design Document v1.1 and supersedes all references to Africa\'s Talking in that document.

  **Attribute**             **Detail**
  ------------------------- ------------------------------------------------------------------------------
  **Amendment Reference**   AAN-001
  **Affects Document**      System Architecture Design Document v1.1
  **Decision Date**         March 2026
  **Decision Made By**      School Representative (Client) + Development Team
  **Reason**                Cost efficiency, local UGX billing, Kampala-based support, WhatsApp deferred

2. Cost Basis for Decision
==========================

The following comparison informed the decision to switch from Africa\'s Talking to EgoSMS:

  **Factor**                             **Africa\'s Talking**             **EgoSMS (Pahappa)**
  -------------------------------------- --------------------------------- ----------------------------------------------
  **Per SMS cost (Uganda)**              \~UGX 73--146 (billed in USD)     UGX 35 (basic) → UGX 20 (high volume)
  **Billing currency**                   USD --- foreign exchange risk     Uganda Shillings --- stable for school
  **Payment method**                     USD credit card / bank transfer   Mobile Money (MTN / Airtel Uganda)
  **Sender ID --- Airtel**               UGX 250,000/month (recurring)     UGX 250,000 one-time payment
  **Sender ID --- MTN**                  UGX 250,000/month (recurring)     UGX 250,000/month (after 3-month commitment)
  **WhatsApp API**                       Yes (available)                   Not available --- deferred to future release
  **Local support**                      Kenya-based                       Kampala-based (Plot 41, Ntinda)
  **Node.js SDK**                        Yes (npm: africastalking)         Yes (npm: comms-sdk)
  **Sandbox environment**                Yes                               Yes
  **Delivery reports**                   Webhook callbacks                 Portal polling / delivery report endpoint
  **Estimated monthly cost (500 SMS)**   \~UGX 36,500--73,000              UGX 17,500

> **Cost Saving** At the school\'s estimated volume of \~500 SMS/month, EgoSMS saves between UGX 19,000 and UGX 55,500 per month compared to Africa\'s Talking. Over a full academic year (9 months) this represents a saving of UGX 171,000--499,500 on SMS costs alone, before Sender ID fee differences.

3. What Changes
===============

The following table shows every component that changes as a result of this decision. All other architecture, services, database schema, and UI/UX remain unchanged.

  **Component**                    **Before (Africa\'s Talking)**                 **After (EgoSMS / Pahappa)**
  -------------------------------- ---------------------------------------------- -------------------------------------------------------------------------------
  **npm package**                  africastalking                                 comms-sdk (v1.0.1)
  **Adapter file**                 /integrations/africas-talking.js               /integrations/egosms.js
  **Adapter class**                AfricasTalkingAdapter                          EgoSMSAdapter
  **Authentication**               AT\_API\_KEY + AT\_USERNAME                    EGOSMS\_USERNAME + EGOSMS\_PASSWORD
  **.env variables**               AT\_API\_KEY, AT\_USERNAME, AT\_SENDER\_ID     EGOSMS\_USERNAME, EGOSMS\_PASSWORD, EGOSMS\_SENDER\_ID
  **SMS channel**                  Africa\'s Talking REST API                     EgoSMS Comms API via comms-sdk
  **WhatsApp channel**             Africa\'s Talking (planned)                    Deferred --- no provider assigned yet
  **Delivery receipts**            AT webhook → /api/v1/comms/delivery-callback   Scheduled polling of EgoSMS delivery report endpoint (node-cron, every 5 min)
  **DB column: message ID**        communication\_logs.at\_message\_id            communication\_logs.egosms\_message\_id
  **Architecture doc reference**   AfricasTalkingAdapter                          EgoSMSAdapter
  **Tech stack entry**             Africa\'s Talking API (REST)                   EgoSMS Comms SDK (comms-sdk npm, v1.0.1)

4. What Does NOT Change
=======================

-   The entire communication module structure --- CommunicationService, communication\_logs table, message\_templates, demand\_notes --- is unchanged.

-   The guardian.phone\_whatsapp column remains in the database. It will be populated at registration and used when WhatsApp integration is added in a future release.

-   The follow-up queue, SMS sending workflow, interaction logging, bulk SMS, and all parent communication UI screens are unchanged.

-   The message template system, 160-character limit warning, and delivery status display all remain the same.

-   All other architecture layers --- React.js frontend, Node.js/Express backend, PostgreSQL database, Prisma ORM, Puppeteer PDF, SchoolPay, photo upload --- are unchanged.

5. Updated Adapter Specification
================================

5.1 EgoSMSAdapter --- /integrations/egosms.js
---------------------------------------------

The adapter wraps the comms-sdk npm package and exposes a clean interface to the CommunicationService. It handles authentication, message dispatch, error handling, and response normalisation.

+------------------------------------------------------------------------------------+
| // /integrations/egosms.js                                                         |
|                                                                                    |
| import { CommsSDK } from \'comms-sdk/v1\';                                         |
|                                                                                    |
| class EgoSMSAdapter {                                                              |
|                                                                                    |
| constructor() {                                                                    |
|                                                                                    |
| this.sdk = CommsSDK.authenticate(                                                  |
|                                                                                    |
| process.env.EGOSMS\_USERNAME,                                                      |
|                                                                                    |
| process.env.EGOSMS\_PASSWORD                                                       |
|                                                                                    |
| );                                                                                 |
|                                                                                    |
| this.senderId = process.env.EGOSMS\_SENDER\_ID; // Max 11 chars e.g. \'StMarySch\' |
|                                                                                    |
| }                                                                                  |
|                                                                                    |
| // Send single SMS to one recipient                                                |
|                                                                                    |
| async sendSMS(phoneNumber, message) {                                              |
|                                                                                    |
| const response = await this.sdk.sendSMS(phoneNumber, message);                     |
|                                                                                    |
| return {                                                                           |
|                                                                                    |
| messageId: response.messageId \|\| null,                                           |
|                                                                                    |
| status: response.status === \'success\' ? \'sent\' : \'failed\',                   |
|                                                                                    |
| raw: response                                                                      |
|                                                                                    |
| };                                                                                 |
|                                                                                    |
| }                                                                                  |
|                                                                                    |
| // Send bulk SMS to multiple recipients                                            |
|                                                                                    |
| async sendBulkSMS(phoneNumbers, message) {                                         |
|                                                                                    |
| const results = await Promise.allSettled(                                          |
|                                                                                    |
| phoneNumbers.map(num =\> this.sdk.sendSMS(num, message))                           |
|                                                                                    |
| );                                                                                 |
|                                                                                    |
| return results.map((r, i) =\> ({                                                   |
|                                                                                    |
| phoneNumber: phoneNumbers\[i\],                                                    |
|                                                                                    |
| status: r.status === \'fulfilled\' ? \'sent\' : \'failed\',                        |
|                                                                                    |
| messageId: r.value?.messageId \|\| null,                                           |
|                                                                                    |
| error: r.reason?.message \|\| null                                                 |
|                                                                                    |
| }));                                                                               |
|                                                                                    |
| }                                                                                  |
|                                                                                    |
| // Check delivery status of a sent message                                         |
|                                                                                    |
| async checkDeliveryStatus(messageId) {                                             |
|                                                                                    |
| // EgoSMS uses portal polling --- query delivery report endpoint                   |
|                                                                                    |
| const response = await this.sdk.getDeliveryReport(messageId);                      |
|                                                                                    |
| return response.status; // \'delivered\', \'pending\', \'failed\'                  |
|                                                                                    |
| }                                                                                  |
|                                                                                    |
| }                                                                                  |
|                                                                                    |
| export default new EgoSMSAdapter();                                                |
+------------------------------------------------------------------------------------+

5.2 Updated .env Configuration
------------------------------

+--------------------------------------------------------------------+
| \# EgoSMS / Pahappa Comms API                                      |
|                                                                    |
| EGOSMS\_USERNAME=your\_egosms\_username                            |
|                                                                    |
| EGOSMS\_PASSWORD=your\_egosms\_password                            |
|                                                                    |
| EGOSMS\_SENDER\_ID=StMarySch \# Max 11 chars --- school short name |
|                                                                    |
| \# WhatsApp --- deferred. Variables reserved for future use.       |
|                                                                    |
| \# WHATSAPP\_PROVIDER=                                             |
|                                                                    |
| \# WHATSAPP\_API\_KEY=                                             |
+--------------------------------------------------------------------+

5.3 Delivery Status Polling --- Updated Job
-------------------------------------------

Since EgoSMS does not provide outbound webhook delivery callbacks (unlike Africa\'s Talking), the scheduled job for delivery status checks is updated from a passive webhook listener to an active polling job.

  **Attribute**                  **Detail**
  ------------------------------ ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  **Old approach**               Africa\'s Talking POSTs a delivery report to /api/v1/comms/delivery-callback. Communication log updated passively.
  **New approach**               node-cron job runs every 5 minutes. Queries EgoSMS delivery report endpoint for all communication\_logs with delivery\_status = \'sent\' and created\_at within the last 24 hours. Updates each record to \'delivered\' or \'failed\'.
  **Job name**                   egosms\_delivery\_poll (replaces at\_delivery\_webhook handler)
  **Schedule**                   \*/5 \* \* \* \* (every 5 minutes during school hours: 7AM--7PM)
  **Webhook endpoint removed**   /api/v1/comms/delivery-callback --- this route is removed from the API.

6. WhatsApp --- Deferred Feature Specification
==============================================

WhatsApp integration is deferred to a future release. The following records the agreed approach for when it is implemented, so the database and architecture are already ready.

  **Item**                     **Detail**
  ---------------------------- ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  **Database readiness**       guardians.phone\_whatsapp column already exists in the schema. No schema changes needed when WhatsApp is added.
  **UI readiness**             The guardian registration form already captures the WhatsApp number separately. The communication log already supports channel = \'whatsapp\'. No UI changes needed.
  **Future adapter**           A WhatsAppAdapter will be added at /integrations/whatsapp.js when a provider is selected. Candidates: Twilio (WhatsApp Business API), Africa\'s Talking (if pricing is acceptable at that time), or a direct Meta WhatsApp Cloud API integration.
  **Future .env**              WHATSAPP\_PROVIDER and WHATSAPP\_API\_KEY will be added to .env at implementation time.
  **No code changes needed**   CommunicationService.sendMessage() already accepts a channel parameter. Adding \'whatsapp\' as a new channel only requires adding the adapter --- the service layer routing is already designed for it.

7. Pre-Implementation Requirements
==================================

Before the EgoSMS adapter can be used in production, the following must be completed by the school:

  **□**   **Action Required**                                                                                                                   **Who**
  ------- ------------------------------------------------------------------------------------------------------------------------------------- -----------------------------------
  **□**   Register a school account at comms.egosms.co (free to register).                                                                      **School Admin**
  **□**   Top up the EgoSMS account with initial SMS credit (recommended: UGX 50,000 = \~1,400 SMS at UGX 35/SMS).                              **Bursar**
  **□**   Apply for Airtel Sender ID through EgoSMS (UGX 250,000 one-time). Sender ID = school short name, max 11 chars, e.g. \'StMarysSch\'.   **School Admin / EgoSMS support**
  **□**   Apply for MTN Sender ID through EgoSMS (UGX 750,000 for first 3 months, then UGX 250,000/month).                                      **School Admin / EgoSMS support**
  **□**   Share EGOSMS\_USERNAME, EGOSMS\_PASSWORD, and agreed EGOSMS\_SENDER\_ID securely with the development team for .env configuration.    **School Admin → Dev Team**
  **□**   Test SMS delivery in sandbox environment before go-live. Confirm messages are received on both MTN and Airtel numbers.                **Dev Team + School**

8. Document Approval
====================

This amendment note is approved by the parties below, confirming the switch from Africa\'s Talking to EgoSMS and the deferral of WhatsApp integration.

  **Name**   **Role**                             **Signature**   **Date**
  ---------- ------------------------------------ --------------- ----------
             **School Representative (Client)**                   
             **Lead Developer**                                   

**--- End of Amendment Note ---**

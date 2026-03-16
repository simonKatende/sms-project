/**
 * AuditService — thin wrapper for writing structured audit log entries.
 *
 * All mutating operations in the system should call AuditService.log()
 * so that a complete audit trail exists in the audit_logs table.
 *
 * Usage:
 *   import * as AuditService from './AuditService.js';
 *   await AuditService.log({
 *     userId:     req.user.id,
 *     action:     'UPDATE',
 *     entityType: 'Pupil',
 *     entityId:   pupil.id,
 *     oldValue:   { name: 'Old Name' },
 *     newValue:   { name: 'New Name' },
 *     ipAddress:  req.ip,
 *   });
 */

import { prisma } from '../lib/prisma.js';

/**
 * Write a single audit log entry.
 *
 * @param {object} params
 * @param {string|null}  params.userId     - ID of the user who performed the action (null = system)
 * @param {string}       params.action     - Verb: CREATE | UPDATE | DELETE | LOGIN | LOGOUT | GENERATE | etc.
 * @param {string}       params.entityType - Prisma model name or logical entity label (e.g. 'Pupil', 'FeeInvoice')
 * @param {string|null}  params.entityId   - UUID of the affected record (null for list/bulk actions)
 * @param {object|null}  params.oldValue   - Snapshot before the change (plain object, will be JSON-serialised)
 * @param {object|null}  params.newValue   - Snapshot after the change (plain object, will be JSON-serialised)
 * @param {string|null}  params.ipAddress  - Client IP address from req.ip
 * @param {string|null}  params.notes      - Free-text context (e.g. reason for manual override)
 * @returns {Promise<object>} The created audit log record
 */
export async function log({
  userId     = null,
  action,
  entityType,
  entityId   = null,
  oldValue   = null,
  newValue   = null,
  ipAddress  = null,
  notes      = null,
}) {
  return prisma.auditLog.create({
    data: {
      userId,
      action,
      entityType,
      entityId,
      oldValue:  oldValue  ? JSON.stringify(oldValue)  : null,
      newValue:  newValue  ? JSON.stringify(newValue)  : null,
      ipAddress,
      notes,
    },
  });
}

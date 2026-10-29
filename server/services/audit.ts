import type { Request } from "express";
import { auditLogs } from "@shared/schema";
import { db, type DbOrTx } from "../db";
import { logger } from "../logger";

export interface AuditTarget {
  type: string;
  id?: string | null;
}

export interface AuditEntry {
  actor?: { id: string; username: string } | null;
  action: string;
  target?: AuditTarget;
  metadata?: Record<string, unknown>;
  ip?: string | null;
  requestId?: string | null;
}

/** Where a request came from, for services that write audit entries without seeing the request itself. */
export interface RequestContext {
  ip?: string | null;
  requestId?: string | null;
}

/**
 * Writes one audit entry. Pass `dbc` (a transaction) to make it part of the change it describes;
 * outside a transaction a failed audit write is logged but never fails the user's request.
 */
export async function auditEvent(entry: AuditEntry, dbc: DbOrTx = db): Promise<void> {
  const write = () =>
    dbc.insert(auditLogs).values({
      actorId: entry.actor?.id ?? null,
      actorUsername: entry.actor?.username ?? null,
      action: entry.action,
      targetType: entry.target?.type ?? null,
      targetId: entry.target?.id ?? null,
      metadata: entry.metadata ?? null,
      ip: entry.ip ?? null,
      requestId: entry.requestId ?? null,
    });

  if (dbc !== db) {
    await write(); // inside a transaction: let a failure roll the change back
    return;
  }
  try {
    await write();
  } catch (error) {
    logger.error({ err: error, action: entry.action }, "failed to write audit log");
  }
}

/**
 * Records who did what (admin/trainer actions, account erasure, password
 * resets...) for the signed-in person making the request.
 */
export async function audit(
  req: Request | null,
  action: string,
  target?: AuditTarget,
  metadata?: Record<string, unknown>,
  dbc: DbOrTx = db
): Promise<void> {
  await auditEvent(
    {
      actor: req?.user ? { id: req.user.id, username: req.user.username } : null,
      action,
      target,
      metadata,
      ip: req?.ip ?? null,
      requestId: req?.id ?? null,
    },
    dbc
  );
}

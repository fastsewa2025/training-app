import type { Role } from "@shared/schema";
import { config } from "../config";

/**
 * Learners must have accepted the privacy notice version the deployment currently shows
 * (CONSENT_VERSION). Accounts from before consent was recorded, accounts created by staff, and
 * everyone after CONSENT_VERSION is raised are asked once (POST /auth/consent). Staff accept their
 * terms through their employment, so the gate is for learners only.
 */
export function consentOutdated(user: { role: Role; consentVersion: string | null }): boolean {
  return user.role === "worker" && user.consentVersion !== config.legal.consentVersion;
}

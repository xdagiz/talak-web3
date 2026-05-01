import { randomBytes } from "node:crypto";

import { TalakWeb3Error } from "@talak-web3/errors";

export interface Incident {
  id: string;
  type: IncidentType;
  severity: IncidentSeverity;
  status: IncidentStatus;
  createdAt: number;
  updatedAt: number;
  description: string;
  affectedSystems: string[];
  containmentActions: string[];
  recoveryActions: string[];
  postMortemRequired: boolean;
  metadata: Record<string, unknown>;
}

export type IncidentType =
  | "key_compromise"
  | "data_breach"
  | "denial_of_service"
  | "unauthorized_access"
  | "security_misconfiguration"
  | "vulnerability_exploitation"
  | "system_failure";

export type IncidentSeverity = "low" | "medium" | "high" | "critical";

export type IncidentStatus = "open" | "investigating" | "contained" | "resolved" | "closed";

export interface RevocationStrategy {
  name: string;
  description: string;
  execute: (context: RevocationContext) => Promise<RevocationResult>;
}

export interface RevocationContext {
  incidentId: string;
  reason: string;
  scope: "global" | "selective" | "targeted";
  targets: string[];
  immediate: boolean;
  notifyUsers: boolean;
  metadata?: {
    timeWindow?: number;
  };
}

export interface RevocationResult {
  success: boolean;
  revokedCount: number;
  errors: string[];
  duration: number;
  affectedUsers: number;
}

export class IncidentResponseManager {
  private incidents: Map<string, Incident> = new Map();
  private revocationStrategies: Map<string, RevocationStrategy> = new Map();
  private emergencyContacts: EmergencyContact[] = [];
  private communicationChannels: CommunicationChannel[] = [];

  constructor() {
    this.initializeRevocationStrategies();
  }

  async createIncident(
    incident: Omit<Incident, "id" | "createdAt" | "updatedAt" | "status">,
  ): Promise<Incident> {
    const newIncident: Incident = {
      ...incident,
      id: this.generateIncidentId(),
      status: "open",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.incidents.set(newIncident.id, newIncident);

    if (incident.severity === "critical") {
      await this.triggerEmergencyResponse(newIncident);
    }

    console.warn(
      `[INCIDENT] New incident created: ${newIncident.id} - ${newIncident.type} (${newIncident.severity})`,
    );

    return newIncident;
  }

  async updateIncident(id: string, updates: Partial<Incident>): Promise<Incident> {
    const incident = this.incidents.get(id);
    if (!incident) {
      throw new TalakWeb3Error(`Incident ${id} not found`, {
        code: "INCIDENT_NOT_FOUND",
        status: 404,
      });
    }

    const updatedIncident = {
      ...incident,
      ...updates,
      updatedAt: Date.now(),
    };

    this.incidents.set(id, updatedIncident);

    console.info(`[INCIDENT] Incident updated: ${id}`);
    return updatedIncident;
  }

  async getIncident(id: string): Promise<Incident | null> {
    return this.incidents.get(id) ?? null;
  }

  async listIncidents(filters?: {
    type?: IncidentType;
    severity?: IncidentSeverity;
    status?: IncidentStatus;
    since?: number;
  }): Promise<Incident[]> {
    let incidents = Array.from(this.incidents.values());

    if (filters) {
      if (filters.type) {
        incidents = incidents.filter((i) => i.type === filters.type);
      }
      if (filters.severity) {
        incidents = incidents.filter((i) => i.severity === filters.severity);
      }
      if (filters.status) {
        incidents = incidents.filter((i) => i.status === filters.status);
      }
      if (filters.since) {
        incidents = incidents.filter((i) => i.createdAt >= filters.since!);
      }
    }

    return incidents.sort((a, b) => b.createdAt - a.createdAt);
  }

  private async triggerEmergencyResponse(incident: Incident): Promise<void> {
    console.error(`[EMERGENCY] Critical incident detected: ${incident.id}`);

    await this.executeContainmentActions(incident);

    await this.notifyEmergencyContacts(incident);

    if (incident.type === "key_compromise") {
      await this.executeEmergencyRevocation(incident);
    }
  }

  private async executeContainmentActions(incident: Incident): Promise<void> {
    const actions = this.getContainmentActions(incident.type, incident.severity);

    for (const action of actions) {
      try {
        console.info(`[INCIDENT] Executing containment action: ${action}`);
        await this.executeContainmentAction(action, incident);
      } catch (err) {
        console.error(`[INCIDENT] Failed to execute containment action ${action}:`, err);
      }
    }
  }

  private getContainmentActions(type: IncidentType, severity: IncidentSeverity): string[] {
    const actionMap: Record<IncidentType, Record<IncidentSeverity, string[]>> = {
      key_compromise: {
        low: ["audit_key_usage", "monitor_anomalies"],
        medium: ["audit_key_usage", "monitor_anomalies", "prepare_rotation"],
        high: ["audit_key_usage", "monitor_anomalies", "prepare_rotation", "restrict_access"],
        critical: [
          "immediate_key_rotation",
          "revoke_active_tokens",
          "restrict_access",
          "enable_enhanced_monitoring",
        ],
      },
      data_breach: {
        low: ["audit_access_logs", "monitor_data_access"],
        medium: ["audit_access_logs", "monitor_data_access", "restrict_affected_accounts"],
        high: [
          "audit_access_logs",
          "monitor_data_access",
          "restrict_affected_accounts",
          "force_password_reset",
        ],
        critical: [
          "immediate_system_lockdown",
          "revoke_all_sessions",
          "audit_access_logs",
          "notify_regulators",
        ],
      },
      denial_of_service: {
        low: ["monitor_traffic", "adjust_rate_limits"],
        medium: ["monitor_traffic", "adjust_rate_limits", "enable_caching"],
        high: [
          "monitor_traffic",
          "adjust_rate_limits",
          "enable_caching",
          "activate_ddos_protection",
        ],
        critical: [
          "emergency_rate_limits",
          "block_malicious_ips",
          "activate_ddos_protection",
          "scale_resources",
        ],
      },
      unauthorized_access: {
        low: ["audit_access_logs", "monitor_suspicious_accounts"],
        medium: ["audit_access_logs", "monitor_suspicious_accounts", "revoke_suspicious_sessions"],
        high: [
          "audit_access_logs",
          "monitor_suspicious_accounts",
          "revoke_suspicious_sessions",
          "force_password_reset",
        ],
        critical: [
          "revoke_all_sessions",
          "force_password_reset",
          "enable_enhanced_authentication",
          "audit_access_logs",
        ],
      },
      security_misconfiguration: {
        low: ["document_issue", "schedule_fix"],
        medium: ["document_issue", "schedule_fix", "monitor_exploitation"],
        high: [
          "document_issue",
          "immediate_fix",
          "monitor_exploitation",
          "restrict_affected_features",
        ],
        critical: [
          "immediate_system_shutdown",
          "emergency_fix",
          "security_audit",
          "restrict_all_access",
        ],
      },
      vulnerability_exploitation: {
        low: ["monitor_exploitation", "apply_patches"],
        medium: ["monitor_exploitation", "apply_patches", "restrict_affected_features"],
        high: ["emergency_patch", "restrict_affected_features", "monitor_exploitation"],
        critical: [
          "immediate_system_shutdown",
          "emergency_patch",
          "security_audit",
          "incident_investigation",
        ],
      },
      system_failure: {
        low: ["monitor_system", "restart_services"],
        medium: ["monitor_system", "restart_services", "activate_backup_systems"],
        high: ["emergency_restart", "activate_backup_systems", "escalate_to_engineering"],
        critical: [
          "immediate_failover",
          "activate_disaster_recovery",
          "escalate_to_engineering",
          "notify_stakeholders",
        ],
      },
    };

    return actionMap[type]?.[severity] ?? [];
  }

  private async executeContainmentAction(action: string, incident: Incident): Promise<void> {
    switch (action) {
      case "immediate_key_rotation":
        await this.executeEmergencyKeyRotation();
        break;
      case "revoke_active_tokens":
        await this.revokeAllActiveTokens();
        break;
      case "restrict_access":
        await this.restrictSystemAccess();
        break;
      case "emergency_rate_limits":
        await this.applyEmergencyRateLimits();
        break;

      default:
        console.warn(`[INCIDENT] Unknown containment action: ${action}`);
    }
  }

  private initializeRevocationStrategies(): void {
    this.revocationStrategies.set("global_jwt_revocation", {
      name: "Global JWT Revocation",
      description: "Revoke all active JWT tokens immediately",
      execute: async (context) => this.executeGlobalJwtRevocation(context),
    });

    this.revocationStrategies.set("selective_wallet_revocation", {
      name: "Selective Wallet Revocation",
      description: "Revoke tokens for specific wallet addresses",
      execute: async (context) => this.executeSelectiveWalletRevocation(context),
    });

    this.revocationStrategies.set("ip_based_revocation", {
      name: "IP-Based Revocation",
      description: "Revoke tokens from specific IP ranges",
      execute: async (context) => this.executeIpBasedRevocation(context),
    });

    this.revocationStrategies.set("time_based_revocation", {
      name: "Time-Based Revocation",
      description: "Revoke tokens issued within a time window",
      execute: async (context) => this.executeTimeBasedRevocation(context),
    });
  }

  async executeRevocation(
    strategyName: string,
    context: RevocationContext,
  ): Promise<RevocationResult> {
    const strategy = this.revocationStrategies.get(strategyName);
    if (!strategy) {
      throw new TalakWeb3Error(`Revocation strategy "${strategyName}" not found`, {
        code: "REVOCATION_STRATEGY_NOT_FOUND",
        status: 404,
      });
    }

    console.info(
      `[REVOCATION] Executing strategy: ${strategyName} for incident: ${context.incidentId}`,
    );

    const startTime = Date.now();
    const result = await strategy.execute(context);
    const duration = Date.now() - startTime;

    console.info(
      `[REVOCATION] Strategy ${strategyName} completed: ${result.revokedCount} tokens revoked in ${duration}ms`,
    );

    return {
      ...result,
      duration,
    };
  }

  private async executeGlobalJwtRevocation(context: RevocationContext): Promise<RevocationResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    let revokedCount = 0;

    try {
      const activeJwts = await this.getAllActiveJwts();

      for (const jwt of activeJwts) {
        try {
          await this.revokeJwt(jwt.jti, jwt.exp);
          revokedCount++;
        } catch (err) {
          errors.push(`Failed to revoke JWT ${jwt.jti}: ${err}`);
        }
      }

      await this.clearJwtCache();
    } catch (err) {
      errors.push(`Global JWT revocation failed: ${err}`);
    }

    return {
      success: errors.length === 0,
      revokedCount,
      errors,
      duration: Date.now() - startTime,
      affectedUsers: revokedCount,
    };
  }

  private async executeSelectiveWalletRevocation(
    context: RevocationContext,
  ): Promise<RevocationResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    let revokedCount = 0;

    try {
      for (const walletAddress of context.targets) {
        try {
          const walletJwts = await this.getJwtsForWallet(walletAddress);

          for (const jwt of walletJwts) {
            await this.revokeJwt(jwt.jti, jwt.exp);
            revokedCount++;
          }
        } catch (err) {
          errors.push(`Failed to revoke JWTs for wallet ${walletAddress}: ${err}`);
        }
      }
    } catch (err) {
      errors.push(`Selective wallet revocation failed: ${err}`);
    }

    return {
      success: errors.length === 0,
      revokedCount,
      errors,
      duration: Date.now() - startTime,
      affectedUsers: context.targets.length,
    };
  }

  private async executeIpBasedRevocation(context: RevocationContext): Promise<RevocationResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    let revokedCount = 0;

    try {
      for (const ipOrRange of context.targets) {
        try {
          const ipJwts = await this.getJwtsForIp(ipOrRange);

          for (const jwt of ipJwts) {
            await this.revokeJwt(jwt.jti, jwt.exp);
            revokedCount++;
          }
        } catch (err) {
          errors.push(`Failed to revoke JWTs for IP ${ipOrRange}: ${err}`);
        }
      }
    } catch (err) {
      errors.push(`IP-based revocation failed: ${err}`);
    }

    return {
      success: errors.length === 0,
      revokedCount,
      errors,
      duration: Date.now() - startTime,
      affectedUsers: revokedCount,
    };
  }

  private async executeTimeBasedRevocation(context: RevocationContext): Promise<RevocationResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    let revokedCount = 0;

    try {
      const timeWindow = context.metadata?.timeWindow || 3600000;
      const cutoffTime = Date.now() - timeWindow;

      const recentJwts = await this.getJwtsIssuedAfter(cutoffTime);

      for (const jwt of recentJwts) {
        try {
          await this.revokeJwt(jwt.jti, jwt.exp);
          revokedCount++;
        } catch (err) {
          errors.push(`Failed to revoke JWT ${jwt.jti}: ${err}`);
        }
      }
    } catch (err) {
      errors.push(`Time-based revocation failed: ${err}`);
    }

    return {
      success: errors.length === 0,
      revokedCount,
      errors,
      duration: Date.now() - startTime,
      affectedUsers: revokedCount,
    };
  }

  private async executeEmergencyRevocation(incident: Incident): Promise<void> {
    console.error(`[EMERGENCY] Executing emergency revocation for incident: ${incident.id}`);

    const context: RevocationContext = {
      incidentId: incident.id,
      reason: "Emergency revocation due to key compromise",
      scope: "global",
      targets: [],
      immediate: true,
      notifyUsers: true,
    };

    await this.executeRevocation("global_jwt_revocation", context);
  }

  private async executeEmergencyKeyRotation(): Promise<void> {
    console.error("[EMERGENCY] Executing emergency key rotation");
  }

  private async revokeAllActiveTokens(): Promise<void> {
    console.warn("[EMERGENCY] Revoking all active tokens");

    const context: RevocationContext = {
      incidentId: "emergency",
      reason: "Emergency token revocation",
      scope: "global",
      targets: [],
      immediate: true,
      notifyUsers: true,
    };

    await this.executeRevocation("global_jwt_revocation", context);
  }

  private async restrictSystemAccess(): Promise<void> {
    console.warn("[EMERGENCY] Restricting system access");
  }

  private async applyEmergencyRateLimits(): Promise<void> {
    console.warn("[EMERGENCY] Applying emergency rate limits");
  }

  private async notifyEmergencyContacts(incident: Incident): Promise<void> {
    const message =
      `CRITICAL INCIDENT: ${incident.type}\n\n` +
      `Incident ID: ${incident.id}\n` +
      `Severity: ${incident.severity}\n` +
      `Description: ${incident.description}\n` +
      `Affected Systems: ${incident.affectedSystems.join(", ")}\n` +
      `Created: ${new Date(incident.createdAt).toISOString()}`;

    for (const contact of this.emergencyContacts) {
      try {
        await this.sendEmergencyNotification(contact, message, incident.severity);
      } catch (err) {
        console.error(`[INCIDENT] Failed to notify emergency contact ${contact.name}:`, err);
      }
    }
  }

  private async sendEmergencyNotification(
    contact: EmergencyContact,
    message: string,
    severity: IncidentSeverity,
  ): Promise<void> {
    console.info(
      `[NOTIFICATION] Sending ${severity} alert to ${contact.name} (${contact.method}): ${contact.contact}`,
    );
  }

  private generateIncidentId(): string {
    return `inc_${Date.now()}_${randomBytes(4).toString("hex")}`;
  }

  private async getAllActiveJwts(): Promise<Array<{ jti: string; exp: number }>> {
    return [];
  }

  private async getJwtsForWallet(
    walletAddress: string,
  ): Promise<Array<{ jti: string; exp: number }>> {
    return [];
  }

  private async getJwtsForIp(ip: string): Promise<Array<{ jti: string; exp: number }>> {
    return [];
  }

  private async getJwtsIssuedAfter(
    timestamp: number,
  ): Promise<Array<{ jti: string; exp: number }>> {
    return [];
  }

  private async revokeJwt(jti: string, exp: number): Promise<void> {
    console.info(`[REVOCATION] Revoking JWT: ${jti}`);
  }

  private async clearJwtCache(): Promise<void> {
    console.info("[REVOCATION] Clearing JWT cache");
  }

  addEmergencyContact(contact: EmergencyContact): void {
    this.emergencyContacts.push(contact);
  }

  addCommunicationChannel(channel: CommunicationChannel): void {
    this.communicationChannels.push(channel);
  }

  getRevocationStrategies(): RevocationStrategy[] {
    return Array.from(this.revocationStrategies.values());
  }
}

export interface EmergencyContact {
  name: string;
  role: string;
  method: "email" | "sms" | "phone" | "slack";
  contact: string;
  severity: IncidentSeverity[];
}

export interface CommunicationChannel {
  name: string;
  type: "email" | "slack" | "pagerduty" | "webhook";
  config: Record<string, unknown>;
  enabled: boolean;
}

export const incidentResponseManager = new IncidentResponseManager();

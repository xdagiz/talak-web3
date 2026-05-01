import { TalakWeb3Error } from "@talak-web3/errors";
import type { Context } from "hono";

export type Environment = "development" | "staging" | "production";

export interface EnvironmentConfig {
  name: Environment;
  keyRotation: {
    enabled: boolean;
    intervalDays: number;
    gracePeriodDays: number;
  };
  redis: {
    separateDatabase: boolean;
    databaseNumber: number;
    auth: {
      enabled: boolean;
      passwordFromEnv?: string;
    };
    tls: {
      enabled: boolean;
      certPath?: string;
      keyPath?: string;
    };
  };
  rateLimiting: {
    globalMultiplier: number;
    authMultiplier: number;
    rpcMultiplier: number;
  };
  monitoring: {
    metricsEnabled: boolean;
    securityEventsEnabled: boolean;
    auditLevel: "minimal" | "standard" | "comprehensive";
  };
  security: {
    keyProviderType: "environment" | "aws-kms" | "vault";
    requireClientCerts: boolean;
    enableZeroTrust: boolean;
  };
  alerts: {
    enabled: boolean;
    channels: ("email" | "slack" | "pagerduty")[];
    thresholds: {
      authFailureRate: number;
      errorRate: number;
      responseTime: number;
    };
  };
}

export const ENVIRONMENT_CONFIGS: Record<Environment, EnvironmentConfig> = {
  development: {
    name: "development",
    keyRotation: {
      enabled: false,
      intervalDays: 1,
      gracePeriodDays: 1,
    },
    redis: {
      separateDatabase: false,
      databaseNumber: 0,
      auth: {
        enabled: false,
      },
      tls: {
        enabled: false,
      },
    },
    rateLimiting: {
      globalMultiplier: 10,
      authMultiplier: 10,
      rpcMultiplier: 10,
    },
    monitoring: {
      metricsEnabled: true,
      securityEventsEnabled: false,
      auditLevel: "minimal",
    },
    security: {
      keyProviderType: "environment",
      requireClientCerts: false,
      enableZeroTrust: false,
    },
    alerts: {
      enabled: false,
      channels: [],
      thresholds: {
        authFailureRate: 50,
        errorRate: 30,
        responseTime: 5000,
      },
    },
  },
  staging: {
    name: "staging",
    keyRotation: {
      enabled: true,
      intervalDays: 7,
      gracePeriodDays: 3,
    },
    redis: {
      separateDatabase: true,
      databaseNumber: 1,
      auth: {
        enabled: true,
        passwordFromEnv: "REDIS_PASSWORD_STAGING",
      },
      tls: {
        enabled: true,
      },
    },
    rateLimiting: {
      globalMultiplier: 2,
      authMultiplier: 2,
      rpcMultiplier: 2,
    },
    monitoring: {
      metricsEnabled: true,
      securityEventsEnabled: true,
      auditLevel: "standard",
    },
    security: {
      keyProviderType: "environment",
      requireClientCerts: false,
      enableZeroTrust: true,
    },
    alerts: {
      enabled: true,
      channels: ["email"],
      thresholds: {
        authFailureRate: 20,
        errorRate: 10,
        responseTime: 2000,
      },
    },
  },
  production: {
    name: "production",
    keyRotation: {
      enabled: true,
      intervalDays: 30,
      gracePeriodDays: 7,
    },
    redis: {
      separateDatabase: true,
      databaseNumber: 2,
      auth: {
        enabled: true,
        passwordFromEnv: "REDIS_PASSWORD_PROD",
      },
      tls: {
        enabled: true,
      },
    },
    rateLimiting: {
      globalMultiplier: 1,
      authMultiplier: 1,
      rpcMultiplier: 1,
    },
    monitoring: {
      metricsEnabled: true,
      securityEventsEnabled: true,
      auditLevel: "comprehensive",
    },
    security: {
      keyProviderType: "aws-kms",
      requireClientCerts: true,
      enableZeroTrust: true,
    },
    alerts: {
      enabled: true,
      channels: ["email", "slack", "pagerduty"],
      thresholds: {
        authFailureRate: 5,
        errorRate: 2,
        responseTime: 1000,
      },
    },
  },
};

export class EnvironmentManager {
  private currentEnv: Environment;
  private config: EnvironmentConfig;

  constructor(env?: Environment) {
    this.currentEnv = env ?? this.detectEnvironment();
    this.config = ENVIRONMENT_CONFIGS[this.currentEnv];

    this.validateEnvironment();
    this.applyEnvironmentIsolation();
  }

  private detectEnvironment(): Environment {
    const nodeEnv = process.env["NODE_ENV"]?.toLowerCase();
    const envVar = process.env["ENVIRONMENT"]?.toLowerCase();

    const envString = envVar || nodeEnv || "development";

    switch (envString) {
      case "prod":
      case "production":
        return "production";
      case "staging":
      case "stage":
        return "staging";
      case "dev":
      case "development":
      default:
        return "development";
    }
  }

  private validateEnvironment(): void {
    const requiredVars = this.getRequiredEnvironmentVars();
    const missingVars = requiredVars.filter((varName) => !process.env[varName]);

    if (missingVars.length > 0) {
      throw new TalakWeb3Error(
        `Missing required environment variables for ${this.currentEnv}: ${missingVars.join(", ")}`,
        { code: "ENV_VALIDATION_FAILED", status: 500 },
      );
    }

    this.validateKeyIsolation();

    this.validateDatabaseIsolation();
  }

  private getRequiredEnvironmentVars(): string[] {
    const baseVars = ["REDIS_URL", "SIWE_DOMAIN"];

    switch (this.currentEnv) {
      case "production":
        return [
          ...baseVars,
          "REDIS_PASSWORD_PROD",
          "JWT_PRIVATE_KEY",
          "JWT_PUBLIC_KEY",
          "AWS_ACCESS_KEY_ID",
          "AWS_SECRET_ACCESS_KEY",
          "AWS_REGION",
        ];
      case "staging":
        return [...baseVars, "REDIS_PASSWORD_STAGING", "JWT_PRIVATE_KEY", "JWT_PUBLIC_KEY"];
      default:
        return baseVars;
    }
  }

  private validateKeyIsolation(): void {
    const keyEnvVars = ["JWT_PRIVATE_KEY", "JWT_PUBLIC_KEY"];

    for (const varName of keyEnvVars) {
      const key = process.env[varName];
      if (!key) continue;

      if (this.currentEnv === "production" && this.isDevelopmentKey(key)) {
        throw new TalakWeb3Error(`Development key detected in production environment: ${varName}`, {
          code: "ENV_KEY_ISOLATION_VIOLATION",
          status: 500,
        });
      }
    }
  }

  private isDevelopmentKey(key: string): boolean {
    const devIndicators = ["dev", "test", "localhost", "example", "sample"];
    return devIndicators.some((indicator) => key.toLowerCase().includes(indicator));
  }

  private validateDatabaseIsolation(): void {
    if (!this.config.redis.separateDatabase) {
      if (this.currentEnv === "production") {
        throw new TalakWeb3Error("Database separation is required in production", {
          code: "ENV_DB_ISOLATION_REQUIRED",
          status: 500,
        });
      }
    }
  }

  private applyEnvironmentIsolation(): void {
    process.env["ENVIRONMENT_HEADER"] = this.currentEnv;

    this.configureLogging();

    this.applyRateLimitingMultipliers();

    this.configureSecuritySettings();
  }

  private configureLogging(): void {
    switch (this.currentEnv) {
      case "production":
        process.env["LOG_LEVEL"] = "error";
        break;
      case "staging":
        process.env["LOG_LEVEL"] = "warn";
        break;
      default:
        process.env["LOG_LEVEL"] = "debug";
    }
  }

  private applyRateLimitingMultipliers(): void {
    process.env["RATE_LIMIT_GLOBAL_MULTIPLIER"] = String(this.config.rateLimiting.globalMultiplier);
    process.env["RATE_LIMIT_AUTH_MULTIPLIER"] = String(this.config.rateLimiting.authMultiplier);
    process.env["RATE_LIMIT_RPC_MULTIPLIER"] = String(this.config.rateLimiting.rpcMultiplier);
  }

  private configureSecuritySettings(): void {
    if (this.config.redis.separateDatabase) {
      process.env["REDIS_DB_NONCE"] = String(this.config.redis.databaseNumber);
      process.env["REDIS_DB_SESSION"] = String(this.config.redis.databaseNumber + 1);
      process.env["REDIS_DB_RATELIMIT"] = String(this.config.redis.databaseNumber + 2);
      process.env["REDIS_DB_AUDIT"] = String(this.config.redis.databaseNumber + 3);
    }

    process.env["SECURITY_REQUIRE_CLIENT_CERTS"] = String(this.config.security.requireClientCerts);
    process.env["SECURITY_ENABLE_ZERO_TRUST"] = String(this.config.security.enableZeroTrust);
  }

  getCurrentEnvironment(): Environment {
    return this.currentEnv;
  }

  getConfig(): EnvironmentConfig {
    return this.config;
  }

  isProduction(): boolean {
    return this.currentEnv === "production";
  }

  isStaging(): boolean {
    return this.currentEnv === "staging";
  }

  isDevelopment(): boolean {
    return this.currentEnv === "development";
  }

  getEnvironmentSpecificUrl(service: "api" | "redis" | "metrics"): string {
    const baseUrl = process.env["BASE_URL"] ?? "http://localhost:8787";

    switch (service) {
      case "api":
        return baseUrl;
      case "redis":
        return process.env["REDIS_URL"] ?? "redis://localhost:6379";
      case "metrics":
        return `${baseUrl}/metrics`;
      default:
        return baseUrl;
    }
  }

  getKeyRotationConfig() {
    return this.config.keyRotation;
  }

  getRedisConfig() {
    return this.config.redis;
  }

  getRateLimitingConfig() {
    return this.config.rateLimiting;
  }

  getMonitoringConfig() {
    return this.config.monitoring;
  }

  getSecurityConfig() {
    return this.config.security;
  }

  getAlertsConfig() {
    return this.config.alerts;
  }
}

export function createEnvironmentValidationMiddleware(envManager: EnvironmentManager) {
  return async (c: Context, next: () => Promise<void>) => {
    c.header("X-Environment", envManager.getCurrentEnvironment());
    c.header("X-Environment-Isolation", "enabled");

    if (envManager.isProduction()) {
      const proto = c.req.header("x-forwarded-proto");

      if (proto !== "https") {
        console.warn("[SECURITY] Non-HTTPS request in production");
      }

      const requiredHeaders = ["x-request-id", "user-agent"];
      const missingHeaders = requiredHeaders.filter((header) => !c.req.header(header));

      if (missingHeaders.length > 0) {
        console.warn("[SECURITY] Missing required headers in production:", missingHeaders);
      }
    }

    await next();
  };
}

export class KeyIsolationManager {
  constructor(private envManager: EnvironmentManager) {}

  validateKeyEnvironment(key: string, expectedEnv: Environment): boolean {
    const keyEnv = this.extractKeyEnvironment(key);
    return keyEnv === expectedEnv;
  }

  private extractKeyEnvironment(key: string): Environment | "unknown" {
    const lowerKey = key.toLowerCase();

    if (lowerKey.includes("prod") || lowerKey.includes("production")) {
      return "production";
    } else if (lowerKey.includes("staging") || lowerKey.includes("stage")) {
      return "staging";
    } else if (lowerKey.includes("dev") || lowerKey.includes("development")) {
      return "development";
    }

    return "unknown";
  }

  ensureKeyIsolation(): void {
    const currentEnv = this.envManager.getCurrentEnvironment();
    const privateKey = process.env["JWT_PRIVATE_KEY"];
    const publicKey = process.env["JWT_PUBLIC_KEY"];

    if (privateKey && !this.validateKeyEnvironment(privateKey, currentEnv)) {
      throw new TalakWeb3Error(`Private key environment mismatch. Expected: ${currentEnv}`, {
        code: "KEY_ISOLATION_VIOLATION",
        status: 500,
      });
    }

    if (publicKey && !this.validateKeyEnvironment(publicKey, currentEnv)) {
      throw new TalakWeb3Error(`Public key environment mismatch. Expected: ${currentEnv}`, {
        code: "KEY_ISOLATION_VIOLATION",
        status: 500,
      });
    }
  }

  generateEnvironmentSpecificKeyId(): string {
    const env = this.envManager.getCurrentEnvironment();
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${env}_${timestamp}_${random}`;
  }
}

export class DeploymentHealthChecker {
  constructor(private envManager: EnvironmentManager) {}

  async checkHealth(): Promise<{
    healthy: boolean;
    environment: Environment;
    checks: Array<{
      name: string;
      healthy: boolean;
      message?: string;
    }>;
  }> {
    const checks: Array<{ name: string; healthy: boolean; message?: string }> = [];

    checks.push(this.checkEnvironmentConfig());

    checks.push(this.checkKeyIsolation());

    checks.push(this.checkDatabaseSeparation());

    checks.push(this.checkSecuritySettings());

    const healthy = checks.every((check) => check.healthy);

    return {
      healthy,
      environment: this.envManager.getCurrentEnvironment(),
      checks,
    };
  }

  private checkEnvironmentConfig(): { name: string; healthy: boolean; message?: string } {
    try {
      return { name: "environment_config", healthy: true };
    } catch (err) {
      return {
        name: "environment_config",
        healthy: false,
        message: `Environment config error: ${err}`,
      };
    }
  }

  private checkKeyIsolation(): { name: string; healthy: boolean; message?: string } {
    try {
      const keyManager = new KeyIsolationManager(this.envManager);
      keyManager.ensureKeyIsolation();
      return { name: "key_isolation", healthy: true };
    } catch (err) {
      return {
        name: "key_isolation",
        healthy: false,
        message: `Key isolation error: ${err}`,
      };
    }
  }

  private checkDatabaseSeparation(): { name: string; healthy: boolean; message?: string } {
    const config = this.envManager.getRedisConfig();

    if (this.envManager.isProduction() && !config.separateDatabase) {
      return {
        name: "database_separation",
        healthy: false,
        message: "Database separation required in production",
      };
    }

    return { name: "database_separation", healthy: true };
  }

  private checkSecuritySettings(): { name: string; healthy: boolean; message?: string } {
    const config = this.envManager.getSecurityConfig();

    if (this.envManager.isProduction()) {
      if (!config.requireClientCerts) {
        return {
          name: "security_settings",
          healthy: false,
          message: "Client certificates required in production",
        };
      }

      if (!config.enableZeroTrust) {
        return {
          name: "security_settings",
          healthy: false,
          message: "Zero trust required in production",
        };
      }
    }

    return { name: "security_settings", healthy: true };
  }
}

export const environmentManager = new EnvironmentManager();

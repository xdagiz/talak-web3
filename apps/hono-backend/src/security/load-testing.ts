import { TalakWeb3Error } from '@talak-web3/errors';

export interface LoadTestScenario {
  name: string;
  description: string;
  config: LoadTestConfig;
  execute: (target: LoadTestTarget) => Promise<LoadTestResult>;
}

export interface LoadTestConfig {
  concurrentRequests: number;
  duration: number;
  rampUpTime?: number;
  thinkTime?: number;
  timeout?: number;
}

export interface LoadTestTarget {
  baseUrl: string;
  endpoints: {
    nonce: string;
    login: string;
    rpc: string;
    refresh: string;
  };
  headers?: Record<string, string>;
}

export interface LoadTestResult {
  scenario: string;
  startTime: number;
  endTime: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  requestsPerSecond: number;
  errors: Array<{
    error: string;
    count: number;
    samples: string[];
  }>;
  securityMetrics: {
    rateLimitHits: number;
    authFailures: number;
    suspiciousActivityDetections: number;
  };
}

export const highConcurrencyLoginTest: LoadTestScenario = {
  name: 'high-concurrency-login',
  description: 'Test system under high concurrent login attempts',
  config: {
    concurrentRequests: 100,
    duration: 60,
    rampUpTime: 10,
    thinkTime: 100,
    timeout: 10000,
  },
  async execute(target: LoadTestTarget): Promise<LoadTestResult> {
    const startTime = Date.now();
    const endTime = startTime + (this.config.duration * 1000);

    const requests: Array<Promise<void>> = [];
    const results: Array<{ success: boolean; responseTime: number; error?: string }> = [];

    const wallets = Array.from({ length: this.config.concurrentRequests }, (_, i) =>
      generateTestWallet(i)
    );

    for (let i = 0; i < this.config.concurrentRequests; i++) {
      const request = executeLoginAttempt(target, wallets[i], startTime, endTime, results);
      requests.push(request);

      if (this.config.rampUpTime) {
        const delay = (this.config.rampUpTime * 1000) / this.config.concurrentRequests;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    await Promise.all(requests);

    return calculateResults('high-concurrency-login', startTime, results);
  },
};

export const replayAttackTest: LoadTestScenario = {
  name: 'replay-attack-flood',
  description: 'Test system resilience against replay attack floods',
  config: {
    concurrentRequests: 200,
    duration: 30,
    thinkTime: 50,
    timeout: 5000,
  },
  async execute(target: LoadTestTarget): Promise<LoadTestResult> {
    const startTime = Date.now();
    const endTime = startTime + (this.config.duration * 1000);

    const requests: Array<Promise<void>> = [];
    const results: Array<{ success: boolean; responseTime: number; error?: string }> = [];

    const wallet = generateTestWallet(0);
    const siweMessage = generateSiweMessage(wallet.address);
    const signature = await signMessage(wallet, siweMessage);

    for (let i = 0; i < this.config.concurrentRequests; i++) {
      const request = executeReplayAttack(target, siweMessage, signature, startTime, endTime, results);
      requests.push(request);
    }

    await Promise.all(requests);

    return calculateResults('replay-attack-flood', startTime, results);
  },
};

export const malformedRpcTest: LoadTestScenario = {
  name: 'malformed-rpc-storm',
  description: 'Test system with malformed RPC requests',
  config: {
    concurrentRequests: 500,
    duration: 45,
    thinkTime: 10,
    timeout: 3000,
  },
  async execute(target: LoadTestTarget): Promise<LoadTestResult> {
    const startTime = Date.now();
    const endTime = startTime + (this.config.duration * 1000);

    const requests: Array<Promise<void>> = [];
    const results: Array<{ success: boolean; responseTime: number; error?: string }> = [];

    const malformedRequests = [
      { jsonrpc: '2.0', id: 1, method: '', params: [] },
      { jsonrpc: '1.0', id: 1, method: 'eth_getBalance', params: [] },
      { jsonrpc: '2.0', method: 'eth_getBalance' },
      { jsonrpc: '2.0', id: 'invalid', method: 'eth_getBalance', params: [] },
      { jsonrpc: '2.0', id: 1, method: 'invalid_method', params: [] },
      { jsonrpc: '2.0', id: 1, method: 'eth_getBalance', params: 'invalid' },
      '',
      'invalid json',
      { method: 'eth_getBalance' },
    ];

    for (let i = 0; i < this.config.concurrentRequests; i++) {
      const malformedRequest = malformedRequests[i % malformedRequests.length];
      const request = executeMalformedRpc(target, malformedRequest, startTime, endTime, results);
      requests.push(request);
    }

    await Promise.all(requests);

    return calculateResults('malformed-rpc-storm', startTime, results);
  },
};

export const redisFailureTest: LoadTestScenario = {
  name: 'redis-failure-under-load',
  description: 'Test system behavior when Redis fails under load',
  config: {
    concurrentRequests: 150,
    duration: 40,
    thinkTime: 200,
    timeout: 8000,
  },
  async execute(target: LoadTestTarget): Promise<LoadTestResult> {
    const startTime = Date.now();
    const endTime = startTime + (this.config.duration * 1000);

    const requests: Array<Promise<void>> = [];
    const results: Array<{ success: boolean; responseTime: number; error?: string }> = [];

    for (let i = 0; i < this.config.concurrentRequests; i++) {
      const operation = i % 3;
      let request: Promise<void>;

      switch (operation) {
        case 0:
          request = executeNonceRequest(target, startTime, endTime, results);
          break;
        case 1:
          request = executeLoginAttempt(target, generateTestWallet(i), startTime, endTime, results);
          break;
        case 2:
          request = executeRpcRequest(target, startTime, endTime, results);
          break;
        default:
          request = executeNonceRequest(target, startTime, endTime, results);
      }

      requests.push(request);
    }

    await Promise.all(requests);

    return calculateResults('redis-failure-under-load', startTime, results);
  },
};

function generateTestWallet(index: number) {

  return {
    address: `0x${index.toString(16).padStart(40, '0')}`,
    privateKey: `0x${index.toString(16).padStart(64, '0')}`,
  };
}

function generateSiweMessage(address: string) {
  return `localhost wants you to sign in with your Ethereum account:\n${address}\n\nURI: http://localhost\nVersion: 1\nChain ID: 1\nNonce: ${Math.random().toString(36).substring(2, 10)}\nIssued At: ${new Date().toISOString()}`;
}

async function signMessage(wallet: any, message: string) {

  return '0x' + 'a'.repeat(130);
}

async function executeLoginAttempt(target: LoadTestTarget, wallet: any, startTime: number, endTime: number, results: any[]) {
  while (Date.now() < endTime) {
    const start = Date.now();
    try {
      const siweMessage = generateSiweMessage(wallet.address);
      const signature = await signMessage(wallet, siweMessage);

      const response = await fetch(`${target.baseUrl}${target.endpoints.login}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...target.headers },
        body: JSON.stringify({ message: siweMessage, signature }),
      });

      results.push({ success: response.ok, responseTime: Date.now() - start });
    } catch (err) {
      results.push({ success: false, responseTime: Date.now() - start, error: (err as any).message });
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

async function executeReplayAttack(target: LoadTestTarget, siweMessage: string, signature: string, startTime: number, endTime: number, results: any[]) {
  while (Date.now() < endTime) {
    const start = Date.now();
    try {
      const response = await fetch(`${target.baseUrl}${target.endpoints.login}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...target.headers },
        body: JSON.stringify({ message: siweMessage, signature }),
      });

      results.push({ success: response.ok, responseTime: Date.now() - start });
    } catch (err) {
      results.push({ success: false, responseTime: Date.now() - start, error: (err as any).message });
    }
    await new Promise(resolve => setTimeout(resolve, 50));
  }
}

async function executeMalformedRpc(target: LoadTestTarget, malformedRequest: any, startTime: number, endTime: number, results: any[]) {
  while (Date.now() < endTime) {
    const start = Date.now();
    try {
      const response = await fetch(`${target.baseUrl}${target.endpoints.rpc.replace(':chainId', '1')}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...target.headers },
        body: typeof malformedRequest === 'string' ? malformedRequest : JSON.stringify(malformedRequest),
      });

      results.push({ success: response.ok, responseTime: Date.now() - start });
    } catch (err) {
      results.push({ success: false, responseTime: Date.now() - start, error: (err as any).message });
    }
    await new Promise(resolve => setTimeout(resolve, 10));
  }
}

function calculateResults(scenario: string, startTime: number, results: any[]): LoadTestResult {
  const endTime = Date.now();
  const successfulRequests = results.filter(r => r.success).length;
  const failedRequests = results.length - successfulRequests;
  const responseTimes = results.map(r => r.responseTime).sort((a, b) => a - b);
  const averageResponseTime = responseTimes.length > 0 ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length : 0;

  const errorsMap = new Map<string, { count: number; samples: string[] }>();
  results.filter(r => r.error).forEach(r => {
    const err = r.error!;
    const entry = errorsMap.get(err) || { count: 0, samples: [] };
    entry.count++;
    if (entry.samples.length < 3) entry.samples.push(err);
    errorsMap.set(err, entry);
  });

  return {
    scenario,
    startTime,
    endTime,
    totalRequests: results.length,
    successfulRequests,
    failedRequests,
    averageResponseTime,
    minResponseTime: responseTimes[0] ?? 0,
    maxResponseTime: responseTimes[responseTimes.length - 1] ?? 0,
    p95ResponseTime: responseTimes[Math.floor(responseTimes.length * 0.95)] ?? 0,
    p99ResponseTime: responseTimes[Math.floor(responseTimes.length * 0.99)] ?? 0,
    requestsPerSecond: results.length / ((endTime - startTime) / 1000),
    errors: Array.from(errorsMap.entries()).map(([error, data]) => ({ error, ...data })),
    securityMetrics: {
      rateLimitHits: 0,
      authFailures: 0,
      suspiciousActivityDetections: 0,
    },
  };
}

export class LoadTestEngine {
  private scenarios: Map<string, LoadTestScenario> = new Map();

  constructor() {

    this.registerScenario(highConcurrencyLoginTest);
    this.registerScenario(replayAttackTest);
    this.registerScenario(malformedRpcTest);
    this.registerScenario(redisFailureTest);
  }

  registerScenario(scenario: LoadTestScenario): void {
    this.scenarios.set(scenario.name, scenario);
  }

  getScenario(name: string): LoadTestScenario | undefined {
    return this.scenarios.get(name);
  }

  listScenarios(): LoadTestScenario[] {
    return Array.from(this.scenarios.values());
  }

  async runScenario(
    scenarioName: string,
    target: LoadTestTarget,
    options: {
      onProgress?: (progress: number, result: LoadTestResult) => void;
      verbose?: boolean;
    } = {}
  ): Promise<LoadTestResult> {
    const scenario = this.scenarios.get(scenarioName);
    if (!scenario) {
      throw new TalakWeb3Error(`Load test scenario "${scenarioName}" not found`, {
        code: 'LOAD_TEST_SCENARIO_NOT_FOUND',
        status: 404,
      });
    }

    if (options.verbose) {
      console.log(`[LOAD_TEST] Starting scenario: ${scenario.name}`);
      console.log(`[LOAD_TEST] Description: ${scenario.description}`);
      console.log(`[LOAD_TEST] Config:`, scenario.config);
    }

    const result = await scenario.execute(target);

    if (options.verbose) {
      console.log(`[LOAD_TEST] Scenario completed: ${scenario.name}`);
      console.log(`[LOAD_TEST] Results:`, result);
    }

    return result;
  }

  async runAllScenarios(
    target: LoadTestTarget,
    options: {
      onProgress?: (scenario: string, result: LoadTestResult) => void;
      verbose?: boolean;
    } = {}
  ): Promise<LoadTestResult[]> {
    const results: LoadTestResult[] = [];

    for (const scenario of this.scenarios.values()) {
      try {
        const result = await this.runScenario(scenario.name, target, {
          verbose: options.verbose,
        });
        results.push(result);
        options.onProgress?.(scenario.name, result);
      } catch (err) {
        console.error(`[LOAD_TEST] Scenario ${scenario.name} failed:`, err);

      }
    }

    return results;
  }

  generateReport(results: LoadTestResult[]): string {
    const report = `
# Adversarial Load Testing Report

Generated: ${new Date().toISOString()}

## Summary
- Total Scenarios: ${results.length}
- Total Requests: ${results.reduce((sum, r) => sum + r.totalRequests, 0)}
- Overall Success Rate: ${((results.reduce((sum, r) => sum + r.successfulRequests, 0) / results.reduce((sum, r) => sum + r.totalRequests, 0)) * 100).toFixed(2)}%

## Scenario Results

${results.map(result => `
### ${result.scenario}
- **Duration:** ${((result.endTime - result.startTime) / 1000).toFixed(2)}s
- **Total Requests:** ${result.totalRequests}
- **Success Rate:** ${((result.successfulRequests / result.totalRequests) * 100).toFixed(2)}%
- **Average Response Time:** ${result.averageResponseTime.toFixed(2)}ms
- **P95 Response Time:** ${result.p95ResponseTime.toFixed(2)}ms
- **P99 Response Time:** ${result.p99ResponseTime.toFixed(2)}ms
- **Requests/sec:** ${result.requestsPerSecond.toFixed(2)}
- **Rate Limit Hits:** ${result.securityMetrics.rateLimitHits}
- **Auth Failures:** ${result.securityMetrics.authFailures}
- **Suspicious Activity:** ${result.securityMetrics.suspiciousActivityDetections}

**Errors:**
${result.errors.map(err => `- ${err.error}: ${err.count} occurrences`).join('\n')}
`).join('\n')}

## Recommendations
${generateRecommendations(results)}
    `.trim();

    return report;
  }
}

async function executeLoginAttempt(
  target: LoadTestTarget,
  wallet: TestWallet,
  startTime: number,
  endTime: number,
  results: Array<{ success: boolean; responseTime: number; error?: string }>
): Promise<void> {
  while (Date.now() < endTime) {
    const requestStart = Date.now();

    try {

      const nonceResponse = await fetch(`${target.baseUrl}${target.endpoints.nonce}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...target.headers,
        },
        body: JSON.stringify({ address: wallet.address }),
      });

      if (!nonceResponse.ok) {
        results.push({ success: false, responseTime: Date.now() - requestStart, error: 'nonce_failed' });
        continue;
      }

      const { nonce } = await nonceResponse.json();

      const siweMessage = generateSiweMessage(wallet.address, nonce);
      const signature = await signMessage(wallet, siweMessage);

      const loginResponse = await fetch(`${target.baseUrl}${target.endpoints.login}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...target.headers,
        },
        body: JSON.stringify({ message: siweMessage, signature }),
      });

      const responseTime = Date.now() - requestStart;
      results.push({
        success: loginResponse.ok,
        responseTime,
        error: loginResponse.ok ? undefined : 'login_failed'
      });

    } catch (err) {
      results.push({
        success: false,
        responseTime: Date.now() - requestStart,
        error: err instanceof Error ? err.message : 'unknown_error'
      });
    }

    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

async function executeReplayAttack(
  target: LoadTestTarget,
  siweMessage: string,
  signature: string,
  startTime: number,
  endTime: number,
  results: Array<{ success: boolean; responseTime: number; error?: string }>
): Promise<void> {
  while (Date.now() < endTime) {
    const requestStart = Date.now();

    try {
      const response = await fetch(`${target.baseUrl}${target.endpoints.login}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...target.headers,
        },
        body: JSON.stringify({ message: siweMessage, signature }),
      });

      const responseTime = Date.now() - requestStart;
      results.push({
        success: response.ok,
        responseTime,
        error: response.ok ? undefined : 'replay_rejected'
      });

    } catch (err) {
      results.push({
        success: false,
        responseTime: Date.now() - requestStart,
        error: err instanceof Error ? err.message : 'unknown_error'
      });
    }

    await new Promise(resolve => setTimeout(resolve, 50));
  }
}

async function executeMalformedRpc(
  target: LoadTestTarget,
  malformedRequest: any,
  startTime: number,
  endTime: number,
  results: Array<{ success: boolean; responseTime: number; error?: string }>
): Promise<void> {
  while (Date.now() < endTime) {
    const requestStart = Date.now();

    try {
      const response = await fetch(`${target.baseUrl}${target.endpoints.rpc}/1`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...target.headers,
        },
        body: typeof malformedRequest === 'string' ? malformedRequest : JSON.stringify(malformedRequest),
      });

      const responseTime = Date.now() - requestStart;
      results.push({
        success: response.ok,
        responseTime,
        error: response.ok ? undefined : 'malformed_rejected'
      });

    } catch (err) {
      results.push({
        success: false,
        responseTime: Date.now() - requestStart,
        error: err instanceof Error ? err.message : 'unknown_error'
      });
    }

    await new Promise(resolve => setTimeout(resolve, 10));
  }
}

async function executeNonceRequest(
  target: LoadTestTarget,
  startTime: number,
  endTime: number,
  results: Array<{ success: boolean; responseTime: number; error?: string }>
): Promise<void> {
  const wallet = generateTestWallet(Math.floor(Math.random() * 10000));

  while (Date.now() < endTime) {
    const requestStart = Date.now();

    try {
      const response = await fetch(`${target.baseUrl}${target.endpoints.nonce}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...target.headers,
        },
        body: JSON.stringify({ address: wallet.address }),
      });

      const responseTime = Date.now() - requestStart;
      results.push({
        success: response.ok,
        responseTime,
        error: response.ok ? undefined : 'nonce_failed'
      });

    } catch (err) {
      results.push({
        success: false,
        responseTime: Date.now() - requestStart,
        error: err instanceof Error ? err.message : 'unknown_error'
      });
    }

    await new Promise(resolve => setTimeout(resolve, 200));
  }
}

async function executeRpcRequest(
  target: LoadTestTarget,
  startTime: number,
  endTime: number,
  results: Array<{ success: boolean; responseTime: number; error?: string }>
): Promise<void> {
  while (Date.now() < endTime) {
    const requestStart = Date.now();

    try {
      const response = await fetch(`${target.baseUrl}${target.endpoints.rpc}/1`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...target.headers,
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_getBalance',
          params: ['0x0000000000000000000000000000000000000000', 'latest'],
        }),
      });

      const responseTime = Date.now() - requestStart;
      results.push({
        success: response.ok,
        responseTime,
        error: response.ok ? undefined : 'rpc_failed'
      });

    } catch (err) {
      results.push({
        success: false,
        responseTime: Date.now() - requestStart,
        error: err instanceof Error ? err.message : 'unknown_error'
      });
    }

    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

function calculateResults(
  scenario: string,
  startTime: number,
  results: Array<{ success: boolean; responseTime: number; error?: string }>
): LoadTestResult {
  const endTime = Date.now();
  const successfulResults = results.filter(r => r.success);
  const failedResults = results.filter(r => !r.success);

  const responseTimes = results.map(r => r.responseTime).sort((a, b) => a - b);
  const averageResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;

  const p95Index = Math.floor(responseTimes.length * 0.95);
  const p99Index = Math.floor(responseTimes.length * 0.99);

  const errorCounts = new Map<string, number>();
  failedResults.forEach(result => {
    const error = result.error || 'unknown';
    errorCounts.set(error, (errorCounts.get(error) || 0) + 1);
  });

  const errors = Array.from(errorCounts.entries()).map(([error, count]) => ({
    error,
    count,
    samples: failedResults.filter(r => r.error === error).slice(0, 3).map(r => String(r.responseTime)),
  }));

  return {
    scenario,
    startTime,
    endTime,
    totalRequests: results.length,
    successfulRequests: successfulResults.length,
    failedRequests: failedResults.length,
    averageResponseTime,
    minResponseTime: responseTimes[0] || 0,
    maxResponseTime: responseTimes[responseTimes.length - 1] || 0,
    p95ResponseTime: responseTimes[p95Index] || 0,
    p99ResponseTime: responseTimes[p99Index] || 0,
    requestsPerSecond: results.length / ((endTime - startTime) / 1000),
    errors,
    securityMetrics: {
      rateLimitHits: errorCounts.get('rate_limit') || 0,
      authFailures: errorCounts.get('auth_failed') || 0,
      suspiciousActivityDetections: errorCounts.get('suspicious_activity') || 0,
    },
  };
}

function generateRecommendations(results: LoadTestResult[]): string {
  const recommendations: string[] = [];

  const highFailureScenarios = results.filter(r => (r.failedRequests / r.totalRequests) > 0.1);
  if (highFailureScenarios.length > 0) {
    recommendations.push('- Consider increasing rate limits or improving error handling for scenarios with high failure rates');
  }

  const slowScenarios = results.filter(r => r.p95ResponseTime > 5000);
  if (slowScenarios.length > 0) {
    recommendations.push('- Optimize performance for scenarios with P95 response times > 5s');
  }

  const securityIssues = results.some(r => r.securityMetrics.rateLimitHits > r.totalRequests * 0.5);
  if (securityIssues) {
    recommendations.push('- Review rate limiting configuration - high rate of limit hits detected');
  }

  return recommendations.length > 0 ? recommendations.join('\n') : '- System performed well within acceptable limits';
}

interface TestWallet {
  address: string;
  privateKey: string;
}

function generateTestWallet(index: number): TestWallet {
  return {
    address: `0x${index.toString(16).padStart(40, '0')}`,
    privateKey: `0x${index.toString(16).padStart(64, '0')}`,
  };
}

function generateSiweMessage(address: string, nonce?: string): string {
  const timestamp = new Date().toISOString();
  const actualNonce = nonce ?? Math.random().toString(36).substring(2, 15);

  return `talak-web3.example.com wants you to sign in with your Ethereum account:
${address}

I accept the Login to talak-web3.example.com.

URI: https://talak-web3.example.com
Version: 1
Chain ID: 1
Nonce: ${actualNonce}
Issued At: ${timestamp}`;
}

async function signMessage(wallet: TestWallet, message: string): Promise<string> {

  return `0x${Buffer.from(message + wallet.privateKey).toString('hex')}`;
}

export const loadTestEngine = new LoadTestEngine();

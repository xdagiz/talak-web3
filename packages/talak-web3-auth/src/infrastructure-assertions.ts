import type Redis from 'ioredis';
import { TalakWeb3Error } from '@talak-web3/errors';

export interface RedisConfigAssertion {
  key: string;
  expected: string | RegExp | ((value: string) => boolean);
  description: string;
}

export interface RedisReplicationAssertion {
  minReplicas: number;
  maxLagSeconds: number;
}

export async function assertRedisConfiguration(redis: Redis): Promise<void> {
  console.log('[AUTH] Verifying Redis configuration...');

  const assertions: RedisConfigAssertion[] = [
    {
      key: 'appendonly',
      expected: 'yes',
      description: 'AOF durability must be enabled for nonce/revocation persistence',
    },
    {
      key: 'appendfsync',
      expected: (value: string) => value === 'everysec' || value === 'always',
      description: 'AOF fsync must be everysec or always (not no)',
    },
    {
      key: 'min-replicas-to-write',
      expected: (value: string) => parseInt(value, 10) >= 1,
      description: 'At least 1 replica required for write acknowledgment',
    },
    {
      key: 'min-replicas-max-lag',
      expected: (value: string) => parseInt(value, 10) <= 10,
      description: 'Replica lag must be bounded to ≤10 seconds',
    },
    {
      key: 'maxmemory-policy',
      expected: 'noeviction',
      description: 'Memory eviction must be disabled to prevent security data loss',
    },
    {
      key: 'protected-mode',
      expected: 'yes',
      description: 'Protected mode must be enabled',
    },
  ];

  const failures: string[] = [];

  for (const assertion of assertions) {
    try {
      const value = await redis.config('GET', assertion.key);
      const actualValue = value?.[1] || '';

      let isValid = false;

      if (typeof assertion.expected === 'string') {
        isValid = actualValue === assertion.expected;
      } else if (assertion.expected instanceof RegExp) {
        isValid = assertion.expected.test(actualValue);
      } else if (typeof assertion.expected === 'function') {
        isValid = assertion.expected(actualValue);
      }

      if (!isValid) {
        failures.push(
          `${assertion.key}: expected ${assertion.expected}, got "${actualValue}" — ${assertion.description}`
        );
      }
    } catch (err) {
      failures.push(
        `${assertion.key}: failed to read config — ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  if (failures.length > 0) {
    const errorMessage = [
      '[CRITICAL] Redis configuration assertion failed:',
      'System cannot start with insecure Redis configuration.',
      '',
      ...failures.map(f => `  - ${f}`),
      '',
      'Required fixes:',
      '  1. Update redis.conf with required settings',
      '  2. Restart Redis server',
      '  3. See REDIS_DEPLOYMENT_RUNBOOK.md for full configuration',
    ].join('\n');

    console.error(errorMessage);

    throw new TalakWeb3Error('Redis configuration assertion failed', {
      code: 'AUTH_REDIS_CONFIG_ASSERTION_FAILED',
      status: 503,
      data: { failures },
    });
  }

  console.log('[AUTH] Redis configuration verified ✓');
}

export async function assertRedisReplication(
  redis: Redis,
  assertion: RedisReplicationAssertion
): Promise<void> {
  console.log('[AUTH] Verifying Redis replication status...');

  try {
    const info = await redis.info('replication');
    const role = info.match(/role:(master|slave)/)?.[1];

    if (!role) {
      throw new Error('Unable to determine Redis role');
    }

    if (role === 'master') {

      const connectedSlaves = parseInt(info.match(/connected_slaves:(\d+)/)?.[1] || '0');

      if (connectedSlaves < assertion.minReplicas) {
        throw new Error(
          `Insufficient replicas: have ${connectedSlaves}, need ${assertion.minReplicas}`
        );
      }

      const lagBytes = parseInt(info.match(/master_repl_offset:(\d+)/)?.[1] || '0');
      const maxLagBytes = assertion.maxLagSeconds * 10000;

      if (lagBytes > maxLagBytes) {
        throw new Error(
          `Replication lag too high: ${lagBytes} bytes (>${maxLagBytes} bytes threshold)`
        );
      }

      console.log(`[AUTH] Redis replication verified ✓ (${connectedSlaves} replicas connected)`);
    } else {

      const masterLinkStatus = info.match(/master_link_status:(up|down)/)?.[1];

      if (masterLinkStatus !== 'up') {
        throw new Error('Replica not connected to primary');
      }

      console.log('[AUTH] Redis replica status verified ✓');
    }
  } catch (err) {
    const errorMessage = [
      '[CRITICAL] Redis replication assertion failed:',
      'System cannot start with degraded replication.',
      '',
      `  Error: ${err instanceof Error ? err.message : String(err)}`,
      '',
      'Required fixes:',
      '  1. Check Redis replica health',
      '  2. Verify network connectivity between primary and replicas',
      '  3. See REDIS_DEPLOYMENT_RUNBOOK.md for troubleshooting',
    ].join('\n');

    console.error(errorMessage);

    throw new TalakWeb3Error('Redis replication assertion failed', {
      code: 'AUTH_REDIS_REPLICATION_ASSERTION_FAILED',
      status: 503,
      cause: err,
    });
  }
}

export async function assertRedisInfrastructure(redis: Redis): Promise<void> {
  try {

    await redis.ping();
    console.log('[AUTH] Redis connectivity verified ✓');

    await assertRedisConfiguration(redis);

    await assertRedisReplication(redis, {
      minReplicas: 1,
      maxLagSeconds: 10,
    });
  } catch (err) {
    console.error('[AUTH] Infrastructure assertion failed — refusing to start');
    throw err;
  }
}

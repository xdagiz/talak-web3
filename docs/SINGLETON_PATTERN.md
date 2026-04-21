# Singleton Pattern Limitation

## Overview

The `talakWeb3()` factory function uses a **singleton pattern** - it creates only one instance per process and returns the same instance on subsequent calls.

## What This Means

```typescript
import { talakWeb3 } from 'talak-web3';

const instance1 = talakWeb3(config1);
const instance2 = talakWeb3(config2);

instance1 === instance2;
```

## Limitations

### 1. **Cannot Create Multiple Instances**
You cannot create separate instances for:
- Different chains/environments
- Multiple dApps in the same process
- Isolated testing scenarios

### 2. **Testing Requires Reset**
Tests must call `__resetTalakWeb3()` before each test:

```typescript
import { talakWeb3, __resetTalakWeb3 } from 'talak-web3';

beforeEach(() => {
  __resetTalakWeb3();
});
```

⚠️ **Warning**: This is fragile and can lead to test pollution if forgotten.

### 3. **Serverless Cold Starts**
In serverless environments (AWS Lambda, Vercel, etc.):
- The singleton may persist across invocations during warm starts
- Configuration from the first invocation will be reused
- This can cause unexpected behavior if different invocations need different configs

### 4. **Multiple dApps in Same Process**
If you're running multiple dApps in the same Node.js process, they will share the same talak-web3 instance, which may not be desirable.

## Workarounds

### For Testing
Always reset the singleton in test setup:

```typescript
setupFiles: ['./test-setup.ts']

import { __resetTalakWeb3 } from 'talak-web3';

beforeEach(() => {
  __resetTalakWeb3();
});
```

### For Serverless
Initialize once at module level and reuse:

```typescript
import { talakWeb3, MainnetPreset } from 'talak-web3';

export const talak = talakWeb3(MainnetPreset);

export async function handler(event) {
  await talak.init();

}
```

### For Multiple Chains
Use the multichain support within a single instance:

```typescript
const talak = talakWeb3({
  chains: [
    { id: 1, name: 'Ethereum', rpcUrls: ['...'], ... },
    { id: 137, name: 'Polygon', rpcUrls: ['...'], ... },
  ],

});
```

## Why Singleton?

The singleton pattern was chosen for:
1. **Simplicity**: Most dApps only need one instance
2. **Resource Management**: Prevents multiple WebSocket/RPC connections
3. **State Consistency**: Ensures single source of truth for auth, cache, etc.

## Future Considerations

A future major version may:
- Remove the singleton pattern entirely
- Support multiple isolated instances
- Provide a factory that returns new instances on each call

This would be a **breaking change** and would require a major version bump.

## Migration Path (If Singleton is Removed)

If you're building for the future, structure your code to easily migrate:

```typescript
const talak = talakWeb3(config);

class TalakService {
  private static instance = talakWeb3(config);

  static get() {
    return this.instance;
  }
}

class TalakService {
  static get() {
    return talakWeb3(config);
  }
}
```

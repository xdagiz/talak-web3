# @talak-web3/plugins

Plugin system for extending talak-web3 functionality.

## Installation

```bash
npm install @talak-web3/plugins

yarn add @talak-web3/plugins

pnpm add @talak-web3/plugins
```

## Creating a Plugin

```typescript
import { definePlugin } from '@talak-web3/plugins';

const myPlugin = definePlugin({
  name: 'my-plugin',
  version: '1.0.0',

  setup(context) {

    context.on('auth:login', (user) => {
      console.log(`User ${user.address} logged in`);
    });

    return {

      customMethod: () => {

      },
    };
  },
});

export default myPlugin;
```

## Using Plugins

```typescript
import { createTalakClient } from 'talak-web3';
import myPlugin from './my-plugin';

const client = createTalakClient({
  plugins: [myPlugin],
});

client.plugins['my-plugin'].customMethod();
```

## Official Plugins

- `@talak-web3/plugin-siwe` - SIWE authentication
- `@talak-web3/plugin-gasless` - Gasless transactions
- `@talak-web3/plugin-multisig` - Multi-signature support

## License

MIT

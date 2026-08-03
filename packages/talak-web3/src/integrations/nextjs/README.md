# Next.js Integration for talak-web3

App Router integration via `talak-web3/nextjs`. See the [Next.js integration](https://docs.talak.dev/docs/nextjs) for the full guide.

## Quick start

```ts
import { toNextJsHandler, nextCookies } from "talak-web3/nextjs";
```

### Route handler

```ts
// app/api/auth/[...talak]/route.ts
import { toNextJsHandler } from "talak-web3/nextjs";
import { app } from "@/talak.config";

const handler = toNextJsHandler(app);

export const GET = handler.GET;
export const POST = handler.POST;
export const PUT = handler.PUT;
export const PATCH = handler.PATCH;
export const DELETE = handler.DELETE;
```

### Cookie plugin

```ts
import { talakWeb3 } from "talak-web3";
import { nextCookies } from "talak-web3/nextjs";

const app = talakWeb3({
  chains: [...],
  plugins: [nextCookies()],
});
```

### Server session

```ts
import { getSession } from "talak-web3/nextjs";
import { app } from "@/talak.config";

const session = await getSession(app);
```

### Middleware

```ts
import { createMiddleware } from "talak-web3/nextjs";

export const middleware = createMiddleware();
```

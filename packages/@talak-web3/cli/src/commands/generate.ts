import fs from 'node:fs';
import path from 'node:path';

interface GenerateOptions {
  project?: string;
}

type GenerateType = 'component' | 'hook' | 'api-route' | 'middleware' | 'plugin';

export async function generateCommand(type: string, name: string, options: GenerateOptions = {}) {
  const projectPath = options.project || '.';

  const validTypes: GenerateType[] = ['component', 'hook', 'api-route', 'middleware', 'plugin'];

  if (!validTypes.includes(type as GenerateType)) {
    console.error(`❌ Unknown type: ${type}`);
    console.log(`Valid types: ${validTypes.join(', ')}`);
    process.exit(1);
  }

  console.log(`📝 Generating ${type}: ${name}...`);

  const generator = generators[type as GenerateType];
  const files = generator(name);

  for (const [filePath, content] of Object.entries(files)) {
    const fullPath = path.join(projectPath, filePath);
    const dir = path.dirname(fullPath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(fullPath, content);
    console.log(`  ✓ Created: ${filePath}`);
  }

  console.log(`\n✅ Generated ${type} "${name}" successfully!`);
}

const generators: Record<GenerateType, (name: string) => Record<string, string>> = {
  component: (name) => ({
    [`src/components/${name}.tsx`]: `import React from 'react';
import { useSession } from 'talak-web3/react';

interface ${name}Props {
  // Add your props here
}

export function ${name}(props: ${name}Props) {
  const { session, isAuthenticated } = useSession();

  return (
    <div className="${name.toLowerCase()}">
      {isAuthenticated ? (
        <p>Welcome, {session?.address}</p>
      ) : (
        <p>Please connect your wallet</p>
      )}
    </div>
  );
}
`,
    [`src/components/${name}.test.tsx`]: `import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ${name} } from './${name}';

describe('${name}', () => {
  it('renders correctly', () => {
    render(<${name} />);
    expect(screen.getByText('Please connect your wallet')).toBeInTheDocument();
  });
});
`,
  }),

  hook: (name) => ({
    [`src/hooks/use${name}.ts`]: `import { useState, useEffect } from 'react';
import { useSession } from 'talak-web3/react';

interface Use${name}Options {
  // Add your options here
}

interface Use${name}Result {
  data: unknown;
  isLoading: boolean;
  error: Error | null;
}

export function use${name}(options: Use${name}Options = {}): Use${name}Result {
  const { session } = useSession();
  const [data, setData] = useState<unknown>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!session) return;

    async function fetchData() {
      try {
        setIsLoading(true);
        // Add your data fetching logic here
        setData(null);
      } catch (err) {
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [session]);

  return { data, isLoading, error };
}
`,
    [`src/hooks/use${name}.test.ts`]: `import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { use${name} } from './use${name}';

describe('use${name}', () => {
  it('returns initial state', () => {
    const { result } = renderHook(() => use${name}());

    expect(result.current.data).toBeNull();
    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBeNull();
  });
});
`,
  }),

  'api-route': (name) => ({
    [`src/app/api/${name.toLowerCase()}/route.ts`]: `import { NextRequest, NextResponse } from 'next/server';
import { app } from '../../../talak.config';

export async function GET(request: NextRequest) {
  try {
    // Verify session
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const session = await app.context.auth.verifySession(token);

    // Handle request
    return NextResponse.json({
      success: true,
      address: session.address
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Handle POST request
    return NextResponse.json({ success: true, data: body });
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    );
  }
}
`,
  }),

  middleware: (name) => ({
    [`src/middleware/${name}.ts`]: `import type { TalakWeb3Context } from '@talak-web3/core';

export async function ${name}Middleware(
  request: unknown,
  next: () => Promise<unknown>,
  context: TalakWeb3Context
): Promise<unknown> {
  // Pre-processing
  console.log('${name} middleware - before');

  const result = await next();

  // Post-processing
  console.log('${name} middleware - after');

  return result;
}
`,
  }),

  plugin: (name) => ({
    [`src/plugins/${name}.ts`]: `import type { TalakWeb3Plugin, TalakWeb3Context } from '@talak-web3/core';

export interface ${name}Options {
  // Add your plugin options here
}

export function ${name}Plugin(options: ${name}Options = {}): TalakWeb3Plugin {
  return {
    name: '${name.toLowerCase()}',
    version: '1.0.0',

    async setup(context: TalakWeb3Context) {
      console.log('${name} plugin initialized');

      // Register hooks
      context.hooks.on('plugin-load', ({ name }) => {
        console.log(\`Plugin loaded: \${name}\`);
      });

      // Add middleware
      context.requestChain.use(async (req, next) => {
        // Add your middleware logic here
        return next();
      });
    },

    async teardown() {
      console.log('${name} plugin teardown');
    },
  };
}
`,
  }),
};

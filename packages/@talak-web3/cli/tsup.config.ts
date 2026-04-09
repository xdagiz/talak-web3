import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/bin.ts'],
  format: ['esm', 'cjs'],
  dts: false,
  clean: true,
  splitting: false,
  sourcemap: true,
  target: 'es2022',
});

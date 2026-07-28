import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { Application, type TypeDocOptions } from "typedoc";
import type { PluginOptions as FrontmatterPluginOptions } from "typedoc-plugin-frontmatter";
import type { PluginOptions as MarkdownPluginOptions } from "typedoc-plugin-markdown";

import { baseTypeDocOptions, discoverPackages } from "../typedoc.config.js";

const __dirname = import.meta.dirname;

const customPluginPath = resolve(__dirname, "typedoc-custom-plugin.mjs");
const contentRoot = resolve(__dirname, "../content/docs/api-reference");

type MarkdownTypeDocOptions = TypeDocOptions & MarkdownPluginOptions & FrontmatterPluginOptions;

const writeJson = async (path: string, value: unknown) => {
  await writeFile(path, JSON.stringify(value, null, 2) + "\n");
};

const stripExtension = (relPath: string) => relPath.replace(/\.mdx?$/, "");

type NavigationChild = {
  title: string;
  path?: string;
  children?: NavigationChild[];
};

const isNavigationChild = (value: unknown): value is NavigationChild => {
  return typeof value === "object" && value !== null && "title" in value;
};

const navigationToPages = (nav: NavigationChild[]): string[] => {
  const pages: string[] = [];

  for (const group of nav) {
    if (!group.children || group.children.length === 0) continue;
    if (/^(modules|globals)$/i.test(group.title)) continue;

    pages.push(`---${group.title}---`);
    for (const child of group.children) {
      if (!child.path) continue;
      pages.push(`./${stripExtension(child.path)}`);
    }
  }

  return pages;
};

const generatePackageMeta = async (outDir: string, navPath: string, pkgName: string) => {
  const raw = await readFile(navPath, "utf-8");
  const parsed = JSON.parse(raw);

  if (!Array.isArray(parsed)) throw new Error(`expected ${navPath} to contain a JSON array`);

  const pages = navigationToPages(parsed.filter(isNavigationChild));
  await writeJson(resolve(outDir, "meta.json"), {
    title: `@talak-web3/${pkgName}`,
    pages,
  });
};

const generateRootMeta = async (packageNames: string[]) => {
  await mkdir(contentRoot, { recursive: true });

  const pages = ["---Packages---"];
  for (const name of packageNames) pages.push(`./${name}`);

  await writeJson(resolve(contentRoot, "meta.json"), {
    title: "API Reference",
    pages,
  });
};

const runPackage = async (pkg: Awaited<ReturnType<typeof discoverPackages>>[number]) => {
  console.log(`→ ${pkg.name}`);

  await rm(pkg.outDir, { recursive: true, force: true });
  await mkdir(pkg.outDir, { recursive: true });

  const navPath = resolve(pkg.outDir, ".navigation.json");

  const options = {
    ...baseTypeDocOptions,
    entryPoints: pkg.entryPoints,
    tsconfig: pkg.tsconfig,
    out: pkg.outDir,
    navigationJson: navPath,
    readmeFrontmatter: { title: `@talak-web3/${pkg.name}` },
    plugin: [...baseTypeDocOptions.plugin, customPluginPath],
  } satisfies MarkdownTypeDocOptions;

  const app = await Application.bootstrapWithPlugins(options);
  const project = await app.convert();

  if (!project) throw new Error(`TypeDoc failed to convert ${pkg.name}`);

  await app.generateOutputs(project);

  await rm(resolve(pkg.outDir, "globals.md"), { force: true });
  await rm(resolve(pkg.outDir, "_media"), { recursive: true, force: true });

  await generatePackageMeta(pkg.outDir, navPath, pkg.name);
  await rm(navPath, { force: true });
};

const main = async () => {
  const packages = await discoverPackages();
  if (packages.length === 0) {
    throw new Error(`no packages discovered under ${resolve(__dirname, "../../packages")}`);
  }

  for (const pkg of packages) await runPackage(pkg);

  await generateRootMeta(packages.map((p) => p.name));
  console.log(`✓ generated API reference for ${packages.length} packages`);
};

await main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});

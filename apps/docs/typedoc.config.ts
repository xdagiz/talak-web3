import { access, readdir } from "node:fs/promises";
import { resolve } from "node:path";

export type Package = {
  name: string;
  entryPoints: string[];
  tsconfig: string;
  outDir: string;
};

const __dirname = import.meta.dirname;

const packagesDir = resolve(__dirname, "../../packages");
const contentDir = resolve(__dirname, "content/docs/api-reference");

const EXCLUDED_PACKAGES: ReadonlySet<string> = new Set(["cli"]);

const exists = (path: string) =>
  access(path).then(
    () => true,
    () => false,
  );

export const discoverPackages = async (): Promise<Package[]> => {
  const entries = await readdir(packagesDir, { withFileTypes: true });
  const discovered: Package[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith(".")) continue;
    if (EXCLUDED_PACKAGES.has(entry.name)) continue;

    const pkgDir = resolve(packagesDir, entry.name);
    const indexPath = resolve(pkgDir, "src/index.ts");
    const tsconfigPath = resolve(pkgDir, "tsconfig.json");
    const pkgJsonPath = resolve(pkgDir, "package.json");

    if (!(await exists(pkgJsonPath))) continue;
    if (!(await exists(indexPath))) continue;
    if (!(await exists(tsconfigPath))) continue;

    discovered.push({
      name: entry.name,
      entryPoints: [indexPath],
      tsconfig: tsconfigPath,
      outDir: resolve(contentDir, entry.name),
    });
  }

  discovered.sort((a, b) => a.name.localeCompare(b.name));
  return discovered;
};

export const baseTypeDocOptions = {
  plugin: ["typedoc-plugin-markdown", "typedoc-plugin-frontmatter"],
  entryFileName: "index",
  readme: "none" as const,
  fileExtension: ".md",
  hideGenerator: true,
  excludePrivate: true,
  excludeInternal: true,
  excludeProtected: true,
  hidePageHeader: true,
  hideBreadcrumbs: true,
  hidePageTitle: true,
  sanitizeComments: true,
  navigation: {
    includeFolders: true,
    includeGroups: true,
    includeCategories: true,
  },
  validation: {
    notDocumented: false,
    invalidLink: true,
    notExported: true,
  },
};

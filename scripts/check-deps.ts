import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const MAX_DEPENDENCIES = 47;

function getPackageJsons() {
  const rootPackageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
  const workspacePackages = execSync("pnpm m ls --json", { encoding: "utf8" });
  const packages = JSON.parse(workspacePackages);

  return [
    { path: "package.json", content: rootPackageJson },
    ...packages.map((pkg: unknown) => {
      const packageInfo = pkg as { path: string; name: string };
      return {
        path: path.join(packageInfo.path, "package.json"),
        content: JSON.parse(fs.readFileSync(path.join(packageInfo.path, "package.json"), "utf8")),
      };
    }),
  ];
}

function checkDependencies() {
  const packages = getPackageJsons();
  const allDeps = new Set<string>();
  const internalPackages = new Set(packages.map((p) => p.content.name));

  packages.forEach((pkg) => {
    const deps = pkg.content.dependencies || {};
    Object.keys(deps).forEach((dep) => {
      if (!deps[dep].startsWith("workspace:") && !internalPackages.has(dep)) {
        allDeps.add(dep);
      }
    });
  });

  console.log(`Total unique external direct dependencies: ${allDeps.size}`);
  if (allDeps.size > MAX_DEPENDENCIES) {
    console.error(
      `ERROR: Dependency budget exceeded! Found ${allDeps.size} dependencies, max is ${MAX_DEPENDENCIES}.`,
    );
    console.error("Dependencies found:", Array.from(allDeps).sort().join(", "));
    process.exit(1);
  } else {
    console.log(`SUCCESS: Dependency budget within limits (${allDeps.size}/${MAX_DEPENDENCIES}).`);
  }
}

checkDependencies();

const fs = require("fs");
const path = require("path");

const packagesDir = path.join(__dirname, "packages");
const appsDir = path.join(__dirname, "apps");

function bumpVersion(dir) {
  const subdirs = fs.readdirSync(dir);

  subdirs.forEach((subdir) => {
    const pkgPath = path.join(dir, subdir, "package.json");

    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
      const oldVersion = pkg.version;
      const [major, minor, patch] = oldVersion.split(".").map(Number);
      const newVersion = `${major}.${minor}.${patch + 1}`;

      pkg.version = newVersion;
      fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 4) + "\n");
      console.log(`✓ ${pkg.name}: ${oldVersion} → ${newVersion}`);
    } else if (fs.statSync(path.join(dir, subdir)).isDirectory()) {
      const nestedPath = path.join(dir, subdir);
      const nestedFiles = fs.readdirSync(nestedPath);

      nestedFiles.forEach((nested) => {
        const nestedPkgPath = path.join(nestedPath, nested, "package.json");
        if (fs.existsSync(nestedPkgPath)) {
          const pkg = JSON.parse(fs.readFileSync(nestedPkgPath, "utf8"));
          const oldVersion = pkg.version;
          const [major, minor, patch] = oldVersion.split(".").map(Number);
          const newVersion = `${major}.${minor}.${patch + 1}`;

          pkg.version = newVersion;
          fs.writeFileSync(nestedPkgPath, JSON.stringify(pkg, null, 4) + "\n");
          console.log(`✓ ${pkg.name}: ${oldVersion} → ${newVersion}`);
        }
      });
    }
  });
}

console.log("Bumping package versions...\n");
bumpVersion(packagesDir);
bumpVersion(appsDir);
console.log("\n✅ All versions bumped!");

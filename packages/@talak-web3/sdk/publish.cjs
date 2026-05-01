const fs = require("fs");

const { execSync } = require("child_process");

console.log("=== Publishing talak-web3 to NPM ===");

console.log("1. Building package...");
execSync("node build-simple.cjs", { stdio: "inherit" });

console.log("2. Backing up original package.json...");
if (fs.existsSync("package.json")) {
  fs.copyFileSync("package.json", "package.dev.json");
}

console.log("3. Using publish configuration...");
fs.copyFileSync("package.publish.json", "package.json");

console.log("4. Checking package contents...");
execSync("npm pack --dry-run", { stdio: "inherit" });

console.log("5. Publishing to npm...");
try {
  execSync("npm publish", { stdio: "inherit" });
  console.log("6. Restoring development configuration...");
  fs.copyFileSync("package.dev.json", "package.json");
  fs.unlinkSync("package.dev.json");
  console.log("=== Published successfully! ===");
} catch {
  console.log("6. Restoring development configuration...");
  fs.copyFileSync("package.dev.json", "package.json");
  fs.unlinkSync("package.dev.json");
  console.error("=== Publishing failed ===");
  process.exit(1);
}

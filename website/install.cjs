
const { execSync } = require("child_process");

console.log("Installing dependencies in:", __dirname);

try {
  execSync("pnpm install --no-frozen-lockfile", {
    cwd: __dirname,
    stdio: "inherit",
  });
  console.log("Dependencies installed successfully.");
} catch (error) {
  console.error("Failed to install dependencies:", error);
  process.exit(1);
}

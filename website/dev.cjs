
const { execSync } = require("child_process");

console.log("Starting dev server in:", __dirname);

process.env.PORT = "5173";

try {
  execSync("pnpm run dev", {
    cwd: __dirname,
    stdio: "inherit",
    env: { ...process.env, PORT: "5173" },
  });
} catch (error) {
  console.error("Failed to start dev server:", error);
  process.exit(1);
}

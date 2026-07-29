const userAgent = process.env.npm_config_user_agent || "";

const isPnpm = userAgent.startsWith("pnpm/");

if (!isPnpm) {
  console.error("This repository must be installed with pnpm.");
  console.error("Use: corepack enable && pnpm install");
  process.exit(1);
}

console.log(`Installing with pnpm...`);

import { cac } from "cac";

import { addCommand } from "./commands/add.js";
import { depsCommand } from "./commands/deps.js";
import { devCommand } from "./commands/dev.js";
import { docsCommand } from "./commands/docs.js";
import { doctorCommand } from "./commands/doctor.js";
import { envCommand } from "./commands/env.js";
import { generateCommand } from "./commands/generate.js";
import { infoCommand } from "./commands/info.js";
import { initCommand } from "./commands/init.js";

const version = "1.0.0";

export const cli = cac("talak").version(version).help();

cli
  .command("init [name]", "Initialize a new project")
  .option("-t, --template <template>", "Template to use (nextjs, react, hono, express)")
  .option("-f, --force", "Overwrite existing files")
  .action(initCommand);

cli
  .command("add [integration]", "Add an integration")
  .option("-p, --project <path>", "Project path")
  .action(addCommand);

cli
  .command("doctor", "Check project health")
  .option("-p, --project <path>", "Project path")
  .action(doctorCommand);

cli
  .command("check", "Alias for doctor — verify project health")
  .option("-p, --project <path>", "Project path")
  .action(doctorCommand);

cli
  .command("info", "Show Node version and package.json summary")
  .option("-p, --project <path>", "Project path")
  .action(infoCommand);

cli.command("docs", "Print links to docs, repo, and npm").action(docsCommand);

cli
  .command("deps", "List @talak-web3/* and talak-web3 dependencies")
  .option("-p, --project <path>", "Project path")
  .action(depsCommand);

cli.command("env", "Show which common env vars are set (values hidden)").action(envCommand);

cli
  .command("generate <type> <name>", "Generate code (component, hook, api-route)")
  .option("-p, --project <path>", "Project path")
  .action(generateCommand);

cli
  .command("dev", "Start development server")
  .option("-p, --port <port>", "Port to run on")
  .option("-h, --host", "Expose to network")
  .action(devCommand);

if (import.meta.url === `file://${process.argv[1]}`) {
  cli.parse();
}

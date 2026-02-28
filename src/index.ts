import { runCli } from "./commands.js";

async function main() {
  const args = process.argv.slice(2);
  await runCli(args);
  process.exit(0);
}

main();
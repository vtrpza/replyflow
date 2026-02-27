#!/usr/bin/env node

/* eslint-disable @typescript-eslint/no-require-imports */
const { spawn } = require("node:child_process");

const env = { ...process.env };

async function main() {
  // Run database migrations before starting.
  console.log("[entrypoint] running migrations...");
  await execFile("node", ["dist-cli/cli/migrate.js"]);

  const args = process.argv.slice(2);
  const cmd = args.length > 0 ? args[0] : "node";
  const cmdArgs = args.length > 0 ? args.slice(1) : ["server.js"];

  console.log(`[entrypoint] starting: ${[cmd, ...cmdArgs].join(" ")}`);
  await execFile(cmd, cmdArgs, { forwardSignals: true });
}

function execFile(command, args, opts = {}) {
  const forwardSignals = Boolean(opts.forwardSignals);

  const child = spawn(command, args, { stdio: "inherit", env, shell: false });

  if (forwardSignals) {
    const forward = (signal) => child.kill(signal);
    process.on("SIGTERM", () => forward("SIGTERM"));
    process.on("SIGINT", () => forward("SIGINT"));
  }

  return new Promise((resolve, reject) => {
    child.on("exit", (code, signal) => {
      if (code === 0) return resolve();
      reject(new Error(`${command} exited code=${code} signal=${signal}`));
    });
    child.on("error", reject);
  });
}

main().catch((error) => {
  console.error("[entrypoint] failed", error);
  process.exit(1);
});

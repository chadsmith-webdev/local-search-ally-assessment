import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const result = spawnSync(
  process.platform === "win32" ? "npx.cmd" : "npx",
  [
    "openui",
    "generate",
    "./src/openui/library.tsx",
    "--out",
    "./src/openui/generated-system-prompt.txt",
    "--no-interactive",
  ],
  {
    cwd: root,
    stdio: "inherit",
  },
);

process.exit(result.status ?? 1);

import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const mode = process.argv[2];
const rawInput = readFileSync(0, "utf8").trim();

let payload;
try {
  payload = rawInput ? JSON.parse(rawInput) : {};
} catch {
  process.exit(2);
}

const toolName = String(payload.toolName ?? payload.tool_name ?? "").toLowerCase();
// Only react to actual file edits/creates so helper tools do not spam the agent loop.
if (toolName !== "create" && toolName !== "edit") {
  process.exit(0);
}

const isWindows = process.platform === "win32";
const result = isWindows
  ? spawnSync("cmd.exe", ["/d", "/s", "/c", mode === "typecheck" ? "npx astro check" : "npm run lint"], {
      encoding: "utf8",
      maxBuffer: 1024 * 1024,
    })
  : spawnSync(mode === "typecheck" ? "npx" : "npm", mode === "typecheck" ? ["astro", "check"] : ["run", "lint"], {
      encoding: "utf8",
      maxBuffer: 1024 * 1024,
    });

if (result.status === 0) {
  process.exit(0);
}

const output = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
const truncated = output.length > 7000 ? `${output.slice(0, 7000)}\n...[truncated]` : output;
const errorText = result.error?.message ?? "";
process.stdout.write(
  JSON.stringify({
    additionalContext:
      `Per-edit ${mode} failed after ${toolName}:\n` +
      (truncated || errorText || `Command exited with code ${result.status ?? "unknown"}.`),
  }),
);

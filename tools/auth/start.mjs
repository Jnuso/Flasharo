import { existsSync } from "node:fs";
import { spawn } from "node:child_process";

const savedData = ".firebase-data";
const args = ["exec", "firebase", "emulators:start", "--only", "auth", "--project", "demo-flasharo"];
if (existsSync(`${savedData}/firebase-export-metadata.json`)) {
  args.push(`--import=${savedData}`);
}
args.push(`--export-on-exit=${savedData}`);

const child = spawn(process.platform === "win32" ? "pnpm.cmd" : "pnpm", args, {
  stdio: "inherit",
  shell: process.platform === "win32",
});
process.on("SIGINT", () => child.kill("SIGINT"));
process.on("SIGTERM", () => child.kill("SIGTERM"));
child.on("error", (error) => { console.error(error); process.exitCode = 1; });
child.on("exit", (code) => { process.exitCode = code ?? 1; });

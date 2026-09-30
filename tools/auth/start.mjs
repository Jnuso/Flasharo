import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const firebaseCli = require.resolve("firebase-tools/lib/bin/firebase.js");

const savedData = ".firebase-data";
const args = ["emulators:start", "--only", "auth,firestore", "--project", "demo-flasharo"];
if (existsSync(`${savedData}/firebase-export-metadata.json`)) {
  args.push(`--import=${savedData}`);
}
args.push(`--export-on-exit=${savedData}`);

const child = spawn(process.execPath, [firebaseCli, ...args], {
  stdio: "inherit",
});
process.on("SIGINT", () => child.kill("SIGINT"));
process.on("SIGTERM", () => child.kill("SIGTERM"));
child.on("error", (error) => { console.error(error); process.exitCode = 1; });
child.on("exit", (code) => { process.exitCode = code ?? 1; });

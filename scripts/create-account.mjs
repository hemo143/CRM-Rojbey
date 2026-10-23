// Run locally in a trusted terminal. Only a salted hash is printed.
import { randomBytes, scryptSync } from "node:crypto";
import readline from "node:readline/promises";
const input = process.stdin,
  output = process.stdout;
if (!input.isTTY) throw Error("Use an interactive private terminal.");
const rl = readline.createInterface({ input, output });
const id = (await rl.question("Username (letters/numbers): ")).trim();
const name = (await rl.question("Display name: ")).trim();
const role = (await rl.question("Role (admin/staff): ")).trim();
rl.close();
if (
  !/^[A-Za-z0-9_.@-]{1,100}$/.test(id) ||
  !name ||
  !["admin", "staff"].includes(role)
)
  throw Error("Invalid account details");
output.write("Password (hidden, minimum 12 characters): ");
input.setRawMode(true);
input.resume();
input.setEncoding("utf8");
let password = "";
await new Promise((resolve, reject) => {
  function onData(chunk) {
    for (const char of chunk) {
      if (char === "\u0003") {
        cleanup();
        reject(Error("Cancelled"));
        return;
      }
      if (char === "\r" || char === "\n") {
        cleanup();
        resolve();
        return;
      }
      if (char === "\u007f" || char === "\b") password = password.slice(0, -1);
      else password += char;
    }
  }
  function cleanup() {
    input.off("data", onData);
    input.setRawMode(false);
    input.pause();
    output.write("\n");
  }
  input.on("data", onData);
});
if (password.length < 12 || password.length > 1024)
  throw Error("Password must contain 12–1024 characters");
const salt = randomBytes(16).toString("hex");
const passwordHash = `scrypt:${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
password = "";
output.write(
  "Add this account to the CRM_USERS_JSON array in Render (do not commit):\n",
);
output.write(JSON.stringify([{ id, name, role, passwordHash }]) + "\n");

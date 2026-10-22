import { randomBytes } from "node:crypto";
import { writeFileSync, existsSync } from "node:fs";
if (existsSync(".env.local")) console.log("Existing .env.local preserved.");
else {
  writeFileSync(
    ".env.local",
    `CRM_DATA_PROVIDER=local\nCRM_DEMO_MODE=true\nCRM_SESSION_SECRET=${randomBytes(48).toString("hex")}\n`,
    { mode: 0o600, flag: "wx" },
  );
  console.log(
    "Local demo configured with a private session key. Synthetic data only.",
  );
}

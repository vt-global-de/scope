import { createDatabase } from "./database.mjs";
import { hashPassword, validateAccountCredentials } from "./user-auth.mjs";

const username = String(process.env.SCOPE_RECOVERY_USERNAME ?? "admin").trim().toLowerCase();
const displayName = String(process.env.SCOPE_RECOVERY_DISPLAY_NAME ?? "Scope Administrator").trim();
const password = process.env.SCOPE_RECOVERY_PASSWORD;

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL muss gesetzt sein.");
if (!password) throw new Error("SCOPE_RECOVERY_PASSWORD muss für diesen einmaligen Aufruf gesetzt sein.");
validateAccountCredentials(username, password);

const database = createDatabase();
try {
  await database.initialize();
  const account = await database.resetAdminAccount({
    username, displayName: displayName || username, passwordHash: await hashPassword(password)
  });
  await database.recordAudit({ actor: "recovery-cli", action: "user.admin_recovered", targetType: "user", targetId: String(account.id) });
  process.stdout.write(`Administratorkonto ${account.username} wurde aktiviert und zurückgesetzt.\n`);
} finally {
  await database.close();
}

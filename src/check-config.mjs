import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseConfigText } from "./config.mjs";
import { validateInventoryConfig } from "./inventory-config.mjs";
import { inventoryCertificates, inventoryDnsChecks, toServersConfig, toServicesConfig } from "./inventory-config.mjs";

const rootDir = resolve(fileURLToPath(new URL("..", import.meta.url)));

export async function checkInventoryFile(file = process.env.INVENTORY_CONFIG_FILE ?? resolve(rootDir, "config/inventory.yaml")) {
  const resolvedFile = resolve(file);
  const inventory = parseConfigText(await readFile(resolvedFile, "utf8"), resolvedFile);
  validateInventoryConfig(inventory);
  return { file: resolvedFile, inventory };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const { file, inventory } = await checkInventoryFile(process.argv[2]);
    const services = toServicesConfig(inventory).groups.flatMap((group) => group.panels.flatMap((panel) => panel.items));
    const servers = toServersConfig(inventory).servers;
    console.log(`Scope inventory valid: ${file}`);
    console.log(`Schema v${inventory.version}: ${services.length} services, ${servers.length} servers, ${inventoryCertificates(inventory).length} certificate checks, ${inventoryDnsChecks(inventory).length} DNS checks`);
  } catch (error) {
    console.error(`Scope inventory invalid: ${error.message}`);
    process.exitCode = 1;
  }
}

import { extname } from "node:path";
import { parse as parseYaml } from "yaml";

const isNonEmptyString = (value) => typeof value === "string" && value.trim().length > 0;

function assertString(value, path, { required = false } = {}) {
  if (required && !isNonEmptyString(value)) {
    throw new Error(`${path} muss ein nicht-leerer Text sein.`);
  }
  if (value !== undefined && typeof value !== "string") {
    throw new Error(`${path} muss ein Text sein.`);
  }
}

export function validateConfig(config) {
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    throw new Error("Die Services-Konfiguration muss ein Objekt sein.");
  }

  assertString(config.title, "title", { required: true });
  assertString(config.subtitle, "subtitle");

  if (!Array.isArray(config.groups)) {
    throw new Error("groups muss eine Liste sein.");
  }

  config.groups.forEach((group, groupIndex) => {
    const groupPath = `groups[${groupIndex}]`;
    if (!group || typeof group !== "object" || Array.isArray(group)) {
      throw new Error(`${groupPath} muss ein Objekt sein.`);
    }
    assertString(group.name, `${groupPath}.name`, { required: true });
    if (group.items !== undefined && group.panels !== undefined) {
      throw new Error(`${groupPath} darf entweder items oder panels enthalten, nicht beides.`);
    }
    if (group.items === undefined && group.panels === undefined) {
      throw new Error(`${groupPath} muss items oder panels enthalten.`);
    }
    const panels = group.panels ?? [{ name: "Services", items: group.items }];
    if (!Array.isArray(panels)) throw new Error(`${groupPath}.panels muss eine Liste sein.`);

    panels.forEach((panel, panelIndex) => {
      const panelPath = group.panels ? `${groupPath}.panels[${panelIndex}]` : groupPath;
      if (!panel || typeof panel !== "object" || Array.isArray(panel)) {
        throw new Error(`${panelPath} muss ein Objekt sein.`);
      }
      if (group.panels) assertString(panel.name, `${panelPath}.name`, { required: true });
      assertString(panel.id, `${panelPath}.id`);
      if (panel.id !== undefined && !/^[a-z0-9][a-z0-9_-]*$/.test(panel.id)) {
        throw new Error(`${panelPath}.id ist ungültig.`);
      }
      if (panel.layout !== undefined) {
        if (!panel.layout || typeof panel.layout !== "object" || Array.isArray(panel.layout)) {
          throw new Error(`${panelPath}.layout muss ein Objekt sein.`);
        }
        const unknownLayoutKey = Object.keys(panel.layout).find((key) => key !== "width");
        if (unknownLayoutKey) throw new Error(`${panelPath}.layout.${unknownLayoutKey} ist unbekannt.`);
        if (panel.layout.width !== undefined && !["xsmall", "small", "medium", "large", "full"].includes(panel.layout.width)) {
          throw new Error(`${panelPath}.layout.width muss xsmall, small, medium, large oder full sein.`);
        }
      }
      if (panel.collapsed !== undefined && typeof panel.collapsed !== "boolean") {
        throw new Error(`${panelPath}.collapsed muss true oder false sein.`);
      }
      if (!Array.isArray(panel.items)) throw new Error(`${panelPath}.items muss eine Liste sein.`);

      panel.items.forEach((item, itemIndex) => {
        const itemPath = `${panelPath}.items[${itemIndex}]`;
        if (!item || typeof item !== "object" || Array.isArray(item)) {
          throw new Error(`${itemPath} muss ein Objekt sein.`);
        }
        const unknownKey = Object.keys(item).find((key) => ![
          "id", "type", "name", "description", "url", "icon", "tags", "favorite", "scope", "depends-on", "certificates", "dns"
        ].includes(key));
        if (unknownKey) throw new Error(`${itemPath}.${unknownKey} ist unbekannt.`);
        if (item.type !== undefined && item.type !== "link") {
          throw new Error(`${itemPath}.type wird noch nicht unterstützt (erlaubt: link).`);
        }
        assertString(item.name, `${itemPath}.name`, { required: true });
        assertString(item.id, `${itemPath}.id`);
        if (item.id !== undefined && !/^[a-z0-9][a-z0-9_-]*$/.test(item.id)) {
          throw new Error(`${itemPath}.id ist ungültig.`);
        }
        assertString(item.description, `${itemPath}.description`);
        assertString(item.icon, `${itemPath}.icon`);
        assertString(item.url, `${itemPath}.url`);
        if (item.favorite !== undefined && typeof item.favorite !== "boolean") {
          throw new Error(`${itemPath}.favorite muss true oder false sein.`);
        }
        if (item.scope !== undefined && !["include", "ignore"].includes(item.scope)) {
          throw new Error(`${itemPath}.scope muss include oder ignore sein.`);
        }
        if (item.tags !== undefined) {
          if (!Array.isArray(item.tags) || item.tags.some((tag) => !isNonEmptyString(tag))) {
            throw new Error(`${itemPath}.tags muss eine Liste nicht-leerer Texte sein.`);
          }
          if (new Set(item.tags.map((tag) => tag.toLowerCase())).size !== item.tags.length) {
            throw new Error(`${itemPath}.tags enthält doppelte Werte.`);
          }
        }
        if (item["depends-on"] !== undefined) {
          if (!Array.isArray(item["depends-on"]) || item["depends-on"].some((id) => !isNonEmptyString(id) || !/^[a-z0-9][a-z0-9_-]*$/.test(id))) {
            throw new Error(`${itemPath}.depends-on muss eine Liste gültiger Server-IDs sein.`);
          }
          if (new Set(item["depends-on"]).size !== item["depends-on"].length) {
            throw new Error(`${itemPath}.depends-on enthält doppelte Werte.`);
          }
        }
        for (const feature of ["certificates", "dns"]) {
          const value = item[feature];
          if (value !== undefined && typeof value !== "boolean" && (!value || typeof value !== "object" || Array.isArray(value))) {
            throw new Error(`${itemPath}.${feature} muss true, false oder ein Objekt sein.`);
          }
        }
      });
    });
  });

  return config;
}

export function getDashboardPanels(group) {
  return group.panels ?? [{ name: "Services", collapsed: false, items: group.items }];
}

export function parseConfigText(content, configFile) {
  const extension = extname(configFile).toLowerCase();
  if (extension === ".yaml") return parseYaml(content);
  throw new Error(`Nicht unterstütztes Konfigurationsformat: ${extension || "ohne Dateiendung"}; Scope verwendet ausschließlich .yaml.`);
}

import { isSeq, parseDocument } from "yaml";

const serviceKeyOrder = [
  "id", "name", "description", "url", "icon", "type", "tags", "favorite",
  "scope", "depends-on", "certificates", "dns", "health"
];

export function orderServiceFields(service) {
  const ordered = {};
  for (const key of serviceKeyOrder) {
    if (Object.hasOwn(service, key)) ordered[key] = service[key];
  }
  for (const [key, value] of Object.entries(service)) {
    if (!Object.hasOwn(ordered, key)) ordered[key] = value;
  }
  return ordered;
}

function inheritedDependencies(inventory, destination) {
  const section = inventory.menu?.services;
  const group = Number.isInteger(destination.groupIndex) ? section?.groups?.[destination.groupIndex] : undefined;
  const category = Number.isInteger(destination.categoryIndex) ? group?.categories?.[destination.categoryIndex] : undefined;
  let dependencies;
  for (const defaults of [section?.defaults, group?.defaults, category?.defaults]) {
    if (defaults && Object.hasOwn(defaults, "depends-on")) dependencies = defaults["depends-on"];
  }
  return Array.isArray(dependencies) ? dependencies : [];
}

function sameDependencies(left, right) {
  return left.length === right.length && left.every((id) => right.includes(id));
}

export function prepareDiscoveredService(inventory, destination, service) {
  const prepared = { ...service };
  if (Array.isArray(prepared["depends-on"])) {
    const inherited = inheritedDependencies(inventory, destination);
    if (sameDependencies(prepared["depends-on"], inherited)
      || (prepared["depends-on"].length === 0 && inherited.length === 0)) {
      delete prepared["depends-on"];
    }
  }
  return orderServiceFields(prepared);
}

export function mergeInventoryYaml(source, changes) {
  if (changes.length === 0) return source;
  const document = parseDocument(source);
  if (document.errors.length) throw document.errors[0];

  for (const change of changes) {
    let groupIndex = change.destination.groupIndex;
    if (change.destination.isNewGroup) {
      const groupsPath = ["menu", "services", "groups"];
      const groups = document.getIn(groupsPath, true);
      if (!isSeq(groups)) throw new Error("Discovery-Ziel enthält keine Service-Gruppenliste.");
      groupIndex = groups.items.findIndex((group) => group?.get?.("id") === change.destination.groupId);
      if (groupIndex < 0) {
        groups.add(document.createNode({
          id: change.destination.groupId,
          name: change.destination.groupName,
          categories: []
        }));
        groupIndex = groups.items.length - 1;
      }
    }
    let categoryIndex = change.destination.categoryIndex;
    if (change.destination.isNew) {
      const categoriesPath = ["menu", "services", "groups", groupIndex, "categories"];
      const categories = document.getIn(categoriesPath, true);
      if (!isSeq(categories)) throw new Error(`Discovery-Ziel ${change.destination.groupId} enthält keine Kategorie-Liste.`);
      categoryIndex = categories.items.findIndex((category) => category?.get?.("id") === change.destination.categoryId);
      if (categoryIndex < 0) {
        categories.add(document.createNode({
          id: change.destination.categoryId,
          name: change.destination.categoryName,
          services: []
        }));
        categoryIndex = categories.items.length - 1;
      }
    }
    const path = [
      "menu", "services", "groups", groupIndex,
      "categories", categoryIndex, "services"
    ];
    const services = document.getIn(path, true);
    if (!isSeq(services)) {
      throw new Error(`Discovery-Ziel ${change.destination.groupId}/${change.destination.categoryId} enthält keine Service-Liste.`);
    }
    services.add(document.createNode(orderServiceFields(change.service)));
  }

  return document.toString();
}

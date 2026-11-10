import { Terminal } from "/vendor/xterm/xterm.mjs";
import { FitAddon } from "/vendor/xterm-addon-fit/addon-fit.mjs";
import { supportedLocales, translate } from "/i18n.mjs";
import { defaultIconBaseUrl, iconFallback, iconSource } from "/icons.mjs";

const overviewView = document.querySelector("#overview-view");
const dashboardView = document.querySelector("#dashboard-view");
const monitoringView = document.querySelector("#monitoring-view");
const notificationsView = document.querySelector("#notifications-view");
const adminView = document.querySelector("#admin-view");
const sessionView = document.querySelector("#session-view");
const viewTitleElement = document.querySelector("#view-title");
const viewSubtitleElement = document.querySelector("#view-subtitle");
const viewCountElement = document.querySelector("#view-count");
const brandLink = document.querySelector("#brand-link");
const brandTitleElement = document.querySelector("#brand-title");
const brandSubtitleElement = document.querySelector("#brand-subtitle");
const footerTitleElement = document.querySelector("#footer-title");
const groupsElement = document.querySelector("#groups");
const monitoringGroupsElement = document.querySelector("#monitoring-groups");
const groupNavElement = document.querySelector("#group-nav");
const serviceGroupLabelElement = document.querySelector("#service-group-label");
const serverGroupPanelElement = document.querySelector("#server-group-panel");
const serverGroupLabelElement = document.querySelector("#server-group-label");
const serverGroupNavElement = document.querySelector("#server-group-nav");
const dashboardNavLink = document.querySelector("#dashboard-nav-link");
const serversNavLink = document.querySelector("#servers-nav-link");
const notificationsNavLink = document.querySelector("#notifications-nav-link");
const adminNavLink = document.querySelector("#admin-nav-link");
const adminTabs = document.querySelector("#admin-tabs");
const adminUsersPane = document.querySelector("#admin-users-pane");
const adminAuditPane = document.querySelector("#admin-audit-pane");
const adminStatus = document.querySelector("#admin-status");
const serviceInboxButton = document.querySelector("#service-inbox-button");
const serviceInboxCount = document.querySelector("#service-inbox-count");
const serviceInboxDialog = document.querySelector("#service-inbox-dialog");
const serviceInboxClose = document.querySelector("#service-inbox-close");
const serviceInboxRefresh = document.querySelector("#service-inbox-refresh");
const serviceInboxCopy = document.querySelector("#service-inbox-copy");
const serviceInboxTabs = document.querySelector("#service-inbox-tabs");
const serviceInboxServicesView = document.querySelector("#service-inbox-services-view");
const serviceInboxProvidersView = document.querySelector("#service-inbox-providers-view");
const serviceInboxProviders = document.querySelector("#service-inbox-providers");
const serviceInboxError = document.querySelector("#service-inbox-error");
const serviceInboxStatus = document.querySelector("#service-inbox-status");
const proposalListElement = document.querySelector("#proposal-list");
const proposalFiltersElement = document.querySelector("#proposal-filters");
const proposalSearchElement = document.querySelector("#proposal-search");
const dashboardErrorElement = document.querySelector("#dashboard-error");
const monitoringErrorElement = document.querySelector("#monitoring-error");
const notificationsErrorElement = document.querySelector("#notifications-error");
const notificationsGridElement = document.querySelector("#notifications-grid");
const diagnosticsDialog = document.querySelector("#diagnostics-dialog");
const diagnosticsTitle = document.querySelector("#diagnostics-title");
const diagnosticsSummary = document.querySelector("#diagnostics-summary");
const diagnosticsSteps = document.querySelector("#diagnostics-steps");
const diagnosticsClose = document.querySelector("#diagnostics-close");
const notificationHistorySection = document.querySelector("#notification-history-section");
const notificationHistoryList = document.querySelector("#notification-history-list");
const maintenanceSection = document.querySelector("#maintenance-section");
const maintenanceTargetType = document.querySelector("#maintenance-target-type");
const maintenanceTargetId = document.querySelector("#maintenance-target-id");
const maintenanceTargetOptions = document.querySelector("#maintenance-target-options");
const maintenanceDuration = document.querySelector("#maintenance-duration");
const maintenanceReason = document.querySelector("#maintenance-reason");
const maintenanceCreate = document.querySelector("#maintenance-create");
const maintenanceList = document.querySelector("#maintenance-list");
const overviewGridElement = document.querySelector("#overview-grid");
const overviewIssuesElement = document.querySelector("#overview-issues");
const overviewUpdatedElement = document.querySelector("#overview-updated");
const overviewHistoryElement = document.querySelector("#overview-history");
const historySummaryElement = document.querySelector("#history-summary");
const scopeFocusElement = document.querySelector("#scope-focus");
const scopeScoreElement = document.querySelector("#scope-score");
const scopeMembershipElement = document.querySelector("#scope-membership");
const scopeTrendElement = document.querySelector("#scope-trend");
const globalSearchInput = document.querySelector("#global-search-input");
const globalSearchResults = document.querySelector("#global-search-results");
const sidebarToggle = document.querySelector("#sidebar-toggle");
const serviceLayoutToggle = document.querySelector("#service-layout-toggle");
const serviceLayoutToolbar = document.querySelector("#service-layout-toolbar");
const serviceLayoutReset = document.querySelector("#service-layout-reset");
const serverLayoutToggle = document.querySelector("#server-layout-toggle");
const serverLayoutToolbar = document.querySelector("#server-layout-toolbar");
const serverLayoutReset = document.querySelector("#server-layout-reset");
const serviceFilterBar = document.querySelector("#service-filter-bar");
const serviceTagFilters = document.querySelector("#service-tag-filters");
const serverFilterBar = document.querySelector("#server-filter-bar");
const serverTagFilters = document.querySelector("#server-tag-filters");
const appVersionElement = document.querySelector("#app-version");
const themeToggle = document.querySelector("#theme-toggle");
const languageToggle = document.querySelector("#language-toggle");
const logoutButton = document.querySelector("#logout-button");
const settingsButton = document.querySelector("#settings-button");
const profileMenu = document.querySelector("#profile-menu");
const profileSettingsButton = document.querySelector("#profile-settings-button");
const profileAvatar = document.querySelector("#profile-avatar");
const settingsUserElement = document.querySelector("#settings-user");
const settingsDialog = document.querySelector("#settings-dialog");
const settingsDisplayName = document.querySelector("#settings-display-name");
const settingsAccountName = document.querySelector("#settings-account-name");
const settingsAvatar = document.querySelector("#settings-avatar");
const settingsRole = document.querySelector("#settings-role");
const settingsStatus = document.querySelector("#settings-status");
const settingsTheme = document.querySelector("#settings-theme");
const settingsLanguage = document.querySelector("#settings-language");
const settingsDensity = document.querySelector("#settings-density");
const settingsSidebar = document.querySelector("#settings-sidebar");
const settingsResetLayouts = document.querySelector("#settings-reset-layouts");
const settingsResetFavorites = document.querySelector("#settings-reset-favorites");
const settingsCurrentPassword = document.querySelector("#settings-current-password");
const settingsNewPassword = document.querySelector("#settings-new-password");
const settingsChangePassword = document.querySelector("#settings-change-password");
const settingsUserManagement = document.querySelector("#settings-user-management");
const settingsNewUsername = document.querySelector("#settings-new-username");
const settingsNewDisplayName = document.querySelector("#settings-new-display-name");
const settingsNewUserPassword = document.querySelector("#settings-new-user-password");
const settingsNewUserRole = document.querySelector("#settings-new-user-role");
const settingsCreateUser = document.querySelector("#settings-create-user");
const settingsUsers = document.querySelector("#settings-users");
const settingsAudit = document.querySelector("#settings-audit");
const settingsAuditEvents = document.querySelector("#settings-audit-events");
const sshTerminalElement = document.querySelector("#ssh-terminal");
const sshTerminalCanvas = document.querySelector("#ssh-terminal-canvas");
const rdpDisplayElement = document.querySelector("#rdp-display");
const sessionTitleElement = document.querySelector("#session-title");
const sessionProtocolElement = document.querySelector("#session-protocol");
const sessionCloseButton = document.querySelector("#session-close");
const sessionFullscreenButton = document.querySelector("#session-fullscreen");
const sessionStatusElement = document.querySelector("#session-status");
const sessionDiagnosticsButton = document.querySelector("#session-diagnostics");
const sessionHotkeysElement = document.querySelector("#session-hotkeys");
const rdpQualityControl = document.querySelector("#rdp-quality-control");
const rdpQualitySelect = document.querySelector("#rdp-quality");
const themeStorageKey = "scope-theme";
const languageStorageKey = "scope-language";
const densityStorageKey = "scope-density";
const sidebarStorageKey = "scope-sidebar";
const favoritesStorageKey = "scope-favorites";
const panelLayoutStorageKey = "scope-panel-layout-v1";
const rdpQualityStorageKey = "scope-rdp-stream-profile";
const PANEL_WIDTHS = ["xsmall", "small", "medium", "large", "full"];
const CARD_WIDTHS = ["xsmall", "small", "medium", "large", "full"];
const MAX_PANEL_COLUMNS = 6;
const CUSTOM_CARD_GRID_COLUMNS = 12;
const MIN_PANEL_WIDTH_PX = 190;
const MIN_COMPACT_PANEL_WIDTH_PX = 150;
const cardElements = new Map();
const panelOpenState = new Map();
const panelGridObservers = new WeakMap();
const moduleCounts = new Map();
const destructiveConfirmationTimers = new WeakMap();
const destructiveConfirmationWindowMs = 5000;

let dashboardConfig;
let remoteConnections = [];
let monitoringHosts = [];
let groupSlugs = [];
let serverGroups = [];
let serverGroupSlugs = [];
let latestStatuses = [];
let latestRemoteStatuses = [];
let latestCertificates = [];
let latestDnsChecks = [];
let latestNotificationChannels = [];
let latestDiscoveryProposals = { proposals: [], destinations: [], groups: [], providers: [], servers: [] };
let proposalFilter = "pending";
let proposalSearch = "";
let latestHistory = { summary: { total: 0, up: 0, down: 0 }, events: [], targets: [], timeline: [] };
let activeSession;
let menuPresentation = {};
let iconBaseUrl = defaultIconBaseUrl;
let appCapabilities = { services: true, servers: true, certificates: false, dns: false, notifications: false, inventory: false, administration: false };
let locale = "en";
let activeServiceTag = "";
let activeServerTag = "";
let searchQuery = "";
let favoriteOverrides = {};
let panelLayoutOverrides = {};
let account;
let personalPreferences = {};
let preferenceSaveTimer;
let preferenceSaveQueue = Promise.resolve();
const layoutEditing = { services: false, servers: false };
let draggedPanel;
let draggedCard;

const auditActionTranslationKeys = Object.freeze({
  "auth.login": "auditActionLogin",
  "auth.login_failed": "auditActionLoginFailed",
  "auth.logout": "auditActionLogout",
  "user.initial_admin_created": "auditActionInitialAdminCreated",
  "user.admin_recovered": "auditActionAdminRecovered",
  "user.created": "auditActionUserCreated",
  "user.activated": "auditActionUserActivated",
  "user.deactivated": "auditActionUserDeactivated",
  "user.password_changed": "auditActionPasswordChanged",
  "notification.test": "auditActionNotificationTest",
  "notification.enabled": "auditActionNotificationEnabled",
  "notification.disabled": "auditActionNotificationDisabled",
  "remote.launched": "auditActionRemoteLaunched",
  "remote.closed": "auditActionRemoteClosed",
  "maintenance.created": "auditActionMaintenanceCreated",
  "maintenance.deleted": "auditActionMaintenanceDeleted",
  "discovery.proposal.accepted": "auditActionDiscoveryAccepted",
  "discovery.proposal.rejected": "auditActionDiscoveryRejected",
  "discovery.proposal.ignored": "auditActionDiscoveryIgnored",
  "discovery.proposal.pending": "auditActionDiscoveryReset"
});

document.title = "Scope";
try {
  const storedRdpProfile = localStorage.getItem(rdpQualityStorageKey);
  if (rdpStreamProfileNames().includes(storedRdpProfile)) rdpQualitySelect.value = storedRdpProfile;
} catch { /* Storage may be disabled. */ }

function t(key, values) {
  return translate(locale, key, values);
}

function rdpStreamProfileNames() {
  return ["performance", "balanced", "quality"];
}

function resetConfirmationButtons() {
  return [serviceLayoutReset, serverLayoutReset, settingsResetLayouts, settingsResetFavorites];
}

function clearDestructiveConfirmation(button) {
  const timer = destructiveConfirmationTimers.get(button);
  if (timer) clearTimeout(timer);
  destructiveConfirmationTimers.delete(button);
  delete button.dataset.confirming;
  button.removeAttribute("aria-pressed");
  button.textContent = t(button.dataset.i18n);
}

function confirmDestructiveAction(button, action) {
  if (button.dataset.confirming === "true") {
    clearDestructiveConfirmation(button);
    action();
    return;
  }

  resetConfirmationButtons().filter((candidate) => candidate !== button).forEach((candidate) => {
    clearDestructiveConfirmation(candidate);
  });
  button.dataset.confirming = "true";
  button.setAttribute("aria-pressed", "true");
  button.textContent = t("confirmResetAction");
  destructiveConfirmationTimers.set(button, setTimeout(() => {
    clearDestructiveConfirmation(button);
  }, destructiveConfirmationWindowMs));
}

function clearResetConfirmations(buttons = resetConfirmationButtons()) {
  buttons.forEach((button) => clearDestructiveConfirmation(button));
}

document.addEventListener("click", (event) => {
  resetConfirmationButtons().forEach((button) => {
    if (button.dataset.confirming === "true" && event.target !== button && !button.contains(event.target)) {
      clearDestructiveConfirmation(button);
    }
  });
});

function updatePreference(key, value) {
  if (!account) return;
  personalPreferences[key] = value;
  clearTimeout(preferenceSaveTimer);
  settingsStatus.textContent = t("settingsSaving");
  preferenceSaveTimer = setTimeout(() => {
    const preferences = structuredClone(personalPreferences);
    preferenceSaveQueue = preferenceSaveQueue.then(async () => {
      const response = await fetch("/api/account/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferences })
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      settingsStatus.textContent = t("settingsSaved");
    }).catch(() => { settingsStatus.textContent = t("settingsSaveFailed"); });
  }, 350);
}

function cacheVisualPreference(key, value) {
  const storageKey = { theme: themeStorageKey, language: languageStorageKey, density: densityStorageKey, sidebar: sidebarStorageKey }[key];
  if (storageKey) try { localStorage.setItem(storageKey, value); } catch { /* Cache is optional. */ }
}

function plural(count, singular, multiple) {
  return t(count === 1 ? singular : multiple, { count });
}

function applyStaticTranslations() {
  document.documentElement.lang = locale;
  document.querySelectorAll("[data-i18n]").forEach((element) => {
    if (element === sessionTitleElement && activeSession) return;
    element.textContent = t(element.dataset.i18n);
  });
  document.querySelectorAll('[data-confirming="true"]').forEach((button) => {
    button.textContent = t("confirmResetAction");
  });
  document.querySelectorAll("[data-i18n-aria-label]").forEach((element) => {
    element.setAttribute("aria-label", t(element.dataset.i18nAriaLabel));
  });
  document.querySelectorAll("[data-i18n-content]").forEach((element) => {
    element.setAttribute("content", t(element.dataset.i18nContent));
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
    element.setAttribute("placeholder", t(element.dataset.i18nPlaceholder));
  });
  const languageLabel = locale === "en" ? t("switchToGerman") : t("switchToEnglish");
  languageToggle.setAttribute("aria-label", languageLabel);
  languageToggle.title = languageLabel;
  updateSidebarControls();
  updateLayoutToggleLabels();
}

function updateSidebarControls() {
  const collapsed = document.documentElement.dataset.sidebar === "collapsed";
  const label = collapsed ? t("expandSidebar") : t("collapseSidebar");
  const overviewLabel = t("openOverview");
  sidebarToggle.setAttribute("aria-expanded", String(!collapsed));
  sidebarToggle.setAttribute("aria-label", label);
  sidebarToggle.title = label;
  sidebarToggle.textContent = collapsed ? "›" : "‹";
  brandLink.setAttribute("aria-label", overviewLabel);
  if (collapsed) brandLink.title = overviewLabel;
  else brandLink.removeAttribute("title");
  document.querySelectorAll(".module-nav a").forEach((link) => {
    const navigationLabel = link.querySelector("strong")?.textContent?.trim() || "";
    link.setAttribute("aria-label", navigationLabel);
    if (collapsed) link.title = navigationLabel;
    else link.removeAttribute("title");
  });
  const settingsLabel = t("openAccountMenu");
  settingsButton.setAttribute("aria-label", settingsLabel);
  settingsButton.title = settingsLabel;
  const administrationLabel = t("administration");
  adminNavLink.setAttribute("aria-label", administrationLabel);
  if (collapsed) adminNavLink.title = administrationLabel;
  else adminNavLink.removeAttribute("title");
}

function setSidebar(state, persist = false) {
  const normalized = state === "collapsed" ? "collapsed" : "expanded";
  document.documentElement.dataset.sidebar = normalized;
  updateSidebarControls();
  if (persist) {
    cacheVisualPreference("sidebar", normalized);
    updatePreference("sidebar", normalized);
  }
}

function rerenderLocalizedContent() {
  if (dashboardConfig?.groups.length) {
    renderSelectedEnvironment(parseRoute().environment);
  }
  if (monitoringHosts.length || remoteConnections.length) renderMonitoring(parseRoute().group);
  if (latestNotificationChannels.length) renderNotifications(latestNotificationChannels);
  if (latestDiscoveryProposals.proposals.length || latestDiscoveryProposals.destinations.length) renderDiscoveryProposals(latestDiscoveryProposals);
  renderOverview();
  renderSearchResults();
  if (!activeSession) setActiveModule(parseRoute().module);
  else {
    viewSubtitleElement.textContent = t("remoteSession");
    sessionTitleElement.textContent = activeSession.connectionName;
    if (sessionStatusElement.dataset.i18n) sessionStatusElement.textContent = t(sessionStatusElement.dataset.i18n);
  }
  sessionFullscreenButton.textContent = document.fullscreenElement ? t("exitFullscreen") : t("fullscreen");
}

function setLanguage(nextLocale, persist = false) {
  locale = supportedLocales.includes(nextLocale) ? nextLocale : "en";
  applyStaticTranslations();
  rerenderLocalizedContent();
  if (persist) {
    cacheVisualPreference("language", locale);
    updatePreference("language", locale);
  }
}

function setTheme(theme, persist = false) {
  document.documentElement.dataset.theme = theme;
  const label = theme === "dark" ? t("switchToLight") : t("switchToDark");
  themeToggle.setAttribute("aria-label", label);
  themeToggle.title = label;
  if (persist) {
    cacheVisualPreference("theme", theme);
    updatePreference("theme", theme);
  }
}

themeToggle.addEventListener("click", () => {
  setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark", true);
  if (activeSession?.terminal) activeSession.terminal.options.theme = terminalTheme();
});
languageToggle.addEventListener("click", () => {
  setLanguage(locale === "en" ? "de" : "en", true);
  setTheme(document.documentElement.dataset.theme || "dark");
  setDensity(document.documentElement.dataset.density || "comfortable");
});
logoutButton.addEventListener("click", async () => {
  closeProfileMenu();
  logoutButton.disabled = true;
  try { await fetch("/api/auth/logout", { method: "POST" }); } finally {
    for (const key of [themeStorageKey, languageStorageKey, densityStorageKey, sidebarStorageKey, favoritesStorageKey, panelLayoutStorageKey]) {
      try { localStorage.removeItem(key); } catch { /* Storage may be disabled. */ }
    }
    window.location.replace("/login");
  }
});
let storedLanguage = "en";
try { storedLanguage = localStorage.getItem(languageStorageKey) || "en"; } catch { /* Storage may be disabled. */ }
setLanguage(storedLanguage);
setTheme(document.documentElement.dataset.theme || "dark");

try { favoriteOverrides = JSON.parse(localStorage.getItem(favoritesStorageKey) || "{}"); } catch { favoriteOverrides = {}; }
try { panelLayoutOverrides = JSON.parse(localStorage.getItem(panelLayoutStorageKey) || "{}"); } catch { panelLayoutOverrides = {}; }
if (!panelLayoutOverrides || typeof panelLayoutOverrides !== "object" || Array.isArray(panelLayoutOverrides)) panelLayoutOverrides = {};
let storedDensity = "comfortable";
try { storedDensity = localStorage.getItem(densityStorageKey) || "comfortable"; } catch { /* Storage may be disabled. */ }

function setDensity(density, persist = false) {
  const normalized = density === "compact" ? "compact" : "comfortable";
  document.documentElement.dataset.density = normalized;
  requestAnimationFrame(() => document.querySelectorAll(".grid").forEach(updatePanelGridColumns));
  if (persist) {
    cacheVisualPreference("density", normalized);
    updatePreference("density", normalized);
  }
}

setDensity(storedDensity);

sidebarToggle.addEventListener("click", () => {
  setSidebar(document.documentElement.dataset.sidebar === "collapsed" ? "expanded" : "collapsed", true);
});
setSidebar(document.documentElement.dataset.sidebar || "expanded");

function updateLayoutToggleLabels() {
  for (const [module, toggle] of [["services", serviceLayoutToggle], ["servers", serverLayoutToggle]]) {
    const editing = layoutEditing[module];
    toggle.textContent = editing ? t("finishLayout") : t("customizeLayout");
    toggle.setAttribute("aria-pressed", String(editing));
  }
}

function applyLayoutEditorState(module, groupId) {
  const services = module === "services";
  const container = services ? groupsElement : monitoringGroupsElement;
  const toolbar = services ? serviceLayoutToolbar : serverLayoutToolbar;
  const reset = services ? serviceLayoutReset : serverLayoutReset;
  const confirmationContext = `${module}:${groupId}`;
  if (!layoutEditing[module] || (reset.dataset.confirming === "true" && reset.dataset.confirmationContext !== confirmationContext)) {
    clearDestructiveConfirmation(reset);
  }
  reset.dataset.confirmationContext = confirmationContext;
  container.dataset.layoutEditing = String(layoutEditing[module]);
  toolbar.hidden = !layoutEditing[module];
  reset.disabled = !Object.keys(groupLayoutOverride(module, groupId)).length;
  updateLayoutToggleLabels();
  updatePanelMoveButtons(container);
  container.querySelectorAll(".card-layout-grid").forEach((grid) => {
    updateCardMoveButtons(grid);
    updatePanelGridColumns(grid);
  });
}

function setLayoutEditing(module, editing) {
  layoutEditing[module] = editing;
  const route = parseRoute();
  const groupId = module === "services"
    ? dashboardConfig?.groups[Math.max(0, groupSlugs.indexOf(route.environment))]?.id
    : serverGroups[Math.max(0, serverGroupSlugs.indexOf(route.group))]?.id;
  if (groupId) applyLayoutEditorState(module, groupId);
}

function resetPanelLayout(module) {
  const route = parseRoute();
  const groupId = module === "services"
    ? dashboardConfig?.groups[Math.max(0, groupSlugs.indexOf(route.environment))]?.id
    : serverGroups[Math.max(0, serverGroupSlugs.indexOf(route.group))]?.id;
  if (!groupId) return;
  delete panelLayoutOverrides[module]?.[layoutGroupKey(groupId)];
  if (panelLayoutOverrides[module] && !Object.keys(panelLayoutOverrides[module]).length) delete panelLayoutOverrides[module];
  persistPanelLayouts();
  if (module === "services") renderSelectedEnvironment(route.environment);
  else renderMonitoring(route.group);
}

serviceLayoutToggle.addEventListener("click", () => setLayoutEditing("services", !layoutEditing.services));
serverLayoutToggle.addEventListener("click", () => setLayoutEditing("servers", !layoutEditing.servers));
serviceLayoutReset.addEventListener("click", () => confirmDestructiveAction(serviceLayoutReset, () => resetPanelLayout("services")));
serverLayoutReset.addEventListener("click", () => confirmDestructiveAction(serverLayoutReset, () => resetPanelLayout("servers")));

function slugify(value) {
  return value.toLocaleLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "environment";
}

function createGroupSlugs(groups) {
  const used = new Set();
  return groups.map((group) => {
    const base = group.id || slugify(group.name);
    let slug = base;
    let suffix = 2;
    while (used.has(slug)) slug = `${base}-${suffix++}`;
    used.add(slug);
    return slug;
  });
}

function parseRoute() {
  const route = window.location.hash.slice(1);
  if (!route || route === "overview") return { module: "overview" };
  if (route.startsWith("servers/") && appCapabilities.servers) return { module: "servers", group: route.slice(8) };
  if (["servers", "monitoring", "remote"].includes(route) && appCapabilities.servers) {
    return { module: "servers", group: serverGroupSlugs[0] };
  }
  if (route === "notifications" && appCapabilities.notifications) return { module: route };
  if (route === "admin" && appCapabilities.administration) return { module: "admin" };
  if (route.startsWith("services/") && appCapabilities.services) return { module: "dashboard", environment: route.slice(9) };
  if (route.startsWith("dashboard/") && appCapabilities.services) return { module: "dashboard", environment: route.slice(10) };
  if (groupSlugs.includes(route) && appCapabilities.services) return { module: "dashboard", environment: route };
  if (appCapabilities.services) return { module: "dashboard", environment: groupSlugs[0] };
  const fallback = ["servers", "notifications"].find((name) => appCapabilities[name]);
  return { module: fallback ?? (appCapabilities.administration ? "admin" : "dashboard"), environment: groupSlugs[0], group: serverGroupSlugs[0] };
}

function setActiveModule(module) {
  document.documentElement.dataset.module = module === "dashboard" ? "services" : module;
  document.querySelectorAll(".module-nav a").forEach((link) => {
    if (link.dataset.module === module) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
  if (module === "admin") adminNavLink.setAttribute("aria-current", "page");
  else adminNavLink.removeAttribute("aria-current");
  overviewView.hidden = module !== "overview";
  dashboardView.hidden = module !== "dashboard";
  monitoringView.hidden = module !== "servers";
  notificationsView.hidden = module !== "notifications";
  adminView.hidden = module !== "admin";
  sessionView.hidden = true;
  viewTitleElement.textContent = {
    overview: t("infrastructureScope"), dashboard: t("serviceOverview"), servers: t("serverOperations"), notifications: t("deliveryChannels"), admin: t("administration")
  }[module] ?? "Scope";
  const subtitleKey = { overview: "overviewDescription", dashboard: "configurationLoading", servers: "serverSubtitle", notifications: "notificationsSubtitle", admin: "administrationDescription" }[module];
  const menuName = module === "dashboard" ? "services" : module === "servers" ? "server" : module;
  const configuredSubtitle = module === "overview" ? "" : module === "dashboard" ? dashboardConfig?.subtitle : menuPresentation[menuName]?.subtitle;
  viewSubtitleElement.textContent = configuredSubtitle?.trim() || (subtitleKey ? t(subtitleKey) : "");
  const count = moduleCounts.get(module);
  viewCountElement.textContent = count || "";
  viewCountElement.hidden = !count;
}

function setModuleCount(module, count) {
  moduleCounts.set(module, count);
  if (!activeSession && parseRoute().module === module) {
    viewCountElement.textContent = count;
    viewCountElement.hidden = !count;
  }
}

function dashboardPanels(group) {
  return group.panels ?? [{ name: t("services"), collapsed: false, items: group.items }];
}

function dashboardItemCount(group) {
  return dashboardPanels(group).reduce((total, panel) => total + panel.items.length, 0);
}

function updatePanelGridColumns(grid) {
  const configuredItemCount = Number(grid.dataset.itemCount) || 1;
  const editing = grid.closest("[data-layout-editing]")?.dataset.layoutEditing === "true";
  const visibleItemCount = [...grid.querySelectorAll(":scope > .layout-card-shell")]
    .filter((card) => card.dataset.cardHidden !== "true").length;
  const itemCount = editing ? configuredItemCount : Math.max(visibleItemCount, 1);
  const minimumWidth = document.documentElement.dataset.density === "compact"
    ? Number(grid.dataset.compactMinimumWidth) || MIN_COMPACT_PANEL_WIDTH_PX
    : Number(grid.dataset.minimumWidth) || MIN_PANEL_WIDTH_PX;
  const gap = Number.parseFloat(getComputedStyle(grid).columnGap) || 0;
  const fittingColumns = Math.max(1, Math.floor((grid.clientWidth + gap) / (minimumWidth + gap)));
  const customizedWidths = grid.dataset.cardWidthsCustomized === "true";
  const columns = customizedWidths
    ? CUSTOM_CARD_GRID_COLUMNS
    : Math.min(itemCount, MAX_PANEL_COLUMNS, fittingColumns);
  grid.style.setProperty("--panel-columns", columns);
  const configuredSpans = customizedWidths
    ? { xsmall: 3, small: 4, medium: 6, large: 8, full: columns }
    : { xsmall: 1, small: 1, medium: 2, large: 3, full: columns };
  grid.querySelectorAll(".layout-card-shell").forEach((card) => {
    const configuredSpan = configuredSpans[normalizedCardWidth(card.dataset.cardWidth)] ?? 1;
    card.style.gridColumn = `span ${Math.min(columns, configuredSpan)}`;
  });
}

function configurePanelGrid(grid, itemCount, { minimumWidth, compactMinimumWidth } = {}) {
  grid.dataset.itemCount = itemCount;
  if (minimumWidth) grid.dataset.minimumWidth = minimumWidth;
  if (compactMinimumWidth) grid.dataset.compactMinimumWidth = compactMinimumWidth;
  const updateColumns = () => updatePanelGridColumns(grid);
  grid.style.setProperty("--panel-columns", Math.min(itemCount || 1, MAX_PANEL_COLUMNS));
  const observer = new ResizeObserver(updateColumns);
  observer.observe(grid);
  panelGridObservers.set(grid, observer);
  requestAnimationFrame(updateColumns);
}

function disconnectPanelGridObservers(container) {
  container.querySelectorAll(".card-layout-grid").forEach((grid) => {
    panelGridObservers.get(grid)?.disconnect();
    panelGridObservers.delete(grid);
  });
}

function panelIdentifier(panel, index = 0) {
  return panel.id || slugify(panel.name) || `panel-${index + 1}`;
}

function normalizedPanelWidth(width) {
  return PANEL_WIDTHS.includes(width) ? width : "full";
}

function normalizedCardWidth(width) {
  return CARD_WIDTHS.includes(width) ? width : "full";
}

function layoutGroupKey(groupId) {
  return `group:${groupId}`;
}

function layoutPanelKey(panelId) {
  return `panel:${panelId}`;
}

function layoutCardKey(cardId) {
  return `card:${cardId}`;
}

function groupLayoutOverride(module, groupId, create = false) {
  if (!panelLayoutOverrides[module] || typeof panelLayoutOverrides[module] !== "object" || Array.isArray(panelLayoutOverrides[module])) {
    if (!create) return {};
    panelLayoutOverrides[module] = {};
  }
  const key = layoutGroupKey(groupId);
  if (!panelLayoutOverrides[module][key] || typeof panelLayoutOverrides[module][key] !== "object" || Array.isArray(panelLayoutOverrides[module][key])) {
    if (!create) return {};
    panelLayoutOverrides[module][key] = {};
  }
  return panelLayoutOverrides[module][key];
}

function persistPanelLayouts() {
  updatePreference("panelLayouts", panelLayoutOverrides);
}

function prunePanelLayout(module, groupId) {
  const section = panelLayoutOverrides[module];
  const key = layoutGroupKey(groupId);
  if (section?.[key] && !Object.keys(section[key]).length) delete section[key];
  if (section && !Object.keys(section).length) delete panelLayoutOverrides[module];
}

function panelsWithLayout(module, groupId, panels) {
  const override = groupLayoutOverride(module, groupId);
  const order = Array.isArray(override.order) ? override.order : [];
  const orderIndex = new Map(order.map((id, index) => [id, index]));
  const widths = override.widths && typeof override.widths === "object" && !Array.isArray(override.widths) ? override.widths : {};
  const hiddenPanels = override.hidden && typeof override.hidden === "object" && !Array.isArray(override.hidden) ? override.hidden : {};
  return panels.map((panel, index) => {
    const id = panelIdentifier(panel, index);
    const customWidth = widths[layoutPanelKey(id)];
    const hidden = hiddenPanels[layoutPanelKey(id)] === true;
    return { ...panel, id, sourceIndex: index, effectiveWidth: normalizedPanelWidth(customWidth ?? panel.layout?.width), hidden };
  }).sort((left, right) => {
    const leftIndex = orderIndex.has(left.id) ? orderIndex.get(left.id) : Number.MAX_SAFE_INTEGER;
    const rightIndex = orderIndex.has(right.id) ? orderIndex.get(right.id) : Number.MAX_SAFE_INTEGER;
    return leftIndex - rightIndex;
  });
}

function panelCardLayoutOverride(module, groupId, panelId, create = false) {
  const groupOverride = groupLayoutOverride(module, groupId, create);
  if (!groupOverride.cards || typeof groupOverride.cards !== "object" || Array.isArray(groupOverride.cards)) {
    if (!create) return {};
    groupOverride.cards = {};
  }
  const key = layoutPanelKey(panelId);
  if (!groupOverride.cards[key] || typeof groupOverride.cards[key] !== "object" || Array.isArray(groupOverride.cards[key])) {
    if (!create) return {};
    groupOverride.cards[key] = {};
  }
  return groupOverride.cards[key];
}

function cardIdentifier(card, index = 0) {
  return card.id || `${slugify(card.name)}-${index + 1}`;
}

function cardsWithLayout(module, groupId, panelId, cards, { defaultWidth = "small", favorite } = {}) {
  const override = panelCardLayoutOverride(module, groupId, panelId);
  const order = Array.isArray(override.order) ? override.order : [];
  const orderIndex = new Map(order.map((id, index) => [id, index]));
  const widths = override.widths && typeof override.widths === "object" && !Array.isArray(override.widths) ? override.widths : {};
  const hiddenCards = override.hidden && typeof override.hidden === "object" && !Array.isArray(override.hidden) ? override.hidden : {};
  const arranged = cards.map((card, index) => {
    const id = cardIdentifier(card, index);
    return {
      value: card,
      id,
      sourceIndex: index,
      effectiveWidth: normalizedCardWidth(widths[layoutCardKey(id)] ?? defaultWidth),
      customizedWidth: Object.hasOwn(widths, layoutCardKey(id)),
      hidden: hiddenCards[layoutCardKey(id)] === true
    };
  });
  return arranged.sort((left, right) => {
    const leftIndex = orderIndex.has(left.id) ? orderIndex.get(left.id) : Number.MAX_SAFE_INTEGER;
    const rightIndex = orderIndex.has(right.id) ? orderIndex.get(right.id) : Number.MAX_SAFE_INTEGER;
    if (leftIndex !== rightIndex) return leftIndex - rightIndex;
    if (!order.length && favorite) return Number(favorite(right.value)) - Number(favorite(left.value));
    return left.sourceIndex - right.sourceIndex;
  });
}

function pruneCardLayout(module, groupId, panelId) {
  const groupOverride = groupLayoutOverride(module, groupId);
  const panelKey = layoutPanelKey(panelId);
  if (groupOverride.cards?.[panelKey] && !Object.keys(groupOverride.cards[panelKey]).length) delete groupOverride.cards[panelKey];
  if (groupOverride.cards && !Object.keys(groupOverride.cards).length) delete groupOverride.cards;
  prunePanelLayout(module, groupId);
}

function setCardWidth(context, width, card) {
  const override = panelCardLayoutOverride(context.module, context.groupId, context.panelId, true);
  if (!override.widths || typeof override.widths !== "object" || Array.isArray(override.widths)) override.widths = {};
  override.widths[layoutCardKey(context.cardId)] = normalizedCardWidth(width);
  card.parentElement.dataset.cardWidthsCustomized = "true";
  card.dataset.cardWidth = normalizedCardWidth(width);
  card.querySelectorAll(".card-size-button").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.width === card.dataset.cardWidth));
  });
  updatePanelGridColumns(card.parentElement);
  (context.module === "services" ? serviceLayoutReset : serverLayoutReset).disabled = false;
  persistPanelLayouts();
}

function setCardVisibility(context, hidden, card) {
  const override = panelCardLayoutOverride(context.module, context.groupId, context.panelId, true);
  if (!override.hidden || typeof override.hidden !== "object" || Array.isArray(override.hidden)) override.hidden = {};
  if (hidden) override.hidden[layoutCardKey(context.cardId)] = true;
  else delete override.hidden[layoutCardKey(context.cardId)];
  if (!Object.keys(override.hidden).length) delete override.hidden;
  card.dataset.cardHidden = String(hidden);
  const button = card.querySelector('[data-card-action="visibility"]');
  const label = hidden ? t("showCard") : t("hideCard");
  button.textContent = hidden ? "○" : "◉";
  button.title = label;
  button.setAttribute("aria-label", label);
  pruneCardLayout(context.module, context.groupId, context.panelId);
  (context.module === "services" ? serviceLayoutReset : serverLayoutReset).disabled = !Object.keys(groupLayoutOverride(context.module, context.groupId)).length;
  persistPanelLayouts();
}

function persistCardOrder(context, container) {
  const visibleOrder = [...container.children]
    .filter((element) => element.classList.contains("layout-card-shell"))
    .map((element) => element.dataset.cardId);
  let completeOrder;
  try { completeOrder = JSON.parse(container.dataset.cardLayoutOrder || "[]"); } catch { completeOrder = []; }
  const visible = new Set(visibleOrder);
  let visibleIndex = 0;
  const mergedOrder = completeOrder.map((id) => visible.has(id) ? visibleOrder[visibleIndex++] : id);
  for (const id of visibleOrder) if (!mergedOrder.includes(id)) mergedOrder.push(id);
  const override = panelCardLayoutOverride(context.module, context.groupId, context.panelId, true);
  override.order = mergedOrder;
  container.dataset.cardLayoutOrder = JSON.stringify(mergedOrder);
  (context.module === "services" ? serviceLayoutReset : serverLayoutReset).disabled = false;
  persistPanelLayouts();
}

function updateCardMoveButtons(container) {
  const cards = [...container.children].filter((element) => element.classList.contains("layout-card-shell"));
  cards.forEach((card, index) => {
    const previous = card.querySelector('[data-card-move="previous"]');
    const next = card.querySelector('[data-card-move="next"]');
    if (previous) previous.disabled = index === 0;
    if (next) next.disabled = index === cards.length - 1;
  });
}

function moveCard(card, direction, context) {
  const container = card.parentElement;
  const cards = [...container.children].filter((element) => element.classList.contains("layout-card-shell"));
  const sibling = cards[cards.indexOf(card) + direction];
  if (!sibling) return;
  if (direction < 0) sibling.before(card);
  else sibling.after(card);
  persistCardOrder(context, container);
  updateCardMoveButtons(container);
  card.querySelector(".card-drag-handle")?.focus({ preventScroll: true });
}

function createCardLayoutControls(card, context) {
  const controls = document.createElement("div");
  controls.className = "card-layout-controls";
  const dragHandle = document.createElement("button");
  dragHandle.type = "button";
  dragHandle.className = "card-drag-handle";
  dragHandle.draggable = true;
  dragHandle.textContent = "⠿";
  dragHandle.title = t("moveCard");
  dragHandle.setAttribute("aria-label", t("moveCard"));
  dragHandle.addEventListener("dragstart", (event) => {
    draggedCard = card;
    card.classList.add("card-dragging");
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", context.cardId);
  });
  dragHandle.addEventListener("dragend", () => {
    draggedCard = undefined;
    card.classList.remove("card-dragging");
    card.parentElement?.querySelectorAll(".card-drop-before, .card-drop-after").forEach((element) => {
      element.classList.remove("card-drop-before", "card-drop-after");
      delete element.dataset.dropAxis;
    });
  });
  const previous = document.createElement("button");
  previous.type = "button";
  previous.dataset.cardMove = "previous";
  previous.textContent = "←";
  previous.title = t("moveCardPrevious");
  previous.setAttribute("aria-label", previous.title);
  previous.addEventListener("click", () => moveCard(card, -1, context));
  const next = document.createElement("button");
  next.type = "button";
  next.dataset.cardMove = "next";
  next.textContent = "→";
  next.title = t("moveCardNext");
  next.setAttribute("aria-label", next.title);
  next.addEventListener("click", () => moveCard(card, 1, context));
  const visibility = document.createElement("button");
  visibility.type = "button";
  visibility.dataset.cardAction = "visibility";
  visibility.textContent = context.hidden ? "○" : "◉";
  visibility.title = context.hidden ? t("showCard") : t("hideCard");
  visibility.setAttribute("aria-label", visibility.title);
  visibility.addEventListener("click", () => setCardVisibility(context, card.dataset.cardHidden !== "true", card));
  const sizeLabel = document.createElement("span");
  sizeLabel.textContent = t("cardSize");
  const sizes = document.createElement("span");
  sizes.className = "card-size-options";
  const sizeLabels = {
    xsmall: ["XS", t("cardSizeXSmall")],
    small: ["S", t("cardSizeSmall")], medium: ["M", t("cardSizeMedium")],
    large: ["L", t("cardSizeLarge")], full: ["↔", t("cardSizeFull")]
  };
  for (const width of CARD_WIDTHS) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "card-size-button";
    button.dataset.width = width;
    button.textContent = sizeLabels[width][0];
    button.title = sizeLabels[width][1];
    button.setAttribute("aria-label", sizeLabels[width][1]);
    button.setAttribute("aria-pressed", String(width === context.width));
    button.addEventListener("click", () => setCardWidth(context, width, card));
    sizes.append(button);
  }
  controls.append(dragHandle, previous, next, visibility, sizeLabel, sizes);
  card.addEventListener("dragover", (event) => {
    if (!draggedCard || draggedCard === card || draggedCard.parentElement !== card.parentElement
      || card.closest("[data-layout-editing]")?.dataset.layoutEditing !== "true") return;
    event.preventDefault();
    const rect = card.getBoundingClientRect();
    const draggedRect = draggedCard.getBoundingClientRect();
    const sameRow = Math.abs(rect.top - draggedRect.top) < Math.min(rect.height, draggedRect.height) / 2;
    const after = sameRow ? event.clientX > rect.left + rect.width / 2 : event.clientY > rect.top + rect.height / 2;
    card.dataset.dropAxis = sameRow ? "horizontal" : "vertical";
    card.classList.toggle("card-drop-before", !after);
    card.classList.toggle("card-drop-after", after);
  });
  card.addEventListener("dragleave", (event) => {
    if (!card.contains(event.relatedTarget)) {
      card.classList.remove("card-drop-before", "card-drop-after");
      delete card.dataset.dropAxis;
    }
  });
  card.addEventListener("drop", (event) => {
    if (!draggedCard || draggedCard === card || draggedCard.parentElement !== card.parentElement) return;
    event.preventDefault();
    if (card.classList.contains("card-drop-after")) card.after(draggedCard);
    else card.before(draggedCard);
    card.classList.remove("card-drop-before", "card-drop-after");
    delete card.dataset.dropAxis;
    persistCardOrder(context, card.parentElement);
    updateCardMoveButtons(card.parentElement);
    updatePanelGridColumns(card.parentElement);
  });
  return controls;
}

function configureLayoutCard(card, context) {
  card.classList.add("layout-card-shell");
  card.dataset.cardId = context.cardId;
  card.dataset.cardWidth = normalizedCardWidth(context.width);
  card.dataset.cardHidden = String(context.hidden === true);
  card.append(createCardLayoutControls(card, context));
  return card;
}

function setPanelWidth(module, groupId, panelId, width, panel) {
  const override = groupLayoutOverride(module, groupId, true);
  if (!override.widths || typeof override.widths !== "object" || Array.isArray(override.widths)) override.widths = {};
  override.widths[layoutPanelKey(panelId)] = normalizedPanelWidth(width);
  panel.dataset.panelWidth = normalizedPanelWidth(width);
  panel.querySelectorAll(".panel-size-button").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.width === panel.dataset.panelWidth));
  });
  (module === "services" ? serviceLayoutReset : serverLayoutReset).disabled = false;
  persistPanelLayouts();
}

function setPanelVisibility(module, groupId, panelId, hidden, panel) {
  const override = groupLayoutOverride(module, groupId, true);
  if (!override.hidden || typeof override.hidden !== "object" || Array.isArray(override.hidden)) override.hidden = {};
  if (hidden) override.hidden[layoutPanelKey(panelId)] = true;
  else delete override.hidden[layoutPanelKey(panelId)];
  if (!Object.keys(override.hidden).length) delete override.hidden;
  panel.dataset.panelHidden = String(hidden);
  const button = panel.querySelector('[data-action="visibility"]');
  const label = hidden ? t("showPanel") : t("hidePanel");
  button.textContent = hidden ? "○" : "◉";
  button.title = label;
  button.setAttribute("aria-label", label);
  prunePanelLayout(module, groupId);
  (module === "services" ? serviceLayoutReset : serverLayoutReset).disabled = !Object.keys(groupLayoutOverride(module, groupId)).length;
  persistPanelLayouts();
}

function persistPanelOrder(module, groupId, container) {
  const visibleOrder = [...container.children]
    .filter((element) => element.classList.contains("collapsible-panel"))
    .map((element) => element.dataset.panelId);
  let completeOrder;
  try { completeOrder = JSON.parse(container.dataset.layoutOrder || "[]"); } catch { completeOrder = []; }
  const visible = new Set(visibleOrder);
  let visibleIndex = 0;
  const mergedOrder = completeOrder.map((id) => visible.has(id) ? visibleOrder[visibleIndex++] : id);
  for (const id of visibleOrder) if (!mergedOrder.includes(id)) mergedOrder.push(id);
  const override = groupLayoutOverride(module, groupId, true);
  override.order = mergedOrder;
  container.dataset.layoutOrder = JSON.stringify(mergedOrder);
  (module === "services" ? serviceLayoutReset : serverLayoutReset).disabled = false;
  persistPanelLayouts();
}

function updatePanelMoveButtons(container) {
  const panels = [...container.children].filter((element) => element.classList.contains("collapsible-panel"));
  panels.forEach((panel, index) => {
    const previous = panel.querySelector('[data-move="previous"]');
    const next = panel.querySelector('[data-move="next"]');
    if (previous) previous.disabled = index === 0;
    if (next) next.disabled = index === panels.length - 1;
  });
}

function movePanel(panel, direction, context) {
  const container = panel.parentElement;
  const panels = [...container.children].filter((element) => element.classList.contains("collapsible-panel"));
  const index = panels.indexOf(panel);
  const sibling = panels[index + direction];
  if (!sibling) return;
  if (direction < 0) sibling.before(panel);
  else sibling.after(panel);
  persistPanelOrder(context.module, context.groupId, container);
  updatePanelMoveButtons(container);
  panel.querySelector(".panel-drag-handle")?.focus({ preventScroll: true });
}

function createPanelLayoutControls(panel, context) {
  const controls = document.createElement("div");
  controls.className = "panel-layout-controls";
  const dragHandle = document.createElement("button");
  dragHandle.type = "button";
  dragHandle.className = "panel-drag-handle";
  dragHandle.draggable = true;
  dragHandle.textContent = "⠿";
  dragHandle.title = t("movePanel");
  dragHandle.setAttribute("aria-label", t("movePanel"));
  dragHandle.addEventListener("dragstart", (event) => {
    draggedPanel = panel;
    panel.classList.add("panel-dragging");
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", context.panelId);
  });
  dragHandle.addEventListener("dragend", () => {
    draggedPanel = undefined;
    panel.classList.remove("panel-dragging");
    panel.parentElement?.querySelectorAll(".panel-drop-before, .panel-drop-after").forEach((element) => {
      element.classList.remove("panel-drop-before", "panel-drop-after");
      delete element.dataset.dropAxis;
    });
  });

  const previous = document.createElement("button");
  previous.type = "button";
  previous.dataset.move = "previous";
  previous.textContent = "←";
  previous.title = t("movePanelPrevious");
  previous.setAttribute("aria-label", t("movePanelPrevious"));
  previous.addEventListener("click", () => movePanel(panel, -1, context));
  const next = document.createElement("button");
  next.type = "button";
  next.dataset.move = "next";
  next.textContent = "→";
  next.title = t("movePanelNext");
  next.setAttribute("aria-label", t("movePanelNext"));
  next.addEventListener("click", () => movePanel(panel, 1, context));
  const visibility = document.createElement("button");
  visibility.type = "button";
  visibility.dataset.action = "visibility";
  visibility.textContent = context.hidden ? "○" : "◉";
  visibility.title = context.hidden ? t("showPanel") : t("hidePanel");
  visibility.setAttribute("aria-label", visibility.title);
  visibility.addEventListener("click", () => {
    setPanelVisibility(context.module, context.groupId, context.panelId, panel.dataset.panelHidden !== "true", panel);
  });

  const sizeLabel = document.createElement("span");
  sizeLabel.textContent = t("panelSize");
  const sizes = document.createElement("span");
  sizes.className = "panel-size-options";
  const sizeLabels = {
    xsmall: ["XS", t("panelSizeXSmall")],
    small: ["S", t("panelSizeSmall")], medium: ["M", t("panelSizeMedium")],
    large: ["L", t("panelSizeLarge")], full: ["↔", t("panelSizeFull")]
  };
  for (const width of PANEL_WIDTHS) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "panel-size-button";
    button.dataset.width = width;
    button.textContent = sizeLabels[width][0];
    button.title = sizeLabels[width][1];
    button.setAttribute("aria-label", sizeLabels[width][1]);
    button.setAttribute("aria-pressed", String(width === context.width));
    button.addEventListener("click", () => setPanelWidth(context.module, context.groupId, context.panelId, width, panel));
    sizes.append(button);
  }
  controls.append(dragHandle, previous, next, visibility, sizeLabel, sizes);

  panel.addEventListener("dragover", (event) => {
    if (!draggedPanel || draggedPanel === panel || panel.parentElement?.dataset.layoutEditing !== "true") return;
    event.preventDefault();
    const targetRect = panel.getBoundingClientRect();
    const draggedRect = draggedPanel.getBoundingClientRect();
    const sameRow = Math.abs(targetRect.top - draggedRect.top) < Math.min(targetRect.height, draggedRect.height) / 2;
    const after = sameRow
      ? event.clientX > targetRect.left + targetRect.width / 2
      : event.clientY > targetRect.top + targetRect.height / 2;
    panel.dataset.dropAxis = sameRow ? "horizontal" : "vertical";
    panel.classList.toggle("panel-drop-before", !after);
    panel.classList.toggle("panel-drop-after", after);
  });
  panel.addEventListener("dragleave", (event) => {
    if (!panel.contains(event.relatedTarget)) {
      panel.classList.remove("panel-drop-before", "panel-drop-after");
      delete panel.dataset.dropAxis;
    }
  });
  panel.addEventListener("drop", (event) => {
    if (!draggedPanel || draggedPanel === panel) return;
    event.preventDefault();
    const after = panel.classList.contains("panel-drop-after");
    if (after) panel.after(draggedPanel);
    else panel.before(draggedPanel);
    panel.classList.remove("panel-drop-before", "panel-drop-after");
    delete panel.dataset.dropAxis;
    persistPanelOrder(context.module, context.groupId, panel.parentElement);
    updatePanelMoveButtons(panel.parentElement);
  });
  return controls;
}

function createCollapsiblePanel(titleText, metaText, content, { open = true, stateKey, layout } = {}) {
  const panel = document.createElement("details");
  panel.className = "collapsible-panel";
  panel.tabIndex = -1;
  if (layout) {
    panel.dataset.panelId = layout.panelId;
    panel.dataset.panelWidth = normalizedPanelWidth(layout.width);
    panel.dataset.panelHidden = String(layout.hidden === true);
  }
  panel.open = stateKey && panelOpenState.has(stateKey) ? panelOpenState.get(stateKey) : open;
  if (stateKey) panel.addEventListener("toggle", () => panelOpenState.set(stateKey, panel.open));
  const summary = document.createElement("summary");
  summary.className = "section-heading";
  const title = document.createElement("h2");
  title.textContent = titleText;
  const summaryMeta = document.createElement("span");
  summaryMeta.className = "section-meta";
  const meta = document.createElement("span");
  meta.textContent = metaText;
  const chevron = document.createElement("i");
  chevron.className = "panel-chevron";
  chevron.setAttribute("aria-hidden", "true");
  summaryMeta.append(meta, chevron);
  summary.append(title, summaryMeta);
  const body = document.createElement("div");
  body.className = "collapsible-content";
  body.append(content);
  panel.append(summary);
  if (layout) panel.append(createPanelLayoutControls(panel, layout));
  panel.append(body);
  return panel;
}

function parseHttpUrl(value) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url : null;
  } catch { return null; }
}

function checkEnabled(value) {
  return value === true || (value && typeof value === "object" && value.enabled !== false);
}

function normalizedText(...values) {
  return values.flat().filter(Boolean).join(" ").toLocaleLowerCase();
}

function matchesQuery(item, query = searchQuery) {
  return !query || normalizedText(item.name, item.description, item.tags).includes(query);
}

function serviceFavoriteKey(group, panel, item) {
  return `service:${group.id}:${slugify(panel.name)}:${slugify(item.name)}`;
}

function serverFavoriteKey(server) {
  return `server:${server.id}`;
}

function isFavorite(key, configured = false) {
  return Object.hasOwn(favoriteOverrides, key) ? favoriteOverrides[key] : configured === true;
}

function toggleFavorite(key, configured) {
  favoriteOverrides[key] = !isFavorite(key, configured);
  updatePreference("favorites", favoriteOverrides);
  rerenderLocalizedContent();
}

function createFavoriteButton(key, configured) {
  const button = document.createElement("button");
  const active = isFavorite(key, configured);
  button.type = "button";
  button.className = "favorite-button";
  button.classList.toggle("is-favorite", active);
  button.textContent = active ? "★" : "☆";
  button.title = t(active ? "removeFavorite" : "addFavorite");
  button.setAttribute("aria-label", button.title);
  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    toggleFavorite(key, configured);
  });
  return button;
}

function createTagList(tags = []) {
  const list = document.createElement("span");
  list.className = "item-tags";
  for (const tag of tags) {
    const chip = document.createElement("span");
    chip.textContent = tag;
    list.append(chip);
  }
  return list;
}

function createScopeBadge(target) {
  const badge = document.createElement("span");
  badge.className = "scope-badge";
  const included = isInScope(target);
  badge.classList.toggle("scope-badge-ignored", !included);
  badge.textContent = included ? "◎" : "⊘";
  badge.title = t(included ? "includedInScope" : "ignoredByScope");
  badge.setAttribute("aria-label", badge.title);
  return badge;
}

function historyFor(targetType, targetId) {
  return latestHistory.targets?.find((item) => item.targetType === targetType && item.targetId === targetId);
}

function formatDuration(milliseconds) {
  const minutes = Math.max(0, Math.floor(milliseconds / 60_000));
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const remainder = minutes % 60;
  return [days ? `${days}d` : "", hours ? `${hours}h` : "", `${remainder}m`].filter(Boolean).join(" ");
}

function createHistoryStrip(history) {
  if (!history) return null;
  const container = document.createElement("div");
  container.className = "target-history";
  const values = document.createElement("span");
  values.textContent = `24h ${history.availability24h ?? "–"}% · 7d ${history.availability7d ?? "–"}%`;
  const duration = document.createElement("small");
  duration.textContent = t("currentStateFor", { duration: formatDuration(Date.now() - new Date(history.statusChangedAt).getTime()) });
  duration.title = `${t("currentStateSince")} ${new Intl.DateTimeFormat(locale, { dateStyle: "short", timeStyle: "short" }).format(new Date(history.statusChangedAt))}`;
  const outage = document.createElement("small");
  outage.textContent = history.lastOutageAt
    ? `${t("lastOutage")} ${new Intl.DateTimeFormat(locale, { dateStyle: "short", timeStyle: "short" }).format(new Date(history.lastOutageAt))}`
    : t("noRecordedOutage");
  const timeline = document.createElement("span");
  timeline.className = "mini-timeline";
  for (const point of (latestHistory.timeline ?? []).filter((item) => item.targetType === history.targetType && item.targetId === history.targetId).slice(-24)) {
    const bar = document.createElement("i");
    bar.dataset.status = point.up === point.total ? "up" : point.up === 0 ? "down" : "mixed";
    timeline.append(bar);
  }
  container.append(values, duration, outage);
  if (timeline.children.length) container.append(timeline);
  return container;
}

function renderTagFilters(element, bar, tags, activeTag, select) {
  element.replaceChildren();
  const values = [...new Set(tags)].sort((a, b) => a.localeCompare(b));
  bar.hidden = values.length === 0;
  for (const tag of values) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = tag;
    button.classList.toggle("active", tag === activeTag);
    button.addEventListener("click", () => select(tag === activeTag ? "" : tag));
    element.append(button);
  }
}

function createFilteredEmptyState() {
  const empty = document.createElement("p");
  empty.className = "filtered-empty";
  empty.textContent = t("noMatchingTargets");
  return empty;
}

function sameOwner(candidate, owner) {
  if (!candidate || candidate.kind !== owner.kind) return false;
  if (owner.kind === "server") return candidate.id === owner.id;
  return candidate.groupIndex === owner.groupIndex
    && candidate.panelIndex === owner.panelIndex
    && candidate.itemIndex === owner.itemIndex;
}

function createEmbeddedHealth(owner, { certificates = false, dns = false } = {}) {
  const checks = [];
  if (certificates) checks.push({ type: "TLS", result: latestCertificates.find((item) => sameOwner(item.owner, owner)) });
  if (dns) checks.push({ type: "DNS", result: latestDnsChecks.find((item) => sameOwner(item.owner, owner)) });
  if (!checks.length) return null;

  const container = document.createElement("div");
  container.className = "embedded-health";
  for (const check of checks) {
    const status = check.result?.status ?? "pending";
    const item = document.createElement("span");
    item.className = "embedded-check";
    item.dataset.status = status;
    const dot = document.createElement("i");
    dot.className = "status-indicator";
    dot.setAttribute("aria-hidden", "true");
    const label = document.createElement("strong");
    label.textContent = check.type;
    const detail = document.createElement("small");
    if (!check.result) detail.textContent = t("checking");
    else if (check.type === "TLS" && check.result.status === "up" && Number.isFinite(check.result.daysRemaining)) {
      detail.textContent = plural(check.result.daysRemaining, "day", "days");
    } else if (check.type === "DNS" && check.result.status === "up") {
      detail.textContent = `${check.result.answers.length} ${plural(check.result.answers.length, "answer", "answers")}`;
    } else detail.textContent = check.result.status === "up" ? "Up" : "Down";
    item.title = `${check.type}: ${detail.textContent}`;
    item.append(dot, label, detail);
    container.append(item);
  }
  return container;
}

function createServiceIcon(value, name) {
  const container = document.createElement("span");
  container.className = "icon";
  container.setAttribute("aria-hidden", "true");
  const fallback = iconFallback(value, name);
  const source = iconSource(value, iconBaseUrl);
  if (!source) {
    container.textContent = fallback;
    return container;
  }
  const image = document.createElement("img");
  image.src = source;
  image.alt = "";
  image.loading = "lazy";
  image.decoding = "async";
  image.referrerPolicy = "no-referrer";
  image.addEventListener("error", () => {
    container.replaceChildren(document.createTextNode(fallback));
  }, { once: true });
  container.append(image);
  return container;
}

function createDashboardCard(item, group, panel, groupIndex, panelIndex, itemIndex, cardLayout) {
  const url = parseHttpUrl(item.url);
  const card = document.createElement(url ? "a" : "article");
  card.className = `card${url ? "" : " card-disabled"}`;
  card.dataset.status = "pending";
  if (url) { card.href = url.href; card.target = "_blank"; card.rel = "noopener noreferrer"; }
  cardElements.set(`${groupIndex}:${panelIndex}:${itemIndex}`, card);

  const top = document.createElement("span");
  top.className = "card-top";
  const icon = createServiceIcon(item.icon, item.name);
  const state = document.createElement("span");
  state.className = "card-state";
  state.title = t("statusChecking");
  state.setAttribute("aria-label", t("statusChecking"));
  const dot = document.createElement("i");
  dot.className = "status-indicator";
  dot.setAttribute("aria-hidden", "true");
  state.append(dot);
  const topMeta = document.createElement("span");
  topMeta.className = "card-top-meta";
  topMeta.append(createScopeBadge(item), state);
  top.append(icon, topMeta);

  const content = document.createElement("span");
  content.className = "card-content";
  const name = document.createElement("strong");
  name.textContent = item.name;
  name.title = item.name;
  content.append(name);
  if (item.description) {
    const description = document.createElement("span");
    description.className = "card-description";
    description.textContent = item.description;
    description.title = item.description;
    content.append(description);
  }
  if (item.tags?.length) content.append(createTagList(item.tags));
  if (item["depends-on"]?.length) {
    const dependencies = document.createElement("span");
    dependencies.className = "service-dependencies";
    dependencies.append(document.createTextNode(`${t("dependsOn")}: `));
    for (const dependencyId of item["depends-on"]) {
      const server = serverList().find((candidate) => candidate.id === dependencyId);
      const chip = document.createElement("span");
      chip.dataset.status = server ? serverOverallStatus(server) : "down";
      chip.textContent = server?.name ?? dependencyId;
      chip.title = server?.name ?? dependencyId;
      dependencies.append(chip);
    }
    content.append(dependencies);
  }

  let footer;
  if (url) {
    footer = document.createElement("span");
    footer.className = "card-footer";
    const hostname = document.createElement("span");
    hostname.className = "card-host";
    hostname.textContent = url.host;
    footer.append(hostname);
  }
  const health = createEmbeddedHealth(
    { kind: "service", groupIndex, panelIndex, itemIndex },
    { certificates: checkEnabled(item.certificates), dns: checkEnabled(item.dns) }
  );
  if (health?.querySelector('[data-status="down"]')) card.dataset.healthStatus = "down";
  card.append(top, content);
  if (health) card.append(health);
  const history = createHistoryStrip(historyFor("service", `${group.id ?? groupIndex}:${item.id ?? item.url}`));
  if (history) card.append(history);
  if (footer) card.append(footer);
  const shell = document.createElement("div");
  shell.className = "service-card-shell";
  const surface = document.createElement("div");
  surface.className = "service-card-surface";
  surface.append(card, createFavoriteButton(serviceFavoriteKey(group, panel, item), item.favorite));
  shell.append(surface);
  return configureLayoutCard(shell, cardLayout);
}

function renderEnvironmentNavigation() {
  groupNavElement.replaceChildren();
  dashboardConfig.groups.forEach((group, index) => {
    const link = document.createElement("a");
    link.href = `#services/${groupSlugs[index]}`;
    link.textContent = group.name;
    const count = document.createElement("span");
    count.textContent = dashboardItemCount(group);
    link.append(count);
    groupNavElement.append(link);
  });
  dashboardNavLink.href = `#services/${groupSlugs[0]}`;
}

function serverList() {
  const monitoredIds = new Set(monitoringHosts.map((host) => host.id));
  const remoteOnlyHosts = remoteConnections.filter((connection) => !monitoredIds.has(connection.id)).map((connection) => {
    const remoteStatus = latestRemoteStatuses.find((item) => item.id === connection.id);
    return {
      id: connection.id,
      name: connection.name,
      description: connection.description,
      environment: connection.environment,
      groupId: connection.groupId,
      groupName: connection.groupName,
      category: connection.category,
      categoryId: connection.categoryId,
      categoryCollapsed: connection.categoryCollapsed,
      categoryLayout: connection.categoryLayout,
      tags: connection.tags,
      favorite: connection.favorite,
      scope: connection.scope,
      connectionType: connection.protocol,
      remoteConnection: connection.id,
      monitoringConfigured: false,
      certificateMonitoring: connection.certificateMonitoring,
      dnsMonitoring: connection.dnsMonitoring,
      status: remoteStatus?.status ?? "pending"
    };
  });
  return [...monitoringHosts, ...remoteOnlyHosts];
}

function renderServerNavigation(servers = serverList()) {
  serverGroupNavElement.replaceChildren();
  serverGroups.forEach((group, index) => {
    const link = document.createElement("a");
    link.href = `#servers/${serverGroupSlugs[index]}`;
    link.textContent = group.name;
    const count = document.createElement("span");
    count.textContent = servers.filter((server) => server.groupId === group.id).length;
    link.append(count);
    serverGroupNavElement.append(link);
  });
  serverGroupPanelElement.hidden = serverGroups.length === 0;
  if (serverGroupSlugs.length) serversNavLink.href = `#servers/${serverGroupSlugs[0]}`;
}

function renderSelectedEnvironment(requestedSlug) {
  if (!dashboardConfig?.groups.length) return;
  const selectedIndex = Math.max(0, groupSlugs.indexOf(requestedSlug));
  const group = dashboardConfig.groups[selectedIndex];
  const allItems = dashboardPanels(group).flatMap((panel) => panel.items);
  const availableTags = allItems.flatMap((item) => item.tags ?? []);
  if (activeServiceTag && !availableTags.includes(activeServiceTag)) activeServiceTag = "";
  renderTagFilters(serviceTagFilters, serviceFilterBar, availableTags, activeServiceTag, (tag) => {
    activeServiceTag = tag;
    renderSelectedEnvironment(groupSlugs[selectedIndex]);
  });
  const count = allItems.filter((item) => matchesQuery(item) && (!activeServiceTag || item.tags?.includes(activeServiceTag))).length;
  setModuleCount("dashboard", `${count} ${plural(count, "target", "targets")}`);
  cardElements.clear();
  disconnectPanelGridObservers(groupsElement);
  groupsElement.replaceChildren();
  const panels = panelsWithLayout("services", group.id, dashboardPanels(group));
  groupsElement.dataset.layoutOrder = JSON.stringify(panels.map((panel) => panel.id));
  panels.forEach((panel) => {
    const arrangedItems = cardsWithLayout("services", group.id, panel.id, panel.items, {
      defaultWidth: "small",
      favorite: (item) => isFavorite(serviceFavoriteKey(group, panel, item), item.favorite)
    });
    const visibleItems = arrangedItems
      .filter(({ value: item }) => matchesQuery(item) && (!activeServiceTag || item.tags?.includes(activeServiceTag)));
    if (!visibleItems.length && (searchQuery || activeServiceTag)) return;
    const grid = document.createElement("div");
    grid.className = "grid card-layout-grid";
    grid.dataset.cardLayoutOrder = JSON.stringify(arrangedItems.map((item) => item.id));
    grid.dataset.cardWidthsCustomized = String(arrangedItems.some((item) => item.customizedWidth));
    grid.append(...visibleItems.map(({ value: item, sourceIndex, id, effectiveWidth, hidden }) => createDashboardCard(
      item, group, panel, selectedIndex, panel.sourceIndex, sourceIndex,
      { module: "services", groupId: group.id, panelId: panel.id, cardId: id, width: effectiveWidth, hidden }
    )));
    configurePanelGrid(grid, visibleItems.length);
    groupsElement.append(createCollapsiblePanel(
      panel.name,
      `${visibleItems.length} ${plural(visibleItems.length, "entry", "entries")}`,
      grid,
      {
        open: panel.collapsed !== true,
        stateKey: `dashboard:${groupSlugs[selectedIndex]}:${panel.id}`,
        layout: { module: "services", groupId: group.id, panelId: panel.id, width: panel.effectiveWidth, hidden: panel.hidden }
      }
    ));
  });
  if (!groupsElement.children.length) groupsElement.append(createFilteredEmptyState());
  applyLayoutEditorState("services", group.id);
  [...groupNavElement.children].forEach((link, index) => {
    if (index === selectedIndex) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
  applyStatuses(latestStatuses);
}

const statusLabels = { up: "Up", down: "Down" };
function applyStatuses(items) {
  for (const item of items) {
    const card = cardElements.get(`${item.groupIndex}:${item.panelIndex}:${item.itemIndex}`);
    if (!card) continue;
    const label = [statusLabels[item.status] || t("unknown"), item.detail, Number.isFinite(item.responseTimeMs) ? `${item.responseTimeMs} ms` : ""]
      .filter(Boolean).join(" · ");
    card.dataset.status = item.status;
    card.querySelector(".card-state").title = label;
    card.querySelector(".card-state").setAttribute("aria-label", label);
  }
}

function formatBytes(value) {
  if (!Number.isFinite(value)) return "–";
  const units = ["B", "KiB", "MiB", "GiB", "TiB"];
  let amount = value;
  let index = 0;
  while (amount >= 1024 && index < units.length - 1) { amount /= 1024; index += 1; }
  return `${amount.toFixed(index > 2 ? 1 : 0)} ${units[index]}`;
}

function percentage(used, total) {
  return total > 0 ? Math.min(100, Math.max(0, used / total * 100)) : 0;
}

function createMetric(label, value, progress) {
  const metric = document.createElement("div");
  metric.className = "metric";
  const caption = document.createElement("span");
  caption.textContent = label;
  const output = document.createElement("strong");
  output.textContent = value;
  output.title = value;
  metric.append(caption, output);
  if (Number.isFinite(progress)) {
    const bar = document.createElement("span");
    bar.className = "metric-bar";
    const fill = document.createElement("i");
    fill.style.width = `${Math.min(100, Math.max(0, progress))}%`;
    bar.append(fill);
    metric.append(bar);
  }
  return metric;
}

function createContainerMetric(metrics) {
  const metric = document.createElement("div");
  metric.className = "metric container-metric";
  const caption = document.createElement("span");
  caption.textContent = t("container");
  const summary = document.createElement("div");
  summary.className = "container-summary";
  for (const [label, value, status] of [
    [t("running"), metrics.containersRunning, "running"],
    [t("stopped"), metrics.containersStopped, "stopped"],
    [t("total"), metrics.containersTotal, "total"]
  ]) {
    const item = document.createElement("span");
    item.className = `container-count container-count-${status}`;
    const count = document.createElement("strong");
    count.textContent = value;
    const text = document.createElement("small");
    text.textContent = label;
    item.append(count, text);
    summary.append(item);
  }
  metric.append(caption, summary);
  return metric;
}

function createStatsSection(title, className, ...metrics) {
  const section = document.createElement("section");
  section.className = "monitoring-stat-section";
  const heading = document.createElement("h4");
  heading.className = "monitoring-stat-heading";
  heading.textContent = title;
  const grid = document.createElement("div");
  grid.className = `metrics-grid ${className}`;
  grid.append(...metrics);
  section.append(heading, grid);
  return section;
}

function createServerStatus(label, status, detail, className = "") {
  const state = document.createElement("span");
  state.className = `server-status${className ? ` ${className}` : ""}`;
  state.dataset.status = status ?? "pending";
  state.title = detail || t("remoteStatusChecking");
  state.setAttribute("aria-label", `${label}: ${state.title}`);
  const dot = document.createElement("i");
  dot.className = "status-indicator";
  dot.setAttribute("aria-hidden", "true");
  const text = document.createElement("span");
  text.textContent = label;
  state.append(dot, text);
  return state;
}

function createMonitoringCard(host, cardLayout) {
  const card = document.createElement("article");
  card.className = "monitoring-card";
  card.classList.toggle("monitoring-card-remote-only", host.monitoringConfigured === false);
  card.dataset.status = host.status;
  const secondary = document.createElement("div");
  secondary.className = "monitoring-card-secondary";
  const header = document.createElement("div");
  header.className = "monitoring-card-header";
  const text = document.createElement("div");
  const title = document.createElement("h3");
  title.textContent = host.name;
  title.title = host.name;
  text.append(title);
  if (host.description) {
    const description = document.createElement("p");
    description.textContent = host.description;
    description.title = host.description;
    text.append(description);
  }
  if (host.tags?.length) text.append(createTagList(host.tags));
  const meta = document.createElement("div");
  meta.className = "remote-card-meta";
  meta.append(createScopeBadge(host));
  if (host.monitoringConfigured !== false) {
    meta.append(
      createServerStatus(`Docker/${host.connectionType.toUpperCase()}`, host.status, host.status === "up" ? "Up" : `Down: ${host.error ?? t("unreachable")}`, "server-monitoring-state")
    );
  }
  meta.append(createFavoriteButton(serverFavoriteKey(host), host.favorite));
  header.append(text, meta);
  card.append(header);
  if (host.monitoringConfigured !== false && (host.status === "down" || !host.metrics)) {
    const error = document.createElement("p");
    error.className = "monitoring-host-error";
    error.textContent = host.error || t("monitoringUnavailable");
    card.append(error);
  } else if (host.monitoringConfigured !== false) {
    const hostStats = createStatsSection(
      t("hostStats"),
      "host-stats-grid",
      createMetric("CPU", `${host.metrics.cpuPercent.toFixed(1)} %`, host.metrics.cpuPercent),
      createMetric(t("memory"), `${formatBytes(host.metrics.memoryUsed)} / ${formatBytes(host.metrics.memoryTotal)}`, percentage(host.metrics.memoryUsed, host.metrics.memoryTotal)),
      createMetric(t("diskSpace"), host.metrics.diskUsed === null ? t("notExposed") : `${formatBytes(host.metrics.diskUsed)} ${t("dockerData")}`)
    );
    const dockerStats = createStatsSection(
      t("dockerStats"),
      "docker-stats-grid",
      createContainerMetric(host.metrics),
      createMetric(t("volumes"), String(host.metrics.volumes)),
      createMetric(t("networks"), String(host.metrics.networks)),
      createMetric(t("images"), String(host.metrics.images))
    );
    card.append(hostStats, dockerStats);
  }

  const health = createEmbeddedHealth(
    { kind: "server", id: host.id },
    { certificates: host.certificateMonitoring, dns: host.dnsMonitoring }
  );
  if (health?.querySelector('[data-status="down"]')) card.dataset.healthStatus = "down";
  if (health) secondary.append(health);
  const historyType = host.monitoringConfigured === false ? "remote" : "monitoring";
  const history = createHistoryStrip(historyFor(historyType, host.id));
  if (history) secondary.append(history);

  if (host.remoteConnection) {
    const connection = remoteConnections.find((candidate) => candidate.id === host.remoteConnection);
    const connectionStatus = latestRemoteStatuses.find((candidate) => candidate.id === host.remoteConnection);
    const actions = document.createElement("div");
    actions.className = "server-actions";
    if (connection) {
      const remoteAllowed = !account || ["operator", "admin"].includes(account.role);
      const button = document.createElement(remoteAllowed ? "button" : "span");
      if (remoteAllowed) button.type = "button";
      button.className = "server-remote-button";
      button.textContent = remoteAllowed
        ? t("openProtocol", { protocol: connection.protocol.toUpperCase() })
        : t("remoteAccessRestricted");
      if (remoteAllowed) button.addEventListener("click", () => launchRemoteConnection(connection, button));
      if (host.monitoringConfigured === false) actions.classList.add("server-actions-remote-only");
      actions.append(
        createServerStatus(
          connection.protocol.toUpperCase(),
          connectionStatus?.status,
          connectionStatus?.detail,
          "server-remote-state"
        ),
        button
      );
      if (connectionStatus?.status === "down") {
        const diagnostic = document.createElement("small");
        diagnostic.className = "remote-diagnostic";
        diagnostic.textContent = connectionStatus.detail;
        actions.append(diagnostic);
      }
    } else {
      actions.classList.add("server-actions-invalid");
      actions.textContent = t("remoteConnectionMissing", { id: host.remoteConnection });
    }
    secondary.append(actions);
  }
  if (secondary.children.length) card.append(secondary);
  const shell = document.createElement("div");
  shell.className = "monitoring-card-shell";
  shell.append(card);
  return configureLayoutCard(shell, cardLayout);
}

function renderMonitoring(requestedSlug = parseRoute().group) {
  const allServers = serverList();
  renderServerNavigation(allServers);
  const selectedIndex = Math.max(0, serverGroupSlugs.indexOf(requestedSlug));
  const selectedGroup = serverGroups[selectedIndex];
  const groupServers = selectedGroup ? allServers.filter((server) => server.groupId === selectedGroup.id) : allServers;
  const availableTags = groupServers.flatMap((server) => server.tags ?? []);
  if (activeServerTag && !availableTags.includes(activeServerTag)) activeServerTag = "";
  renderTagFilters(serverTagFilters, serverFilterBar, availableTags, activeServerTag, (tag) => {
    activeServerTag = tag;
    renderMonitoring(serverGroupSlugs[selectedIndex]);
  });
  const servers = groupServers
    .filter((server) => matchesQuery(server) && (!activeServerTag || server.tags?.includes(activeServerTag)))
    .sort((a, b) => Number(isFavorite(serverFavoriteKey(b), b.favorite)) - Number(isFavorite(serverFavoriteKey(a), a.favorite)));
  disconnectPanelGridObservers(monitoringGroupsElement);
  monitoringGroupsElement.replaceChildren();
  setModuleCount("servers", `${servers.length} ${plural(servers.length, "host", "hosts")}`);
  const groupId = selectedGroup?.id ?? "all";
  const grouped = new Map((selectedGroup?.categories ?? []).map((category, index) => {
    const id = category.id || slugify(category.name) || `category-${index + 1}`;
    return [id, {
      id,
      name: category.name,
      layout: category.layout ?? {},
      hosts: [],
      collapsed: category.collapsed === true
    }];
  }));
  for (const host of groupServers) {
    const category = host.category || t("servers");
    const categoryId = host.categoryId || slugify(category);
    const entry = grouped.get(categoryId) ?? {
      id: categoryId,
      name: category,
      layout: host.categoryLayout ?? {},
      hosts: [],
      collapsed: host.categoryCollapsed === true
    };
    entry.hosts.push(host);
    grouped.set(categoryId, entry);
  }
  const categories = panelsWithLayout("servers", groupId, [...grouped.values()]);
  monitoringGroupsElement.dataset.layoutOrder = JSON.stringify(categories.map((category) => category.id));
  for (const category of categories) {
    const { hosts, collapsed } = category;
    const arrangedHosts = cardsWithLayout("servers", groupId, category.id, hosts, {
      defaultWidth: "small",
      favorite: (host) => isFavorite(serverFavoriteKey(host), host.favorite)
    });
    const visibleHosts = arrangedHosts.filter(({ value: host }) =>
      matchesQuery(host) && (!activeServerTag || host.tags?.includes(activeServerTag))
    );
    if (!visibleHosts.length && (searchQuery || activeServerTag)) continue;
    const grid = document.createElement("div");
    grid.className = "monitoring-grid card-layout-grid";
    grid.dataset.cardLayoutOrder = JSON.stringify(arrangedHosts.map((host) => host.id));
    grid.dataset.cardWidthsCustomized = String(arrangedHosts.some((host) => host.customizedWidth));
    grid.append(...visibleHosts.map(({ value: host, id, effectiveWidth, hidden }) => createMonitoringCard(host, {
      module: "servers", groupId, panelId: category.id, cardId: id, width: effectiveWidth, hidden
    })));
    configurePanelGrid(grid, visibleHosts.length, { minimumWidth: 400, compactMinimumWidth: 340 });
    monitoringGroupsElement.append(createCollapsiblePanel(
      category.name,
      `${visibleHosts.length} ${plural(visibleHosts.length, "host", "hosts")}`,
      grid,
      {
        open: !collapsed,
        stateKey: `servers:${serverGroupSlugs[selectedIndex] ?? "all"}:${category.id}`,
        layout: { module: "servers", groupId, panelId: category.id, width: category.effectiveWidth, hidden: category.hidden }
      }
    ));
  }
  if (!monitoringGroupsElement.children.length) monitoringGroupsElement.append(createFilteredEmptyState());
  applyLayoutEditorState("servers", groupId);
  [...serverGroupNavElement.children].forEach((link, index) => {
    if (index === selectedIndex) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
}

function createInsightCard({ status, title, subtitle, badge, rows = [] }) {
  const card = document.createElement("article");
  card.className = "insight-card";
  if (status) card.dataset.status = status;
  const header = document.createElement("div");
  header.className = "insight-card-header";
  const text = document.createElement("div");
  const heading = document.createElement("h3");
  heading.textContent = title;
  heading.title = title;
  const description = document.createElement("p");
  description.textContent = subtitle;
  text.append(heading, description);
  const meta = document.createElement("span");
  meta.className = "remote-card-meta";
  const badgeElement = document.createElement("span");
  badgeElement.className = "protocol-badge";
  badgeElement.textContent = badge;
  meta.append(badgeElement);
  if (status) {
    const dot = document.createElement("i");
    dot.className = "status-indicator";
    meta.append(dot);
  }
  header.append(text, meta);
  const details = document.createElement("dl");
  details.className = "insight-details";
  for (const [label, value] of rows) {
    const term = document.createElement("dt");
    term.textContent = label;
    const definition = document.createElement("dd");
    definition.textContent = value ?? "–";
    details.append(term, definition);
  }
  card.append(header, details);
  return card;
}

function renderNotifications(channels) {
  setModuleCount("notifications", `${channels.length} ${plural(channels.length, "channel", "channels")}`);
  notificationsGridElement.replaceChildren(...channels.map((channel) => {
    const card = createInsightCard({
      status: channel.enabled ? (channel.ready ? "up" : "down") : undefined,
      title: channel.name,
      subtitle: channel.enabled ? t("enabled") : t("disabled"),
      badge: channel.type.toUpperCase(),
      rows: [
        [t("readiness"), channel.enabled ? (channel.ready ? t("ready") : t("incomplete")) : t("disabled")],
        [t("automaticNotifications"), channel.deliveryEnabled ? t("enabled") : t("disabled")],
        [t("missingVariables"), channel.missingVariables.length ? channel.missingVariables.join(", ") : t("none")],
        [t("missingFields"), channel.missingFields.length ? channel.missingFields.join(", ") : t("none")]
      ]
    });
    if (account?.role !== "admin") return card;
    const actions = document.createElement("div");
    actions.className = "notification-actions";
    const toggleRow = document.createElement("label");
    toggleRow.className = "notification-channel-toggle";
    const toggleText = document.createElement("span");
    toggleText.textContent = t("automaticNotifications");
    const toggle = document.createElement("input");
    toggle.type = "checkbox";
    toggle.setAttribute("role", "switch");
    toggle.checked = channel.deliveryEnabled;
    toggle.disabled = !channel.enabled;
    toggle.addEventListener("change", async () => {
      const requested = toggle.checked;
      toggle.disabled = true;
      result.textContent = "";
      result.dataset.state = "";
      try {
        const response = await fetch(`/api/notifications/${encodeURIComponent(channel.id)}/enabled`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ enabled: requested })
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`);
        channel.deliveryEnabled = payload.deliveryEnabled;
        toggle.checked = payload.deliveryEnabled;
        result.textContent = t(payload.deliveryEnabled ? "notificationChannelEnabled" : "notificationChannelDisabled");
        result.dataset.state = "success";
      } catch (error) {
        toggle.checked = !requested;
        result.textContent = t("notificationChannelUpdateFailed", { error: error.message });
        result.dataset.state = "error";
      } finally {
        toggle.disabled = !channel.enabled;
      }
    });
    toggleRow.append(toggleText, toggle);
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = t("sendTestNotification");
    button.disabled = !channel.enabled || !channel.ready;
    const result = document.createElement("span");
    result.className = "notification-test-result";
    button.addEventListener("click", async () => {
      button.disabled = true;
      button.textContent = t("sendingTestNotification");
      result.textContent = "";
      result.dataset.state = "";
      try {
        const response = await fetch(`/api/notifications/${encodeURIComponent(channel.id)}/test`, { method: "POST" });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`);
        result.textContent = t("testNotificationSent");
        result.dataset.state = "success";
      } catch (error) {
        result.textContent = t("testNotificationFailed", { error: error.message });
        result.dataset.state = "error";
      } finally {
        button.textContent = t("sendTestNotification");
        button.disabled = !channel.enabled || !channel.ready;
      }
    });
    actions.append(toggleRow, button, result);
    card.append(actions);
    return card;
  }));
  renderOverview();
}

function renderNotificationHistory(deliveries) {
  notificationHistorySection.hidden = account?.role !== "admin";
  if (notificationHistorySection.hidden) return;
  notificationHistoryList.replaceChildren(...deliveries.map((delivery) => {
    const row = document.createElement("article");
    row.className = "notification-history-row";
    row.dataset.state = delivery.state;
    const text = document.createElement("div");
    const name = document.createElement("strong");
    name.textContent = delivery.event?.name || delivery.event?.targetId || t("notification");
    const meta = document.createElement("small");
    meta.textContent = `${delivery.channelId} · ${new Date(delivery.createdAt).toLocaleString(locale)}`;
    text.append(name, meta);
    const state = document.createElement("span");
    state.textContent = t(`deliveryState_${delivery.state}`);
    state.title = delivery.lastError || "";
    row.append(text, state);
    return row;
  }));
}

function renderMaintenanceWindows(windows) {
  maintenanceSection.hidden = account?.role !== "admin";
  if (maintenanceSection.hidden) return;
  refreshMaintenanceTargets();
  maintenanceList.replaceChildren(...windows.map((window) => {
    const row = document.createElement("article");
    row.className = "notification-history-row";
    const text = document.createElement("div");
    const name = document.createElement("strong");
    name.textContent = `${window.targetType} · ${window.targetId}`;
    const meta = document.createElement("small");
    meta.textContent = `${window.reason || t("maintenanceWindow")} · ${new Date(window.endsAt).toLocaleString(locale)}`;
    text.append(name, meta);
    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = t("endMaintenance");
    remove.addEventListener("click", async () => {
      const response = await fetch(`/api/admin/maintenance/${encodeURIComponent(window.id)}`, { method: "DELETE" });
      if (response.ok) await loadMaintenanceWindows();
    });
    row.append(text, remove);
    return row;
  }));
}

function refreshMaintenanceTargets() {
  const type = maintenanceTargetType.value;
  let targets = [];
  if (type === "service") targets = allServiceEntries().map(({ item, group }) => ({ id: `${group.id}:${item.id ?? item.url}`.slice(0, 240), name: item.name }));
  if (type === "monitoring") targets = monitoringHosts.map((host) => ({ id: host.id, name: host.name }));
  if (type === "remote") targets = remoteConnections.map((connection) => ({ id: connection.id, name: connection.name }));
  if (type === "certificate") targets = latestCertificates.map((item) => ({ id: item.id, name: item.name }));
  if (type === "dns") targets = latestDnsChecks.map((item) => ({ id: item.id, name: item.name }));
  maintenanceTargetOptions.replaceChildren(...targets.map((target) => {
    const option = document.createElement("option");
    option.value = target.id;
    option.label = target.name || target.id;
    return option;
  }));
}

async function loadMaintenanceWindows() {
  if (account?.role !== "admin") return;
  const response = await fetch("/api/admin/maintenance?active=true", { cache: "no-store" });
  if (response.ok) renderMaintenanceWindows((await response.json()).windows || []);
}

function allServiceEntries() {
  if (!dashboardConfig) return [];
  return dashboardConfig.groups.flatMap((group, groupIndex) => dashboardPanels(group).flatMap((panel, panelIndex) =>
    panel.items.map((item, itemIndex) => ({ item, group, panel, groupIndex, panelIndex, itemIndex }))
  ));
}

function serviceEntryForStatus(status) {
  return allServiceEntries().find((entry) => entry.groupIndex === status.groupIndex
    && entry.panelIndex === status.panelIndex && entry.itemIndex === status.itemIndex);
}

function isInScope(target) {
  return target?.scope !== "ignore";
}

function isOwnerInScope(owner) {
  if (owner?.kind === "service") {
    const entry = allServiceEntries().find((candidate) => candidate.groupIndex === owner.groupIndex
      && candidate.panelIndex === owner.panelIndex && candidate.itemIndex === owner.itemIndex);
    return isInScope(entry?.item);
  }
  if (owner?.kind === "server") {
    return isInScope(serverList().find((server) => server.id === owner.id));
  }
  return true;
}

function isHistoryEventInScope(event) {
  if (event.targetType === "service") {
    const status = latestStatuses.find((item) => item.id === event.targetId);
    return isInScope(status ? serviceEntryForStatus(status)?.item : undefined);
  }
  if (["remote", "monitoring"].includes(event.targetType)) {
    return isInScope(serverList().find((server) => server.id === event.targetId));
  }
  if (["certificate", "dns"].includes(event.targetType)) {
    const health = [...latestCertificates, ...latestDnsChecks].find((item) => item.id === event.targetId);
    return isOwnerInScope(health?.owner);
  }
  return true;
}

function routeForOwner(owner) {
  if (owner?.kind === "service") {
    const entry = serviceEntryForStatus(owner);
    return { href: `#services/${entry?.group.id ?? groupSlugs[0] ?? ""}`, name: entry?.item.name };
  }
  if (owner?.kind === "server") {
    const server = serverList().find((candidate) => candidate.id === owner.id);
    return { href: `#servers/${server?.groupId ?? serverGroupSlugs[0] ?? ""}`, name: server?.name };
  }
  return { href: "#overview" };
}

function createOverviewModule({ title, href, icon, total, up, detail, status }) {
  const link = document.createElement("a");
  link.className = "overview-module";
  link.href = href;
  if (status) link.dataset.status = status;
  const heading = document.createElement("span");
  heading.className = "overview-module-heading";
  const mark = document.createElement("i");
  mark.textContent = icon;
  const name = document.createElement("strong");
  name.textContent = title;
  heading.append(mark, name);
  const value = document.createElement("span");
  value.className = "overview-module-value";
  value.textContent = total ? `${up}/${total}` : "–";
  const description = document.createElement("small");
  description.textContent = detail;
  link.append(heading, value, description);
  return link;
}

function serverOverallStatus(server) {
  if (server.status === "down") return "down";
  const remoteStatus = server.remoteConnection
    ? latestRemoteStatuses.find((item) => item.id === server.remoteConnection)?.status
    : undefined;
  return remoteStatus === "down" ? "down" : server.status;
}

function historyEventRoute(event) {
  if (event.targetType === "service") {
    const status = latestStatuses.find((item) => item.id === event.targetId);
    const entry = status ? serviceEntryForStatus(status) : undefined;
    return entry ? `#services/${entry.group.id}` : "#overview";
  }
  if (["remote", "monitoring"].includes(event.targetType)) {
    const server = serverList().find((item) => item.id === event.targetId);
    return server ? `#servers/${server.groupId}` : "#overview";
  }
  const health = [...latestCertificates, ...latestDnsChecks].find((item) => item.id === event.targetId);
  return routeForOwner(health?.owner).href;
}

function renderHistory() {
  if (!overviewHistoryElement) return;
  const events = latestHistory.events.filter(isHistoryEventInScope);
  const scopedServiceStatuses = latestStatuses.filter((status) => isInScope(serviceEntryForStatus(status)?.item));
  const scopedServers = serverList().filter(isInScope);
  const scopedHealth = [...latestCertificates, ...latestDnsChecks].filter((item) => isOwnerInScope(item.owner));
  const currentStatuses = [
    ...scopedServiceStatuses.map((item) => item.status),
    ...scopedServers.map(serverOverallStatus),
    ...scopedHealth.map((item) => item.status)
  ];
  const up = currentStatuses.filter((status) => status === "up").length;
  const down = currentStatuses.filter((status) => status === "down").length;
  historySummaryElement.textContent = currentStatuses.length
    ? `${up} ${t("upLabel")} · ${down} ${t("downLabel")}`
    : "";
  if (!events.length) {
    const empty = document.createElement("p");
    empty.className = "overview-empty";
    empty.textContent = t("noStatusHistory");
    overviewHistoryElement.replaceChildren(empty);
    return;
  }
  overviewHistoryElement.replaceChildren(...events.map((event) => {
    const link = document.createElement("a");
    link.href = historyEventRoute(event);
    link.dataset.status = event.status;
    const dot = document.createElement("i");
    dot.className = "status-indicator";
    const content = document.createElement("span");
    const name = document.createElement("strong");
    name.textContent = event.name;
    const detail = document.createElement("small");
    detail.textContent = event.detail || (event.status === "up" ? t("targetRecovered") : t("targetUnavailable"));
    content.append(name, detail);
    const meta = document.createElement("span");
    meta.className = "history-meta";
    const type = document.createElement("b");
    type.textContent = event.targetType.toUpperCase();
    const time = document.createElement("time");
    time.dateTime = event.observedAt;
    time.textContent = new Intl.DateTimeFormat(locale, { dateStyle: "short", timeStyle: "short" }).format(new Date(event.observedAt));
    meta.append(type, time);
    link.append(dot, content, meta);
    return link;
  }));
}

function renderOverview() {
  if (!overviewGridElement) return;
  const allServices = allServiceEntries();
  const allServers = serverList();
  const scopedServiceEntries = allServices.filter(({ item }) => isInScope(item));
  const scopedServiceStatuses = latestStatuses.filter((status) => isInScope(serviceEntryForStatus(status)?.item));
  const serviceTotal = scopedServiceEntries.length;
  const serviceUp = scopedServiceStatuses.filter((item) => item.status === "up").length;
  const servers = allServers.filter(isInScope);
  const serverUp = servers.filter((server) => serverOverallStatus(server) === "up").length;
  const enabledChannels = latestNotificationChannels.filter((channel) => channel.enabled);
  const readyChannels = enabledChannels.filter((channel) => channel.ready).length;
  const healthChecks = [...latestCertificates, ...latestDnsChecks].filter((item) => isOwnerInScope(item.owner));
  const serviceHealthDown = healthChecks.some((item) => item.status === "down" && item.owner?.kind === "service");
  const serverHealthDown = healthChecks.some((item) => item.status === "down" && item.owner?.kind === "server");
  const checks = [
    ...scopedServiceStatuses.map((item) => item.status),
    ...servers.map(serverOverallStatus),
    ...healthChecks.map((item) => item.status),
    ...enabledChannels.map((channel) => channel.ready ? "up" : "down")
  ];
  const healthy = checks.filter((status) => status === "up").length;
  const score = checks.length ? Math.round(healthy / checks.length * 100) : null;
  scopeScoreElement.textContent = score === null ? "–" : `${score}%`;
  scopeFocusElement.dataset.status = checks.includes("down") ? "down" : checks.length ? "up" : "pending";
  const inventoryTotal = allServices.length + allServers.length;
  const scopedTotal = scopedServiceEntries.length + servers.length;
  scopeMembershipElement.textContent = t("scopeMembership", { included: scopedTotal, ignored: inventoryTotal - scopedTotal });
  const scopedTargetIds = new Set([
    ...scopedServiceStatuses.map((item) => `service:${item.id}`),
    ...servers.map((server) => `${server.monitoringConfigured === false ? "remote" : "monitoring"}:${server.id}`)
  ]);
  const trendPoints = (latestHistory.timeline ?? []).filter((point) => scopedTargetIds.has(`${point.targetType}:${point.targetId}`));
  const trend24 = trendPoints.reduce((sum, point) => sum + point.up, 0) / Math.max(1, trendPoints.reduce((sum, point) => sum + point.total, 0)) * 100;
  scopeTrendElement.textContent = trendPoints.length ? t("scopeTrend", { availability: trend24.toFixed(1) }) : t("scopeTrendPending");

  const modules = [];
  if (appCapabilities.services) modules.push(createOverviewModule({
    title: t("services"), href: `#services/${groupSlugs[0] ?? ""}`, icon: "▦", total: serviceTotal, up: serviceUp,
    detail: t("reachableTargets"), status: scopedServiceStatuses.some((item) => item.status === "down") || serviceHealthDown ? "down" : serviceTotal ? "up" : undefined
  }));
  if (appCapabilities.servers) modules.push(createOverviewModule({
    title: t("server"), href: `#servers/${serverGroupSlugs[0] ?? ""}`, icon: "⌁", total: servers.length, up: serverUp,
    detail: t("availableHosts"), status: servers.some((server) => serverOverallStatus(server) === "down") || serverHealthDown ? "down" : servers.length ? "up" : undefined
  }));
  if (appCapabilities.notifications) modules.push(createOverviewModule({
    title: t("notifications"), href: "#notifications", icon: "△", total: latestNotificationChannels.length, up: readyChannels,
    detail: t("readyChannels"), status: enabledChannels.some((channel) => !channel.ready) ? "down" : enabledChannels.length ? "up" : undefined
  }));
  overviewGridElement.replaceChildren(...modules);

  const unavailableServerIds = new Set(servers.filter((server) => serverOverallStatus(server) === "down").map((server) => server.id));
  const dependentCounts = new Map();
  for (const { item } of scopedServiceEntries) {
    for (const id of item["depends-on"] ?? []) {
      if (unavailableServerIds.has(id)) dependentCounts.set(id, (dependentCounts.get(id) ?? 0) + 1);
    }
  }
  const serviceIsRootIssue = (status) => {
    const entry = serviceEntryForStatus(status);
    return !(entry?.item["depends-on"] ?? []).some((id) => unavailableServerIds.has(id));
  };
  const issues = [
    ...scopedServiceStatuses.filter((item) => item.status === "down" && serviceIsRootIssue(item)).map((item) => {
      const entry = serviceEntryForStatus(item);
      return { name: entry?.item.name ?? t("unknown"), type: t("services"), href: `#services/${entry?.group.id ?? groupSlugs[0] ?? ""}` };
    }),
    ...servers.filter((server) => serverOverallStatus(server) === "down").map((server) => ({
      name: server.name,
      type: dependentCounts.has(server.id) ? t("dependentServicesAffected", { count: dependentCounts.get(server.id) }) : t("server"),
      href: `#servers/${server.groupId}`
    })),
    ...enabledChannels.filter((channel) => !channel.ready).map((channel) => ({
      name: channel.name, type: t("notifications"), href: "#notifications"
    })),
    ...latestCertificates.filter((item) => item.status === "down" && isOwnerInScope(item.owner)).map((item) => {
      const target = routeForOwner(item.owner);
      return { name: target.name ?? item.name, type: "TLS", href: target.href };
    }),
    ...latestDnsChecks.filter((item) => item.status === "down" && isOwnerInScope(item.owner)).map((item) => {
      const target = routeForOwner(item.owner);
      return { name: target.name ?? item.name, type: "DNS", href: target.href };
    })
  ];
  if (!issues.length) {
    const empty = document.createElement("p");
    empty.className = "overview-empty";
    empty.textContent = checks.length ? t("allSystemsOperational") : t("waitingForChecks");
    overviewIssuesElement.replaceChildren(empty);
  } else {
    overviewIssuesElement.replaceChildren(...issues.slice(0, 8).map((issue) => {
      const link = document.createElement("a");
      link.href = issue.href;
      link.dataset.status = "down";
      const dot = document.createElement("i");
      dot.className = "status-indicator";
      const name = document.createElement("strong");
      name.textContent = issue.name;
      const type = document.createElement("span");
      type.textContent = issue.type;
      link.append(dot, name, type);
      return link;
    }));
  }
  overviewUpdatedElement.textContent = checks.length ? t("updatedNow") : "";
  renderHistory();
  setModuleCount("overview", score === null ? "" : `${score}%`);
}

function renderSearchResults() {
  const query = searchQuery;
  if (query.length < 2) {
    globalSearchResults.hidden = true;
    globalSearchResults.replaceChildren();
    return;
  }
  const serviceResults = allServiceEntries().filter(({ item }) => matchesQuery(item, query)).map(({ item, group }) => ({
    name: item.name, detail: `${t("services")} · ${group.name}`, href: `#services/${group.id}`, tags: item.tags ?? []
  }));
  const serverResults = serverList().filter((server) => matchesQuery(server, query)).map((server) => ({
    name: server.name, detail: `${t("server")} · ${server.groupName}`, href: `#servers/${server.groupId}`, tags: server.tags ?? []
  }));
  const results = [...serviceResults, ...serverResults].slice(0, 10);
  if (!results.length) {
    const empty = document.createElement("p");
    empty.textContent = t("noSearchResults");
    globalSearchResults.replaceChildren(empty);
  } else {
    globalSearchResults.replaceChildren(...results.map((result) => {
      const link = document.createElement("a");
      link.href = result.href;
      const name = document.createElement("strong");
      name.textContent = result.name;
      const detail = document.createElement("small");
      detail.textContent = result.detail;
      link.append(name, detail);
      if (result.tags.length) link.append(createTagList(result.tags));
      return link;
    }));
  }
  globalSearchResults.hidden = false;
}

globalSearchInput.addEventListener("input", () => {
  searchQuery = globalSearchInput.value.trim().toLocaleLowerCase();
  renderSearchResults();
  const route = parseRoute();
  if (route.module === "dashboard") renderSelectedEnvironment(route.environment);
  if (route.module === "servers") renderMonitoring(route.group);
});
globalSearchInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    const firstResult = globalSearchResults.querySelector("a");
    if (firstResult) firstResult.click();
  }
  if (event.key === "Escape") {
    globalSearchInput.value = "";
    globalSearchInput.dispatchEvent(new Event("input"));
    globalSearchInput.blur();
  }
});
globalSearchInput.addEventListener("focus", renderSearchResults);
document.addEventListener("click", (event) => {
  if (!event.target.closest(".global-search")) globalSearchResults.hidden = true;
});

async function launchRemoteConnection(connection, button) {
  monitoringErrorElement.hidden = true;
  const buttonLabel = button.textContent;
  button.disabled = true;
  button.textContent = t("preparingSession");
  try {
    const response = await fetch(`/api/remote/connections/${encodeURIComponent(connection.id)}/launch`, { method: "POST" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || `HTTP ${response.status}`);
    activeSession = { id: result.id, protocol: result.protocol, connectionName: connection.name };
    setSessionStatus("connecting", "connecting");
    sessionTitleElement.textContent = connection.name;
    sessionProtocolElement.textContent = result.protocol.toUpperCase();
    sessionView.dataset.protocol = result.protocol;
    rdpQualityControl.hidden = result.protocol !== "rdp";
    dashboardView.hidden = true;
    monitoringView.hidden = true;
    sessionView.hidden = false;
    document.body.classList.add("session-active");
    viewTitleElement.textContent = connection.name;
    viewSubtitleElement.textContent = t("remoteSession");
    viewCountElement.hidden = true;
    if (result.protocol === "ssh") await openSshSession(result.socketPath);
    else await openRdpSession(result.socketPath);
  } catch (error) {
    if (activeSession) closeSession();
    monitoringErrorElement.textContent = error.message;
    monitoringErrorElement.hidden = false;
  } finally {
    button.disabled = false;
    button.textContent = buttonLabel;
  }
  renderHistory();
}

function websocketUrl(path) {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}${path}`;
}

function setSessionStatus(messageKey, state) {
  sessionStatusElement.dataset.i18n = messageKey;
  sessionStatusElement.textContent = t(messageKey);
  sessionView.dataset.connectionState = state;
}

function terminalTheme() {
  const dark = document.documentElement.dataset.theme === "dark";
  return dark
    ? {
        background: "#091013", foreground: "#dce8eb", cursor: "#55d5df", cursorAccent: "#091013",
        selectionBackground: "#24525a", selectionInactiveBackground: "#1b353a",
        black: "#11191d", red: "#f06b6b", green: "#29d39b", yellow: "#e4bd65", blue: "#6ba7f2",
        magenta: "#c58bea", cyan: "#55d5df", white: "#dce8eb", brightBlack: "#617278", brightWhite: "#ffffff"
      }
    : {
        background: "#f8fafb", foreground: "#142126", cursor: "#087f8c", cursorAccent: "#ffffff",
        selectionBackground: "#b9e2e6", selectionInactiveBackground: "#dcebed",
        black: "#263238", red: "#c74444", green: "#087f62", yellow: "#946b00", blue: "#2868a9",
        magenta: "#824fa3", cyan: "#087f8c", white: "#edf2f3", brightBlack: "#607077", brightWhite: "#ffffff"
      };
}

async function openSshSession(socketPath) {
  sshTerminalElement.hidden = false;
  rdpDisplayElement.hidden = true;
  sshTerminalCanvas.replaceChildren();
  const terminal = new Terminal({
    cursorBlink: true,
    cursorStyle: "bar",
    cursorWidth: 2,
    fontFamily: '"JetBrains Mono", "Cascadia Code", "SFMono-Regular", Consolas, ui-monospace, monospace',
    fontSize: 17,
    fontWeight: 450,
    fontWeightBold: 700,
    lineHeight: 1.22,
    letterSpacing: 0.15,
    minimumContrastRatio: 4.5,
    scrollback: 10000,
    smoothScrollDuration: 100,
    rightClickSelectsWord: true,
    theme: terminalTheme()
  });
  const fitAddon = new FitAddon();
  terminal.loadAddon(fitAddon);
  terminal.open(sshTerminalCanvas);
  const socket = new WebSocket(websocketUrl(socketPath));
  socket.binaryType = "arraybuffer";
  const sendResize = () => {
    if (activeSession?.terminal !== terminal) return;
    fitAddon.fit();
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: "resize", cols: terminal.cols, rows: terminal.rows }));
    }
  };
  const scheduleResize = () => requestAnimationFrame(sendResize);
  const resizeObserver = new ResizeObserver(scheduleResize);
  resizeObserver.observe(sshTerminalCanvas);
  document.addEventListener("fullscreenchange", scheduleResize);
  socket.addEventListener("open", () => { setSessionStatus("connected", "connected"); scheduleResize(); terminal.focus(); });
  socket.addEventListener("message", (event) => terminal.write(typeof event.data === "string" ? event.data : new Uint8Array(event.data)));
  socket.addEventListener("close", () => { setSessionStatus("connectionClosed", "closed"); terminal.write(`\r\n\x1b[33m[Scope] ${t("connectionClosed")}\x1b[0m\r\n`); });
  socket.addEventListener("error", () => { setSessionStatus("websocketError", "error"); terminal.write(`\r\n\x1b[31m[Scope] ${t("websocketError")}\x1b[0m\r\n`); });
  const encoder = new TextEncoder();
  terminal.onData((data) => { if (socket.readyState === WebSocket.OPEN) socket.send(encoder.encode(data)); });
  Object.assign(activeSession, { terminal, socket, fitAddon, resizeObserver, scheduleResize });
}

const rdpStreamProfiles = {
  performance: { qualityLevel: 4, compressionLevel: 1 },
  balanced: { qualityLevel: 6, compressionLevel: 2 },
  quality: { qualityLevel: 8, compressionLevel: 4 }
};

function applyRdpStreamProfile(rfb, profileName) {
  const profile = rdpStreamProfiles[profileName] ?? rdpStreamProfiles.performance;
  rfb.qualityLevel = profile.qualityLevel;
  rfb.compressionLevel = profile.compressionLevel;
}

async function openRdpSession(socketPath) {
  sshTerminalElement.hidden = true;
  rdpDisplayElement.hidden = false;
  const { default: RFB } = await import("/vendor/novnc/core/rfb.js");
  const rfb = new RFB(rdpDisplayElement, websocketUrl(socketPath), { shared: true });
  applyRdpStreamProfile(rfb, rdpQualitySelect.value);
  rfb.scaleViewport = true;
  rfb.resizeSession = true;
  rfb.clipViewport = false;
  rfb.focusOnClick = true;
  rfb.background = "#080d10";
  rfb.addEventListener("connect", () => { setSessionStatus("connected", "connected"); rfb.focus(); });
  rfb.addEventListener("disconnect", (event) => { setSessionStatus(event.detail.clean ? "connectionClosed" : "connectionInterrupted", event.detail.clean ? "closed" : "error"); });
  rfb.addEventListener("securityfailure", () => { setSessionStatus("remoteSecurityFailed", "error"); });
  rfb.focus();
  activeSession.rfb = rfb;
}

function closeSession() {
  const session = activeSession;
  activeSession = undefined;
  session?.resizeObserver?.disconnect();
  if (session?.scheduleResize) document.removeEventListener("fullscreenchange", session.scheduleResize);
  session?.socket?.close();
  session?.terminal?.dispose();
  session?.rfb?.disconnect();
  if (document.fullscreenElement === sessionView) document.exitFullscreen?.();
  sshTerminalCanvas.replaceChildren();
  rdpDisplayElement.replaceChildren();
  sshTerminalElement.hidden = true;
  rdpDisplayElement.hidden = true;
  if (session?.id) {
    fetch(`/api/remote/sessions/${encodeURIComponent(session.id)}`, { method: "DELETE", keepalive: true }).catch(() => {});
  }
  sessionView.hidden = true;
  delete sessionView.dataset.protocol;
  delete sessionView.dataset.connectionState;
  rdpQualityControl.hidden = true;
  document.body.classList.remove("session-active");
  monitoringView.hidden = false;
  setActiveModule("servers");
}

function sendRfbChord(rfb, keys) {
  for (const key of keys) rfb.sendKey(key.keysym, key.code, true);
  for (const key of [...keys].reverse()) rfb.sendKey(key.keysym, key.code, false);
  rfb.focus();
}

sessionHotkeysElement.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-hotkey]");
  if (!button || !activeSession) return;
  const hotkey = button.dataset.hotkey;
  if (activeSession.protocol === "ssh") {
    const controlSequences = { "ctrl-c": "\x03", "ctrl-l": "\x0c", "ctrl-d": "\x04", escape: "\x1b" };
    const sequence = controlSequences[hotkey];
    if (sequence && activeSession.socket?.readyState === WebSocket.OPEN) {
      activeSession.socket.send(new TextEncoder().encode(sequence));
      activeSession.terminal?.focus();
    }
    return;
  }
  const rfb = activeSession.rfb;
  if (!rfb) return;
  if (hotkey === "ctrl-alt-delete") {
    rfb.sendCtrlAltDel();
    rfb.focus();
    return;
  }
  const keys = {
    "ctrl-alt-end": [
      { keysym: 0xffe3, code: "ControlLeft" },
      { keysym: 0xffe9, code: "AltLeft" },
      { keysym: 0xff57, code: "End" }
    ],
    "alt-tab": [
      { keysym: 0xffe9, code: "AltLeft" },
      { keysym: 0xff09, code: "Tab" }
    ],
    windows: [{ keysym: 0xffeb, code: "MetaLeft" }]
  };
  if (keys[hotkey]) sendRfbChord(rfb, keys[hotkey]);
});

rdpQualitySelect.addEventListener("change", () => {
  const profile = rdpStreamProfileNames().includes(rdpQualitySelect.value) ? rdpQualitySelect.value : "performance";
  rdpQualitySelect.value = profile;
  try { localStorage.setItem(rdpQualityStorageKey, profile); } catch { /* Storage may be disabled. */ }
  if (activeSession?.rfb) {
    applyRdpStreamProfile(activeSession.rfb, profile);
    activeSession.rfb.focus();
  }
});

sessionDiagnosticsButton.addEventListener("click", async () => {
  if (!activeSession?.id) return;
  const response = await fetch(`/api/remote/sessions/${encodeURIComponent(activeSession.id)}/diagnostics`);
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || `HTTP ${response.status}`);
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([JSON.stringify(result, null, 2)], { type: "application/json" }));
  link.download = `scope-session-${activeSession.id.slice(0, 12)}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
});
sessionCloseButton.addEventListener("click", closeSession);
sessionFullscreenButton.addEventListener("click", () => {
  if (document.fullscreenElement) document.exitFullscreen?.();
  else sessionView.requestFullscreen?.();
});
document.addEventListener("fullscreenchange", () => {
  sessionFullscreenButton.textContent = document.fullscreenElement ? t("exitFullscreen") : t("fullscreen");
});

async function loadDashboard() {
  if (!appCapabilities.services) return;
  try {
    const response = await fetch("/api/config", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    dashboardConfig = await response.json();
    groupSlugs = createGroupSlugs(dashboardConfig.groups);
    serviceGroupLabelElement.textContent = dashboardConfig.navigationLabel || t("groups");
    renderEnvironmentNavigation();
    renderSearchResults();
    renderOverview();
  } catch (error) {
    dashboardErrorElement.textContent = t("servicesLoadError");
    dashboardErrorElement.hidden = false;
  }
}

async function loadStatuses() {
  if (!appCapabilities.services) return;
  try {
    const response = await fetch("/api/status", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    latestStatuses = (await response.json()).items;
    applyStatuses(latestStatuses);
    renderOverview();
  } catch (error) { console.error("Statusprüfung fehlgeschlagen", error); }
}

async function loadRemoteConnections() {
  if (!appCapabilities.servers) return;
  try {
    const response = await fetch("/api/remote/connections", { cache: "no-store" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || `HTTP ${response.status}`);
    remoteConnections = result.connections;
    renderMonitoring();
    renderSearchResults();
    renderOverview();
  } catch (error) {
    monitoringErrorElement.textContent = t("remoteLoadError");
    monitoringErrorElement.hidden = false;
  }
}

async function loadRemoteStatuses() {
  if (!appCapabilities.servers) return;
  try {
    const response = await fetch("/api/remote/status", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    latestRemoteStatuses = (await response.json()).items;
    renderMonitoring();
    renderOverview();
  } catch (error) { console.error("Remote-Statusprüfung fehlgeschlagen", error); }
}

async function loadMonitoring() {
  if (!appCapabilities.servers) return;
  try {
    const response = await fetch("/api/monitoring", { cache: "no-store" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || `HTTP ${response.status}`);
    monitoringHosts = result.hosts;
    monitoringErrorElement.hidden = true;
    renderMonitoring();
    renderSearchResults();
    renderOverview();
  } catch (error) {
    monitoringErrorElement.textContent = t("monitoringLoadError", { error: error.message });
    monitoringErrorElement.hidden = false;
  }
}

async function loadCertificates() {
  if (!appCapabilities.certificates) return;
  try {
    const response = await fetch("/api/certificates", { cache: "no-store" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || `HTTP ${response.status}`);
    latestCertificates = result.items;
    rerenderLocalizedContent();
  } catch (error) {
    console.error(t("certificatesLoadError", { error: error.message }));
  }
}

async function loadDns() {
  if (!appCapabilities.dns) return;
  try {
    const response = await fetch("/api/dns", { cache: "no-store" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || `HTTP ${response.status}`);
    latestDnsChecks = result.items;
    rerenderLocalizedContent();
  } catch (error) {
    console.error(t("dnsLoadError", { error: error.message }));
  }
}

async function loadNotifications() {
  if (!appCapabilities.notifications) return;
  try {
    const response = await fetch("/api/notifications", { cache: "no-store" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || `HTTP ${response.status}`);
    notificationsErrorElement.hidden = true;
    latestNotificationChannels = result.channels;
    renderNotifications(latestNotificationChannels);
    if (account?.role === "admin") {
      const [historyResponse] = await Promise.all([
        fetch("/api/admin/notification-history?limit=30", { cache: "no-store" }), loadMaintenanceWindows()
      ]);
      if (historyResponse.ok) renderNotificationHistory((await historyResponse.json()).deliveries || []);
    }
  } catch (error) {
    notificationsErrorElement.textContent = t("notificationsLoadError", { error: error.message });
    notificationsErrorElement.hidden = false;
  }
}

maintenanceCreate.addEventListener("click", async () => {
  maintenanceCreate.disabled = true;
  try {
    const response = await fetch("/api/admin/maintenance", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetType: maintenanceTargetType.value, targetId: maintenanceTargetId.value.trim(),
        durationMinutes: Number(maintenanceDuration.value), reason: maintenanceReason.value.trim()
      })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || `HTTP ${response.status}`);
    maintenanceTargetId.value = "";
    maintenanceReason.value = "";
    await loadMaintenanceWindows();
  } catch (error) {
    notificationsErrorElement.textContent = error.message;
    notificationsErrorElement.hidden = false;
  } finally { maintenanceCreate.disabled = false; }
});
maintenanceTargetType.addEventListener("change", refreshMaintenanceTargets);

async function loadHistory() {
  try {
    const response = await fetch("/api/history?limit=12", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    latestHistory = await response.json();
    renderHistory();
  } catch (error) {
    console.error(t("historyLoadError", { error: error.message }));
  }
}

function showDiagnostics(title, result) {
  diagnosticsTitle.textContent = title;
  diagnosticsSummary.textContent = result.status === "up" ? t("diagnosticsSuccessful") : t("diagnosticsFailed");
  diagnosticsSummary.dataset.status = result.status;
  diagnosticsSteps.replaceChildren(...result.steps.map((step) => {
    const row = document.createElement("article");
    row.className = "diagnostics-step";
    row.dataset.status = step.status;
    const mark = document.createElement("i");
    const copy = document.createElement("span");
    const heading = document.createElement("strong");
    const detail = document.createElement("small");
    const duration = document.createElement("time");
    mark.textContent = step.status === "up" ? "✓" : "×";
    heading.textContent = t(`diagnosticStep_${step.name.replaceAll("-", "_")}`);
    detail.textContent = step.detail;
    duration.textContent = `${step.durationMs} ms`;
    copy.append(heading, detail);
    row.append(mark, copy, duration);
    return row;
  }));
  const failedStep = result.steps.find((step) => step.status === "down");
  if (failedStep) {
    const next = document.createElement("article");
    next.className = "diagnostics-next";
    const heading = document.createElement("strong");
    const detail = document.createElement("p");
    heading.textContent = t("recommendedNextStep");
    detail.textContent = t(`diagnosticNext_${failedStep.name.replaceAll("-", "_")}`);
    next.append(heading, detail);
    diagnosticsSteps.append(next);
  }
  diagnosticsDialog.showModal();
}

async function runServiceDiagnostic(item, button) {
  button.disabled = true;
  button.textContent = t("diagnosing");
  try {
    const response = await fetch(`/api/diagnostics/service?id=${encodeURIComponent(item.id)}`, { cache: "no-store" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || `HTTP ${response.status}`);
    showDiagnostics(item.name, result);
  } catch (error) {
    dashboardErrorElement.textContent = error.message;
    dashboardErrorElement.hidden = false;
  } finally {
    button.disabled = false;
    button.textContent = t("troubleshoot");
  }
}

async function runServerDiagnostic(serverId, button) {
  button.disabled = true;
  button.textContent = t("diagnosing");
  try {
    const response = await fetch(`/api/diagnostics/server?id=${encodeURIComponent(serverId)}`, { cache: "no-store" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || `HTTP ${response.status}`);
    showDiagnostics(button.dataset.targetName || serverId, result);
  } catch (error) {
    monitoringErrorElement.textContent = error.message;
    monitoringErrorElement.hidden = false;
  } finally {
    button.disabled = false;
    button.textContent = button.dataset.defaultLabel || t("checkConnection");
  }
}

diagnosticsClose.addEventListener("click", () => diagnosticsDialog.close());
diagnosticsDialog.addEventListener("click", (event) => { if (event.target === diagnosticsDialog) diagnosticsDialog.close(); });

async function reviewProposal(proposal, state, destination, suggestion) {
  serviceInboxError.hidden = true;
  serviceInboxStatus.textContent = "";
  const response = await fetch(`/api/admin/discovery-proposals/${encodeURIComponent(proposal.id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      state,
      targetGroup: destination?.groupId ?? "",
      targetCategory: destination?.categoryId ?? "",
      ...(destination?.newGroup ? { newGroup: destination.newGroup } : {}),
      ...(destination?.newCategory ? { newCategory: destination.newCategory } : {}),
      ...(suggestion ? { suggestion } : {})
    })
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || `HTTP ${response.status}`);
  await loadDiscoveryProposals({ forceRender: true });
}

function proposalField(labelKey, value, options = {}) {
  const label = document.createElement("label");
  const title = document.createElement("span");
  const control = options.multiline ? document.createElement("textarea") : document.createElement("input");
  title.textContent = t(labelKey);
  control.value = value ?? "";
  control.disabled = options.disabled === true;
  if (options.maxLength) control.maxLength = options.maxLength;
  if (options.placeholderKey) control.placeholder = t(options.placeholderKey);
  if (!options.multiline) control.type = "text";
  label.className = options.wide ? "proposal-field proposal-field-wide" : "proposal-field";
  label.append(title, control);
  return { label, control };
}

function generatedIdentifier(value) {
  return String(value ?? "").toLowerCase().normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 64);
}

function bindGeneratedIdentifier(nameControl, idControl, persisted = false) {
  let edited = persisted;
  idControl.addEventListener("input", () => { edited = true; });
  nameControl.addEventListener("input", () => {
    if (!edited) idControl.value = generatedIdentifier(nameControl.value);
  });
}

function selectField(labelKey, select) {
  const label = document.createElement("label");
  const title = document.createElement("span");
  label.className = "proposal-field";
  title.textContent = t(labelKey);
  select.setAttribute("aria-label", title.textContent);
  label.append(title, select);
  return label;
}

function suggestedProposalDestination(proposal, destinations) {
  const source = `${proposal.suggestion.id} ${proposal.suggestion.name} ${proposal.suggestion.url} ${proposal.suggestion.providerId}`.toLowerCase();
  const categoryHints = {
    monitoring: ["grafana", "prometheus", "loki", "uptime", "monitor"],
    networking: ["traefik", "caddy", "nginx", "proxy", "dns", "router", "switch", "network"],
    netzwerk: ["traefik", "caddy", "nginx", "proxy", "dns", "router", "switch", "network"],
    management: ["authentik", "gitlab", "portainer", "proxmox", "admin", "management"],
    storage: ["nextcloud", "minio", "nas", "backup", "storage"],
    speicher: ["nextcloud", "minio", "nas", "backup", "storage"]
  };
  return destinations.map((destination, index) => {
    const group = `${destination.groupId} ${destination.groupName}`.toLowerCase();
    const category = `${destination.categoryId} ${destination.categoryName}`.toLowerCase();
    let score = 0;
    for (const token of group.split(/[^a-z0-9]+/).filter((item) => item.length >= 3)) {
      if (source.includes(token)) score += 4;
    }
    for (const [hint, keywords] of Object.entries(categoryHints)) {
      if (category.includes(hint) && keywords.some((keyword) => source.includes(keyword))) score += 3;
    }
    return { destination, index, score };
  }).sort((left, right) => right.score - left.score || left.index - right.index)[0]?.destination;
}

function renderDiscoveryProviders(data) {
  const providers = data.providers ?? [];
  serviceInboxProviders.hidden = providers.length === 0;
  serviceInboxProviders.replaceChildren(...providers.map((provider) => {
    const card = document.createElement("article");
    const indicator = document.createElement("i");
    const copy = document.createElement("span");
    const name = document.createElement("strong");
    const meta = document.createElement("small");
    const detail = document.createElement("small");
    const checkedAt = new Date(provider.checkedAt ?? data.checkedAt);
    const time = Number.isNaN(checkedAt.getTime()) ? t("unknown") : checkedAt.toLocaleTimeString(locale);
    const resourceKey = provider.type === "docker" ? "providerTargets" : "providerRoutes";
    card.className = "service-inbox-provider";
    card.dataset.status = provider.status;
    card.title = provider.error || "";
    indicator.setAttribute("aria-hidden", "true");
    name.textContent = provider.name;
    meta.textContent = `${t(provider.status === "up" ? "providerUp" : "providerDown")} · ${t(resourceKey, {
      count: provider.type === "docker" ? provider.targets : provider.routes
    })} · ${t("providerCheckedAt", { time })}`;
    detail.textContent = provider.error || (provider.driver ?? provider.type);
    copy.append(name, meta, detail);
    card.append(indicator, copy);
    return card;
  }));
}

function selectServiceInboxView(name) {
  const views = { services: serviceInboxServicesView, providers: serviceInboxProvidersView };
  const selected = views[name] ? name : "services";
  Object.entries(views).forEach(([key, view]) => { view.hidden = key !== selected; });
  serviceInboxTabs.querySelectorAll("button[data-service-inbox-view]").forEach((button) => {
    const active = button.dataset.serviceInboxView === selected;
    button.setAttribute("aria-selected", String(active));
    button.tabIndex = active ? 0 : -1;
  });
}

serviceInboxTabs.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-service-inbox-view]");
  if (button) selectServiceInboxView(button.dataset.serviceInboxView);
});

serviceInboxTabs.addEventListener("keydown", (event) => {
  if (!new Set(["ArrowLeft", "ArrowRight"]).has(event.key)) return;
  const tabs = [...serviceInboxTabs.querySelectorAll("button[data-service-inbox-view]")];
  const current = tabs.indexOf(document.activeElement);
  if (current < 0) return;
  event.preventDefault();
  const direction = event.key === "ArrowRight" ? 1 : -1;
  const next = tabs[(current + direction + tabs.length) % tabs.length];
  selectServiceInboxView(next.dataset.serviceInboxView);
  next.focus();
});

function hasActiveProposalEditor() {
  return Boolean(proposalListElement.querySelector(".proposal-editor:not([hidden])"));
}

function renderDiscoveryProposals(data, { force = false } = {}) {
  latestDiscoveryProposals = data;
  renderDiscoveryProviders(data);
  if (!force && hasActiveProposalEditor()) return;
  const counts = { pending: 0, accepted: 0, rejected: 0, all: data.proposals.length };
  data.proposals.forEach((proposal) => {
    const state = proposal.state === "ignored" ? "rejected" : proposal.state;
    counts[state] = (counts[state] ?? 0) + 1;
  });
  serviceInboxCount.textContent = String(counts.pending);
  serviceInboxCount.hidden = counts.pending === 0;
  proposalFiltersElement.querySelectorAll("button[data-proposal-filter]").forEach((button) => {
    const active = button.dataset.proposalFilter === proposalFilter;
    button.setAttribute("aria-pressed", String(active));
    button.querySelector("output").textContent = String(counts[button.dataset.proposalFilter] ?? 0);
  });
  const query = proposalSearch.trim().toLowerCase();
  const proposals = data.proposals.filter((proposal) => {
    const state = proposal.state === "ignored" ? "rejected" : proposal.state;
    if (proposalFilter !== "all" && state !== proposalFilter) return false;
    if (!query) return true;
    return [proposal.suggestion.id, proposal.suggestion.name, proposal.suggestion.url, proposal.suggestion.providerId]
      .some((value) => String(value ?? "").toLowerCase().includes(query));
  });
  const proposalCards = proposals.map((proposal) => {
    const proposalState = proposal.state === "ignored" ? "rejected" : proposal.state;
    const card = document.createElement("article");
    card.className = "proposal-card";
    card.dataset.state = proposalState;
    const heading = document.createElement("header");
    const copy = document.createElement("span");
    const serviceTitle = document.createElement("strong");
    const url = document.createElement("small");
    const source = document.createElement("small");
    const state = document.createElement("em");
    serviceTitle.textContent = proposal.suggestion.name;
    url.textContent = proposal.suggestion.url;
    source.textContent = t("discoveredVia", { provider: proposal.suggestion.providerId ?? "Discovery" });
    state.textContent = t(`proposal_${proposalState}`);
    copy.append(serviceTitle, url, source);
    heading.append(copy, state);

    const name = proposalField("serviceName", proposal.suggestion.name, { maxLength: 120 });
    const id = proposalField("serviceId", proposal.suggestion.id, { maxLength: 64 });
    const description = proposalField("serviceDescription", proposal.suggestion.description, {
      maxLength: 240, wide: true, placeholderKey: "optionalDescription"
    });
    const icon = proposalField("serviceIcon", proposal.suggestion.icon, {
      maxLength: 240, wide: true, placeholderKey: "optionalIcon"
    });
    const fields = document.createElement("div");
    fields.className = "proposal-fields";
    fields.append(name.label, id.label, description.label, icon.label);

    const dependencyField = document.createElement("fieldset");
    const dependencyLegend = document.createElement("legend");
    const dependencyOptions = document.createElement("div");
    const provider = (data.providers ?? []).find((item) => item.id === proposal.suggestion.providerId);
    const initialDependencies = Object.hasOwn(proposal.suggestion, "depends-on") && Array.isArray(proposal.suggestion["depends-on"])
      ? proposal.suggestion["depends-on"]
      : (provider?.dependsOn ?? []);
    dependencyField.className = "proposal-dependencies";
    dependencyLegend.textContent = t("dependsOn");
    dependencyOptions.className = "proposal-dependency-options";
    for (const server of data.servers ?? []) {
      const label = document.createElement("label");
      const checkbox = document.createElement("input");
      const text = document.createElement("span");
      checkbox.type = "checkbox";
      checkbox.value = server.id;
      checkbox.checked = initialDependencies.includes(server.id);
      text.textContent = server.name;
      label.title = server.id;
      label.append(checkbox, text);
      dependencyOptions.append(label);
    }
    dependencyField.append(dependencyLegend, dependencyOptions);

    const targetEditor = document.createElement("div");
    const targetMode = document.createElement("select");
    const destination = document.createElement("select");
    targetEditor.className = "proposal-target-editor";
    for (const [value, key] of [["existing", "targetExistingPanel"], ["new-panel", "targetNewPanel"], ["new-area", "targetNewArea"]]) {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = t(key);
      targetMode.append(option);
    }
    targetMode.value = proposal.suggestion.newGroup
      ? "new-area"
      : proposal.suggestion.newCategory
        ? "new-panel"
        : data.destinations.length
          ? "existing"
          : (data.groups?.length ? "new-panel" : "new-area");
    const suggestedDestination = suggestedProposalDestination(proposal, data.destinations);
    for (const item of data.destinations) {
      const option = document.createElement("option");
      option.value = `${item.groupId}:${item.categoryId}`;
      option.textContent = `${item.groupName} / ${item.categoryName}${item.isDraft ? ` · ${t("acceptedDraft")}` : ""}`;
      option.dataset.groupId = item.groupId;
      option.dataset.categoryId = item.categoryId;
      if (item.newGroup) {
        option.dataset.newGroupId = item.newGroup.id;
        option.dataset.newGroupName = item.newGroup.name;
      }
      if (item.newCategory) {
        option.dataset.newCategoryId = item.newCategory.id;
        option.dataset.newCategoryName = item.newCategory.name;
      }
      option.selected = proposal.targetGroup
        ? item.groupId === proposal.targetGroup && item.categoryId === proposal.targetCategory
        : item === suggestedDestination;
      destination.append(option);
    }
    const newCategoryFields = document.createElement("div");
    const targetGroup = document.createElement("select");
    const categoryName = proposalField("newCategoryName", proposal.suggestion.newCategory?.name, { maxLength: 120 });
    const categoryId = proposalField("newCategoryId", proposal.suggestion.newCategory?.id, { maxLength: 64 });
    newCategoryFields.className = "proposal-new-category";
    for (const group of data.groups ?? []) {
      const option = document.createElement("option");
      option.value = group.groupId;
      option.textContent = `${group.groupName}${group.isDraft ? ` · ${t("acceptedDraft")}` : ""}`;
      option.dataset.groupId = group.groupId;
      option.dataset.groupName = group.groupName;
      option.dataset.draft = String(group.isDraft === true);
      option.selected = group.groupId === (proposal.targetGroup || proposal.suggestion.newCategory?.groupId)
        || (!proposal.targetGroup && !proposal.suggestion.newCategory?.groupId && group.groupId === suggestedDestination?.groupId);
      targetGroup.append(option);
    }
    bindGeneratedIdentifier(categoryName.control, categoryId.control, Boolean(proposal.suggestion.newCategory?.id));
    newCategoryFields.append(selectField("targetGroup", targetGroup), categoryName.label, categoryId.label);

    const newAreaFields = document.createElement("div");
    const areaName = proposalField("newAreaName", proposal.suggestion.newGroup?.name, { maxLength: 120 });
    const areaId = proposalField("newAreaId", proposal.suggestion.newGroup?.id, { maxLength: 64 });
    const areaCategoryName = proposalField("newCategoryName", proposal.suggestion.newCategory?.name, { maxLength: 120 });
    const areaCategoryId = proposalField("newCategoryId", proposal.suggestion.newCategory?.id, { maxLength: 64 });
    newAreaFields.className = "proposal-new-area";
    bindGeneratedIdentifier(areaName.control, areaId.control, Boolean(proposal.suggestion.newGroup?.id));
    bindGeneratedIdentifier(areaCategoryName.control, areaCategoryId.control, Boolean(proposal.suggestion.newCategory?.id));
    newAreaFields.append(areaName.label, areaId.label, areaCategoryName.label, areaCategoryId.label);

    const existingFields = document.createElement("div");
    existingFields.className = "proposal-existing-target";
    existingFields.append(selectField("targetCategory", destination));
    targetEditor.append(selectField("targetMode", targetMode), existingFields, newCategoryFields, newAreaFields);
    const syncTargetMode = () => {
      existingFields.hidden = targetMode.value !== "existing";
      newCategoryFields.hidden = targetMode.value !== "new-panel";
      newAreaFields.hidden = targetMode.value !== "new-area";
    };
    targetMode.addEventListener("change", syncTargetMode);
    syncTargetMode();

    const actions = document.createElement("div");
    actions.className = "proposal-actions";
    const cancelButton = document.createElement("button");
    cancelButton.type = "button";
    cancelButton.dataset.action = "cancel";
    cancelButton.textContent = t("cancelAddService");
    cancelButton.hidden = true;
    for (const [nextState, key] of [["accepted", "acceptSuggestion"], ["rejected", "rejectSuggestion"]]) {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.action = nextState;
      const restingLabel = nextState === "accepted" && proposalState === "accepted" ? "editSuggestion" : key;
      button.textContent = t(restingLabel);
      button.hidden = nextState === "rejected" && proposalState === "rejected";
      button.addEventListener("click", async () => {
        if (nextState === "accepted" && editor.hidden) {
          editor.hidden = false;
          cancelButton.hidden = false;
          button.textContent = t(proposalState === "accepted" ? "confirmSuggestionChanges" : "confirmAddService");
          return;
        }
        button.disabled = true;
        try {
          const selected = destination.selectedOptions[0]?.dataset;
          const selectedGroup = targetGroup.selectedOptions[0]?.dataset;
          const selectedDestination = targetMode.value === "new-area" ? {
            groupId: areaId.control.value,
            categoryId: areaCategoryId.control.value,
            newGroup: { id: areaId.control.value, name: areaName.control.value },
            newCategory: { id: areaCategoryId.control.value, name: areaCategoryName.control.value }
          } : targetMode.value === "new-panel" ? {
            groupId: targetGroup.value,
            categoryId: categoryId.control.value,
            ...(selectedGroup?.draft === "true" ? {
              newGroup: { id: targetGroup.value, name: selectedGroup.groupName }
            } : {}),
            newCategory: { id: categoryId.control.value, name: categoryName.control.value }
          } : selected ? {
            groupId: selected.groupId,
            categoryId: selected.categoryId,
            ...(selected.newGroupId ? { newGroup: { id: selected.newGroupId, name: selected.newGroupName } } : {}),
            ...(selected.newCategoryId ? { newCategory: { id: selected.newCategoryId, name: selected.newCategoryName } } : {})
          } : null;
          const customized = nextState === "accepted" ? {
            id: id.control.value,
            name: name.control.value,
            description: description.control.value,
            icon: icon.control.value,
            "depends-on": [...dependencyOptions.querySelectorAll('input[type="checkbox"]:checked')].map((input) => input.value)
          } : undefined;
          await reviewProposal(
            proposal,
            nextState,
            selectedDestination,
            customized
          );
        } catch (error) {
          serviceInboxError.textContent = error.message;
          serviceInboxError.hidden = false;
          button.disabled = false;
        }
      });
      actions.append(button);
    }
    cancelButton.addEventListener("click", () => {
      editor.hidden = true;
      cancelButton.hidden = true;
      actions.querySelector('[data-action="accepted"]')?.replaceChildren(t(proposalState === "accepted" ? "editSuggestion" : "acceptSuggestion"));
    });
    actions.prepend(cancelButton);
    const footer = document.createElement("footer");
    const destinationFields = document.createElement("div");
    destinationFields.className = "proposal-destination";
    destinationFields.append(targetEditor);
    const editor = document.createElement("div");
    editor.className = "proposal-editor";
    editor.hidden = true;
    editor.append(fields, dependencyField, destinationFields);
    footer.append(actions);
    card.append(heading, editor, footer);
    return { providerId: proposal.suggestion.providerId ?? "unassigned", card };
  });
  const providerNames = new Map((data.providers ?? []).map((provider) => [provider.id, provider.name]));
  const cardsByProvider = new Map();
  for (const item of proposalCards) {
    if (!cardsByProvider.has(item.providerId)) cardsByProvider.set(item.providerId, []);
    cardsByProvider.get(item.providerId).push(item.card);
  }
  proposalListElement.replaceChildren(...[...cardsByProvider.entries()].map(([providerId, cards]) => {
    const group = document.createElement("details");
    const summary = document.createElement("summary");
    const label = document.createElement("span");
    const count = document.createElement("output");
    const grid = document.createElement("div");
    group.className = "proposal-provider-group";
    group.open = true;
    label.textContent = providerNames.get(providerId) ?? providerId;
    count.textContent = String(cards.length);
    grid.className = "proposal-provider-grid";
    grid.append(...cards);
    summary.append(label, count);
    group.append(summary, grid);
    return group;
  }));
  if (!proposals.length) {
    const empty = document.createElement("p");
    empty.className = "proposal-empty";
    empty.textContent = data.proposals.length ? t("noMatchingProposals") : t("noDiscoveryProposals");
    proposalListElement.append(empty);
  }
}

proposalFiltersElement.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-proposal-filter]");
  if (!button) return;
  proposalFilter = button.dataset.proposalFilter;
  renderDiscoveryProposals(latestDiscoveryProposals);
});

proposalSearchElement.addEventListener("input", () => {
  proposalSearch = proposalSearchElement.value;
  renderDiscoveryProposals(latestDiscoveryProposals);
});

async function loadDiscoveryProposals({ forceRender = false } = {}) {
  if (!appCapabilities.inventory) return;
  const response = await fetch("/api/admin/discovery-proposals", { cache: "no-store" });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || `HTTP ${response.status}`);
  renderDiscoveryProposals(result, { force: forceRender });
}

function selectAdminTab(name) {
  const panes = { users: adminUsersPane, audit: adminAuditPane };
  const selected = panes[name] ? name : "users";
  Object.entries(panes).forEach(([key, pane]) => { pane.hidden = key !== selected; });
  adminTabs.querySelectorAll("button").forEach((button) => {
    if (button.dataset.adminTab === selected) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });
  if (selected === "users") loadUsers().catch(() => { adminStatus.textContent = t("usersLoadFailed"); });
  if (selected === "audit") loadAuditEvents().catch(() => { adminStatus.textContent = t("auditLoadFailed"); });
}

adminTabs.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-admin-tab]");
  if (button) selectAdminTab(button.dataset.adminTab);
});

async function refreshServiceInbox() {
  serviceInboxRefresh.disabled = true;
  serviceInboxError.hidden = true;
  try {
    const response = await fetch("/api/inventory/refresh", { method: "POST", cache: "no-store" });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || `HTTP ${response.status}`);
    await loadDiscoveryProposals();
  } catch (error) {
    serviceInboxError.textContent = error.message;
    serviceInboxError.hidden = false;
  } finally {
    serviceInboxRefresh.disabled = false;
  }
}

async function copyMergedInventory() {
  serviceInboxCopy.disabled = true;
  serviceInboxStatus.textContent = "";
  try {
    const response = await fetch("/api/admin/discovery-export?format=full", { cache: "no-store" });
    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      throw new Error(result.error || `HTTP ${response.status}`);
    }
    const source = await response.text();
    try {
      await navigator.clipboard.writeText(source);
    } catch {
      const fallback = document.createElement("textarea");
      fallback.value = source;
      fallback.setAttribute("readonly", "");
      fallback.style.position = "fixed";
      fallback.style.opacity = "0";
      document.body.append(fallback);
      fallback.select();
      const copied = document.execCommand("copy");
      fallback.remove();
      if (!copied) throw new Error(t("clipboardUnavailable"));
    }
    serviceInboxStatus.textContent = t("inventoryCopied");
  } catch (error) {
    serviceInboxStatus.textContent = t("inventoryCopyFailed", { error: error.message });
  } finally {
    serviceInboxCopy.disabled = false;
  }
}

serviceInboxButton.addEventListener("click", async () => {
  proposalFilter = "pending";
  proposalSearch = "";
  proposalSearchElement.value = "";
  selectServiceInboxView("services");
  serviceInboxError.hidden = true;
  serviceInboxStatus.textContent = "";
  serviceInboxDialog.showModal();
  try { await loadDiscoveryProposals(); }
  catch (error) {
    serviceInboxError.textContent = error.message;
    serviceInboxError.hidden = false;
  }
});
serviceInboxClose.addEventListener("click", () => serviceInboxDialog.close());
serviceInboxDialog.addEventListener("cancel", (event) => {
  if (hasActiveProposalEditor()) event.preventDefault();
});
serviceInboxRefresh.addEventListener("click", refreshServiceInbox);
serviceInboxCopy.addEventListener("click", copyMergedInventory);

function syncSettingsControls() {
  settingsTheme.value = document.documentElement.dataset.theme || "dark";
  settingsLanguage.value = locale;
  settingsDensity.value = document.documentElement.dataset.density || "comfortable";
  settingsSidebar.value = document.documentElement.dataset.sidebar || "expanded";
}

async function loadPersonalPreferences() {
  try {
    const [accountResponse, preferencesResponse] = await Promise.all([
      fetch("/api/account", { cache: "no-store" }),
      fetch("/api/account/preferences", { cache: "no-store" })
    ]);
    if (!accountResponse.ok) return;
    account = (await accountResponse.json()).user;
    personalPreferences = preferencesResponse.ok ? (await preferencesResponse.json()).preferences || {} : {};
    favoriteOverrides = personalPreferences.favorites && typeof personalPreferences.favorites === "object" ? personalPreferences.favorites : {};
    panelLayoutOverrides = personalPreferences.panelLayouts && typeof personalPreferences.panelLayouts === "object" ? personalPreferences.panelLayouts : {};
    setTheme(personalPreferences.theme || "dark");
    setLanguage(personalPreferences.language || "en");
    setDensity(personalPreferences.density || "comfortable");
    setSidebar(personalPreferences.sidebar || "expanded");
    for (const [key, value] of Object.entries({
      theme: document.documentElement.dataset.theme,
      language: locale,
      density: document.documentElement.dataset.density,
      sidebar: document.documentElement.dataset.sidebar
    })) cacheVisualPreference(key, value);
    settingsButton.hidden = false;
    profileSettingsButton.hidden = false;
    settingsUserElement.textContent = account.displayName || account.username;
    profileAvatar.textContent = (account.displayName || account.username).trim().slice(0, 1).toUpperCase();
    settingsDisplayName.textContent = account.displayName || account.username;
    settingsAccountName.textContent = `@${account.username}`;
    settingsAvatar.textContent = (account.displayName || account.username).trim().slice(0, 1).toUpperCase();
    settingsRole.textContent = account.role;
    const isAdmin = account.role === "admin";
    appCapabilities.administration = isAdmin;
    settingsUserManagement.hidden = !isAdmin;
    settingsAudit.hidden = !isAdmin;
    adminTabs.querySelectorAll('[data-admin-tab="users"], [data-admin-tab="audit"]').forEach((button) => { button.hidden = !isAdmin; });
    if (appCapabilities.inventory && account.role !== "admin") appCapabilities.inventory = false;
    serviceInboxButton.hidden = !(isAdmin && appCapabilities.inventory);
    if (isAdmin) selectAdminTab("users");
    adminNavLink.hidden = !isAdmin;
    if (isAdmin && appCapabilities.inventory) loadDiscoveryProposals().catch(() => {});
    syncSettingsControls();
  } catch { /* Scope remains usable if preferences are temporarily unavailable. */ }
}

async function loadUsers() {
  if (account?.role !== "admin") return;
  const response = await fetch("/api/admin/users", { cache: "no-store" });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const { users } = await response.json();
  settingsUsers.replaceChildren(...users.map((user) => {
    const row = document.createElement("div");
    row.className = "settings-user-row";
    const copy = document.createElement("span");
    const name = document.createElement("strong");
    const meta = document.createElement("small");
    name.textContent = user.displayName || user.username;
    meta.textContent = `@${user.username} · ${user.role} · ${user.active ? t("active") : t("inactive")}`;
    copy.append(name, meta);
    row.append(copy);
    if (user.username !== account.username) {
      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.textContent = t(user.active ? "deactivateUser" : "activateUser");
      toggle.addEventListener("click", async () => {
        toggle.disabled = true;
        try {
          const update = await fetch(`/api/admin/users/${encodeURIComponent(user.id)}/active`, {
            method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active: !user.active })
          });
          if (!update.ok) adminStatus.textContent = t("userUpdateFailed");
          else await loadUsers();
        } catch {
          adminStatus.textContent = t("userUpdateFailed");
        } finally {
          toggle.disabled = false;
        }
      });
      row.append(toggle);
    }
    return row;
  }));
}

async function loadAuditEvents() {
  if (account?.role !== "admin") return;
  const response = await fetch("/api/admin/audit?limit=40", { cache: "no-store" });
  if (!response.ok) return;
  const events = (await response.json()).events || [];
  settingsAuditEvents.replaceChildren(...events.map((event) => {
    const row = document.createElement("div");
    row.className = "settings-user-row";
    const copy = document.createElement("span");
    const action = document.createElement("strong");
    action.textContent = t(auditActionTranslationKeys[event.action] || "auditActionUnknown", { action: event.action });
    const detail = document.createElement("small");
    const targetValue = event.targetType === "user"
      ? event.detail?.username || (["user.initial_admin_created", "user.password_changed", "auth.login", "auth.login_failed", "auth.logout"].includes(event.action) ? event.actor : event.targetId)
      : event.targetId;
    const targetKey = {
      user: "auditTargetUser", channel: "auditTargetChannel", connection: "auditTargetConnection",
      session: "auditTargetSession", maintenance: "auditTargetMaintenance", "discovery-proposal": "auditTargetDiscoveryProposal"
    }[event.targetType] || "auditTargetScope";
    detail.textContent = t("auditActorAndTarget", {
      actor: event.actor || t("auditSystemActor"),
      target: t(targetKey, { value: targetValue || event.targetType || "Scope" })
    });
    copy.append(action, detail);
    const time = document.createElement("small");
    time.textContent = new Date(event.occurredAt).toLocaleString(locale);
    row.append(copy, time);
    return row;
  }));
}

function closeProfileMenu() {
  profileMenu.hidden = true;
  settingsButton.setAttribute("aria-expanded", "false");
}

settingsButton.addEventListener("click", (event) => {
  event.stopPropagation();
  const opening = profileMenu.hidden;
  profileMenu.hidden = !opening;
  settingsButton.setAttribute("aria-expanded", String(opening));
});
profileSettingsButton.addEventListener("click", () => {
  closeProfileMenu();
  clearResetConfirmations([settingsResetLayouts, settingsResetFavorites]);
  syncSettingsControls();
  settingsStatus.textContent = "";
  settingsDialog.showModal();
});
document.addEventListener("click", (event) => {
  if (!event.target.closest("#profile-control")) closeProfileMenu();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !profileMenu.hidden) closeProfileMenu();
});
settingsDialog.addEventListener("click", (event) => {
  if (event.target === settingsDialog) settingsDialog.close();
});
settingsDialog.addEventListener("close", () => {
  clearResetConfirmations([settingsResetLayouts, settingsResetFavorites]);
});
settingsTheme.addEventListener("change", () => setTheme(settingsTheme.value, true));
settingsLanguage.addEventListener("change", () => {
  setLanguage(settingsLanguage.value, true);
  syncSettingsControls();
});
settingsDensity.addEventListener("change", () => setDensity(settingsDensity.value, true));
settingsSidebar.addEventListener("change", () => setSidebar(settingsSidebar.value, true));
settingsResetLayouts.addEventListener("click", () => confirmDestructiveAction(settingsResetLayouts, () => {
  panelLayoutOverrides = {};
  updatePreference("panelLayouts", panelLayoutOverrides);
  rerenderLocalizedContent();
}));
settingsResetFavorites.addEventListener("click", () => confirmDestructiveAction(settingsResetFavorites, () => {
  favoriteOverrides = {};
  updatePreference("favorites", favoriteOverrides);
  rerenderLocalizedContent();
}));
settingsChangePassword.addEventListener("click", async () => {
  settingsChangePassword.disabled = true;
  try {
    const response = await fetch("/api/account/password", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: settingsCurrentPassword.value, newPassword: settingsNewPassword.value })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      settingsStatus.textContent = result.error || t("passwordChangeFailed");
      return;
    }
    window.location.replace("/login");
  } catch {
    settingsStatus.textContent = t("passwordChangeFailed");
  } finally {
    settingsChangePassword.disabled = false;
  }
});
settingsCreateUser.addEventListener("click", async () => {
  settingsCreateUser.disabled = true;
  try {
    const response = await fetch("/api/admin/users", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: settingsNewUsername.value, displayName: settingsNewDisplayName.value,
        password: settingsNewUserPassword.value, role: settingsNewUserRole.value
      })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) adminStatus.textContent = result.error || t("userCreateFailed");
    else {
      settingsNewUsername.value = "";
      settingsNewDisplayName.value = "";
      settingsNewUserPassword.value = "";
      adminStatus.textContent = t("userCreated");
      await loadUsers();
    }
  } catch {
    adminStatus.textContent = t("userCreateFailed");
  } finally {
    settingsCreateUser.disabled = false;
  }
});

async function loadMeta() {
  try {
    const response = await fetch("/api/meta", { cache: "no-store" });
    if (response.status === 401) {
      window.location.replace("/login");
      return;
    }
    if (response.ok) {
      const meta = await response.json();
      appVersionElement.textContent = `v${meta.version}`;
      const appTitle = meta.title || meta.name || "Scope";
      brandTitleElement.textContent = appTitle;
      brandSubtitleElement.textContent = meta.subtitle || "";
      footerTitleElement.textContent = appTitle;
      document.title = appTitle;
      settingsUserElement.textContent = meta.authenticationRequired ? t("account") : appTitle;
      iconBaseUrl = meta.iconBaseUrl || defaultIconBaseUrl;
      menuPresentation = meta.menu || {};
      serverGroups = menuPresentation.server?.groups ?? [];
      serverGroupSlugs = createGroupSlugs(serverGroups);
      serverGroupLabelElement.textContent = menuPresentation.server?.navigationLabel || t("groups");
      renderServerNavigation();
      logoutButton.hidden = !meta.authenticationRequired;
      appCapabilities = { ...appCapabilities, ...meta.capabilities };
      dashboardNavLink.hidden = !appCapabilities.services;
      serversNavLink.hidden = !appCapabilities.servers;
      notificationsNavLink.hidden = !appCapabilities.notifications;
      serviceInboxButton.hidden = meta.authenticationRequired || !appCapabilities.inventory;
      adminNavLink.hidden = true;
      settingsButton.hidden = !meta.authenticationRequired;
      if (!meta.authenticationRequired && appCapabilities.inventory) loadDiscoveryProposals().catch(() => {});
      rerenderLocalizedContent();
      renderOverview();
    }
  } catch { /* Der Versions-Platzhalter bleibt sichtbar. */ }
}

function renderRoute() {
  if (sessionView.hidden === false) closeSession();
  const route = parseRoute();
  setActiveModule(route.module);
  if (route.module === "overview") renderOverview();
  if (route.module === "dashboard") renderSelectedEnvironment(route.environment);
  if (route.module === "servers") renderMonitoring(route.group);
  if (route.module === "admin") selectAdminTab("users");
}

window.addEventListener("hashchange", renderRoute);
await loadMeta();
await loadPersonalPreferences();
await Promise.all([loadDashboard(), loadRemoteConnections()]);
renderRoute();
await Promise.all([loadStatuses(), loadRemoteStatuses(), loadMonitoring(), loadCertificates(), loadDns(), loadNotifications(), loadHistory()]);
setInterval(() => {
  loadStatuses(); loadRemoteStatuses(); loadMonitoring(); loadCertificates(); loadDns(); loadNotifications(); loadHistory();
}, 60000);

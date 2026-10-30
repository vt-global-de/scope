import { supportedLocales, translate } from "/i18n.mjs";

const themeStorageKey = "scope-theme";
const languageStorageKey = "scope-language";
const form = document.querySelector("#login-form");
const usernameInput = document.querySelector("#login-username");
const displayNameInput = document.querySelector("#login-display-name");
const passwordInput = document.querySelector("#login-password");
const passwordConfirmationInput = document.querySelector("#login-password-confirmation");
const displayNameLabel = document.querySelector("#display-name-label");
const displayNameField = document.querySelector("#display-name-field");
const passwordConfirmationLabel = document.querySelector("#password-confirmation-label");
const passwordConfirmationField = document.querySelector("#password-confirmation-field");
const kickerElement = document.querySelector("#login-kicker");
const headingElement = document.querySelector("#login-title");
const promptElement = document.querySelector("#login-prompt");
const visibilityButton = document.querySelector("#password-visibility");
const submitButton = document.querySelector("#login-submit");
const errorElement = document.querySelector("#login-error");
const themeToggle = document.querySelector("#login-theme-toggle");
const languageToggle = document.querySelector("#login-language-toggle");
const titleElement = document.querySelector("#login-app-title");
const subtitleElement = document.querySelector("#login-app-subtitle");
let locale = supportedLocales.includes(document.documentElement.lang) ? document.documentElement.lang : "en";
let setupMode = false;

const t = (key) => translate(locale, key);

function updateVisibilityLabel() {
  visibilityButton.setAttribute("aria-label", t(passwordInput.type === "password" ? "showPassword" : "hidePassword"));
}

function applyLanguage(nextLocale, persist = false) {
  locale = supportedLocales.includes(nextLocale) ? nextLocale : "en";
  document.documentElement.lang = locale;
  document.querySelectorAll("[data-i18n]").forEach((element) => { element.textContent = t(element.dataset.i18n); });
  document.querySelectorAll("[data-i18n-aria-label]").forEach((element) => element.setAttribute("aria-label", t(element.dataset.i18nAriaLabel)));
  updateVisibilityLabel();
  languageToggle.setAttribute("aria-label", locale === "en" ? t("switchToGerman") : t("switchToEnglish"));
  if (persist) try { localStorage.setItem(languageStorageKey, locale); } catch { /* Storage may be disabled. */ }
}

function applyTheme(theme, persist = false) {
  document.documentElement.dataset.theme = theme;
  themeToggle.setAttribute("aria-label", theme === "dark" ? t("switchToLight") : t("switchToDark"));
  if (persist) try { localStorage.setItem(themeStorageKey, theme); } catch { /* Storage may be disabled. */ }
}

function setLoginMode(setupRequired) {
  setupMode = setupRequired;
  displayNameLabel.hidden = !setupMode;
  displayNameField.hidden = !setupMode;
  passwordConfirmationLabel.hidden = !setupMode;
  passwordConfirmationField.hidden = !setupMode;
  displayNameInput.required = setupMode;
  passwordConfirmationInput.required = setupMode;
  passwordInput.minLength = setupMode ? 8 : 0;
  passwordInput.maxLength = setupMode ? 128 : 524288;
  passwordConfirmationInput.minLength = setupMode ? 8 : 0;
  passwordConfirmationInput.maxLength = setupMode ? 128 : 524288;
  passwordInput.autocomplete = setupMode ? "new-password" : "current-password";
  kickerElement.dataset.i18n = setupMode ? "firstRunSetup" : "protectedWorkspace";
  headingElement.dataset.i18n = setupMode ? "createAdministrator" : "welcomeBack";
  promptElement.dataset.i18n = setupMode ? "setupPrompt" : "loginPrompt";
  submitButton.querySelector("span").dataset.i18n = setupMode ? "finishSetup" : "openScope";
  applyLanguage(locale);
}

languageToggle.addEventListener("click", () => {
  applyLanguage(locale === "en" ? "de" : "en", true);
  applyTheme(document.documentElement.dataset.theme || "dark");
});
themeToggle.addEventListener("click", () => applyTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark", true));
visibilityButton.addEventListener("click", () => {
  const visible = passwordInput.type === "text";
  passwordInput.type = visible ? "password" : "text";
  updateVisibilityLabel();
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  errorElement.hidden = true;
  submitButton.disabled = true;
  submitButton.querySelector("span").textContent = t(setupMode ? "creatingAdministrator" : "signingIn");
  try {
    const response = await fetch(setupMode ? "/api/auth/setup" : "/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(setupMode ? {
        displayName: displayNameInput.value,
        username: usernameInput.value,
        password: passwordInput.value,
        passwordConfirmation: passwordConfirmationInput.value
      } : { username: usernameInput.value, password: passwordInput.value })
    });
    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      errorElement.textContent = setupMode
        ? result.error || t("setupFailed")
        : t(response.status === 429 ? "loginRateLimited" : "loginFailed");
      errorElement.hidden = false;
      passwordInput.select();
      return;
    }
    window.location.replace("/");
  } catch {
    errorElement.textContent = t("loginUnavailable");
    errorElement.hidden = false;
  } finally {
    submitButton.disabled = false;
    submitButton.querySelector("span").textContent = t(setupMode ? "finishSetup" : "openScope");
  }
});

applyLanguage(locale);
applyTheme(document.documentElement.dataset.theme || "dark");

try {
  const response = await fetch("/api/auth/config", { cache: "no-store" });
  if (response.ok) {
    const config = await response.json();
    if (!config.enabled) window.location.replace("/");
    setLoginMode(config.setupRequired === true);
    titleElement.textContent = config.title || "Scope";
    subtitleElement.textContent = config.subtitle || "";
    document.title = `${config.title || "Scope"} · ${t(config.setupRequired ? "setup" : "login")}`;
  }
} catch {
  errorElement.textContent = t("loginUnavailable");
  errorElement.hidden = false;
}

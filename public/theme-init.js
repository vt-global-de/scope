(() => {
  const themeStorageKey = "scope-theme";
  const languageStorageKey = "scope-language";
  const densityStorageKey = "scope-density";
  const sidebarStorageKey = "scope-sidebar";
  let theme;
  let language;
  let density;
  let sidebar;

  try {
    theme = localStorage.getItem(themeStorageKey);
    language = localStorage.getItem(languageStorageKey);
    density = localStorage.getItem(densityStorageKey);
    sidebar = localStorage.getItem(sidebarStorageKey);
  } catch {
    // Storage can be disabled by the browser. In that case the defaults apply.
  }

  if (theme !== "light" && theme !== "dark") {
    theme = "dark";
  }

  document.documentElement.dataset.theme = theme;
  document.documentElement.dataset.density = density === "compact" ? "compact" : "comfortable";
  document.documentElement.dataset.sidebar = sidebar === "collapsed" ? "collapsed" : "expanded";
  document.documentElement.lang = ["en", "de"].includes(language) ? language : "en";
})();

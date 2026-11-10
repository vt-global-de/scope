import { expect, test } from "@playwright/test";

test("loads the Scope overview and primary navigation", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Scope/);
  await expect(page.locator("#brand-link")).toBeVisible();
  await expect(page.locator("#overview-nav-link")).toBeVisible();
  await expect(page.locator("#dashboard-nav-link")).toBeVisible();
  await expect(page.locator("#servers-nav-link")).toBeVisible();
  await expect(page.locator("#admin-nav-link")).toBeHidden();
  await expect(page.locator("#theme-toggle .theme-icon")).toHaveCount(2);
  await page.locator("#dashboard-nav-link").click();
  await expect(page.locator(".card .arrow")).toHaveCount(0);
  await expect(page.locator("#service-inbox-button")).toBeVisible();
  await page.locator("#service-inbox-button").click();
  await expect(page.locator("#service-inbox-dialog")).toBeVisible();
  await expect(page.locator(".service-inbox-provider")).toHaveCount(1, { timeout: 10000 });
  await expect(page.locator(".service-inbox-provider")).toHaveAttribute("data-status", /^(up|down)$/);
  await expect(page.locator("#service-inbox-services-view")).toBeVisible();
  await expect(page.locator("#service-inbox-providers-view")).toBeHidden();
  await page.locator('[data-service-inbox-view="providers"]').click();
  await expect(page.locator("#service-inbox-services-view")).toBeHidden();
  await expect(page.locator("#service-inbox-providers-view")).toBeVisible();
  await expect(page.locator(".service-inbox-provider")).toBeVisible();
  const crowdedProviderLayout = await page.locator("#service-inbox-providers-view").evaluate((view) => {
    const grid = view.querySelector("#service-inbox-providers");
    const card = grid.querySelector(".service-inbox-provider");
    for (let index = 0; index < 80; index += 1) grid.append(card.cloneNode(true));
    return { clientHeight: view.clientHeight, scrollHeight: view.scrollHeight };
  });
  expect(crowdedProviderLayout.clientHeight).toBeGreaterThan(0);
  expect(crowdedProviderLayout.scrollHeight).toBeGreaterThan(crowdedProviderLayout.clientHeight);
  const serviceInboxLayout = await page.locator("#service-inbox-dialog").evaluate((dialog) => ({
    dialogOverflow: getComputedStyle(dialog).overflow,
    bodyOverflow: getComputedStyle(document.body).overflow,
    providerOverflow: getComputedStyle(dialog.querySelector("#service-inbox-providers-view")).overflowY,
    clientWidth: dialog.clientWidth,
    scrollWidth: dialog.scrollWidth
  }));
  expect(serviceInboxLayout.dialogOverflow).toBe("hidden");
  expect(serviceInboxLayout.bodyOverflow).toBe("hidden");
  expect(serviceInboxLayout.providerOverflow).toBe("auto");
  expect(serviceInboxLayout.scrollWidth).toBeLessThanOrEqual(serviceInboxLayout.clientWidth + 1);
  await page.locator('[data-service-inbox-view="services"]').click();
  await expect(page.locator("#service-inbox-services-view")).toBeVisible();
  const serviceViewHeight = await page.locator("#service-inbox-services-view").evaluate((view) => view.clientHeight);
  expect(serviceViewHeight).toBeGreaterThan(0);
  await page.mouse.click(1, 1);
  await expect(page.locator("#service-inbox-dialog")).toBeVisible();
  await page.locator("#proposal-list").evaluate((list) => {
    const editor = document.createElement("div");
    editor.className = "proposal-editor";
    list.append(editor);
  });
  await page.locator("#service-inbox-refresh").click();
  await expect(page.locator("#service-inbox-refresh")).toBeEnabled({ timeout: 10000 });
  await expect(page.locator("#proposal-list > .proposal-editor")).toHaveCount(1);
  await page.keyboard.press("Escape");
  await expect(page.locator("#service-inbox-dialog")).toBeVisible();
  await page.locator("#service-inbox-close").click();
  await expect(page.locator("#service-inbox-dialog")).toBeHidden();
  await expect(page.locator("#config-error")).toHaveCount(0);
});

test("offers protocol-specific remote controls without overflowing the session", async ({ page }) => {
  await page.goto("/");
  await page.locator("#session-view").evaluate((session) => {
    session.hidden = false;
    session.dataset.protocol = "ssh";
    session.dataset.connectionState = "connected";
  });

  await expect(page.locator('[data-hotkey="ctrl-c"]')).toBeVisible();
  await expect(page.locator('[data-hotkey="ctrl-alt-delete"]')).toBeHidden();
  await expect(page.locator("#rdp-quality-control")).toBeHidden();

  await page.locator("#session-view").evaluate((session) => { session.dataset.protocol = "rdp"; });
  await page.locator("#rdp-quality-control").evaluate((control) => { control.hidden = false; });
  await expect(page.locator('[data-hotkey="ctrl-alt-delete"]')).toBeVisible();
  await expect(page.locator('[data-hotkey="ctrl-c"]')).toBeHidden();
  await expect(page.locator("#rdp-quality")).toHaveValue("performance");

  const dimensions = await page.locator("#session-view").evaluate((session) => ({
    clientWidth: session.clientWidth,
    scrollWidth: session.scrollWidth
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
});

test("keeps card utilities separated and only divides stacked server statistics", async ({ page }) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const sizes = [
      ["xsmall", 260], ["small", 340], ["medium", 520], ["large", 760], ["full", 1100]
    ];
    const overlaps = (left, right) => !(
      left.right <= right.left || right.right <= left.left || left.bottom <= right.top || right.bottom <= left.top
    );
    const output = [];

    for (const [name, width] of sizes) {
      const service = document.createElement("div");
      service.className = "layout-card-shell service-card-shell";
      service.dataset.cardWidth = name;
      service.style.width = `${width}px`;
      service.innerHTML = `
        <div class="service-card-surface">
          <a class="card">
            <span class="card-top">
              <span class="icon">SC</span>
              <span class="card-top-meta">
                <span class="scope-badge scope-badge-ignored">⊘</span>
                <span class="card-state"><i class="status-indicator"></i></span>
              </span>
            </span>
            <span class="card-content"><strong>A deliberately long service name</strong></span>
            <span class="embedded-health"><span class="embedded-check"><i class="status-indicator"></i><strong>TLS</strong><small>90 days</small></span></span>
          </a>
          <button class="favorite-button">★</button>
        </div>
        <div class="card-layout-controls" style="display:block;height:60px"></div>`;
      document.body.append(service);
      await new Promise((resolve) => requestAnimationFrame(resolve));
      const favorite = service.querySelector(".favorite-button").getBoundingClientRect();
      const scope = service.querySelector(".scope-badge").getBoundingClientRect();
      const state = service.querySelector(".card-state").getBoundingClientRect();
      const bounds = service.querySelector(".service-card-surface").getBoundingClientRect();
      output.push({
        name,
        serviceOverlap: overlaps(favorite, scope) || overlaps(favorite, state),
        serviceOverflow: favorite.left < bounds.left || favorite.right > bounds.right
      });
      service.remove();
    }

    for (const width of [300, 700, 1100]) {
      const server = document.createElement("div");
      server.className = "layout-card-shell monitoring-card-shell";
      server.style.width = `${width}px`;
      server.innerHTML = `
        <article class="monitoring-card" data-status="down">
          <div class="monitoring-card-header">
            <div><h3>A deliberately long server name</h3></div>
            <div class="remote-card-meta">
              <span class="scope-badge scope-badge-ignored">⊘</span>
              <span class="server-status server-monitoring-state" data-status="up"><i class="status-indicator"></i><span>Docker/TLS</span></span>
              <button class="favorite-button">★</button>
            </div>
          </div>
          <section class="monitoring-stat-section"><h4>Host stats</h4></section>
          <section class="monitoring-stat-section"><h4>Docker stats</h4></section>
        </article>`;
      document.body.append(server);
      await new Promise((resolve) => requestAnimationFrame(resolve));
      const utilities = [...server.querySelector(".remote-card-meta").children].map((element) => element.getBoundingClientRect());
      const bounds = server.getBoundingClientRect();
      const dockerStats = getComputedStyle(server.querySelectorAll(".monitoring-stat-section")[1]);
      const upReference = document.createElement("i");
      upReference.className = "legend-dot up";
      document.body.append(upReference);
      output.push({
        name: `server-${width}`,
        serverOverlap: utilities.some((left, index) => utilities.slice(index + 1).some((right) => overlaps(left, right))),
        serverOverflow: utilities.some((item) => item.left < bounds.left || item.right > bounds.right),
        serverTitleWidth: server.querySelector("h3").getBoundingClientRect().width,
        nestedStatusColor: getComputedStyle(server.querySelector(".server-status .status-indicator")).backgroundColor,
        expectedUpColor: getComputedStyle(upReference).backgroundColor,
        dividerTop: dockerStats.borderTopWidth,
        dividerLeft: dockerStats.borderLeftWidth
      });
      upReference.remove();
      server.remove();
    }
    return output;
  });

  for (const size of result.filter((item) => !item.name.startsWith("server-"))) {
    expect(size.serviceOverlap, size.name).toBe(false);
    expect(size.serviceOverflow, size.name).toBe(false);
  }
  for (const size of result.filter((item) => item.name.startsWith("server-"))) {
    expect(size.serverOverlap, size.name).toBe(false);
    expect(size.serverOverflow, size.name).toBe(false);
    expect(size.serverTitleWidth, size.name).toBeGreaterThan(80);
    expect(size.nestedStatusColor, size.name).toBe(size.expectedUpColor);
  }
  expect(result.find((item) => item.name === "server-700").dividerTop).not.toBe("0px");
  expect(result.find((item) => item.name === "server-1100").dividerTop).toBe("0px");
  expect(result.find((item) => item.name === "server-1100").dividerLeft).toBe("0px");
});

test("exposes healthy liveness and readiness endpoints", async ({ request }) => {
  await expect((await request.get("/livez")).status()).toBe(200);
  await expect((await request.get("/readyz")).status()).toBe(200);
});

import { expect, test } from "@playwright/test";

test("loads the Scope overview and primary navigation", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Scope/);
  await expect(page.locator("#brand-link")).toBeVisible();
  await expect(page.locator("#overview-nav-link")).toBeVisible();
  await expect(page.locator("#dashboard-nav-link")).toBeVisible();
  await expect(page.locator("#servers-nav-link")).toBeVisible();
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
        <article class="monitoring-card">
          <div class="monitoring-card-header">
            <div><h3>A deliberately long server name</h3></div>
            <div class="remote-card-meta">
              <span class="scope-badge scope-badge-ignored">⊘</span>
              <span class="protocol-badge">TLS</span>
              <span class="card-state"><i class="status-indicator"></i></span>
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
      output.push({
        name: `server-${width}`,
        serverOverlap: utilities.some((left, index) => utilities.slice(index + 1).some((right) => overlaps(left, right))),
        serverOverflow: utilities.some((item) => item.left < bounds.left || item.right > bounds.right),
        serverTitleWidth: server.querySelector("h3").getBoundingClientRect().width,
        dividerTop: dockerStats.borderTopWidth,
        dividerLeft: dockerStats.borderLeftWidth
      });
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
  }
  expect(result.find((item) => item.name === "server-700").dividerTop).not.toBe("0px");
  expect(result.find((item) => item.name === "server-1100").dividerTop).toBe("0px");
  expect(result.find((item) => item.name === "server-1100").dividerLeft).toBe("0px");
});

test("exposes healthy liveness and readiness endpoints", async ({ request }) => {
  await expect((await request.get("/livez")).status()).toBe(200);
  await expect((await request.get("/readyz")).status()).toBe(200);
});

// Takes screenshots of the main pages for visual review. Run after the smoke test.
// Usage: BASE_URL=http://localhost:3000 OUT_DIR=screenshots node scripts/screenshots.mjs
import fs from "node:fs";
import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const OUT = process.env.OUT_DIR || "screenshots";
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const errors = [];

async function shoot(page, name, fullPage = true) {
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage });
  console.log(`saved ${name}.png`);
}

async function newPage(viewport) {
  const ctx = await browser.newContext({ viewport, locale: "en-GB" });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(`${page.url()}: ${e.message}`));
  page.on("console", (m) => m.type() === "error" && errors.push(`${page.url()} console: ${m.text()}`));
  return { ctx, page };
}

try {
  // ---------- Desktop customer journey ----------
  const { ctx, page } = await newPage({ width: 1366, height: 900 });
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await page.evaluate(() => localStorage.setItem("fgc-cookie-notice", "1"));
  await page.reload({ waitUntil: "networkidle" });
  await shoot(page, "01-home-desktop");
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(3600);
  await shoot(page, "01b-hero-slide-2", false);
  await page.waitForTimeout(450);
  await shoot(page, "01c-hero-mid-transition", false);
  await page.waitForTimeout(3200);
  await shoot(page, "01d-hero-slide-3", false);
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await shoot(page, "01e-login", false);

  await page.goto(`${BASE}/menu`, { waitUntil: "networkidle" });
  await shoot(page, "02-menu-desktop", false);

  // Open a pizza and customise
  await page.getByRole("heading", { name: "FGC Special King" }).click();
  await shoot(page, "02b-allergy-alert", false);
  await page.getByRole("button", { name: "I understand", exact: true }).click();
  await page.getByRole("button", { name: /^L\s/ }).click();
  await page.getByRole("button", { name: /Extra Cheese/ }).click();
  await shoot(page, "03-pizza-modal", false);
  await page.getByRole("button", { name: /(to cart|to continue)/ }).click();

  // Burger with meal upgrade
  await page.getByRole("heading", { name: "Double Flame Burger" }).click();
  await page.getByRole("button", { name: /Make it a meal - fries/ }).click();
  await page.getByLabel("Choose your drink").selectOption({ label: "Coca-Cola" });
  await shoot(page, "03b-meal-drink", false);
  await page.getByRole("button", { name: /(to cart|to continue)/ }).click();

  // Wings: try adding without flavour to show validation
  await page.getByRole("heading", { name: "Chicken Wings" }).click();
  await page.getByRole("button", { name: /(to cart|to continue)/ }).click();
  await shoot(page, "04-wings-validation", false);
  await page.getByRole("button", { name: "BBQ", exact: true }).click();
  await page.getByRole("button", { name: /(to cart|to continue)/ }).click();

  await page.getByRole("button", { name: /Open cart/ }).click();
  await shoot(page, "05-cart-drawer", false);
  await page.goto(`${BASE}/cart`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await shoot(page, "05b-cart-page");

  // Register, then checkout
  await page.goto(`${BASE}/register?next=/checkout`, { waitUntil: "networkidle" });
  await shoot(page, "06-register", false);
  await page.fill("#name", "Jamie Smith");
  await page.fill("#email", `shots+${Date.now()}@example.com`);
  await page.fill("#password", "Password123");
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForSelector("#otp");
  const devCode = (await page.locator("span.font-mono").textContent())?.trim();
  await page.fill("#otp", devCode);
  await shoot(page, "06b-register-code", false);
  await page.getByRole("button", { name: "Verify and continue" }).click();
  await page.waitForURL(/\/checkout/);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1500);
  // First order: add the delivery address at checkout
  await page.fill("#a-postcode", "WR1 1SB");
  await page.fill("#a-line1", "12 Barbourne Road");
  await page.getByRole("button", { name: "Save address" }).click();
  await page.waitForTimeout(1500);
  await shoot(page, "07-checkout");
  // Add a second address from checkout
  await page.getByRole("button", { name: "Add another address" }).click();
  await page.fill("#a-postcode", "WR3 8HP");
  await page.fill("#a-label", "Work");
  await page.fill("#a-line1", "4 Ombersley Road");
  await page.getByRole("button", { name: "Save address" }).click();
  await page.waitForTimeout(1500);
  await shoot(page, "07b-checkout-two-addresses");
  await page.fill("#phone", "07700 900123");
  await page.getByRole("button", { name: /Continue to payment/ }).click();
  await page.getByRole("button", { name: "I understand, continue" }).click();
  await page.waitForTimeout(1200);
  await page.getByRole("button", { name: /Place order \(demo\)/ }).click();
  await page.waitForURL(/\/order\//);
  await page.waitForLoadState("networkidle");
  await shoot(page, "08-order-confirmation");

  await page.goto(`${BASE}/account`, { waitUntil: "networkidle" });
  await shoot(page, "09-account", false);
  await page.goto(`${BASE}/account/addresses`, { waitUntil: "networkidle" });
  await shoot(page, "09b-account-addresses", false);
  await ctx.close();

  // ---------- Mobile ----------
  const m = await newPage({ width: 390, height: 844 });
  await m.page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await m.page.evaluate(() => localStorage.setItem("fgc-cookie-notice", "1"));
  await m.page.reload({ waitUntil: "networkidle" });
  await shoot(m.page, "10-home-mobile");
  await m.page.goto(`${BASE}/menu`, { waitUntil: "networkidle" });
  await shoot(m.page, "11-menu-mobile", false);
  await m.page.getByRole("heading", { name: "Chicken Wings" }).click();
  await m.page.getByRole("button", { name: "I understand", exact: true }).click();
  await shoot(m.page, "12-modal-mobile", false);
  await m.ctx.close();

  // ---------- Admin ----------
  const a = await newPage({ width: 1440, height: 900 });
  await a.page.goto(`${BASE}/admin/login`, { waitUntil: "networkidle" });
  await shoot(a.page, "13a-admin-login", false);
  await a.page.fill("#admin-email", process.env.SEED_ADMIN_EMAIL || "admin@flamegrillandchill.co.uk");
  await a.page.fill("#admin-password", process.env.SEED_ADMIN_PASSWORD || "ChangeMe123!");
  await a.page.getByRole("button", { name: "Sign in to admin" }).click();
  await a.page.waitForURL(/\/admin/);
  await a.page.waitForLoadState("networkidle");
  await shoot(a.page, "13-admin-dashboard");
  await a.page.goto(`${BASE}/admin/orders`, { waitUntil: "networkidle" });
  await a.page.waitForTimeout(1200);
  await shoot(a.page, "14-admin-orders-board");
  const first = a.page.locator('a[href^="/admin/orders/"]').first();
  if (await first.count()) {
    await first.click();
    await a.page.waitForLoadState("networkidle");
    await shoot(a.page, "15-admin-order-detail");
  }
  await a.page.goto(`${BASE}/admin/day`, { waitUntil: "networkidle" });
  await shoot(a.page, "15b-admin-daily-orders");
  await a.page.goto(`${BASE}/admin/menu`, { waitUntil: "networkidle" });
  await shoot(a.page, "16-admin-menu", false);
  await a.page.goto(`${BASE}/admin/settings`, { waitUntil: "networkidle" });
  await shoot(a.page, "17-admin-settings", false);
  await a.ctx.close();
} catch (e) {
  errors.push(`SCRIPT: ${e.stack || e.message}`);
}

await browser.close();
fs.writeFileSync(`${OUT}/errors.txt`, errors.join("\n") || "none");
console.log(errors.length ? `Browser errors:\n${errors.join("\n")}` : "No browser errors");
process.exit(errors.some((e) => e.startsWith("SCRIPT")) ? 1 : 0);

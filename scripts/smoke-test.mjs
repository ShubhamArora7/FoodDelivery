// End-to-end smoke test against a running server (npm run build && npm start).
// Usage: BASE_URL=http://localhost:3000 node scripts/smoke-test.mjs
// Needs DATABASE_URL (it reads/writes the DB to set up test conditions) and
// demo payments (no Stripe keys + ALLOW_DEMO_PAYMENTS=true when NODE_ENV=production).
import crypto from "node:crypto";
import { PrismaClient } from "@prisma/client";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const prisma = new PrismaClient();
let failures = 0;
let passes = 0;

function check(cond, label, extra) {
  if (cond) {
    passes++;
    console.log(`  PASS ${label}`);
  } else {
    failures++;
    console.log(`  FAIL ${label}${extra !== undefined ? ` -> ${typeof extra === "string" ? extra : JSON.stringify(extra).slice(0, 500)}` : ""}`);
  }
}

class Client {
  constructor() {
    this.cookies = new Map();
  }
  async req(method, path, body) {
    const headers = {};
    if (body !== undefined) headers["Content-Type"] = "application/json";
    if (this.cookies.size) headers.Cookie = [...this.cookies].map(([k, v]) => `${k}=${v}`).join("; ");
    const res = await fetch(BASE + path, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined, redirect: "manual" });
    for (const c of res.headers.getSetCookie?.() ?? []) {
      const [pair] = c.split(";");
      const i = pair.indexOf("=");
      const k = pair.slice(0, i);
      const v = pair.slice(i + 1);
      if (!v || /Max-Age=0|Expires=Thu, 01 Jan 1970/i.test(c)) this.cookies.delete(k);
      else this.cookies.set(k, v);
    }
    const text = await res.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {}
    return { status: res.status, json, text, location: res.headers.get("location") };
  }
  get(p) { return this.req("GET", p); }
  post(p, b = {}) { return this.req("POST", p, b); }
  patch(p, b = {}) { return this.req("PATCH", p, b); }
  put(p, b = {}) { return this.req("PUT", p, b); }
  del(p) { return this.req("DELETE", p); }
}

async function main() {
  console.log(`Smoke testing ${BASE}`);

  // Make sure the shop is "open" whatever time CI runs
  await prisma.settings.update({
    where: { id: 1 },
    data: {
      openingHours: [0, 1, 2, 3, 4, 5, 6].map((day) => ({ day, open: "00:00", close: "23:59", closed: false })),
      lastOrderMinsBeforeClose: 0,
      orderingPaused: false,
    },
  });

  console.log("\n# Public pages");
  const anon = new Client();
  for (const path of ["/", "/menu", "/about", "/contact", "/legal/terms", "/legal/privacy", "/legal/allergens", "/legal/cookies", "/login", "/register", "/forgot-password", "/reset-password?token=x", "/cart"]) {
    const r = await anon.get(path);
    check(r.status === 200, `GET ${path} -> 200`, r.status);
  }
  const menuHtml = (await anon.get("/menu")).text;
  for (const name of ["Classic Smash Burger", "Zinger Tower Burger", "Chicken Wings", "FGC Special King", "Mozzarella Sticks (6 pcs)", "Family Deal", "Smoothies"]) {
    check(menuHtml.includes(name), `menu shows ${name}`);
  }
  check((await anon.get("/legal/nope")).status === 404, "unknown legal page -> 404");
  const gated = await anon.get("/checkout");
  check(gated.status === 307 && gated.location?.includes("/login"), "checkout redirects to login when signed out", gated);
  const gatedAdmin = await anon.get("/admin");
  check(gatedAdmin.status === 307, "admin redirects when signed out", gatedAdmin.status);
  check((await anon.get("/api/admin/orders")).status === 401, "admin API 401 when signed out");

  console.log("\n# Register / login / logout");
  const email = `test+${Date.now()}@example.com`;
  const password = "Password123";
  const c = new Client();
  let r = await c.post("/api/auth/register", { name: "Test Customer", email, phone: "07123 456789", password, acceptTerms: true });
  check(r.status === 200 && c.cookies.has("fgc_session"), "register sets session", r.json);
  r = await c.post("/api/auth/register", { name: "Test Customer", email, phone: "07123 456789", password, acceptTerms: true });
  check(r.status === 409, "duplicate email rejected", r.status);
  r = await c.post("/api/auth/register", { name: "X", email: "bad", phone: "1", password: "short", acceptTerms: true });
  check(r.status === 400, "invalid registration rejected", r.status);
  r = await c.get("/account");
  check(r.status === 200 && r.text.includes("Test"), "account page loads", r.status);
  r = await c.post("/api/auth/logout");
  check(!c.cookies.has("fgc_session"), "logout clears session");
  r = await c.post("/api/auth/login", { email, password: "wrongpass1" });
  check(r.status === 401, "wrong password rejected", r.status);
  r = await c.post("/api/auth/login", { email: email.toUpperCase(), password });
  check(r.status === 200 && c.cookies.has("fgc_session"), "login works (case-insensitive email)", r.json);

  console.log("\n# Profile & password");
  r = await c.patch("/api/account/profile", { name: "Test Person", phone: "07999 111222", marketingOptIn: true });
  check(r.status === 200 && r.json?.name === "Test Person", "update profile", r.json);
  r = await c.post("/api/account/password", { currentPassword: "nope", newPassword: "NewPass123" });
  check(r.status === 400, "change password needs current password", r.status);
  r = await c.post("/api/account/password", { currentPassword: password, newPassword: "NewPass123" });
  check(r.status === 200, "change password", r.json);
  r = await c.get("/api/account/profile");
  check(r.status === 200, "session still valid after password change", r.status);

  console.log("\n# Forgot / reset password");
  r = await anon.post("/api/auth/forgot", { email });
  check(r.status === 200, "forgot password responds", r.status);
  r = await anon.post("/api/auth/forgot", { email: "nobody@example.com" });
  check(r.status === 200, "forgot password doesn't reveal unknown emails", r.status);
  const user = await prisma.user.findUnique({ where: { email } });
  const token = crypto.randomBytes(32).toString("hex");
  await prisma.passwordResetToken.create({
    data: { userId: user.id, tokenHash: crypto.createHash("sha256").update(token).digest("hex"), expiresAt: new Date(Date.now() + 3600e3) },
  });
  const other = new Client();
  r = await other.post("/api/auth/reset", { token, password: "Reset12345" });
  check(r.status === 200 && other.cookies.has("fgc_session"), "reset password with token", r.json);
  r = await other.post("/api/auth/reset", { token, password: "Reset12345" });
  check(r.status === 400, "reset token can't be reused", r.status);
  r = await c.get("/api/account/profile");
  check(r.status === 401, "old sessions revoked after reset", r.status);
  r = await c.post("/api/auth/login", { email, password: "Reset12345" });
  check(r.status === 200, "login with new password", r.status);

  console.log("\n# Addresses");
  r = await c.post("/api/account/addresses", { label: "Home", line1: "1 Test Street", city: "Worcester", postcode: "wr11sb" });
  check(r.status === 201 && r.json?.postcode === "WR1 1SB" && r.json?.isDefault, "add address (normalised postcode, default)", r.json);
  const addressId = r.json?.id;
  r = await c.post("/api/account/addresses", { label: "Far", line1: "1 London Road", city: "London", postcode: "SW1A 1AA" });
  const farId = r.json?.id;
  check(r.status === 201, "add out-of-area address", r.json);
  r = await c.post("/api/account/addresses", { line1: "x", city: "y", postcode: "NOTAPOSTCODE" });
  check(r.status === 400, "invalid postcode rejected", r.status);
  r = await c.get("/api/account/addresses");
  check(r.status === 200 && r.json?.length === 2, "list addresses", r.json?.length);

  console.log("\n# Pricing");
  const find = (name) => prisma.product.findFirst({ where: { name }, include: { variants: true, modifierGroups: { include: { group: { include: { options: true } } } } } });
  const burger = await find("Double Flame Burger");
  const wings = await find("Chicken Wings");
  const pizza = await find("FGC Special King");
  const fries = await find("Fries");
  const grp = (prod, name) => prod.modifierGroups.map((m) => m.group).find((g) => g.name === name);
  const mealOpt = grp(burger, "Make it a meal").options[0];
  const mealDrinkGroup = burger.modifierGroups.map((m) => m.group).find((g) => g.showWhenOptionId === mealOpt.id);
  const coke = mealDrinkGroup?.options.find((o) => o.name === "Coca-Cola");
  const wings8 = wings.variants.find((v) => v.name === "8 pcs");
  const bbq = grp(wings, "Choose your flavour").options.find((o) => o.name === "BBQ");
  const pizzaL = pizza.variants.find((v) => v.name === "L");
  const extras = grp(pizza, "Pizza extras").options;
  const cheese = extras.find((o) => o.name === "Extra Cheese");
  const jal = extras.find((o) => o.name === "Jalapeños");
  check(burger.basePrice === 399 && mealOpt.price === 299, "burger £3.99, meal +£2.99");
  check(mealDrinkGroup?.options.length === 20 && !!coke, "meal drink choice lists the shop's 20 drinks", mealDrinkGroup?.options.length);
  const familyDeal = await find("Family Deal");
  check(!!grp(familyDeal, "Choose your 1st drink") && !!grp(familyDeal, "Choose your 2nd drink"), "2-drink deals ask for both drinks");
  check(grp(pizza, "Add a drink")?.options.every((o) => o.price === 130), "optional add-a-drink on food at £1.30");
  check(wings8.price === 699 && pizzaL.price === 1299 && cheese.price === 70 && jal.price === 60, "menu prices match printed menu");

  const cart = [
    { productId: burger.id, variantId: null, optionIds: [mealOpt.id, coke.id], quantity: 2 },
    { productId: wings.id, variantId: wings8.id, optionIds: [bbq.id], quantity: 1 },
    { productId: pizza.id, variantId: pizzaL.id, optionIds: [cheese.id, jal.id], quantity: 1, notes: "well done" },
    { productId: fries.id, variantId: null, optionIds: [], quantity: 1 },
  ];
  const expectedSubtotal = 2 * (399 + 299) + 699 + (1299 + 70 + 60) + 249;
  r = await c.post("/api/checkout/quote", { cart, addressId });
  check(r.status === 200 && r.json?.subtotal === expectedSubtotal, `subtotal = ${expectedSubtotal}`, r.json?.subtotal ?? r.json);
  check(r.json?.deliveryFee === 149 && r.json?.serviceFee === 110 && r.json?.total === expectedSubtotal + 149 + 110, "£1.49 delivery + £1.10 service fee added to total", { fee: r.json?.deliveryFee, service: r.json?.serviceFee, total: r.json?.total });
  check(r.json?.canPlaceOrder === true, "can place order", r.json);

  r = await c.post("/api/checkout/quote", { cart: [{ productId: wings.id, variantId: wings8.id, optionIds: [], quantity: 1 }], addressId });
  check(r.status === 400, "missing required flavour rejected", r.json);
  r = await c.post("/api/checkout/quote", { cart: [{ productId: burger.id, variantId: null, optionIds: [mealOpt.id], quantity: 1 }], addressId });
  check(r.status === 400, "meal without a drink choice rejected", r.json);
  r = await c.post("/api/checkout/quote", { cart: [{ productId: pizza.id, variantId: null, optionIds: [], quantity: 1 }], addressId });
  check(r.status === 400, "missing pizza size rejected", r.json);
  r = await c.post("/api/checkout/quote", { cart: [{ productId: burger.id, variantId: null, optionIds: [bbq.id], quantity: 1 }], addressId });
  check(r.status === 400, "option from another item rejected", r.json);
  r = await c.post("/api/checkout/quote", { cart: [{ productId: fries.id, optionIds: [], quantity: 1 }], addressId });
  check(r.status === 200 && !r.json?.minOrderError && r.json?.minOrder === 0, "no minimum order for delivery", r.json?.minOrderError);
  r = await c.post("/api/checkout/quote", { cart, addressId: farId });
  check(r.status === 200 && r.json?.deliveryError && !r.json?.canPlaceOrder, "out-of-area postcode blocked", r.json?.deliveryError);

  console.log("\n# Discount codes");
  r = await c.post("/api/checkout/quote", { cart, addressId, discountCode: "WELCOME10" });
  check(r.json?.discount === 0 && r.json?.discountMessage, "inactive code not applied", r.json?.discountMessage);

  const admin = new Client();
  r = await admin.post("/api/auth/login", { email: process.env.SEED_ADMIN_EMAIL || "admin@flamegrillandchill.co.uk", password: process.env.SEED_ADMIN_PASSWORD || "ChangeMe123!" });
  check(r.status === 200 && r.json?.role === "ADMIN", "admin login", r.json);
  const welcome = await prisma.discount.findUnique({ where: { code: "WELCOME10" } });
  r = await admin.put(`/api/admin/discounts/${welcome.id}`, {
    code: "WELCOME10", description: "10% off", type: "PERCENT", value: 10, minSubtotal: 1500, maxUses: null, onePerCustomer: true, startsAt: null, expiresAt: null, active: true,
  });
  check(r.status === 200, "admin activates discount", r.json);
  r = await c.post("/api/checkout/quote", { cart, addressId, discountCode: "welcome10" });
  const expectedDiscount = Math.round(expectedSubtotal * 0.1);
  check(r.json?.discount === expectedDiscount && r.json?.total === expectedSubtotal - expectedDiscount + 149 + 110, "10% discount applied", { d: r.json?.discount, t: r.json?.total });

  r = await anon.post("/api/cart/quote", { cart, discountCode: "WELCOME10" });
  check(r.status === 200 && r.json?.deliveryFee === 149 && r.json?.serviceFee === 110 && r.json?.discount === expectedDiscount && r.json?.deliveryRadiusMiles === 7, "cart bill works before sign-in (fees, 7-mile note, discount)", r.json);

  console.log("\n# Place order (demo payment)");
  r = await c.post("/api/checkout/create", { cart, addressId, discountCode: "WELCOME10", phone: "07999 111222", notes: "Ring the bell" });
  check(r.status === 200 && r.json?.orderId && r.json?.demo === true, "create order", r.json);
  const orderId = r.json?.orderId;
  r = await c.get(`/order/${orderId}`);
  check(r.status === 200 && r.text.includes("Confirming your payment"), "order page shows awaiting payment", r.status);
  r = await c.post("/api/checkout/demo-pay", { orderId });
  check(r.status === 200, "demo pay", r.json);
  r = await c.post("/api/checkout/demo-pay", { orderId });
  check(r.status === 409, "can't pay twice", r.status);
  let order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
  check(order.status === "PLACED" && order.paymentStatus === "PAID" && order.total === expectedSubtotal - expectedDiscount + 149 + 110, "order stored as PLACED/PAID with correct total", { s: order.status, p: order.paymentStatus, t: order.total });
  check(order.items.length === 4 && order.items.find((i) => i.name === "FGC Special King")?.variantName === "L", "order items snapshot", order.items.map((i) => i.name));
  check((await prisma.discount.findUnique({ where: { code: "WELCOME10" } })).usedCount === 1, "discount usage counted");
  r = await c.post("/api/checkout/quote", { cart, addressId, discountCode: "WELCOME10" });
  check(r.json?.discount === 0, "one-per-customer code can't be reused", r.json?.discountMessage);
  r = await c.get(`/order/${orderId}?placed=1`);
  check(r.status === 200 && r.text.includes("Order placed"), "order tracking page", r.status);
  r = await c.get("/account/orders");
  check(r.status === 200 && r.text.includes(`#${order.number}`), "order in history", r.status);
  r = await c.get(`/api/orders/${orderId}/reorder`);
  check(r.status === 200 && r.json?.lines?.length === 4 && r.json?.skipped === 0, "reorder rebuilds cart", r.json);

  const stranger = new Client();
  await stranger.post("/api/auth/register", { name: "Other Person", email: `other+${Date.now()}@example.com`, phone: "07123 000111", password: "Password123", acceptTerms: true });
  r = await stranger.get(`/order/${orderId}`);
  check(r.status === 404, "other customers can't see the order", r.status);
  r = await stranger.get("/api/admin/orders");
  check(r.status === 403, "customers can't use admin API", r.status);
  r = await stranger.get("/admin");
  check(r.status === 307, "customers redirected away from admin", r.status);

  console.log("\n# Admin");
  for (const path of ["/admin", "/admin/orders", "/admin/orders?tab=history", "/admin/day", `/admin/orders/${orderId}`, `/admin/orders/${orderId}/print`, "/admin/menu", `/admin/menu/${burger.id}`, "/admin/menu/new", "/admin/options", `/admin/options/${burger.modifierGroups[0].groupId}`, "/admin/options/new", "/admin/discounts", "/admin/customers", "/admin/staff", "/admin/settings"]) {
    const res = await admin.get(path);
    check(res.status === 200, `GET ${path} -> 200`, res.status);
  }
  r = await admin.get("/api/admin/orders?scope=active");
  check(r.status === 200 && r.json?.orders?.some((o) => o.id === orderId), "order on live board", r.json?.orders?.length);
  r = await admin.get("/api/admin/orders/alerts");
  check(r.status === 200 && r.json?.newCount >= 1, "new-order alert count", r.json);
  r = await admin.patch(`/api/admin/orders/${orderId}`, { status: "DELIVERED" });
  check(r.status === 400, "invalid status jump rejected", r.status);
  for (const s of ["ACCEPTED", "PREPARING", "OUT_FOR_DELIVERY", "DELIVERED"]) {
    r = await admin.patch(`/api/admin/orders/${orderId}`, { status: s });
    check(r.status === 200 && r.json?.status === s, `status -> ${s}`, r.json?.error);
  }
  r = await admin.get(`/api/admin/orders?scope=history&q=${order.number}`);
  check(r.json?.orders?.[0]?.id === orderId, "search history by order number", r.json?.total);
  r = await admin.get("/api/admin/orders/export");
  check(r.status === 200 && r.text.includes("Test Person"), "CSV export", r.status);

  // Second order, then cancel with automatic refund
  r = await c.post("/api/checkout/create", { cart, addressId, phone: "07999 111222" });
  const order2 = r.json?.orderId;
  await c.post("/api/checkout/demo-pay", { orderId: order2 });
  r = await admin.patch(`/api/admin/orders/${order2}`, { status: "CANCELLED", cancelReason: "Test cancel" });
  order = await prisma.order.findUnique({ where: { id: order2 } });
  check(r.status === 200 && order.status === "CANCELLED" && order.paymentStatus === "REFUNDED" && order.refundedAmount === order.total, "cancel refunds in full", { s: order.status, p: order.paymentStatus });

  // Menu management
  r = await admin.patch(`/api/admin/products/${fries.id}`, { available: false });
  check(r.status === 200, "mark item sold out");
  r = await c.post("/api/checkout/quote", { cart, addressId });
  check(r.status === 409, "sold-out item blocks checkout", r.json);
  await admin.patch(`/api/admin/products/${fries.id}`, { available: true });
  const cat = await prisma.category.findFirst({ where: { slug: "sides" } });
  r = await admin.post("/api/admin/products", {
    categoryId: cat.id, name: "Test Nachos", description: "Test", image: null, basePrice: 450, badge: null, isVegetarian: true, isSpicy: false, allergens: "Milk", available: true, sortOrder: 50, variants: [], groupIds: [],
  });
  check(r.status === 201, "create product", r.json);
  const nachosId = r.json?.id;
  r = await admin.put(`/api/admin/products/${nachosId}`, {
    categoryId: cat.id, name: "Test Nachos", description: "Test", image: null, basePrice: 450, badge: "New", isVegetarian: true, isSpicy: false, allergens: "Milk", available: true, sortOrder: 50,
    variants: [{ name: "Regular", price: 450 }, { name: "Large", price: 650 }], groupIds: [burger.modifierGroups[0].groupId],
  });
  check(r.status === 200, "edit product with sizes + option group", r.json);
  check((await anon.get("/menu")).text.includes("Test Nachos"), "new product visible on menu");
  r = await admin.del(`/api/admin/products/${nachosId}`);
  check(r.status === 200 && !(await anon.get("/menu")).text.includes("Test Nachos"), "archived product hidden");
  r = await admin.post("/api/admin/groups", { name: "Choose a dip", internalName: "Test dips", minSelect: 1, maxSelect: 1, options: [{ name: "Garlic", price: 0, available: true }, { name: "BBQ", price: 50, available: true }] });
  check(r.status === 201, "create option group", r.json);
  r = await admin.del(`/api/admin/groups/${r.json?.id}`);
  check(r.status === 200, "delete unused option group", r.json);

  // Staff permissions
  const staffEmail = `staff+${Date.now()}@example.com`;
  r = await admin.post("/api/admin/staff", { name: "Kitchen", email: staffEmail, password: "Kitchen123", role: "STAFF" });
  check(r.status === 201, "create staff account", r.json);
  const staff = new Client();
  await staff.post("/api/auth/login", { email: staffEmail, password: "Kitchen123" });
  check((await staff.get("/api/admin/orders?scope=active")).status === 200, "staff can view orders");
  check((await staff.get("/admin/settings")).status === 307, "staff can't open settings");
  r = await staff.put(`/api/admin/discounts/${welcome.id}`, { code: "X" });
  check(r.status === 403, "staff can't edit discounts", r.status);

  // Settings + pause
  r = await admin.patch("/api/admin/settings", { orderingPaused: true });
  r = await c.post("/api/checkout/quote", { cart, addressId });
  check(r.json?.canPlaceOrder === false && r.json?.closedMessage, "pausing blocks orders", r.json?.closedMessage);
  r = await c.post("/api/checkout/create", { cart, addressId, phone: "07999 111222" });
  check(r.status === 409, "create blocked while paused", r.status);
  await admin.patch("/api/admin/settings", { orderingPaused: false });
  const s = (await admin.get("/api/admin/settings")).json;
  r = await admin.put("/api/admin/settings", { ...s, id: undefined, updatedAt: undefined, deliveryFee: 300 });
  check(r.status === 200 && r.json?.deliveryFee === 300, "update settings", r.json?.error);
  await admin.put("/api/admin/settings", { ...s, id: undefined, updatedAt: undefined });

  console.log("\n# Account deletion");
  r = await c.post("/api/account/delete", { password: "Reset12345" });
  check(r.status === 200, "delete account", r.json);
  check((await prisma.user.findUnique({ where: { email } })) === null, "personal email removed");

  console.log(`\n${passes} passed, ${failures} failed`);
  await prisma.$disconnect();
  process.exit(failures ? 1 : 0);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});

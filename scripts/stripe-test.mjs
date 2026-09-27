// Payment tests against Stripe's official mock server (stripe-mock), run in CI.
// Needs a server started with STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET and STRIPE_MOCK_URL set.
// Usage: BASE_URL=http://localhost:3001 STRIPE_WEBHOOK_SECRET=whsec_test node scripts/stripe-test.mjs
import Stripe from "stripe";
import { PrismaClient } from "@prisma/client";

const BASE = process.env.BASE_URL || "http://localhost:3001";
const WHSEC = process.env.STRIPE_WEBHOOK_SECRET;
const prisma = new PrismaClient();
let failures = 0;
let passes = 0;

function check(cond, label, extra) {
  if (cond) {
    passes++;
    console.log(`  PASS ${label}`);
  } else {
    failures++;
    console.log(`  FAIL ${label}${extra !== undefined ? ` -> ${JSON.stringify(extra).slice(0, 600)}` : ""}`);
  }
}

class Client {
  cookies = new Map();
  async req(method, path, body) {
    const headers = {};
    if (body !== undefined) headers["Content-Type"] = "application/json";
    if (this.cookies.size) headers.Cookie = [...this.cookies].map(([k, v]) => `${k}=${v}`).join("; ");
    const res = await fetch(BASE + path, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined, redirect: "manual" });
    for (const c of res.headers.getSetCookie?.() ?? []) {
      const [pair] = c.split(";");
      const i = pair.indexOf("=");
      this.cookies.set(pair.slice(0, i), pair.slice(i + 1));
    }
    const text = await res.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {}
    return { status: res.status, json, text };
  }
  get(p) { return this.req("GET", p); }
  post(p, b = {}) { return this.req("POST", p, b); }
  patch(p, b = {}) { return this.req("PATCH", p, b); }
}

async function webhook(event, secret = WHSEC) {
  const payload = JSON.stringify(event);
  const header = Stripe.webhooks.generateTestHeaderString({ payload, secret });
  const res = await fetch(`${BASE}/api/stripe/webhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "stripe-signature": header },
    body: payload,
  });
  return res.status;
}

const piEvent = (type, pi) => ({
  id: `evt_test_${Date.now()}_${Math.random().toString(36).slice(2)}`,
  object: "event",
  type,
  api_version: "2024-06-20",
  created: Math.floor(Date.now() / 1000),
  data: { object: pi },
});

async function main() {
  console.log(`Stripe payment tests against ${BASE}`);

  const c = new Client();
  const email = `stripe+${Date.now()}@example.com`;
  let r = await c.post("/api/auth/register", { name: "Card Customer", email, phone: "07123 456789", password: "Password123", acceptTerms: true });
  r = await c.post("/api/auth/verify-code", { challengeId: r.json?.challengeId, code: r.json?.devCode });
  check(r.status === 200, "register", r.json);
  r = await c.post("/api/account/addresses", { label: "Home", line1: "2 Test Street", city: "Worcester", postcode: "WR1 1SB" });
  const addressId = r.json?.id;
  check(r.status === 201, "add address", r.json);

  const pizza = await prisma.product.findFirst({
    where: { name: "FGC Special King" },
    include: { variants: true },
  });
  const large = pizza.variants.find((v) => v.name === "L");
  const cart = [{ productId: pizza.id, variantId: large.id, optionIds: [], quantity: 1 }];

  console.log("\n# Checkout creates a Stripe PaymentIntent");
  r = await c.post("/api/checkout/create", { cart, addressId, phone: "07123 456789", notes: "Knock twice" });
  check(r.status === 200 && r.json?.demo === false && typeof r.json?.clientSecret === "string" && r.json.clientSecret.length > 0, "order created with client secret (not demo mode)", r.json);
  const orderId = r.json?.orderId;
  let order = await prisma.order.findUnique({ where: { id: orderId } });
  check(order?.status === "PENDING_PAYMENT" && order?.paymentMethod === "card" && !!order?.stripePaymentIntentId, "order waits for payment with a PaymentIntent id", order);
  check(order?.total === 1299 + 149 + 110, "amount = £12.99 + £1.49 delivery + £1.10 service", order?.total);

  r = await c.post("/api/checkout/demo-pay", { orderId });
  check(r.status === 404, "demo payment disabled when Stripe is configured", r.status);

  r = await c.get(`/order/${orderId}`);
  check(r.status === 200, "order page loads while payment pending", r.status);

  console.log("\n# Webhook security");
  const pi = { id: order.stripePaymentIntentId, object: "payment_intent", amount: order.total, amount_received: order.total, currency: "gbp", status: "succeeded", metadata: { orderId } };
  check((await webhook(piEvent("payment_intent.succeeded", pi), "whsec_wrong")) === 400, "webhook with wrong signature rejected");
  const noSig = await fetch(`${BASE}/api/stripe/webhook`, { method: "POST", body: "{}" });
  check(noSig.status === 400, "webhook without signature rejected", noSig.status);
  order = await prisma.order.findUnique({ where: { id: orderId } });
  check(order.status === "PENDING_PAYMENT", "order still unpaid after forged webhooks");

  const wrongAmount = { ...pi, amount_received: 1 };
  check((await webhook(piEvent("payment_intent.succeeded", wrongAmount))) === 200, "signed webhook accepted");
  order = await prisma.order.findUnique({ where: { id: orderId } });
  check(order.status === "PENDING_PAYMENT", "payment for the wrong amount does not mark the order paid", order.status);

  console.log("\n# Successful payment");
  check((await webhook(piEvent("payment_intent.succeeded", pi))) === 200, "payment_intent.succeeded accepted");
  order = await prisma.order.findUnique({ where: { id: orderId } });
  check(order.status === "PLACED" && order.paymentStatus === "PAID" && !!order.placedAt, "order marked PAID and PLACED", { s: order.status, p: order.paymentStatus });
  check((await webhook(piEvent("payment_intent.succeeded", pi))) === 200, "duplicate webhook is harmless");
  r = await c.get(`/order/${orderId}?placed=1`);
  check(r.status === 200 && r.text.includes("Order placed"), "customer sees order placed", r.status);

  console.log("\n# Refunds through Stripe");
  const admin = new Client();
  r = await admin.post("/api/admin/auth/login", { email: process.env.SEED_ADMIN_EMAIL || "admin@flamegrillandchill.co.uk", password: process.env.SEED_ADMIN_PASSWORD || "ChangeMe123!" });
  check(r.status === 200, "admin login", r.json);
  r = await admin.post(`/api/admin/orders/${orderId}/refund`, { amount: 200 });
  check(r.status === 200 && r.json?.paymentStatus === "PARTIALLY_REFUNDED" && r.json?.refundedAmount === 200, "partial refund via Stripe", r.json);
  r = await admin.patch(`/api/admin/orders/${orderId}`, { status: "CANCELLED", cancelReason: "Test" });
  check(r.status === 200 && r.json?.paymentStatus === "REFUNDED" && r.json?.refundedAmount === order.total, "cancelling refunds the rest via Stripe", r.json);

  console.log("\n# Failed payment");
  // stripe-mock returns the same fixture PaymentIntent id every time; real Stripe ids are unique.
  await prisma.order.update({ where: { id: orderId }, data: { stripePaymentIntentId: null } });
  r = await c.post("/api/checkout/create", { cart, addressId, phone: "07123 456789" });
  const failedId = r.json?.orderId;
  const failedOrder = await prisma.order.findUnique({ where: { id: failedId } });
  await webhook(piEvent("payment_intent.payment_failed", { ...pi, id: failedOrder.stripePaymentIntentId, status: "requires_payment_method", amount_received: 0, metadata: { orderId: failedId } }));
  const afterFail = await prisma.order.findUnique({ where: { id: failedId } });
  check(afterFail.status === "PENDING_PAYMENT" && afterFail.paymentStatus === "FAILED", "failed payment recorded, order not placed", afterFail);
  r = await c.get(`/order/${failedId}?redirect_status=failed`);
  check(r.status === 200 && r.text.includes("go through"), "customer told the payment didn't go through", r.status);

  console.log(`\n${passes} passed, ${failures} failed`);
  await prisma.$disconnect();
  process.exit(failures ? 1 : 0);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});

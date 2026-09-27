import "server-only";
import nodemailer from "nodemailer";
import type { Order, OrderItem } from "@prisma/client";
import { formatGBP } from "./money";

let transporter: nodemailer.Transporter | null = null;

function getTransport(): nodemailer.Transporter | null {
  if (!process.env.SMTP_HOST) return null;
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT || 587);
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    });
  }
  return transporter;
}

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function layout(title: string, body: string) {
  return `<!doctype html><html><body style="margin:0;background:#0b0806;font-family:Arial,sans-serif;color:#f5ede6">
  <div style="max-width:560px;margin:0 auto;padding:24px">
    <h1 style="font-size:22px;color:#ff8a1f;margin:0 0 4px">Flame Grill &amp; Chill</h1>
    <p style="margin:0 0 20px;color:#a8998c;font-size:12px">67 Barbourne Rd, Worcester WR1 1SB · 01905 330095</p>
    <div style="background:#18110c;border:1px solid #3a2a1e;border-radius:12px;padding:20px">
      <h2 style="margin:0 0 12px;font-size:18px;color:#fff">${esc(title)}</h2>
      ${body}
    </div>
  </div></body></html>`;
}

export const emailConfigured = () => !!process.env.SMTP_HOST;

/** Returns true if the email was handed to the SMTP server. */
export async function sendEmail(to: string, subject: string, html: string, text: string): Promise<boolean> {
  const t = getTransport();
  if (!t) {
    console.log(`\n[email] (SMTP not configured, printing instead)\nTo: ${to}\nSubject: ${subject}\n${text}\n`);
    return false;
  }
  try {
    await t.sendMail({ from: process.env.EMAIL_FROM || "no-reply@example.com", to, subject, html, text });
    return true;
  } catch (e) {
    console.error("[email] failed to send", e);
    return false;
  }
}

export async function sendLoginCodeEmail(to: string, name: string, code: string) {
  const html = layout(
    "Your verification code",
    `<p>Hi ${esc(name)},</p><p>Use this code to finish signing in. It expires in 10 minutes.</p>
     <p style="font-size:32px;letter-spacing:8px;font-weight:bold;color:#ff8a1f;margin:16px 0">${code}</p>
     <p style="color:#a8998c;font-size:12px">If you didn't try to sign in, you can ignore this email.</p>`,
  );
  return sendEmail(to, `${code} is your Flame Grill & Chill code`, html, `Your Flame Grill & Chill code is ${code}. It expires in 10 minutes.`);
}

export async function sendPasswordResetEmail(to: string, name: string, link: string) {
  const html = layout(
    "Reset your password",
    `<p>Hi ${esc(name)},</p><p>Click the button below to choose a new password. This link expires in 1 hour.</p>
     <p><a href="${link}" style="display:inline-block;background:#ff6a13;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold">Reset password</a></p>
     <p style="color:#a8998c;font-size:12px">If you didn't ask for this, you can ignore this email.</p>`,
  );
  await sendEmail(to, "Reset your Flame Grill & Chill password", html, `Reset your password: ${link}`);
}

function itemsTable(items: OrderItem[]) {
  return items
    .map((i) => {
      const opts = Array.isArray(i.options) ? (i.options as Array<{ name: string }>).map((o) => o.name) : [];
      const detail = [i.variantName, ...opts].filter(Boolean).join(", ");
      return `<tr><td style="padding:6px 0;vertical-align:top">${i.quantity} × ${esc(i.name)}${
        detail ? `<br><span style="color:#a8998c;font-size:12px">${esc(detail)}</span>` : ""
      }</td><td style="padding:6px 0;text-align:right;vertical-align:top">${formatGBP(i.lineTotal)}</td></tr>`;
    })
    .join("");
}

export async function sendOrderConfirmation(order: Order & { items: OrderItem[] }) {
  const appUrl = process.env.APP_URL || "http://localhost:3000";
  const rows = (label: string, v: number, neg = false) =>
    `<tr><td style="padding:3px 0;color:#a8998c">${label}</td><td style="text-align:right">${neg ? "-" : ""}${formatGBP(v)}</td></tr>`;
  const html = layout(
    `Order #${order.number} confirmed`,
    `<p>Thanks ${esc(order.customerName)}! We've received your order and will start preparing it shortly.</p>
     <table style="width:100%;border-collapse:collapse;font-size:14px;color:#f5ede6">${itemsTable(order.items)}</table>
     <hr style="border:none;border-top:1px solid #3a2a1e;margin:12px 0">
     <table style="width:100%;font-size:14px;color:#f5ede6">
       ${rows("Subtotal", order.subtotal)}
       ${order.discount ? rows(`Discount (${esc(order.discountCode || "")})`, order.discount, true) : ""}
       ${rows("Delivery", order.deliveryFee)}
       ${order.serviceFee ? rows("Service fee", order.serviceFee) : ""}
       <tr><td style="padding-top:6px;font-weight:bold">Total paid</td><td style="text-align:right;font-weight:bold">${formatGBP(order.total)}</td></tr>
     </table>
     <p style="margin-top:16px"><strong>Delivering to:</strong><br>${esc(order.addressLine1)}${
       order.addressLine2 ? `, ${esc(order.addressLine2)}` : ""
     }<br>${esc(order.city)} ${esc(order.postcode)}</p>
     <p><a href="${appUrl}/order/${order.id}" style="color:#ff8a1f">Track your order</a></p>`,
  );
  await sendEmail(order.customerEmail, `Order #${order.number} confirmed – Flame Grill & Chill`, html, `Order #${order.number} confirmed. Total ${formatGBP(order.total)}. Track: ${appUrl}/order/${order.id}`);

  if (process.env.SHOP_NOTIFY_EMAIL) {
    await sendEmail(
      process.env.SHOP_NOTIFY_EMAIL,
      `NEW ORDER #${order.number} – ${formatGBP(order.total)}`,
      layout(`New order #${order.number}`, `<p>${esc(order.customerName)} · ${esc(order.customerPhone)}</p><table style="width:100%;color:#f5ede6">${itemsTable(order.items)}</table><p><a href="${appUrl}/admin/orders/${order.id}" style="color:#ff8a1f">Open in admin</a></p>`),
      `New order #${order.number}: ${appUrl}/admin/orders/${order.id}`,
    );
  }
}

const STATUS_COPY: Record<string, string> = {
  ACCEPTED: "Your order has been accepted and will be prepared shortly.",
  PREPARING: "Your food is being prepared.",
  OUT_FOR_DELIVERY: "Your order is on its way!",
  DELIVERED: "Your order has been delivered. Enjoy your meal!",
  CANCELLED: "Your order has been cancelled. If you paid by card, a refund has been issued to your card.",
};

export async function sendStatusEmail(order: Order) {
  const copy = STATUS_COPY[order.status];
  if (!copy) return;
  const appUrl = process.env.APP_URL || "http://localhost:3000";
  await sendEmail(
    order.customerEmail,
    `Order #${order.number} update – Flame Grill & Chill`,
    layout(`Order #${order.number}`, `<p>${copy}</p><p><a href="${appUrl}/order/${order.id}" style="color:#ff8a1f">View your order</a></p>`),
    `${copy} ${appUrl}/order/${order.id}`,
  );
}

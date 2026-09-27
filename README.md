# Flame Grill & Chill – Online Ordering

Ordering website and admin panel for **Flame Grill & Chill**, 67 Barbourne Rd, Worcester WR1 1SB.

Customers browse the menu, customise items (sizes, flavours, extras, meal upgrades), pay by card / Apple Pay / Google Pay and track their delivery. Staff run everything from `/admin`: a live order board with sound alerts, order details and printing, refunds, the menu editor, discount codes, customers, staff and shop settings.

## Features

**Customer site**
- Home, Menu, About, Contact, and legal pages (terms, privacy, allergens, cookies)
- Menu with category tabs, search and a vegetarian filter. Every item and price comes from the printed menu.
- Item customiser for sizes (S/M/L/XL pizzas, 5/8/12 wings), required choices (wing flavour, milkshake/smoothie flavour, lamb/chicken doner), optional extras (pizza extras) and "Make it a meal +£2.99", plus special requests
- Basket drawer and basket page (saved in the browser)
- Accounts: register, sign in, sign out, forgot/reset password by email, profile, change password, delete account (UK GDPR)
- Saved delivery addresses with UK postcode validation
- Checkout shows a live itemised bill: subtotal, discount code, delivery fee, optional service fee and total
- Delivery-zone check (postcode areas plus max distance via postcodes.io), minimum order, and opening-hours / pause checks
- Stripe Payment Element (cards, Apple Pay, Google Pay), with a webhook to confirm payments
- Order confirmation and tracking page that refreshes automatically, order history, and one-click reorder
- Emails for order confirmations, status updates and password resets

**Admin panel (`/admin`)**
- Dashboard: today's orders and sales, a 7-day chart, top items and recent orders
- Live order board (New → Accepted → Preparing → On the way), refreshing every 10 seconds with a sound and desktop alert for new orders
- Order detail: customer, phone, address with a Google Maps link, items with all choices, notes, timeline, status changes, delivery estimate, cancel with automatic refund, and partial refunds
- Printable kitchen/delivery ticket sized for 80mm thermal printers
- Order history with search, filters and CSV export
- Menu editor: categories, items, prices, sizes, images, badges, allergens, and a sold-out switch
- Option groups (flavours, extras, meal upgrade), including "only show when…" rules
- Discount codes: percentage or fixed amount, minimum spend, dates, usage limits and once-per-customer
- Customers list with order count and total spend
- Staff accounts. **Staff** can handle orders and mark items sold out. **Admins** can do everything.
- Settings: opening hours, pause ordering, delivery fee, free-delivery threshold, minimum order, service fee, delivery area and shop details

## Tech stack

| Layer | Choice |
|---|---|
| App | Next.js 15 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS 4 |
| Database | PostgreSQL + Prisma ORM |
| Auth | Email/password with bcrypt and signed httpOnly session cookies (jose) |
| Payments | Stripe PaymentIntents + Payment Element + webhooks |
| Email | Any SMTP provider via Nodemailer |
| Basket state | Zustand (persisted in localStorage) |
| Postcodes | postcodes.io (free, no key) |

All prices are stored as whole pence. Prices are always recalculated on the server; the browser's prices are only for display.

## Run it locally

Requirements: Node.js 20+ and Docker (for Postgres). You can also use any Postgres database.

```bash
cp .env.example .env          # then edit AUTH_SECRET at least
docker compose up -d          # starts Postgres on localhost:5432
npm install
npx prisma db push            # creates the tables
npm run db:seed               # loads the full menu + admin user
npm run dev                   # http://localhost:3000
```

Sign in to the admin at `/login` with `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` from `.env` (default `admin@flamegrillandchill.co.uk` / `ChangeMe123!`). **Change this password straight away** from the account page.

Without Stripe keys, checkout runs in **demo mode**: the "Place order (demo)" button marks orders as paid without charging. Demo mode is automatically off in production unless `ALLOW_DEMO_PAYMENTS=true`.

### Testing Stripe locally

1. Put your **test** keys in `.env` (`STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`).
2. Install the Stripe CLI and run `stripe listen --forward-to localhost:3000/api/stripe/webhook`. Copy the `whsec_…` value into `STRIPE_WEBHOOK_SECRET`.
3. Pay with card `4242 4242 4242 4242`, any future date and any CVC.

## Going live checklist

1. **Database**: create a managed Postgres (Neon, Supabase, Railway, AWS RDS, etc.) and set `DATABASE_URL`.
2. **Hosting**: deploy to Vercel (import the GitHub repo) or any Node host (`npm run build && npm start`). Set every variable from `.env.example`.
3. `APP_URL` = the real domain, e.g. `https://flamegrillandchill.co.uk`. `AUTH_SECRET` = a long random string.
4. Run `npx prisma db push` and `npm run db:seed` once against the live database.
5. **Stripe**: activate the account in the shop's business name and use **live** keys. Add a webhook endpoint `https://<domain>/api/stripe/webhook` for `payment_intent.succeeded`, `payment_intent.payment_failed` and `charge.refunded`, then copy its signing secret. For Apple Pay, verify the domain in Stripe → Settings → Payment methods.
6. **Email**: set SMTP details (Resend, Postmark, Mailgun or similar) and a sending address on the shop's domain. Set `SHOP_NOTIFY_EMAIL` to get new-order emails.
7. In **Admin → Settings**, confirm delivery fee, minimum order, delivery postcodes/radius, opening hours and shop coordinates.
8. In **Admin → Menu**, add allergen information for each item. This is a legal requirement for UK food businesses selling online.
9. Review the legal pages (`src/app/(site)/legal/[page]/page.tsx`) and the About page copy.

### Things the printed menu doesn't specify

These are left for the shop to decide. Customers can use the "special requests" box until they're set up, and each can be added in **Admin → Option groups** without code changes:
- Which drinks come with meals and deals (cans/bottles available)
- Meat options for Loaded Fries
- Wing flavour choice inside the boxes and deals
- Delivery fee (placeholder £2.50) and minimum order (placeholder £10)

## Project structure

```
prisma/schema.prisma        database models
prisma/seed.ts              full menu from the printed menu + first admin
src/app/(site)/             customer pages (home, menu, checkout, account, order tracking…)
src/app/admin/              admin panel pages
src/app/api/                JSON API (auth, account, checkout, stripe webhook, admin)
src/lib/                    pricing, checkout, delivery, auth, email, stripe helpers
src/components/             shared UI (header, basket, item customiser, address book…)
scripts/smoke-test.mjs      end-to-end API test (run by CI)
scripts/screenshots.mjs     page screenshots (run by CI)
```

## Tests

GitHub Actions (`.github/workflows/ci.yml`) installs, type-checks, builds, starts the app against Postgres, and runs `scripts/smoke-test.mjs`. That script covers registration, login, password reset, addresses, pricing rules, discount codes, ordering, payment, the admin workflow, refunds, permissions and settings.

To run it yourself against a running production build:

```bash
npm run build && ALLOW_DEMO_PAYMENTS=true npm start &
node scripts/smoke-test.mjs
```

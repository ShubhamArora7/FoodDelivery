# Flame Grill & Chill – online ordering

Customer website and admin panel for **Flame Grill & Chill**, 67 Barbourne Rd, Worcester WR1 1SB. Orders are delivery only.

## What's included

**Customer website**

- Home, About, Contact (with map and contact form), Menu, Basket, Checkout, Order tracking
- Sign up, sign in, sign out, forgot/reset password by email
- Account: edit profile, change password, saved delivery addresses, order history with one-click reorder, delete account (UK GDPR)
- Menu matches the printed menu: pizza sizes (S/M/L/XL), wing pieces (5/8/12), wing flavours, milkshake and smoothie flavours, pizza extras, and the +£2.99 meal upgrade on burgers and wraps. Items with required choices can't be added until the customer picks
- Basket saved on the device, with a slide-out drawer and full basket page
- Checkout: choose or add an address, delivery zone check (postcode areas + distance), minimum order, delivery fee, optional service fee, discount codes, and an itemised bill that is always recalculated on the server
- Payments by card, Apple Pay and Google Pay through **Stripe**. Card details never touch this server
- Live order tracking page and email confirmations
- Opening hours (UK time, BST aware) and a pause switch. Outside hours customers can browse but not pay
- Allergen, terms, privacy and cookie pages (templates)

**Admin panel** (`/admin`)

- Live order board (New → Accepted → Preparing → On the way → Delivered) with a sound alert and desktop notifications for new orders
- Daily orders page: every order for today (or any past day) with the customer's name, phone (tap to call or text), email, full address, delivery note, every item with its choices, item notes, the customer's order note, totals and timings. It updates automatically, prints as a day sheet and exports to CSV
- Order detail: customer, phone, delivery address with a Google Maps link, items with every choice, notes, payment status, and a timeline
- Accept, update and cancel orders. Cancelling a paid order refunds it automatically. Admins can also do partial refunds
- Printable kitchen/delivery ticket sized for 80mm thermal printers
- Order history search (number, name, phone, email, postcode), date and status filters, CSV export
- Dashboard: today's orders and sales, last 7 days chart, top items, recent orders
- Menu editor: categories, items, prices, sizes, images, badges, allergens, veg/spicy flags, sold-out switch
- Option groups editor (flavours, extras, meal upgrade), including "only show when…" rules
- Discount codes: percent or fixed, minimum spend, start/end dates, usage limits, once per customer
- Customers list with order count and total spend
- Staff accounts. **Staff** can handle orders and mark items sold out. **Admins** can do everything
- Settings: opening hours, delivery postcodes and radius, fees, minimum order, delivery estimate, shop details

## Payments

Checkout uses Stripe's Payment Element, which shows every payment method switched on in the Stripe dashboard (Settings → Payment methods). No code change is needed to add or remove one. For a UK shop charging in pounds, this can include cards, Apple Pay, Google Pay, Link, PayPal, Revolut Pay, Pay by Bank, Klarna and Clearpay. UPI is not available because Stripe only supports it for customers in India paying in rupees.

Payments are confirmed by Stripe's webhook, and again when the customer returns to the order page. An order is only marked paid when Stripe reports that the exact amount was received.

## Tech stack

| Part | Choice |
|---|---|
| Framework | Next.js 15 (App Router) + React 19 + TypeScript |
| Styling | Tailwind CSS 4 |
| Database | PostgreSQL + Prisma ORM |
| Auth | Email/password with bcrypt, signed JWT session cookie (httpOnly) |
| Payments | Stripe Payment Element + webhooks |
| Email | Any SMTP provider via Nodemailer (Resend, Postmark, Mailgun, Gmail…) |
| Postcode lookup | postcodes.io (free, no key) |

All prices are stored in pence, so there are no rounding errors.

## Running it locally

You need **Node.js 20 or newer** and a **PostgreSQL** database. For the database, pick one of these:

- **Docker:** run `docker compose up -d` in this folder.
- **Free cloud database:** create a project at [neon.tech](https://neon.tech) and copy its connection string.
- **Installed locally:** install PostgreSQL and create a database called `flame`.

```bash
npm install
cp .env.example .env          # Windows: copy .env.example .env
# edit .env: set DATABASE_URL and AUTH_SECRET
npm run setup                 # creates the tables and loads the menu + first admin account
npm run dev
```

Open http://localhost:3000. The admin panel is at http://localhost:3000/admin. Sign in with `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` from `.env` (defaults: `admin@flamegrillandchill.co.uk` / `ChangeMe123!`) and **change the password straight away**.

### Payments while testing

- **No Stripe keys:** checkout runs in **demo mode**. The order is placed and marked paid without charging anything, so you can test the whole flow and the admin board.
- **Stripe test keys:** add them from https://dashboard.stripe.com/test/apikeys to `.env`, then run the webhook forwarder:

  ```bash
  stripe listen --forward-to localhost:3000/api/stripe/webhook
  ```

  Copy the `whsec_...` secret it prints into `STRIPE_WEBHOOK_SECRET`. Pay with test card `4242 4242 4242 4242`, any future date, any CVC.

### Emails while testing

If `SMTP_HOST` is empty, emails (order confirmations, password reset links) are printed in the terminal instead of being sent.

## Going live

1. **Hosting:** Vercel (easiest), Railway, Render or any Node server. Set every variable from `.env.example` in the host's environment settings.
2. **Database:** use a managed Postgres (Neon, Supabase, Railway). Run `npm run setup` once against it.
3. **Stripe:** switch to live keys and add a webhook endpoint at `https://YOURDOMAIN/api/stripe/webhook` for the events `payment_intent.succeeded`, `payment_intent.payment_failed` and `charge.refunded`. Enable Apple Pay / Google Pay in the Stripe dashboard (Apple Pay needs the domain verified in Stripe).
4. **Email:** add SMTP details from your provider and verify the sending domain.
5. Set `APP_URL` to the real domain and a long random `AUTH_SECRET`.
6. In **Admin → Settings**, check the delivery postcodes, radius, delivery fee, minimum order and opening hours. Tick "Stripe payments: connected".

## Shop details confirmed by the client

- Delivery area: 7-mile radius from the shop (checked with the free postcodes.io lookup)
- Delivery fee: £1.49 launch offer for the first 2 months. At launch, open **Admin → Settings** and set "Delivery fee changes to" and "…from this date" (2 months after go-live) so the fee switches automatically. The banner text can be edited or cleared there too.
- Service fee: £1.10
- Allergy wording: "Please inform the restaurant of any allergies or dietary requirements before ordering." It's shown on the menu, in every item pop-up, at checkout and on the allergen page
- Drinks: 20 canned soft drinks. Customers choose one with any meal upgrade, meal, box or deal (two for the 2-drink deals), pick which can when ordering Cans, and can optionally add a can (£1.30) to any other food item

## Still to confirm with the shop

- **Minimum order.** Currently a £10.00 placeholder, editable in Admin → Settings.
- **The standard delivery fee after the launch offer ends.**
- **Bottled drinks.** Which ones are stocked, if any. "Bottled Drinks" has no choice yet.
- **Meat options for Loaded Fries.** The menu says "choice of meat".
- **Legal pages.** The terms and privacy templates need checking, with the registered business details added.
- **Photos.** Item photos are cropped from the printed menu artwork. Replace them with real photos when available.

## Project structure

```
prisma/schema.prisma      database tables
prisma/seed.ts            menu, settings and first admin account
src/app/(site)/           customer website pages
src/app/admin/            admin panel pages
src/app/api/              API routes (auth, account, checkout, stripe webhook, admin)
src/lib/                  pricing, delivery, opening hours, auth, email, stripe helpers
src/components/           shared UI (header, basket, item customiser, address book…)
src/store/cart.ts         basket state
```

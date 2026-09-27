/* eslint-disable no-console */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Bump this whenever the built-in menu below changes (see main()).
const MENU_VERSION = 2;

// £ to pence
const p = (pounds: number) => Math.round(pounds * 100);

async function group(
  name: string,
  internalName: string,
  minSelect: number,
  maxSelect: number,
  options: Array<string | [string, number] | { name: string; price?: number; description?: string; image?: string }>,
  showWhenOptionId?: string,
) {
  return prisma.modifierGroup.create({
    data: {
      name,
      internalName,
      minSelect,
      maxSelect,
      showWhenOptionId,
      options: {
        create: options.map((o, i) =>
          typeof o === "string"
            ? { name: o, price: 0, sortOrder: i }
            : Array.isArray(o)
              ? { name: o[0], price: o[1], sortOrder: i }
              : { name: o.name, price: o.price ?? 0, description: o.description, image: o.image, sortOrder: i },
        ),
      },
    },
    include: { options: true },
  });
}

type ProductSeed = {
  name: string;
  description?: string;
  price?: number;
  variants?: Array<[string, number]>;
  groups?: string[];
  image?: string;
  badge?: string;
  veg?: boolean;
  spicy?: boolean;
};

// Photos for each item (Unsplash, free licence; Water is from the shop's own menu artwork)
const ITEM_IMAGES: Record<string, string> = {
  "Classic Smash Burger": "/images/menu/classic-smash-burger.jpg",
  "Cheese Burger": "/images/menu/cheese-burger.jpg",
  "Double Flame Burger": "/images/menu/double-flame-burger.jpg",
  "BBQ Burger": "/images/menu/bbq-burger.jpg",
  "Spicy Jalapeño Burger": "/images/menu/spicy-jalape-o-burger.jpg",
  "Chicken Fillet Burger": "/images/menu/chicken-fillet-burger.jpg",
  "Spicy Chicken Burger": "/images/menu/spicy-chicken-burger.jpg",
  "Zinger Tower Burger": "/images/menu/zinger-tower-burger.jpg",
  "1/2 Grilled Chicken Meal": "/images/menu/1-2-grilled-chicken-meal.jpg",
  "Chicken Wings": "/images/menu/chicken-wings.jpg",
  "Chicken Tenders": "/images/menu/chicken-tenders.jpg",
  "Fries": "/images/menu/fries.jpg",
  "Cheese Fries": "/images/menu/cheese-fries.jpg",
  "Loaded Fries": "/images/menu/loaded-fries.jpg",
  "Onion Rings": "/images/menu/onion-rings.jpg",
  "Mozzarella Sticks (6 pcs)": "/images/menu/mozzarella-sticks-6-pcs.jpg",
  "Grilled Chicken Wrap": "/images/menu/grilled-chicken-wrap.jpg",
  "Chicken Strip Wrap": "/images/menu/chicken-strip-wrap.jpg",
  "Spicy Wrap": "/images/menu/spicy-wrap.jpg",
  "Cheese & Tomato": "/images/menu/cheese-and-tomato.jpg",
  "Garlic Pizza": "/images/menu/garlic-pizza.jpg",
  "Hawaiian Pizza": "/images/menu/hawaiian-pizza.jpg",
  "Farm House": "/images/menu/farm-house.jpg",
  "Veggie Hot": "/images/menu/veggie-hot.jpg",
  "Pepperoni Feast": "/images/menu/pepperoni-feast.jpg",
  "Paneer King": "/images/menu/paneer-king.jpg",
  "Veggie Supreme": "/images/menu/veggie-supreme.jpg",
  "BBQ Chicken": "/images/menu/bbq-chicken.jpg",
  "Paneer Power Blast": "/images/menu/paneer-power-blast.jpg",
  "Chicken Supreme": "/images/menu/chicken-supreme.jpg",
  "Doner Delight": "/images/menu/doner-delight.jpg",
  "Tandoori Hot King": "/images/menu/tandoori-hot-king.jpg",
  "Peri Peri Blast": "/images/menu/peri-peri-blast.jpg",
  "Meat Feast": "/images/menu/meat-feast.jpg",
  "Burger Pizza": "/images/menu/burger-pizza.jpg",
  "Beef Blast": "/images/menu/beef-blast.jpg",
  "Desi Style Pizza": "/images/menu/desi-style-pizza.jpg",
  "FGC Special King": "/images/menu/fgc-special-king.jpg",
  "Indian Style Pizza": "/images/menu/indian-style-pizza.jpg",
  "Doner Kebab": "/images/menu/doner-kebab.jpg",
  "Mixed Meat Box": "/images/menu/mixed-meat-box.jpg",
  "Chicken Doner Wrap": "/images/menu/chicken-doner-wrap.jpg",
  "Flame Box": "/images/menu/flame-box.jpg",
  "Peri Peri Box": "/images/menu/peri-peri-box.jpg",
  "Bigger Box": "/images/menu/bigger-box.jpg",
  "Wings Deal": "/images/menu/wings-deal.jpg",
  "Tender Deal": "/images/menu/tender-deal.jpg",
  "Family Deal": "/images/menu/family-deal.jpg",
  "Cans": "/images/menu/cans.jpg",
  "Bottled Drinks": "/images/menu/bottled-drinks.jpg",
  "Milkshakes": "/images/menu/milkshakes.jpg",
  "Smoothies": "/images/menu/smoothies.jpg",
  "Water": "/images/menu/water.jpg"
};

const CATEGORY_IMAGES: Record<string, string> = {
  "burgers": "/images/menu/category-burgers.jpg",
  "chicken": "/images/menu/category-chicken.jpg",
  "sides": "/images/menu/category-sides.jpg",
  "wraps": "/images/menu/category-wraps.jpg",
  "pizza": "/images/menu/category-pizza.jpg",
  "drinks": "/images/menu/category-drinks.jpg",
  "late-night": "/images/menu/category-late-night.jpg",
  "boxes": "/images/menu/category-boxes.jpg",
  "meal-deals": "/images/menu/category-meal-deals.jpg"
};

// Canned soft drinks confirmed by the shop
const DRINKS = [
  "Coca-Cola",
  "Diet Coke",
  "Coke Zero",
  "Fanta Orange",
  "Fanta Lemon",
  "Fanta Fruit Twist",
  "Tango Orange",
  "Tango Apple",
  "Tango Cherry",
  "Sprite",
  "Pepsi",
  "Pepsi Max",
  "7UP",
  "Dr Pepper",
  "Rio",
  "Irn-Bru",
  "Rubicon Mango",
  "Rubicon Guava",
  "Rubicon Passion",
  "Vimto",
];

// Names, prices, descriptions and sizes are taken word-for-word from the printed
// menu. Drink choices come from the shop's confirmed list above.
async function seedMenu() {
  // ---------- Option groups (only choices printed on the menu) ----------
  const meal = await group("Make it a meal", "Meal upgrade (fries & drink +£2.99)", 0, 1, [
    { name: "Make it a meal - fries & drink", price: p(2.99), description: "Adds regular fries and a canned soft drink of your choice", image: "/images/menu/fries.jpg" },
  ]);
  const mealDrink = await group("Choose your drink", "Meal drink (shown when meal upgrade ticked)", 1, 1, DRINKS, meal.options[0].id);
  const drink = await group("Choose your drink", "Included drink", 1, 1, DRINKS);
  const drink1 = await group("Choose your 1st drink", "Included drink 1 (2-drink deals)", 1, 1, DRINKS);
  const drink2 = await group("Choose your 2nd drink", "Included drink 2 (2-drink deals)", 1, 1, DRINKS);
  const can = await group("Choose your can", "Can choice", 1, 1, DRINKS);
  // Sides at their menu prices, offered as add-ons on main dishes
  const addSide = await group("Add a side", "Side add-ons (menu prices)", 0, 4, [
    { name: "Fries", price: p(2.49), image: "/images/menu/fries.jpg" },
    { name: "Cheese Fries", price: p(3.49), image: "/images/menu/cheese-fries.jpg" },
    { name: "Onion Rings", price: p(3.49), image: "/images/menu/onion-rings.jpg" },
    { name: "Mozzarella Sticks (6 pcs)", price: p(4.49), image: "/images/menu/mozzarella-sticks-6-pcs.jpg" },
  ]);
  const addDrink = await group(
    "Add a drink",
    "Optional can add-on (£1.30)",
    0,
    1,
    DRINKS.map((d): [string, number] => [d, p(1.3)]),
  );
  const wingFlavour = await group("Choose your flavour", "Wing flavours", 1, 1, ["BBQ", "Spicy", "Peri Peri"]);
  const pizzaExtras = await group("Pizza extras", "Pizza extras", 0, 4, [
    ["Extra Cheese", p(0.7)],
    ["Jalapeños", p(0.6)],
    ["Hash Brown", p(0.8)],
    ["Extra Sauce", p(0.5)],
  ]);
  const donerMeat = await group("Lamb or chicken doner", "Doner Delight meat", 1, 1, ["Lamb Doner", "Chicken Doner"]);
  const shake = await group("Choose your flavour", "Milkshake flavours", 1, 1, ["Chocolate", "Strawberry", "Vanilla"]);
  const smoothie = await group("Choose your smoothie", "Smoothie flavours", 1, 1, [
    "Mango",
    "Tropical",
    "Caribbean",
    "Pina Colada",
    "Pineapple Banana",
    "Berry Mango",
    "Orange Creamsicle",
    "Kiwi",
    "Banana Coconut",
  ]);

  const G: Record<string, string> = {
    meal: meal.id,
    mealDrink: mealDrink.id,
    drink: drink.id,
    drink1: drink1.id,
    drink2: drink2.id,
    can: can.id,
    addDrink: addDrink.id,
    addSide: addSide.id,
    wingFlavour: wingFlavour.id,
    pizzaExtras: pizzaExtras.id,
    donerMeat: donerMeat.id,
    shake: shake.id,
    smoothie: smoothie.id,
  };

  const size = (s: number, m: number, l: number, xl: number): Array<[string, number]> => [
    ["S", p(s)],
    ["M", p(m)],
    ["L", p(l)],
    ["XL", p(xl)],
  ];
  const tier1 = size(5.49, 7.49, 10.49, 13.49);
  const tier2 = size(6.49, 8.49, 11.49, 14.49);
  const tier3 = size(6.99, 8.99, 11.99, 15.49);
  const tier4 = size(7.49, 9.49, 12.49, 15.99);
  const tier5 = size(7.99, 9.99, 12.99, 16.49);

  const burger = (name: string, description: string, extra: Partial<ProductSeed> = {}): ProductSeed => ({
    name,
    description,
    price: p(3.99),
    groups: ["meal", "mealDrink", "addSide"],
    image: "/images/burger-small.jpg",
    ...extra,
  });
  const pizza = (name: string, description: string, variants: Array<[string, number]>, extra: Partial<ProductSeed> = {}): ProductSeed => ({
    name,
    description,
    variants,
    groups: ["pizzaExtras", "addSide", "addDrink"],
    ...extra,
  });

  // Category order follows the printed menu
  const categories: Array<{ name: string; slug: string; description?: string; image?: string; products: ProductSeed[] }> = [
    {
      name: "Burgers",
      slug: "burgers",
      description: "Choose any burger for £3.99. Make it a meal - fries & drink +£2.99.",
      image: "/images/burger-hero.jpg",
      products: [
        burger("Classic Smash Burger", "Smashed beef patty, cheese, pickles, onions, lettuce & signature sauce."),
        burger("Cheese Burger", "Smashed beef patty, double cheese, ketchup, mustard, pickles & onion."),
        burger("Double Flame Burger", "Double smashed beef patties, double cheese, pickles, onions, lettuce & flame sauce.", { badge: "Best seller", image: "/images/burger-hero.jpg" }),
        burger("BBQ Burger", "Beef patty, BBQ sauce, crispy onions, cheese, lettuce & mayo."),
        burger("Spicy Jalapeño Burger", "Beef patty, jalapeños, pepper jack cheese, lettuce & spicy mayo."),
        burger("Chicken Fillet Burger", "Crispy chicken fillet, lettuce, mayo & signature sauce."),
        burger("Spicy Chicken Burger", "Crispy spicy chicken, lettuce, cheese & chilli mayo."),
        burger("Zinger Tower Burger", "Spicy zinger fillet, hashbrown, cheese, lettuce & mayo.", { badge: "New", image: "/images/burger-hero.jpg" }),
      ],
    },
    {
      name: "Chicken",
      slug: "chicken",
      image: "/images/half-chicken.jpg",
      products: [
        { name: "1/2 Grilled Chicken Meal", description: "Flame grilled to perfection. Served with fries, coleslaw & drink.", price: p(9.49), groups: ["drink"], image: "/images/half-chicken.jpg" },
        { name: "Chicken Wings", description: "Choose your flavour. BBQ / Spicy / Peri Peri.", variants: [["5 pcs", p(4.99)], ["8 pcs", p(6.99)], ["12 pcs", p(8.99)]], groups: ["wingFlavour", "addSide", "addDrink"], image: "/images/wings.jpg" },
        { name: "Chicken Tenders", description: "4 crispy chicken tenders with dip.", price: p(5.99), groups: ["addSide", "addDrink"], image: "/images/tenders.jpg" },
      ],
    },
    {
      name: "Sides",
      slug: "sides",
      image: "/images/loaded-fries.jpg",
      products: [
        { name: "Fries", price: p(2.49), groups: ["addDrink"], image: "/images/fries.jpg" },
        { name: "Cheese Fries", price: p(3.49), groups: ["addDrink"], image: "/images/fries.jpg" },
        { name: "Loaded Fries", description: "Fries topped with cheese sauce, choice of meat & our signature sauce.", price: p(5.99), groups: ["addDrink"], image: "/images/loaded-fries.jpg" },
        { name: "Onion Rings", price: p(3.49), groups: ["addDrink"], image: "/images/onion-rings.jpg" },
        { name: "Mozzarella Sticks (6 pcs)", price: p(4.49), groups: ["addDrink"], image: "/images/onion-rings.jpg" },
      ],
    },
    {
      name: "Wraps",
      slug: "wraps",
      description: "Make it a meal - fries & drink +£2.99.",
      image: "/images/wraps.jpg",
      products: [
        { name: "Grilled Chicken Wrap", description: "Grilled chicken, lettuce, onions & sauce.", price: p(5.99), groups: ["meal", "mealDrink", "addSide"], image: "/images/wraps.jpg" },
        { name: "Chicken Strip Wrap", description: "Crispy chicken strips, lettuce, cheese & mayo.", price: p(5.49), groups: ["meal", "mealDrink", "addSide"], image: "/images/wraps.jpg" },
        { name: "Spicy Wrap", description: "Spicy chicken, jalapeños, lettuce & spicy mayo.", price: p(5.49), groups: ["meal", "mealDrink", "addSide"], image: "/images/wraps.jpg" },
      ],
    },
    {
      name: "Pizza",
      slug: "pizza",
      image: "/images/pizza.jpg",
      products: [
        pizza("Cheese & Tomato", "Mozzarella cheese and rich tomato sauce", tier1, { veg: true }),
        pizza("Garlic Pizza", "Mozzarella cheese and garlic", tier1, { veg: true }),
        pizza("Hawaiian Pizza", "Cheese, turkey ham and pineapple", tier2),
        pizza("Farm House", "Cheese, turkey ham and mushrooms", tier2),
        pizza("Veggie Hot", "Cheese, peppers and jalapeños", tier2, { veg: true }),
        pizza("Pepperoni Feast", "Double cheese and double pepperoni", tier3),
        pizza("Paneer King", "Cheese, paneer, peppers and onions", tier3, { veg: true }),
        pizza("Veggie Supreme", "Mushrooms, mixed peppers, pineapple, onions, sweetcorn and black olives", tier3, { veg: true }),
        pizza("BBQ Chicken", "Cheese, BBQ sauce, chicken, onion and sweetcorn", tier3),
        pizza("Paneer Power Blast", "Tomato sauce, cheese, onions, mushrooms, sweetcorn, jalapeños, green peppers, paneer and coriander", tier4, { veg: true }),
        pizza("Chicken Supreme", "Fresh mushrooms, Chinese chicken, cheese and pineapple", tier4),
        pizza("Doner Delight", "Lamb/chicken doner, onions, mixed peppers, jalapeños and coriander", tier4, { groups: ["donerMeat", "pizzaExtras", "addSide", "addDrink"] }),
        pizza("Tandoori Hot King", "Tandoori chicken, red onions, green chillies, mixed peppers and coriander", tier4, { spicy: true }),
        pizza("Peri Peri Blast", "Peri-peri chicken, peppers, onions and sweetcorn", tier4, { spicy: true }),
        pizza("Meat Feast", "Chicken, turkey ham and pepperoni", tier4),
        pizza("Burger Pizza", "Beef, cheese, onions and peppers", tier4),
        pizza("Beef Blast", "Diced beef, mixed peppers and jalapeños", tier4),
        pizza("Desi Style Pizza", "Cheese, tomato base, tandoori chicken, peri-peri chicken, peppers, chillies and coriander", tier5, { spicy: true }),
        pizza("FGC Special King", "Garlic & chilli base, chicken, onion, chillies, peppers, jalapeños, sweetcorn and coriander", tier5, { spicy: true }),
        pizza("Indian Style Pizza", "Hot tandoori spice base, peri-peri chicken, peppers, jalapeños, sweetcorn, coriander and masala", tier5, { spicy: true }),
      ],
    },
    {
      name: "Drinks & Milkshakes",
      slug: "drinks",
      image: "/images/milkshake.jpg",
      products: [
        { name: "Cans", price: p(1.3), groups: ["can"], image: "/images/cans.jpg" },
        { name: "Bottled Drinks", price: p(1.8), image: "/images/cans.jpg" },
        { name: "Water", price: p(1.0), image: "/images/cans.jpg" },
        { name: "Milkshakes", description: "Chocolate · Strawberry · Vanilla", price: p(3.49), groups: ["shake"], image: "/images/milkshake.jpg" },
        { name: "Smoothies", description: "All smoothies £4.99", price: p(4.99), groups: ["smoothie"], image: "/images/smoothie.jpg" },
      ],
    },
    {
      name: "Late Night Favourites",
      slug: "late-night",
      image: "/images/doner.jpg",
      products: [
        { name: "Doner Kebab", description: "Doner meat, fresh salad and sauce in pitta bread", price: p(7.49), groups: ["addSide", "addDrink"], image: "/images/doner.jpg" },
        { name: "Mixed Meat Box", description: "Doner meat, grilled chicken, fries, salad and sauce", price: p(10.49), groups: ["addDrink"], image: "/images/mixed-box.jpg" },
        { name: "Chicken Doner Wrap", description: "Chicken doner, fresh salad and sauce in a tortilla wrap", price: p(7.49), groups: ["addSide", "addDrink"], image: "/images/doner.jpg" },
      ],
    },
    {
      name: "Signature Boxes",
      slug: "boxes",
      image: "/images/box-deal.jpg",
      products: [
        { name: "Flame Box", description: "4 Wings, 2 Tenders, Fries, Coleslaw & Drink", price: p(11.99), groups: ["drink"], image: "/images/box-deal.jpg" },
        { name: "Peri Peri Box", description: "1/2 Grilled Chicken, Fries, Coleslaw & Drink", price: p(12.99), groups: ["drink"], image: "/images/box-deal.jpg" },
        { name: "Bigger Box", description: "6 Wings, 3 Tenders, Fries, Onion Rings, Coleslaw & 2 Drinks", price: p(16.99), groups: ["drink1", "drink2"], image: "/images/box-deal.jpg" },
      ],
    },
    {
      name: "Meal Deals",
      slug: "meal-deals",
      image: "/images/meal-deal.jpg",
      products: [
        { name: "Wings Deal", description: "8 Wings, Fries & Drink", price: p(9.99), groups: ["drink"], image: "/images/meal-deal.jpg" },
        { name: "Tender Deal", description: "4 Tenders, Fries & Drink", price: p(9.49), groups: ["drink"], image: "/images/meal-deal.jpg" },
        { name: "Family Deal", description: "1/2 Grilled Chicken, 4 Wings, 2 Fries, Coleslaw & 2 Drinks", price: p(19.99), groups: ["drink1", "drink2"], image: "/images/meal-deal.jpg" },
      ],
    },
  ];

  for (const [ci, c] of categories.entries()) {
    const category = await prisma.category.create({
      data: { name: c.name, slug: c.slug, description: c.description, image: CATEGORY_IMAGES[c.slug] ?? c.image, sortOrder: ci },
    });
    for (const [pi, prod] of c.products.entries()) {
      await prisma.product.create({
        data: {
          categoryId: category.id,
          name: prod.name,
          description: prod.description,
          image: ITEM_IMAGES[prod.name] ?? prod.image ?? c.image,
          basePrice: prod.price ?? prod.variants?.[0]?.[1] ?? 0,
          badge: prod.badge,
          isVegetarian: prod.veg ?? false,
          isSpicy: prod.spicy ?? false,
          sortOrder: pi,
          variants: prod.variants
            ? { create: prod.variants.map(([name, price], i) => ({ name, price, sortOrder: i })) }
            : undefined,
          modifierGroups: prod.groups
            ? { create: prod.groups.map((g, i) => ({ groupId: G[g], sortOrder: i })) }
            : undefined,
        },
      });
    }
  }
}

async function main() {
  const hours = [0, 1, 2, 3, 4, 5, 6].map((day) => ({ day, open: "12:00", close: "23:00", closed: false }));
  await prisma.settings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, openingHours: hours },
  });

  const email = (process.env.SEED_ADMIN_EMAIL || "admin@flamegrillandchill.co.uk").toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD || "ChangeMe123!";
  const existing = await prisma.user.findUnique({ where: { email } });
  if (!existing) {
    await prisma.user.create({
      data: { email, name: "Shop Admin", role: "ADMIN", passwordHash: await bcrypt.hash(password, 12) },
    });
    console.log(`Created admin user ${email}`);
  }

  // The built-in menu is versioned. When MENU_VERSION goes up (e.g. new drink choices or photos),
  // `npm run setup` / `npm run db:seed` rebuilds the menu so every install gets the change.
  // Past orders are kept (they store their own copy of item names and prices).
  // NOTE: this replaces any menu edits made in the admin, so only bump it before launch.
  const settings = await prisma.settings.findUniqueOrThrow({ where: { id: 1 } });
  if (settings.menuVersion < MENU_VERSION) {
    await prisma.$transaction([
      prisma.productModifierGroup.deleteMany(),
      prisma.modifierOption.deleteMany(),
      prisma.modifierGroup.deleteMany(),
      prisma.productVariant.deleteMany(),
      prisma.product.deleteMany(),
      prisma.category.deleteMany(),
    ]);
    await seedMenu();
    await prisma.settings.update({
      where: { id: 1 },
      data: {
        menuVersion: MENU_VERSION,
        // Delivery details confirmed by the shop (applied once when upgrading an older install)
        ...(settings.menuVersion < 2
          ? { deliveryRadiusMiles: 7, deliveryPostcodes: "", deliveryFee: p(1.49), serviceFee: p(1.1), shopLat: 52.20543, shopLng: -2.227424 }
          : {}),
      },
    });
    console.log(`Menu built (version ${MENU_VERSION})`);
  } else {
    console.log(`Menu is up to date (version ${settings.menuVersion})`);
  }

  await prisma.discount.upsert({
    where: { code: "WELCOME10" },
    update: {},
    create: {
      code: "WELCOME10",
      description: "10% off your first order over £15",
      type: "PERCENT",
      value: 10,
      minSubtotal: 1500,
      onePerCustomer: true,
      // Example code only - switch it on in Admin -> Discount codes if the shop wants it
      active: false,
    },
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

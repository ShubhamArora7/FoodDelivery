// Serializable menu shapes shared by server and client.
export type MenuOption = { id: string; name: string; price: number; available: boolean };

export type MenuGroup = {
  id: string;
  name: string;
  minSelect: number;
  maxSelect: number;
  showWhenOptionId: string | null;
  options: MenuOption[];
};

export type MenuVariant = { id: string; name: string; price: number };

export type MenuProduct = {
  id: string;
  name: string;
  description: string | null;
  image: string | null;
  basePrice: number;
  badge: string | null;
  isVegetarian: boolean;
  isSpicy: boolean;
  allergens: string | null;
  available: boolean;
  variants: MenuVariant[];
  groups: MenuGroup[];
};

export type MenuCategory = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  products: MenuProduct[];
};

/** Lowest price shown on a product card ("from £5.49"). */
export function fromPrice(p: MenuProduct): number {
  if (p.variants.length === 0) return p.basePrice;
  return Math.min(...p.variants.map((v) => v.price));
}

/** Which groups are currently visible given the selected option ids. */
export function visibleGroups(p: MenuProduct, selected: Set<string>): MenuGroup[] {
  return p.groups.filter((g) => !g.showWhenOptionId || selected.has(g.showWhenOptionId));
}

/** Client-side price calculation for display only. The server re-prices at checkout. */
export function unitPriceFor(p: MenuProduct, variantId: string | null, optionIds: string[]): number {
  const selected = new Set(optionIds);
  let price = p.variants.length ? (p.variants.find((v) => v.id === variantId)?.price ?? 0) : p.basePrice;
  for (const g of visibleGroups(p, selected)) {
    for (const o of g.options) if (selected.has(o.id)) price += o.price;
  }
  return price;
}

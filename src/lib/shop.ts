/**
 * Shop catalog.
 *
 * To sell something new:
 * 1. Create a Product and Price in Stripe (see README, “Set up Stripe”).
 * 2. Add STRIPE_PRICE_YOUR_ID to .env.local and to Netlify env vars.
 * 3. Add an entry below. id must be unique; envKey must match the env var.
 * Checkout and the shop page pick it up automatically.
 */

export const MAX_QTY = 50;

export type ShopProduct = {
  id: string;
  envKey: string;
  /** Older env name, still accepted so existing Stripe setup keeps working. */
  fallbackEnvKey?: string;
  title: string;
  blurb: string;
};

export const shopProducts: ShopProduct[] = [
  {
    id: "desk",
    envKey: "STRIPE_PRICE_DESK_SET",
    fallbackEnvKey: "STRIPE_PRICE_CLASSROOM_KIT",
    title: "Desk set",
    blurb: "A camera, a desk screen, and a battery pack. One student, one desk.",
  },
  {
    id: "camera",
    envKey: "STRIPE_PRICE_EXTRA_CAMERA",
    title: "Extra camera",
    blurb: "For another board or poster in the same room.",
  },
  {
    id: "screen",
    envKey: "STRIPE_PRICE_EXTRA_SCREEN",
    title: "Extra screen",
    blurb: "For another student in the same room.",
  },
];

export function getProduct(id: string): ShopProduct | undefined {
  return shopProducts.find((product) => product.id === id);
}

export function priceEnvKeys(product: ShopProduct): string[] {
  return product.fallbackEnvKey
    ? [product.envKey, product.fallbackEnvKey]
    : [product.envKey];
}

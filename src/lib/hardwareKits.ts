/** Highest number of any one item you can put in a single order. */
export const MAX_QTY = 50;

export type HardwareItem = {
  id: string;
  envKey: string;
  /** Older env name, still accepted so existing Stripe setup keeps working. */
  fallbackEnvKey?: string;
  title: string;
  blurb: string;
  defaultQty: number;
};

export const hardwareItems: HardwareItem[] = [
  {
    id: "desk",
    envKey: "STRIPE_PRICE_DESK_SET",
    fallbackEnvKey: "STRIPE_PRICE_CLASSROOM_KIT",
    title: "Desk set",
    blurb: "A camera, a desk screen, and a battery pack. One student, one desk.",
    defaultQty: 1,
  },
  {
    id: "camera",
    envKey: "STRIPE_PRICE_EXTRA_CAMERA",
    title: "Extra camera",
    blurb: "For another board or poster in the same room.",
    defaultQty: 0,
  },
  {
    id: "screen",
    envKey: "STRIPE_PRICE_EXTRA_SCREEN",
    title: "Extra screen",
    blurb: "For another student in the same room.",
    defaultQty: 0,
  },
];

export function priceEnvKeys(item: HardwareItem): string[] {
  return item.fallbackEnvKey
    ? [item.envKey, item.fallbackEnvKey]
    : [item.envKey];
}

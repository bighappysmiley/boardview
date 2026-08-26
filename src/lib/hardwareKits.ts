export type HardwareKit = {
  id: string;
  envKey: string;
  title: string;
  blurb: string;
  bullets: string[];
};

export const hardwareKits: HardwareKit[] = [
  {
    id: "classroom",
    envKey: "STRIPE_PRICE_CLASSROOM_KIT",
    title: "Single classroom kit",
    blurb: "One camera, one screen — everything for a single desk.",
    bullets: [
      "Ceiling or wall-mounted camera",
      "One desk screen",
      "Battery pack + charging cable",
    ],
  },
  {
    id: "school",
    envKey: "STRIPE_PRICE_SCHOOL_BUNDLE",
    title: "School bundle",
    blurb: "Multiple kits for several classrooms across your school.",
    bullets: [
      "5 camera + screen kits",
      "Shared teacher accounts",
      "Priority support",
    ],
  },
];

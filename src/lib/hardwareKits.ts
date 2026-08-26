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
    title: "Classroom kit",
    blurb: "Everything for one desk.",
    bullets: [
      "Ceiling or wall-mounted camera",
      "One desk screen",
      "Battery pack and charging cable",
    ],
  },
  {
    id: "school",
    envKey: "STRIPE_PRICE_SCHOOL_BUNDLE",
    title: "School bundle",
    blurb: "Five classrooms, ready to go.",
    bullets: [
      "Five cameras and five desk screens",
      "For teachers across the school",
      "We'll help you get set up",
    ],
  },
];

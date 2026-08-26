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
    blurb: "One camera and one desk screen.",
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
    blurb: "Five kits for classrooms across a school.",
    bullets: [
      "Five camera and screen kits",
      "Shared teacher accounts",
      "Priority support",
    ],
  },
];

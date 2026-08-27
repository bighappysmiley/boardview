import type { Camera, Classroom } from "./types";

/** Id used by the public "see what the screen looks like" preview. */
export const DEMO_CLASSROOM_ID = "demo";

export const demoClassroom: Classroom = {
  id: DEMO_CLASSROOM_ID,
  owner_id: "demo",
  name: "Room 214 — Demo",
  blacked_out: false,
  pin_mode: "assigned_desk",
  created_at: new Date(0).toISOString(),
};

export const demoCameras: Camera[] = [
  {
    id: "demo-front-board",
    classroom_id: DEMO_CLASSROOM_ID,
    label: "Front whiteboard",
    stream_url: null,
    position: 0,
    created_at: new Date(0).toISOString(),
  },
  {
    id: "demo-side-board",
    classroom_id: DEMO_CLASSROOM_ID,
    label: "Side whiteboard",
    stream_url: null,
    position: 1,
    created_at: new Date(0).toISOString(),
  },
  {
    id: "demo-poster",
    classroom_id: DEMO_CLASSROOM_ID,
    label: "Periodic table poster",
    stream_url: null,
    position: 2,
    created_at: new Date(0).toISOString(),
  },
];

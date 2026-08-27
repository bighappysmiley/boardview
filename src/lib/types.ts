export type Classroom = {
  id: string;
  owner_id: string;
  name: string;
  blacked_out: boolean;
  created_at: string;
};

export type Camera = {
  id: string;
  classroom_id: string;
  label: string;
  /** Image/MJPEG URL the camera publishes. Null until hardware is paired. */
  stream_url: string | null;
  /** Order the screen's "Next view" button cycles through. */
  position: number;
  created_at: string;
};

export type RequestKind = "trial" | "purchase";
export type RequestStatus =
  | "submitted"
  | "in_review"
  | "approved"
  | "declined"
  | "fulfilled";

export type HardwareRequest = {
  id: string;
  owner_id: string;
  contact_email: string;
  kind: RequestKind;
  status: RequestStatus;
  school: string;
  desk_sets: number;
  extra_cameras: number;
  extra_screens: number;
  notes: string | null;
  created_at: string;
};

export type TicketStatus = "open" | "closed";

export type Ticket = {
  id: string;
  owner_id: string;
  contact_email: string;
  subject: string;
  status: TicketStatus;
  created_at: string;
};

export type TicketMessage = {
  id: string;
  ticket_id: string;
  author_id: string;
  body: string;
  created_at: string;
};

export const requestStatusLabel: Record<RequestStatus, string> = {
  submitted: "Received",
  in_review: "In review",
  approved: "Approved",
  declined: "Declined",
  fulfilled: "Fulfilled",
};

export function formatWhen(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

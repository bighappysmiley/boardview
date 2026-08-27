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
  stream_url: string | null;
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
export type MessageKind = "user" | "staff" | "system" | "note";
export type StaffRole = "admin" | "staff";

export type Ticket = {
  id: string;
  owner_id: string | null;
  contact_email: string;
  subject: string;
  status: TicketStatus;
  visitor_name: string | null;
  visitor_token: string | null;
  last_ip: string | null;
  created_at: string;
};

export type TicketMessage = {
  id: string;
  ticket_id: string;
  author_id: string | null;
  body: string;
  kind: MessageKind;
  author_name: string | null;
  created_at: string;
};

export type StaffMember = {
  email: string;
  display_name: string;
  role: StaffRole;
  created_at: string;
};

export type Ban = {
  id: string;
  ip: string | null;
  email: string | null;
  visitor_token: string | null;
  ticket_id: string | null;
  created_by_email: string | null;
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

export function messageAuthorLabel(
  message: TicketMessage,
  viewerId: string | undefined,
  visitorName: string | null
) {
  if (message.kind === "system") return "System";
  if (message.kind === "note") return `${message.author_name ?? "Staff"} (private)`;
  if (message.kind === "staff") return message.author_name ?? "Support";
  if (viewerId && message.author_id === viewerId) return "You";
  return message.author_name || visitorName || "Visitor";
}

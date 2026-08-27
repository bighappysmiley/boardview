export type StaffAccess = "admin" | "staff";

export type StaffPermissions = {
  requests: boolean;
  bans: boolean;
  audit: boolean;
  moderate: boolean;
};

export const defaultPermissions: StaffPermissions = {
  requests: false,
  bans: true,
  audit: false,
  moderate: true,
};

export const allPermissions: StaffPermissions = {
  requests: true,
  bans: true,
  audit: true,
  moderate: true,
};

export const permissionLabels: {
  key: keyof StaffPermissions;
  label: string;
  hint: string;
}[] = [
  {
    key: "requests",
    label: "Hardware requests",
    hint: "See and update trial and hardware requests",
  },
  {
    key: "bans",
    label: "Bans",
    hint: "Ban and unban visitors, and see the ban list",
  },
  {
    key: "audit",
    label: "Audit log",
    hint: "See what staff have done",
  },
  {
    key: "moderate",
    label: "Moderate",
    hint: "Close conversations, private notes, and change the subject",
  },
];

export function parsePermissions(value: unknown): StaffPermissions {
  const row =
    value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  return {
    requests: Boolean(row.requests),
    bans: row.bans !== false,
    audit: Boolean(row.audit),
    moderate: row.moderate !== false,
  };
}

export function resolvePermissions(
  access: StaffAccess | null | undefined,
  value?: unknown
): StaffPermissions {
  if (access === "admin") return allPermissions;
  return parsePermissions(value ?? defaultPermissions);
}

export function hasPermission(
  permissions: StaffPermissions,
  key: keyof StaffPermissions
) {
  return Boolean(permissions[key]);
}

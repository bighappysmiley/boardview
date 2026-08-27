import type { StaffPermissions } from "@/lib/permissions";

export type CommandCategory = "Ticket" | "Visitor" | "Staff" | "Replies";

export type CommandDef = {
  verb: string;
  description: string;
  category: CommandCategory;
  /** Extra permission on top of being staff. Admin always passes. */
  perm?: keyof StaffPermissions;
  /** Shown after the verb in the menu, e.g. `{text}`. */
  hint?: string;
  /** If set, sending the command posts this as your reply. */
  macro?: string;
};

export const COMMANDS: CommandDef[] = [
  {
    verb: "close",
    description: "Close this conversation",
    category: "Ticket",
    perm: "moderate",
  },
  {
    verb: "reopen",
    description: "Open this conversation again",
    category: "Ticket",
    perm: "moderate",
  },
  {
    verb: "resolve",
    description: "Close it as resolved",
    category: "Ticket",
    perm: "moderate",
  },
  {
    verb: "subject",
    description: "Rename the conversation",
    category: "Ticket",
    perm: "moderate",
    hint: "{text}",
  },
  {
    verb: "ban",
    description: "Block this visitor’s network",
    category: "Visitor",
    perm: "bans",
  },
  {
    verb: "unban",
    description: "Restore access",
    category: "Visitor",
    perm: "bans",
  },
  {
    verb: "spam",
    description: "Ban and close as spam",
    category: "Visitor",
    perm: "bans",
  },
  {
    verb: "note",
    description: "Private note — visitors cannot see this",
    category: "Staff",
    perm: "moderate",
    hint: "{text}",
  },
  {
    verb: "who",
    description: "Visitor name, email, and network — private",
    category: "Staff",
  },
  {
    verb: "help",
    description: "List the commands you can use",
    category: "Staff",
  },
  {
    verb: "hello",
    description: "Greet them",
    category: "Replies",
    macro: "Hi — thanks for writing in. How can I help?",
  },
  {
    verb: "thanks",
    description: "Close out politely",
    category: "Replies",
    macro: "You’re welcome. Write back here if anything else comes up.",
  },
  {
    verb: "followup",
    description: "Check whether they still need help",
    category: "Replies",
    macro: "Just checking in — is there anything else you need from us?",
  },
  {
    verb: "hold",
    description: "Say you’re looking into it",
    category: "Replies",
    macro: "I’m looking into this and will follow up here shortly.",
  },
  {
    verb: "away",
    description: "You’ll pick this up when you’re back",
    category: "Replies",
    macro: "I’m stepping away for a bit. I’ll pick this up as soon as I’m back.",
  },
  {
    verb: "hours",
    description: "When you usually reply",
    category: "Replies",
    macro: "We’re usually here during weekday school hours. We’ll reply as soon as we can.",
  },
  {
    verb: "hardware",
    description: "Point them to a hardware request",
    category: "Replies",
    macro:
      "Hardware is requested from your BoardView account. Open Request on the site, tell us the school and how many desk sets you need, and we’ll take it from there.",
  },
];

export const COMMAND_CATEGORIES: CommandCategory[] = [
  "Ticket",
  "Visitor",
  "Staff",
  "Replies",
];

export function findCommand(verb: string) {
  return COMMANDS.find((command) => command.verb === verb.toLowerCase());
}

export function canRunCommand(
  command: CommandDef,
  permissions: StaffPermissions
) {
  if (!command.perm) return true;
  return Boolean(permissions[command.perm]);
}

export function commandsFor(
  permissions: StaffPermissions,
  query = ""
): CommandDef[] {
  const needle = query.trim().toLowerCase().replace(/^\//, "");
  return COMMANDS.filter((command) => {
    if (!canRunCommand(command, permissions)) return false;
    if (!needle) return true;
    return (
      command.verb.startsWith(needle) ||
      command.description.toLowerCase().includes(needle) ||
      command.category.toLowerCase().startsWith(needle)
    );
  });
}

export function groupedCommands(commands: CommandDef[]) {
  return COMMAND_CATEGORIES.map((category) => ({
    category,
    items: commands.filter((command) => command.category === category),
  })).filter((group) => group.items.length > 0);
}

export function commandUsage(command: CommandDef) {
  return command.hint ? `/${command.verb} ${command.hint}` : `/${command.verb}`;
}

export function helpText(permissions: StaffPermissions) {
  const groups = groupedCommands(commandsFor(permissions));
  return groups
    .map((group) => {
      const lines = group.items.map(
        (command) => `/${command.verb}${command.hint ? ` ${command.hint}` : ""} — ${command.description}`
      );
      return `${group.category}\n${lines.join("\n")}`;
    })
    .join("\n\n");
}

/** `/` plus optional verb, no argument yet — show the menu. */
export function slashMenuQuery(value: string): string | null {
  if (!value.startsWith("/")) return null;
  if (value.includes("\n")) return null;
  const match = value.match(/^\/(\S*)$/);
  return match ? match[1] : null;
}

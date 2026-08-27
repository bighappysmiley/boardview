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
  /** After posting the macro, close the conversation. */
  closes?: boolean;
};

const CLOSING =
  "Thank you for contacting BoardView. If you need anything further, please write back here. I am closing this conversation for now.";

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
    verb: "done",
    description: "Send a closing message and close",
    category: "Ticket",
    perm: "moderate",
    macro: CLOSING,
    closes: true,
  },
  {
    verb: "delete",
    description: "Permanently delete a closed conversation",
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
    description: "Open the conversation",
    category: "Replies",
    macro:
      "Thank you for contacting BoardView. How may I help you today?",
  },
  {
    verb: "received",
    description: "Acknowledge the message",
    category: "Replies",
    macro:
      "Thank you. We have received your message and will reply here.",
  },
  {
    verb: "hold",
    description: "You are looking into it",
    category: "Replies",
    macro:
      "Thank you. I am looking into this and will follow up shortly.",
  },
  {
    verb: "away",
    description: "You will continue this later",
    category: "Replies",
    macro:
      "I will continue this conversation as soon as I return.",
  },
  {
    verb: "hours",
    description: "When you reply",
    category: "Replies",
    macro:
      "We reply during weekday school hours and will respond as soon as we are able.",
  },
  {
    verb: "wait",
    description: "Waiting on a reply from them",
    category: "Replies",
    macro:
      "We will wait to hear back from you. This conversation will remain open.",
  },
  {
    verb: "followup",
    description: "Follow up on an open conversation",
    category: "Replies",
    macro:
      "I am writing to follow up. Please let us know if we can be of further assistance.",
  },
  {
    verb: "confirm",
    description: "Ask them to confirm it is resolved",
    category: "Replies",
    macro:
      "Please confirm that this is resolved, and I will close the conversation.",
  },
  {
    verb: "sorry",
    description: "Apologise",
    category: "Replies",
    macro:
      "I am sorry for the trouble this has caused. We will do our best to put it right.",
  },
  {
    verb: "account",
    description: "Point them to their account",
    category: "Replies",
    macro:
      "Please sign in to your BoardView account. From there you can manage classrooms and request hardware.",
  },
  {
    verb: "hardware",
    description: "How to request hardware",
    category: "Replies",
    macro:
      "Hardware is requested from your BoardView account. Open Request on the site, enter the school and the number of desk sets you need, and we will take it from there.",
  },
  {
    verb: "trial",
    description: "How to request a trial",
    category: "Replies",
    macro:
      "A trial is requested from your BoardView account. Open Request on the site, choose a trial, and we will follow up.",
  },
  {
    verb: "school",
    description: "Ask for the school and quantity",
    category: "Replies",
    macro:
      "Please reply with the name of the school and the number of desk sets you need.",
  },
  {
    verb: "thanks",
    description: "A short closing message",
    category: "Replies",
    macro:
      "You are welcome. Please write back here if you need anything further.",
  },
  {
    verb: "closing",
    description: "A full closing message",
    category: "Replies",
    macro: CLOSING,
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
        (command) =>
          `/${command.verb}${command.hint ? ` ${command.hint}` : ""} — ${command.description}`
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

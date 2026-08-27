import type { TicketMessage } from "@/lib/types";
import { formatDateTime, messageAuthorLabel } from "@/lib/types";

type Side = "mine" | "theirs" | "system" | "note";

function sideFor(message: TicketMessage, viewerIsStaff: boolean): Side {
  if (message.kind === "system") return "system";
  if (message.kind === "note") return "note";
  if (viewerIsStaff) {
    return message.kind === "staff" ? "mine" : "theirs";
  }
  return message.kind === "user" ? "mine" : "theirs";
}

export function ChatBubble({
  message,
  viewerId,
  viewerIsStaff,
  visitorName,
}: {
  message: TicketMessage;
  viewerId?: string;
  viewerIsStaff: boolean;
  visitorName: string | null;
}) {
  const side = sideFor(message, viewerIsStaff);
  const name = messageAuthorLabel(message, viewerId, visitorName);
  const time = formatDateTime(message.created_at);

  if (side === "system") {
    return (
      <li className="flex justify-center px-2">
        <p className="max-w-[90%] text-center text-xs leading-relaxed text-muted">
          {message.body}
        </p>
      </li>
    );
  }

  if (side === "note") {
    return (
      <li className="flex justify-start">
        <div className="max-w-[85%] rounded-2xl bg-black/[0.04] px-3.5 py-2">
          <p className="text-[0.7rem] text-muted">{name}</p>
          <p className="mt-0.5 whitespace-pre-wrap text-sm leading-relaxed text-muted italic">
            {message.body}
          </p>
        </div>
      </li>
    );
  }

  const mine = side === "mine";

  return (
    <li className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div className={`flex max-w-[85%] flex-col ${mine ? "items-end" : "items-start"}`}>
        <p
          className={`px-1 text-[0.7rem] text-muted ${mine ? "text-right" : "text-left"}`}
        >
          {name} · {time}
        </p>
        <p
          className={`mt-0.5 whitespace-pre-wrap px-3.5 py-2 text-sm leading-relaxed ${
            mine
              ? "rounded-[1.15rem] rounded-br-md bg-chat-mine text-white"
              : "rounded-[1.15rem] rounded-bl-md bg-chat-theirs text-foreground"
          }`}
        >
          {message.body}
        </p>
      </div>
    </li>
  );
}

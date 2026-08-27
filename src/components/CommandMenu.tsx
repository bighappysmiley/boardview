"use client";

import { useId, useMemo, useState } from "react";
import {
  commandUsage,
  commandsFor,
  groupedCommands,
  slashMenuQuery,
  type CommandDef,
} from "@/lib/commands";
import type { StaffPermissions } from "@/lib/permissions";

export function CommandMenu({
  value,
  permissions,
  activeIndex,
  onActiveIndex,
  onPick,
}: {
  value: string;
  permissions: StaffPermissions;
  activeIndex: number;
  onActiveIndex: (index: number) => void;
  onPick: (command: CommandDef) => void;
}) {
  const labelId = useId();
  const query = slashMenuQuery(value);
  const items = useMemo(
    () => (query === null ? [] : commandsFor(permissions, query)),
    [permissions, query]
  );
  const groups = useMemo(() => groupedCommands(items), [items]);

  if (query === null || items.length === 0) return null;

  const clamped = Math.min(Math.max(activeIndex, 0), items.length - 1);

  return (
    <div
      role="listbox"
      aria-labelledby={labelId}
      className="absolute inset-x-0 bottom-full z-20 mb-2 max-h-72 overflow-y-auto rounded-xl border border-black/8 bg-white py-2 shadow-[0_12px_32px_rgba(0,0,0,0.1)]"
    >
      <p id={labelId} className="sr-only">
        Commands
      </p>
      {groups.map((group) => (
        <div key={group.category} className="px-1">
          <p className="px-3 pt-2 pb-1 text-[0.7rem] font-semibold tracking-wide text-muted uppercase">
            {group.category}
          </p>
          {group.items.map((command) => {
            const index = items.indexOf(command);
            const active = index === clamped;
            return (
              <button
                key={command.verb}
                type="button"
                role="option"
                aria-selected={active}
                className={`flex w-full items-baseline justify-between gap-3 rounded-lg px-3 py-1.5 text-left ${
                  active ? "bg-black/[0.05]" : "hover:bg-black/[0.03]"
                }`}
                onMouseEnter={() => onActiveIndex(index)}
                onMouseDown={(event) => {
                  event.preventDefault();
                  onPick(command);
                }}
              >
                <span className="font-medium">
                  {commandUsage(command)}
                </span>
                <span className="truncate text-sm text-muted">
                  {command.description}
                </span>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export function useCommandComposer(permissions: StaffPermissions) {
  const [activeIndex, setActiveIndex] = useState(0);

  function itemsFor(value: string) {
    const query = slashMenuQuery(value);
    return query === null ? [] : commandsFor(permissions, query);
  }

  function pickInsert(command: CommandDef) {
    return command.hint ? `/${command.verb} ` : `/${command.verb}`;
  }

  return { activeIndex, setActiveIndex, itemsFor, pickInsert };
}

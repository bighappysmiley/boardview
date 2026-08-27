"use client";

import { useState } from "react";
import { Button } from "@/components/Button";

export function DeleteClosed({
  onDelete,
  disabled,
}: {
  onDelete: () => Promise<void> | void;
  disabled?: boolean;
}) {
  const [sure, setSure] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!sure) {
    return (
      <Button
        type="button"
        variant="ghost"
        disabled={disabled}
        onClick={() => setSure(true)}
      >
        Delete
      </Button>
    );
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <Button
        type="button"
        variant="secondary"
        disabled={disabled || busy}
        onClick={async () => {
          setBusy(true);
          await onDelete();
          setBusy(false);
        }}
      >
        {busy ? "Deleting…" : "Delete permanently"}
      </Button>
      <Button
        type="button"
        variant="ghost"
        disabled={busy}
        onClick={() => setSure(false)}
      >
        Cancel
      </Button>
    </span>
  );
}

import { MAX_QTY } from "@/lib/shop";

export function QuantityStepper({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        aria-label={`Fewer ${label}`}
        disabled={value <= 0}
        onClick={() => onChange(value - 1)}
        className="flex h-10 w-10 items-center justify-center rounded-lg border border-black/10 text-lg leading-none text-muted transition-colors hover:bg-black/[.03] hover:text-foreground disabled:opacity-35"
      >
        −
      </button>
      <input
        aria-label={`${label} quantity`}
        type="number"
        inputMode="numeric"
        min={0}
        max={MAX_QTY}
        value={value}
        onChange={(event) => {
          const next = Number.parseInt(event.target.value, 10);
          onChange(Number.isFinite(next) ? next : 0);
        }}
        className="h-10 w-14 rounded-lg border border-black/10 bg-white text-center tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <button
        type="button"
        aria-label={`More ${label}`}
        disabled={value >= MAX_QTY}
        onClick={() => onChange(value + 1)}
        className="flex h-10 w-10 items-center justify-center rounded-lg border border-black/10 text-lg leading-none text-muted transition-colors hover:bg-black/[.03] hover:text-foreground disabled:opacity-35"
      >
        +
      </button>
    </div>
  );
}

import { useState } from "react";

export function PinPad({
  onSubmit,
  error,
  disabled,
}: {
  onSubmit: (pin: string) => void;
  error?: string | null;
  disabled?: boolean;
}) {
  const [digits, setDigits] = useState("");

  function press(d: string) {
    if (disabled || digits.length >= 4) return;
    const next = digits + d;
    if (next.length === 4) {
      setDigits("");
      onSubmit(next);
      return;
    }
    setDigits(next);
  }

  function backspace() {
    if (disabled) return;
    setDigits((current) => current.slice(0, -1));
  }

  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "back"];

  return (
    <div className="flex h-full flex-col items-center justify-center px-6 py-8">
      <p className="text-sm font-medium tracking-wide text-white/70">
        Enter your PIN
      </p>
      <div className="mt-6 flex gap-3" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={`h-3.5 w-3.5 rounded-full border border-white/50 ${
              i < digits.length ? "bg-white" : "bg-transparent"
            }`}
          />
        ))}
      </div>
      <span className="sr-only">{digits.length} of 4 digits entered</span>
      {error && (
        <p role="alert" className="mt-5 text-center text-sm text-white/80">
          {error}
        </p>
      )}
      <div className="mt-10 grid w-full max-w-[20rem] grid-cols-3 gap-3">
        {keys.map((key) => {
          if (key === "") return <span key="pad" />;
          if (key === "back") {
            return (
              <button
                key="back"
                type="button"
                onClick={backspace}
                disabled={disabled}
                aria-label="Delete last digit"
                className="flex h-16 items-center justify-center rounded-xl text-lg font-medium text-white/80 transition-colors hover:bg-white/10 disabled:opacity-40"
              >
                ⌫
              </button>
            );
          }
          return (
            <button
              key={key}
              type="button"
              onClick={() => press(key)}
              disabled={disabled}
              className="flex h-16 items-center justify-center rounded-xl text-2xl font-medium text-white transition-colors hover:bg-white/10 disabled:opacity-40"
            >
              {key}
            </button>
          );
        })}
      </div>
    </div>
  );
}

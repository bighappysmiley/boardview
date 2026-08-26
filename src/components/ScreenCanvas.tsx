import type { Camera } from "@/lib/types";
import { LogoMark } from "./Logo";

export type ScreenMode = "boot" | "live" | "blackout";

/**
 * The student screen's entire visual output. Shared between the real
 * /screen route and the mockups on the marketing site so the two can never
 * drift apart.
 */
export function ScreenCanvas({
  mode,
  camera,
  time,
  cameraIndex = 0,
  cameraCount = 0,
  onNextCamera,
  compact = false,
}: {
  mode: ScreenMode;
  camera?: Camera | null;
  /** Pre-formatted clock string, e.g. "10:42". */
  time?: string;
  cameraIndex?: number;
  cameraCount?: number;
  onNextCamera?: () => void;
  /** Smaller type/padding for the marketing mockups. */
  compact?: boolean;
}) {
  const pad = compact ? "p-4" : "p-5 sm:p-6";
  const labelSize = compact ? "text-[0.7rem]" : "text-sm";

  return (
    <div className="relative h-full w-full overflow-hidden bg-screen text-white">
      {mode === "blackout" && (
        <div className={`flex h-full flex-col ${pad}`}>
          <div className={`flex items-start justify-between ${labelSize}`}>
            <span className="font-medium tracking-wide">BoardView</span>
            <span className="font-mono tabular-nums text-white/90">
              {time ?? "--:--"}
            </span>
          </div>
        </div>
      )}

      {mode === "boot" && (
        <div className="flex h-full flex-col items-center justify-center gap-3">
          <LogoMark className={compact ? "h-9 w-9" : "h-12 w-12"} />
          <span
            className={`${compact ? "text-xs" : "text-sm"} font-medium tracking-wide text-white/70`}
          >
            BoardView
          </span>
        </div>
      )}

      {mode === "live" && (
        <div className="flex h-full flex-col">
          <div className="relative flex-1 overflow-hidden">
            {camera?.stream_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={camera.stream_url}
                alt={`Live view of ${camera.label}`}
                className="h-full w-full object-cover"
              />
            ) : (
              <PlaceholderFeed label={camera?.label} compact={compact} />
            )}
          </div>

          <div
            className={`flex items-center justify-between gap-3 border-t border-white/10 bg-black/50 ${
              compact ? "px-4 py-2" : "px-5 py-3"
            }`}
          >
            <span className={`${labelSize} truncate font-medium text-white/90`}>
              {camera?.label ?? "Camera"}
              {cameraCount > 1 && (
                <span className="ml-2 font-mono text-white/50">
                  {cameraIndex + 1}/{cameraCount}
                </span>
              )}
            </span>

            {cameraCount > 1 &&
              (onNextCamera ? (
                <button
                  type="button"
                  onClick={onNextCamera}
                  className={`shrink-0 rounded-md bg-white/15 px-3 font-medium text-white transition-colors hover:bg-white/25 ${
                    compact ? "py-1 text-xs" : "py-1.5 text-sm"
                  }`}
                >
                  Next view
                </button>
              ) : (
                <span
                  aria-hidden="true"
                  className={`shrink-0 rounded-md bg-white/15 px-3 font-medium text-white/90 ${
                    compact ? "py-1 text-xs" : "py-1.5 text-sm"
                  }`}
                >
                  Next view
                </span>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** Stand-in for a real feed: a framed board with faint guide lines. */
function PlaceholderFeed({
  label,
  compact,
}: {
  label?: string;
  compact?: boolean;
}) {
  return (
    <div className="relative h-full w-full bg-[#161a22]">
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      />
      <div className="absolute inset-5 rounded border border-white/20" />
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className={`${compact ? "text-[0.7rem]" : "text-sm"} text-white/45`}
        >
          {label ? `${label} isn't on yet` : "The camera isn't on yet"}
        </span>
      </div>
    </div>
  );
}

/** Thin dark bezel around a screen, matching the hardware. */
export function DeviceFrame({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-[1.15rem] bg-[#1d1d1f] p-[5px] ${className}`}>
      <div className="aspect-[4/3] w-full overflow-hidden rounded-[0.95rem] bg-screen">
        {children}
      </div>
    </div>
  );
}

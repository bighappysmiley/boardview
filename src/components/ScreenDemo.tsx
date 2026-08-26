"use client";

import { useState } from "react";
import { DeviceFrame, ScreenCanvas, type ScreenMode } from "./ScreenCanvas";
import { demoCameras } from "@/lib/demo";
import { useClock } from "@/lib/useClock";

/**
 * The interactive mock on the landing page: a real working "Next view"
 * button cycling real camera entries, so visitors can feel how it behaves.
 */
export function ScreenDemo({ mode = "live" }: { mode?: ScreenMode }) {
  const [index, setIndex] = useState(0);
  const time = useClock();
  const camera = demoCameras[index % demoCameras.length];

  return (
    <DeviceFrame>
      <ScreenCanvas
        compact
        mode={mode}
        camera={camera}
        time={time ?? undefined}
        cameraIndex={index % demoCameras.length}
        cameraCount={demoCameras.length}
        onNextCamera={() => setIndex((i) => i + 1)}
      />
    </DeviceFrame>
  );
}

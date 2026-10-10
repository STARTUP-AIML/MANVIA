import { useState, useEffect } from "react";

/**
 * Checks whether WebGL is supported and available in the current environment.
 * Gracefully returns false in headless environments (like jsdom/Vitest) or
 * if hardware acceleration is disabled, without throwing jsdom console errors.
 */
export function useWebGLSupport(): boolean {
  const [isSupported, setIsSupported] = useState<boolean>(false);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      typeof document === "undefined" ||
      !("WebGLRenderingContext" in window)
    ) {
      setIsSupported(false);
      return;
    }

    try {
      const canvas = document.createElement("canvas");
      // Test if getContext is truly implemented before invoking
      if (typeof canvas.getContext !== "function") {
        setIsSupported(false);
        return;
      }
      const gl =
        canvas.getContext("webgl2") ||
        canvas.getContext("webgl") ||
        canvas.getContext("experimental-webgl");
      setIsSupported(Boolean(gl && gl instanceof Object));
    } catch {
      setIsSupported(false);
    }
  }, []);

  return isSupported;
}

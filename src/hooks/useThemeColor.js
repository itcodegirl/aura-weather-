import { useEffect } from "react";

const HEX_COLOR_PATTERN = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

function isValidHex(value) {
  return typeof value === "string" && HEX_COLOR_PATTERN.test(value);
}

function ensureMetaThemeColor() {
  if (typeof document === "undefined") {
    return null;
  }

  let meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute("name", "theme-color");
    document.head.appendChild(meta);
  }
  return meta;
}

// Pick a hex color from a weather gradient that visually matches the
// browser chrome's docked position. The first stop is the strongest hue
// and reads cleanly against typical mobile status bars.
export function useThemeColor(gradient) {
  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const candidate = Array.isArray(gradient) ? gradient[0] : null;
    if (!isValidHex(candidate)) {
      return;
    }

    const meta = ensureMetaThemeColor();
    if (!meta) {
      return;
    }

    const previous = meta.getAttribute("content");
    meta.setAttribute("content", candidate);

    return () => {
      if (previous) {
        meta.setAttribute("content", previous);
      }
    };
  }, [gradient]);
}

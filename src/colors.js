/**
 * Google Calendar Event Color Palette & Utilities.
 * Maps Google's official colorId values (1-11) to accurate hex codes
 * and computes accessible text contrast.
 */

export const GOOGLE_EVENT_COLORS = {
  "1": { name: "Lavender", background: "#7986CB", foreground: "#FFFFFF" },
  "2": { name: "Sage", background: "#33B679", foreground: "#FFFFFF" },
  "3": { name: "Grape", background: "#8E24AA", foreground: "#FFFFFF" },
  "4": { name: "Flamingo", background: "#E67C73", foreground: "#FFFFFF" },
  "5": { name: "Banana", background: "#F6BF26", foreground: "#1D1D1D" },
  "6": { name: "Tangerine", background: "#F4511E", foreground: "#FFFFFF" },
  "7": { name: "Peacock", background: "#039BE5", foreground: "#FFFFFF" },
  "8": { name: "Graphite", background: "#616161", foreground: "#FFFFFF" },
  "9": { name: "Blueberry", background: "#3F51B5", foreground: "#FFFFFF" },
  "10": { name: "Basil", background: "#0B8043", foreground: "#FFFFFF" },
  "11": { name: "Tomato", background: "#D50000", foreground: "#FFFFFF" },
};

export const DEFAULT_COLOR = {
  name: "Default Blue",
  background: "#4285F4",
  foreground: "#FFFFFF",
};

/**
 * Calculates WCAG relative luminance and returns appropriate high-contrast text color.
 * @param {string} hex - 6-digit hex color string (e.g. "#7986CB")
 * @returns {string} "#FFFFFF" or "#1D1D1D"
 */
export function getTextContrastColor(hex) {
  if (!hex || typeof hex !== "string") return "#FFFFFF";
  const cleanHex = hex.replace("#", "");
  if (cleanHex.length !== 6) return "#FFFFFF";

  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

  const toLinear = (c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const lum = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);

  // Return dark text for bright backgrounds (luminance > 0.45)
  return lum > 0.45 ? "#1D1D1D" : "#FFFFFF";
}

/**
 * Resolves background and foreground color for an event given its colorId and user config overrides.
 * @param {string|number|null|undefined} colorId - Google colorId
 * @param {Object} [overrides={}] - Custom color overrides from card config
 * @param {string} [fallbackHex] - Optional fallback hex from calendar entity
 * @returns {{ background: string, foreground: string, name: string }}
 */
export function getEventColor(colorId, overrides = {}, fallbackHex = null) {
  const cidStr = colorId != null ? String(colorId) : null;

  // 1. Check user explicit override for this colorId
  if (cidStr && overrides && overrides[cidStr]) {
    const customBg = overrides[cidStr];
    return {
      name: `Custom ${cidStr}`,
      background: customBg,
      foreground: getTextContrastColor(customBg),
    };
  }

  // 2. Check standard Google palette
  if (cidStr && GOOGLE_EVENT_COLORS[cidStr]) {
    const standard = GOOGLE_EVENT_COLORS[cidStr];
    return {
      name: standard.name,
      background: standard.background,
      foreground: standard.foreground || getTextContrastColor(standard.background),
    };
  }

  // 3. Check user default color override
  if (overrides && overrides.default) {
    const defaultBg = overrides.default;
    return {
      name: "Custom Default",
      background: defaultBg,
      foreground: getTextContrastColor(defaultBg),
    };
  }

  // 4. Use calendar-level entity color if provided
  if (fallbackHex) {
    return {
      name: "Calendar Color",
      background: fallbackHex,
      foreground: getTextContrastColor(fallbackHex),
    };
  }

  // 5. Google standard default blue
  return DEFAULT_COLOR;
}

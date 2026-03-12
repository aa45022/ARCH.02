// ══════════════════════════════════════════════════════════════════
// 設計系統 — 建面 v9.0 · Linear/Vercel-inspired · Light + Dark
// CSS variable references for JS inline styles
// ══════════════════════════════════════════════════════════════════

// These return CSS var() references so inline styles can use the design tokens
export const colors = {
  bg:          "var(--bg)",
  bgSecondary: "var(--bg-secondary)",
  surface:     "var(--surface)",
  surfaceHover:"var(--surface-hover)",
  border:      "var(--border)",
  borderSubtle:"var(--border-subtle)",
  text:        "var(--text-primary)",
  muted:       "var(--text-secondary)",
  dim:         "var(--text-tertiary)",
  faint:       "var(--text-quaternary)",
  accent:      "var(--accent)",
  accentHover: "var(--accent-hover)",
  accentSubtle:"var(--accent-subtle)",
  inputBg:     "var(--input-bg)",
  inputBorder: "var(--input-border)",
  focusBorder: "var(--input-focus-border)",

  // Functional
  success: "var(--color-success)",
  warning: "var(--color-warning)",
  error:   "var(--color-error)",
  info:    "var(--color-info)",

  // Semantic aliases used in calculations
  cyan:    "var(--text-primary)",
  blue:    "var(--color-info)",
  purple:  "#8B5CF6",
  green:   "var(--color-success)",
  yellow:  "var(--color-warning)",
  red:     "var(--color-error)",
  teal:    "#14B8A6",
  lav:     "#A78BFA",
  orange:  "#F97316",
};

export const glass = {
  card: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: 6,
    overflow: "hidden",
    transition: "border-color 0.15s ease, box-shadow 0.15s ease",
  },
  cardHover: {
    borderColor: "var(--input-focus-border)",
    boxShadow: "var(--shadow-md)",
  },
  input: {
    background: "var(--input-bg)",
    border: "1px solid var(--input-border)",
    color: "var(--text-primary)",
    padding: "7px 10px",
    borderRadius: 4,
    fontSize: 13,
    width: "100%",
    outline: "none",
    fontFamily: "var(--font-sans)",
    boxSizing: "border-box",
    transition: "border-color 0.15s ease, box-shadow 0.15s ease",
  },
};

export const spacing = {
  xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32,
};

export const fontSize = {
  xs: 11, sm: 12, md: 13, lg: 14, xl: 16, xxl: 20, xxxl: 24,
};

export const animation = {
  fast: "0.12s ease",
  normal: "0.2s ease",
  slow: "0.3s cubic-bezier(0.4, 0, 0.2, 1)",
};

export const alertStyles = {
  error: { bg: "var(--error-bg)", border: "var(--error-border)", icon: "!", color: "var(--color-error)" },
  warn:  { bg: "var(--warning-bg)", border: "var(--warning-border)", icon: "!", color: "var(--color-warning)" },
  info:  { bg: "var(--info-bg)", border: "var(--info-border)", icon: "i", color: "var(--color-info)" },
};

export const priorityColors = {
  "高": "var(--color-error)",
  "中": "var(--color-warning)",
  "低": "var(--color-success)",
};

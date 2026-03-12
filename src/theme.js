// ══════════════════════════════════════════════════════════════════
// 設計系統 — 建面 v8.1 · Linear-inspired Professional Dark Theme
// ══════════════════════════════════════════════════════════════════

export const colors = {
  // 背景層級
  bg:      "#080d18",
  bg2:     "#0c1424",
  bg3:     "#101c30",
  bg4:     "#14233c",
  surface: "#0d1829",

  // 邊框
  border:  "rgba(255,255,255,0.06)",
  border2: "rgba(255,255,255,0.04)",
  border3: "rgba(59,130,246,0.2)",

  // 主要強調 — 單一冷藍（Professional）
  cyan:    "#60a5fa",    // 主強調（改為藍色系）
  blue:    "#3b82f6",    // 深藍
  purple:  "#a78bfa",
  green:   "#34d399",
  yellow:  "#fbbf24",
  red:     "#f87171",
  teal:    "#2dd4bf",
  lav:     "#c4b5fd",
  orange:  "#fb923c",

  // 文字
  text:    "#f1f5f9",
  muted:   "#94a3b8",
  dim:     "#64748b",
  faint:   "#2d3f57",
};

export const glass = {
  card: {
    background: "rgba(13, 22, 40, 0.7)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    border: `1px solid rgba(255,255,255,0.06)`,
    borderRadius: 14,
    overflow: "hidden",
    transition: "border-color 0.2s ease, box-shadow 0.2s ease",
  },
  cardHover: {
    border: `1px solid rgba(59,130,246,0.2)`,
    boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
  },
  input: {
    background: "rgba(59,130,246,0.04)",
    border: "1px solid rgba(59,130,246,0.15)",
    color: colors.text,
    padding: "8px 12px",
    borderRadius: 9,
    fontSize: 13,
    width: "100%",
    outline: "none",
    fontFamily: "'Inter', sans-serif",
    boxSizing: "border-box",
    transition: "border-color 0.2s ease",
  },
};

export const spacing = {
  xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32,
};

export const fontSize = {
  xs: 10, sm: 11, md: 13, lg: 15, xl: 18, xxl: 24,
};

export const animation = {
  fast: "0.15s ease",
  normal: "0.25s ease",
  slow: "0.4s cubic-bezier(0.4, 0, 0.2, 1)",
};

export const alertStyles = {
  error: { bg: "rgba(127,29,29,0.25)", border: "rgba(248,113,113,0.2)", icon: "✗", color: colors.red },
  warn:  { bg: "rgba(120,53,15,0.25)", border: "rgba(251,191,36,0.2)", icon: "⚠", color: colors.yellow },
  info:  { bg: "rgba(22,78,99,0.25)", border: "rgba(45,212,191,0.2)", icon: "ℹ", color: colors.teal },
};

export const priorityColors = {
  "高": colors.red,
  "中": colors.yellow,
  "低": colors.green,
};

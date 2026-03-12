// ══════════════════════════════════════════════════════════════════
// 設計系統 — 現代化 Glassmorphism 主題
// 參考趨勢：2025-2026 Dashboard UI/UX
// ══════════════════════════════════════════════════════════════════

export const colors = {
  // 背景層級（深色漸變）
  bg:      "#060b14",
  bg2:     "#0a1220",
  bg3:     "#0e1a2e",
  bg4:     "#12213a",
  surface: "#0d1829",

  // 邊框
  border:  "rgba(56, 189, 248, 0.08)",
  border2: "rgba(255, 255, 255, 0.04)",
  border3: "rgba(56, 189, 248, 0.15)",

  // 強調色
  cyan:    "#38bdf8",
  purple:  "#818cf8",
  green:   "#34d399",
  yellow:  "#fbbf24",
  red:     "#f87171",
  teal:    "#2dd4bf",
  lav:     "#a78bfa",
  orange:  "#fb923c",
  blue:    "#60a5fa",

  // 文字
  text:    "#f1f5f9",
  muted:   "#94a3b8",
  dim:     "#64748b",
  faint:   "#334155",
};

export const glass = {
  card: {
    background: "rgba(15, 23, 42, 0.6)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    border: `1px solid rgba(56, 189, 248, 0.08)`,
    borderRadius: 16,
    overflow: "hidden",
    transition: "all 0.2s ease",
  },
  cardHover: {
    border: `1px solid rgba(56, 189, 248, 0.15)`,
    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
  },
  input: {
    background: "rgba(15, 23, 42, 0.5)",
    border: "1px solid rgba(56, 189, 248, 0.1)",
    color: colors.text,
    padding: "8px 12px",
    borderRadius: 10,
    fontSize: 13,
    width: "100%",
    outline: "none",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    boxSizing: "border-box",
    transition: "border-color 0.2s ease, box-shadow 0.2s ease",
  },
  inputFocus: {
    borderColor: "rgba(56, 189, 248, 0.3)",
    boxShadow: "0 0 0 3px rgba(56, 189, 248, 0.1)",
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const fontSize = {
  xs: 10,
  sm: 11,
  md: 13,
  lg: 15,
  xl: 18,
  xxl: 24,
};

// 動畫
export const animation = {
  fast: "0.15s ease",
  normal: "0.25s ease",
  slow: "0.4s cubic-bezier(0.4, 0, 0.2, 1)",
};

// Alert 等級樣式
export const alertStyles = {
  error: { bg: "rgba(127, 29, 29, 0.3)", border: "rgba(248, 113, 113, 0.2)", icon: "✗", color: colors.red },
  warn:  { bg: "rgba(120, 53, 15, 0.3)", border: "rgba(251, 191, 36, 0.2)", icon: "⚠", color: colors.yellow },
  info:  { bg: "rgba(22, 78, 99, 0.3)", border: "rgba(45, 212, 191, 0.2)", icon: "ℹ", color: colors.teal },
};

// 優先級顏色
export const priorityColors = {
  "高": colors.red,
  "中": colors.yellow,
  "低": colors.green,
};

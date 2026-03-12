// ══════════════════════════════════════════════════════════════════
// 共用 UI 元件庫 — v9.0 Linear/Vercel-inspired Design System
// ══════════════════════════════════════════════════════════════════

import { colors as C, glass } from "../theme.js";

/* ═══ Button ═══ */
export function Button({ children, onClick, variant = "primary", size = "md", disabled, style, ...props }) {
  const base = {
    fontFamily: "var(--font-sans)",
    fontWeight: 500,
    borderRadius: 4,
    cursor: disabled ? "not-allowed" : "pointer",
    transition: "all 0.12s ease",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    whiteSpace: "nowrap",
    opacity: disabled ? 0.5 : 1,
    lineHeight: 1,
  };
  const sizes = {
    sm: { padding: "5px 10px", fontSize: 11 },
    md: { padding: "7px 14px", fontSize: 12 },
    lg: { padding: "9px 18px", fontSize: 13 },
  };
  const variants = {
    primary: { background: C.accent, color: "var(--bg)", border: "1px solid var(--accent)" },
    secondary: { background: "transparent", color: C.text, border: "1px solid var(--border)" },
    ghost: { background: "transparent", color: C.muted, border: "1px solid transparent" },
    danger: { background: "var(--error-bg)", color: C.red, border: "1px solid var(--error-border)" },
    success: { background: "var(--success-bg)", color: C.green, border: "1px solid var(--success-border)" },
  };
  return (
    <button onClick={onClick} disabled={disabled} style={{ ...base, ...sizes[size], ...variants[variant], ...style }} {...props}>
      {children}
    </button>
  );
}

/* ═══ Input ═══ */
export function Input({ label, hint, error, style, inputStyle, ...props }) {
  return (
    <div style={style}>
      {label && <label style={{ display: "block", fontSize: 11, color: C.dim, marginBottom: 3, fontWeight: 500, letterSpacing: "0.3px" }}>{label}</label>}
      <input style={{ ...glass.input, textAlign: props.type === "number" ? "right" : "left", ...inputStyle }} {...props} />
      {hint && <div style={{ fontSize: 10, color: C.dim, marginTop: 2 }}>{hint}</div>}
      {error && <div style={{ fontSize: 10, color: C.red, marginTop: 2 }}>{error}</div>}
    </div>
  );
}

/* ═══ Card ═══ */
export function Card({ children, style, hover = false }) {
  return (
    <div style={{ ...glass.card, ...(hover ? glass.cardHover : {}), ...style }}>
      {children}
    </div>
  );
}

/* ═══ SectionHeader ═══ */
export function SectionHeader({ icon, label, color, sub, actions }) {
  return (
    <div style={{
      padding: "10px 14px",
      fontSize: 12,
      color: C.text,
      fontWeight: 600,
      borderBottom: "1px solid var(--border)",
      display: "flex",
      alignItems: "center",
      gap: 8,
      background: "var(--bg-secondary)",
    }}>
      {icon && <span style={{ fontSize: 13, opacity: 0.7 }}>{icon}</span>}
      <span>{label}</span>
      {sub && <span style={{ fontSize: 10, color: C.dim, fontWeight: 400, marginLeft: 4 }}>{sub}</span>}
      {actions && <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>{actions}</div>}
    </div>
  );
}

/* ═══ StatCard ═══ */
export function StatCard({ label, value, unit = "", sub, warn, color }) {
  return (
    <div style={{
      background: warn ? "var(--error-bg)" : "var(--surface)",
      border: "1px solid " + (warn ? "var(--error-border)" : "var(--border)"),
      borderRadius: 6,
      padding: "12px 14px",
      minWidth: 0,
    }}>
      <div style={{ fontSize: 11, color: C.dim, marginBottom: 6, letterSpacing: "0.3px" }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: warn ? C.red : (color || C.text), fontFamily: "var(--font-mono)", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
        {value}
        {unit && <span style={{ fontSize: 11, fontWeight: 400, marginLeft: 3, color: C.dim }}>{unit}</span>}
      </div>
      {sub && <div style={{ fontSize: 10, color: C.dim, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

/* ═══ Badge ═══ */
export function Badge({ pass, idle, label }) {
  if (idle) return (
    <span style={{
      background: "var(--badge-bg)",
      color: C.dim,
      border: "1px solid var(--border)",
      padding: "2px 8px",
      borderRadius: 4,
      fontSize: 11,
      fontWeight: 500,
    }}>{label || "— 待輸入"}</span>
  );
  return pass
    ? <span style={{ background: "var(--success-bg)", color: C.green, border: "1px solid var(--success-border)", padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 500 }}>符合</span>
    : <span style={{ background: "var(--error-bg)", color: C.red, border: "1px solid var(--error-border)", padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 500 }}>不符</span>;
}

/* ═══ CRow (Check Row) ═══ */
export function CRow({ label, val, unit, limit, lLabel, inv = false, note, isMobile }) {
  const nv = parseFloat(val), lv = parseFloat(limit);
  const idle = isNaN(nv) || val === "";
  const pass = !idle && !isNaN(lv) && (inv ? nv >= lv : nv <= lv);
  return (
    <div style={{ borderBottom: "1px solid var(--border-subtle)" }}>
      <div style={{ display: "flex", alignItems: "center", padding: isMobile ? "8px 12px" : "10px 14px", gap: isMobile ? 8 : 12, flexWrap: isMobile ? "wrap" : "nowrap" }}>
        <span style={{ color: C.muted, fontSize: 12, flex: 1, minWidth: isMobile ? 100 : undefined }}>{label}</span>
        <span style={{ color: C.text, fontFamily: "var(--font-mono)", fontSize: 13, minWidth: isMobile ? 60 : 80, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
          {!idle ? nv.toFixed(2) + " " + unit : <span style={{ color: C.faint }}>—</span>}
        </span>
        <span style={{ color: C.dim, fontSize: 11, minWidth: isMobile ? 60 : 78, textAlign: "center" }}>
          {lLabel || (inv ? "≥" + lv + unit : "≤" + lv + unit)}
        </span>
        <Badge pass={pass} idle={idle || isNaN(lv)} />
      </div>
      {note && <div style={{ padding: "0 14px 7px", fontSize: 10, color: C.dim, fontStyle: "italic" }}>{note}</div>}
    </div>
  );
}

/* ═══ RL (Result Line) ═══ */
export function RL({ label, val, unit = "㎡", color, sub, bold }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 14px", borderBottom: "1px solid var(--border-subtle)" }}>
      <span style={{ color: C.muted, fontSize: 12 }}>{label}</span>
      <div style={{ textAlign: "right" }}>
        <span style={{ color: color || C.text, fontFamily: "var(--font-mono)", fontSize: bold ? 15 : 13, fontWeight: bold ? 700 : 400, fontVariantNumeric: "tabular-nums" }}>{val} {unit}</span>
        {sub && <div style={{ color: C.dim, fontSize: 10 }}>{sub} 坪</div>}
      </div>
    </div>
  );
}

/* ═══ Arc Gauge ═══ */
export function Arc({ value, max, color, label, unit = "%", isMobile }) {
  const v = isNaN(value) || !value ? 0 : value;
  const over = v > max;
  const pct = Math.min((v / (max || 1)) * 100, 100);
  const sz = isMobile ? 72 : 88;
  const r = isMobile ? 28 : 36;
  const cx = sz / 2, cy = sz / 2;
  const al = Math.PI * r;
  const off = al * (1 - pct / 100);
  const svgH = isMobile ? 42 : 52;
  const strokeColor = over ? "var(--color-error)" : "var(--text-primary)";
  const trackColor = "var(--border)";

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: isMobile ? 68 : 88 }}>
      <svg width={sz} height={svgH} viewBox={`0 0 ${sz} ${svgH}`}>
        <path d={`M${cx - r} ${cy} A${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke={trackColor} strokeWidth={isMobile ? 4 : 5} strokeLinecap="round" />
        <path d={`M${cx - r} ${cy} A${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke={strokeColor} strokeWidth={isMobile ? 4 : 5} strokeLinecap="round" strokeDasharray={al} strokeDashoffset={off} style={{ transition: "stroke-dashoffset 0.5s cubic-bezier(0.4, 0, 0.2, 1)" }} />
        <text x={cx} y={cy - 4} textAnchor="middle" fill={strokeColor} fontSize={isMobile ? 11 : 13} fontWeight="700" fontFamily="'JetBrains Mono', monospace">{v === 0 ? "—" : v.toFixed(1)}</text>
        <text x={cx} y={cy + 9} textAnchor="middle" fill="var(--text-tertiary)" fontSize={isMobile ? 8 : 9} fontFamily="'Inter', sans-serif">/{max}{unit}</text>
      </svg>
      <div style={{ fontSize: isMobile ? 10 : 11, color: C.muted, marginTop: -2, fontWeight: 500 }}>{label}</div>
    </div>
  );
}

/* ═══ Highlight ═══ */
export function Highlight({ text, query }) {
  if (!query || !text) return text;
  const q = query.trim().toLowerCase();
  if (!q) return text;
  const idx = text.toLowerCase().indexOf(q);
  if (idx === -1) return text;
  return (
    <span>
      {text.slice(0, idx)}
      <mark style={{ background: "var(--warning-bg)", color: C.yellow, borderRadius: 2, padding: "0 2px" }}>
        {text.slice(idx, idx + q.length)}
      </mark>
      {text.slice(idx + q.length)}
    </span>
  );
}

/* ═══ Tabs ═══ */
export function TabButton({ active, onClick, children, icon }) {
  return (
    <button onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: 6,
      padding: "6px 12px", borderRadius: 4, cursor: "pointer",
      background: active ? "var(--accent-subtle)" : "transparent",
      color: active ? "var(--text-primary)" : "var(--text-tertiary)",
      border: "none",
      fontSize: 12, fontWeight: active ? 600 : 400,
      whiteSpace: "nowrap", flexShrink: 0,
      transition: "all 0.12s ease",
    }}>
      {icon && <span style={{ fontSize: 13, opacity: active ? 1 : 0.5 }}>{icon}</span>}
      {children}
    </button>
  );
}

/* ═══ Tooltip Icon (?) ═══ */
export function HelpIcon({ tip }) {
  return (
    <span data-tooltip={tip} style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      width: 14, height: 14, borderRadius: "50%",
      background: "var(--badge-bg)", border: "1px solid var(--border)",
      color: C.dim, fontSize: 9, cursor: "help", flexShrink: 0,
    }}>?</span>
  );
}

/* ═══ Progress Bar ═══ */
export function ProgressBar({ value, max, warn, style: customStyle }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div style={{ height: 6, background: "var(--surface)", borderRadius: 3, overflow: "hidden", border: "1px solid var(--border-subtle)", ...customStyle }}>
      <div className="progress-bar" style={{
        width: pct + "%", height: "100%",
        background: warn ? "var(--color-error)" : "var(--text-primary)",
        borderRadius: 3,
      }} />
    </div>
  );
}

/* ═══ Alert ═══ */
export function Alert({ level = "info", children, style: customStyle }) {
  const styles = {
    error: { bg: "var(--error-bg)", border: "var(--error-border)", color: "var(--color-error)" },
    warn: { bg: "var(--warning-bg)", border: "var(--warning-border)", color: "var(--color-warning)" },
    info: { bg: "var(--info-bg)", border: "var(--info-border)", color: "var(--color-info)" },
    success: { bg: "var(--success-bg)", border: "var(--success-border)", color: "var(--color-success)" },
  };
  const s = styles[level] || styles.info;
  return (
    <div style={{
      background: s.bg, border: "1px solid " + s.border, borderRadius: 4,
      padding: "8px 12px", fontSize: 12, color: s.color,
      display: "flex", alignItems: "flex-start", gap: 8, ...customStyle,
    }}>
      {children}
    </div>
  );
}

/* ═══ Modal Overlay ═══ */
export function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, background: "var(--overlay)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }} onClick={onClose}>
      <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8, maxWidth: 520, width: "100%", maxHeight: "85vh", overflow: "auto", boxShadow: "0 16px 48px rgba(0,0,0,0.2)" }} onClick={e => e.stopPropagation()}>
        {title && <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", fontWeight: 600, fontSize: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          {title}
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: C.dim, fontSize: 16, cursor: "pointer", padding: 4 }}>×</button>
        </div>}
        <div style={{ padding: "16px 18px" }}>{children}</div>
      </div>
    </div>
  );
}

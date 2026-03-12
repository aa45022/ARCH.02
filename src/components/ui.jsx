// ══════════════════════════════════════════════════════════════════
// 共用 UI 元件 — 現代化設計
// ══════════════════════════════════════════════════════════════════

import { colors, glass } from "../theme.js";

/** 半圓弧形儀表 */
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
  const strokeColor = over ? "#ef4444" : color;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: isMobile ? 68 : 88 }}>
      <svg width={sz} height={svgH} viewBox={`0 0 ${sz} ${svgH}`}>
        <defs>
          <linearGradient id={`grad-${label}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={strokeColor} stopOpacity="0.3" />
            <stop offset="100%" stopColor={strokeColor} />
          </linearGradient>
          <filter id={`glow-${label}`}>
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <path d={`M${cx - r} ${cy} A${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={isMobile ? 5 : 6} strokeLinecap="round" />
        <path d={`M${cx - r} ${cy} A${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke={`url(#grad-${label})`} strokeWidth={isMobile ? 5 : 6} strokeLinecap="round" strokeDasharray={al} strokeDashoffset={off} filter={`url(#glow-${label})`} style={{ transition: "stroke-dashoffset 0.6s cubic-bezier(0.4, 0, 0.2, 1)" }} />
        <text x={cx} y={cy - 4} textAnchor="middle" fill={strokeColor} fontSize={isMobile ? 11 : 13} fontWeight="700" fontFamily="'Inter', sans-serif">{v === 0 ? "—" : v.toFixed(1)}</text>
        <text x={cx} y={cy + 9} textAnchor="middle" fill={colors.dim} fontSize={isMobile ? 8 : 9} fontFamily="'Inter', sans-serif">/{max}{unit}</text>
      </svg>
      <div style={{ fontSize: isMobile ? 10 : 11, color: colors.muted, marginTop: -2, fontWeight: 500 }}>{label}</div>
    </div>
  );
}

/** 合規/不合規徽章 */
export function Badge({ pass, idle }) {
  if (idle) return (
    <span style={{
      background: "rgba(30, 41, 59, 0.5)",
      color: colors.muted,
      border: "1px solid rgba(255,255,255,0.06)",
      padding: "3px 10px",
      borderRadius: 6,
      fontSize: 11,
      fontWeight: 600,
    }}>— 待輸入</span>
  );
  return pass
    ? <span style={{ background: "rgba(52, 211, 153, 0.12)", color: colors.green, border: "1px solid rgba(52, 211, 153, 0.2)", padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600 }}>✓ 符合</span>
    : <span style={{ background: "rgba(248, 113, 113, 0.12)", color: colors.red, border: "1px solid rgba(248, 113, 113, 0.2)", padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600 }}>✗ 不符</span>;
}

/** 驗算列 */
export function CRow({ label, val, unit, limit, lLabel, inv = false, note, isMobile }) {
  const nv = parseFloat(val), lv = parseFloat(limit);
  const idle = isNaN(nv) || val === "";
  const pass = !idle && !isNaN(lv) && (inv ? nv >= lv : nv <= lv);
  return (
    <div style={{ borderBottom: "1px solid " + colors.border2 }}>
      <div style={{ display: "flex", alignItems: "center", padding: isMobile ? "9px 12px" : "11px 16px", gap: isMobile ? 8 : 12, flexWrap: isMobile ? "wrap" : "nowrap" }}>
        <span style={{ color: colors.muted, fontSize: isMobile ? 11 : 12, flex: 1, minWidth: isMobile ? 100 : undefined }}>{label}</span>
        <span style={{ color: colors.text, fontFamily: "'JetBrains Mono', monospace", fontSize: isMobile ? 12 : 13, minWidth: isMobile ? 60 : 80, textAlign: "right" }}>
          {!idle ? nv.toFixed(2) + " " + unit : <span style={{ color: colors.faint }}>—</span>}
        </span>
        <span style={{ color: colors.dim, fontSize: isMobile ? 10 : 11, minWidth: isMobile ? 60 : 78, textAlign: "center" }}>
          {lLabel || (inv ? "≥" + lv + unit : "≤" + lv + unit)}
        </span>
        <Badge pass={pass} idle={idle || isNaN(lv)} />
      </div>
      {note && <div style={{ padding: "0 16px 8px", fontSize: 10, color: colors.dim, fontStyle: "italic" }}>{note}</div>}
    </div>
  );
}

/** 結果列 */
export function RL({ label, val, unit = "㎡", color, sub, bold }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 16px", borderBottom: "1px solid " + colors.border2 }}>
      <span style={{ color: colors.muted, fontSize: 12 }}>{label}</span>
      <div style={{ textAlign: "right" }}>
        <span style={{ color: color || colors.text, fontFamily: "'JetBrains Mono', monospace", fontSize: bold ? 16 : 13, fontWeight: bold ? 700 : 400 }}>{val} {unit}</span>
        {sub && <div style={{ color: colors.dim, fontSize: 10 }}>{sub} 坪</div>}
      </div>
    </div>
  );
}

/** 區段標題 */
export function SectionHeader({ icon, label, color }) {
  return (
    <div style={{
      background: "rgba(15, 23, 42, 0.4)",
      backdropFilter: "blur(10px)",
      padding: "10px 16px",
      fontSize: 12,
      color: color || colors.cyan,
      fontWeight: 700,
      borderBottom: "1px solid " + colors.border2,
      display: "flex",
      alignItems: "center",
      gap: 8,
      letterSpacing: 0.5,
    }}>
      <span>{icon}</span>
      <span>{label}</span>
    </div>
  );
}

/** 玻璃卡片 */
export function Card({ children, style, hover = false }) {
  return (
    <div style={{ ...glass.card, ...(hover ? glass.cardHover : {}), ...style }}>
      {children}
    </div>
  );
}

/** 關鍵字高亮 */
export function Highlight({ text, query }) {
  if (!query || !text) return text;
  const q = query.trim().toLowerCase();
  if (!q) return text;
  const idx = text.toLowerCase().indexOf(q);
  if (idx === -1) return text;
  return (
    <span>
      {text.slice(0, idx)}
      <mark style={{ background: "rgba(251, 191, 36, 0.2)", color: colors.yellow, borderRadius: 3, padding: "0 2px" }}>
        {text.slice(idx, idx + q.length)}
      </mark>
      {text.slice(idx + q.length)}
    </span>
  );
}

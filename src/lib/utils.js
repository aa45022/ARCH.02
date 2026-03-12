// ══════════════════════════════════════════════════════════════════
// 工具函式 — 數值格式化
// ══════════════════════════════════════════════════════════════════

export const pf = (v) => parseFloat(v) || 0;
export const n2 = (v) => isNaN(v) ? "—" : pf(v).toFixed(2);
export const n1 = (v) => isNaN(v) ? "—" : pf(v).toFixed(1);
export const py = (v) => (!v || isNaN(v)) ? "—" : (pf(v) * 0.3025).toFixed(2);

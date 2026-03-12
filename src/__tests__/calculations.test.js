// ══════════════════════════════════════════════════════════════════
// 計算引擎單元測試 — 確保法規計算正確性
// ══════════════════════════════════════════════════════════════════

import { describe, it, expect } from "vitest";
import {
  calcFAR162,
  calcMaxH,
  checkFH,
  computeUnitTypeSummaries,
  getMepFromItems,
  computeAutoAlerts,
  searchRegulations,
} from "../lib/calculations.js";
import { DEFAULT_REG_DB } from "../lib/constants.js";

// ── §162 容積免計計算 ──────────────────────────────────────

describe("calcFAR162", () => {
  it("全部為零時回傳空結果", () => {
    const result = calcFAR162(0, 0, 0, 0, true);
    expect(result.floor).toBe(0);
    expect(result.far).toBe(0);
    expect(result.balExempt).toBe(0);
    expect(result.corrExempt).toBe(0);
  });

  it("有共用梯廳時，陽台免計≤10%", () => {
    const result = calcFAR162(100, 0, 15, 0, true);
    // base = floor = indoor + corr = 100
    // balMax = 100 * 0.10 = 10
    expect(result.balExempt).toBe(10);
    expect(result.balCounted).toBe(5); // 15 - 10 = 5
  });

  it("有共用梯廳時，梯廳免計≤10%", () => {
    const result = calcFAR162(100, 12, 0, 0, true);
    // base = 100 + 12 = 112
    // corrMax = 112 * 0.10 = 11.2
    expect(result.corrExempt).toBeCloseTo(11.2, 1);
    expect(result.corrCounted).toBeCloseTo(0.8, 1);
  });

  it("共用梯廳合計≤15%限制", () => {
    const result = calcFAR162(100, 14, 14, 0, true);
    // base = 100 + 14 = 114
    // balMax = 11.4, corrMax = 11.4, combinedMax = 17.1
    // balExempt + corrExempt 原本 = 11.4 + 11.4 = 22.8 > 17.1
    // 需要按比例縮減
    expect(result.balExempt + result.corrExempt).toBeCloseTo(17.1, 1);
  });

  it("無共用梯廳時，陽台≤12.5%或8㎡", () => {
    const result = calcFAR162(100, 0, 15, 0, false);
    // base = 100, balMax = max(100*0.125, 8) = 12.5
    expect(result.balExempt).toBe(12.5);
    expect(result.balCounted).toBe(2.5);
    expect(result.corrExempt).toBe(0);
  });

  it("無共用梯廳時，小面積使用8㎡下限", () => {
    const result = calcFAR162(30, 0, 10, 0, false);
    // base = 30, balMax = max(30*0.125, 8) = max(3.75, 8) = 8
    expect(result.balMax).toBe(8);
    expect(result.balExempt).toBe(8);
    expect(result.balCounted).toBe(2);
  });

  it("機電面積應從容積中扣除", () => {
    const result = calcFAR162(100, 0, 0, 10, true);
    // far = indoor + corrCounted + balCounted - mep = 100 + 0 + 0 - 10 = 90
    expect(result.far).toBe(90);
  });

  it("容積不得為負數", () => {
    const result = calcFAR162(10, 0, 0, 50, true);
    expect(result.far).toBe(0);
  });
});

// ── §164 高度限制 ──────────────────────────────────────

describe("calcMaxH", () => {
  it("正確計算 H ≤ 3.6 × (Sw + D)", () => {
    expect(calcMaxH(20, 5)).toBeCloseTo(90, 1); // 3.6 * (20+5) = 90
    expect(calcMaxH(10, 3)).toBeCloseTo(46.8, 1); // 3.6 * 13 = 46.8
  });

  it("道路寬度為0時回傳null", () => {
    expect(calcMaxH(0, 5)).toBeNull();
    expect(calcMaxH("", 5)).toBeNull();
  });

  it("接受字串輸入", () => {
    expect(calcMaxH("15", "2")).toBeCloseTo(61.2, 1);
  });
});

// ── §164-1 樓層高度檢查 ──────────────────────────────────

describe("checkFH", () => {
  it("集合住宅地面層≤4.2M", () => {
    const r = checkFH(0, 4.0, "集合住宅", false);
    expect(r.ok).toBe(true);
    expect(r.limit).toBe(4.2);
  });

  it("集合住宅地面層>4.2M不合規", () => {
    const r = checkFH(0, 4.5, "集合住宅", false);
    expect(r.ok).toBe(false);
    expect(r.limit).toBe(4.2);
  });

  it("一般層≤3.6M", () => {
    expect(checkFH(1, 3.5, "集合住宅", false).ok).toBe(true);
    expect(checkFH(5, 3.7, "透天厝", false).ok).toBe(false);
  });

  it("挑空設計地面層≤6.0M", () => {
    const r = checkFH(0, 5.5, "危老重建", true);
    expect(r.ok).toBe(true);
    expect(r.limit).toBe(6.0);

    expect(checkFH(0, 6.5, "集合住宅", true).ok).toBe(false);
  });

  it("非住宅類型不檢查", () => {
    const r = checkFH(0, 10, "辦公大樓", false);
    expect(r.ok).toBe(true);
    expect(r.limit).toBeNull();
  });
});

// ── 機電面積計算 ──────────────────────────────────────

describe("getMepFromItems", () => {
  it("正確加總機電項目面積", () => {
    const items = [
      { id: 1, name: "安全梯", area: "15" },
      { id: 2, name: "電梯間", area: "8" },
      { id: 3, name: "機電室", area: "12.5" },
    ];
    expect(getMepFromItems(items)).toBeCloseTo(35.5, 1);
  });

  it("空陣列回傳0", () => {
    expect(getMepFromItems([])).toBe(0);
    expect(getMepFromItems(null)).toBe(0);
  });

  it("無效面積值當作0", () => {
    const items = [{ id: 1, name: "test", area: "" }, { id: 2, name: "test2", area: "abc" }];
    expect(getMepFromItems(items)).toBe(0);
  });
});

// ── 戶型摘要計算 ──────────────────────────────────────

describe("computeUnitTypeSummaries", () => {
  it("正確分離室內與陽台面積", () => {
    const unitTypes = [{
      id: 1, name: "A戶",
      spaces: [
        { id: 1, name: "客廳", cat: "res", area: "20" },
        { id: 2, name: "主臥", cat: "res", area: "15" },
        { id: 3, name: "衛浴", cat: "bath", area: "5" },
        { id: 4, name: "陽台", cat: "bal", area: "8" },
      ],
    }];
    const result = computeUnitTypeSummaries(unitTypes);
    expect(result[0].indoor).toBe(40); // 20+15+5
    expect(result[0].bal).toBe(8);
    expect(result[0].total).toBe(48);
  });
});

// ── 智慧法規提示 ──────────────────────────────────────

describe("computeAutoAlerts", () => {
  const baseParams = {
    fl: 15, bfl: 3, avgFlr: 200, totalH: 55, btype: "集合住宅",
    units: "50", rfMaxArea: 100, rfTotal: 80, mepOverCap: false,
    mepCapArea: 500, mepCapPct: 15, sumMep: 400,
    bonus: { lw: "0", sd: "0", cp: "0", tr: "0" }, fhViolations: 0,
  };

  it("15層以上應有特別安全梯警告", () => {
    const alerts = computeAutoAlerts(baseParams);
    expect(alerts.some(a => a.code === "§96")).toBe(true);
  });

  it("高度>50M應有緊急昇降機提示", () => {
    const alerts = computeAutoAlerts(baseParams);
    expect(alerts.some(a => a.code === "§106")).toBe(true);
  });

  it("11層以上應有消防撒水提示", () => {
    const alerts = computeAutoAlerts(baseParams);
    expect(alerts.some(a => a.code === "消防§11")).toBe(true);
  });

  it("樓高超限時應有錯誤提示", () => {
    const alerts = computeAutoAlerts({ ...baseParams, fhViolations: 2 });
    expect(alerts.some(a => a.code === "§164-1" && a.level === "error")).toBe(true);
  });

  it("屋突超限時應有錯誤提示", () => {
    const alerts = computeAutoAlerts({ ...baseParams, rfTotal: 150 });
    expect(alerts.some(a => a.code === "§99" && a.level === "error")).toBe(true);
  });

  it("危老獎勵>40%應有錯誤", () => {
    const alerts = computeAutoAlerts({
      ...baseParams,
      btype: "危老重建",
      bonus: { lw: "30", sd: "0", cp: "15", tr: "0" },
    });
    expect(alerts.some(a => a.code === "危老§6" && a.level === "error")).toBe(true);
  });

  it("無樓層數時回傳空陣列", () => {
    expect(computeAutoAlerts({ ...baseParams, fl: 0 })).toEqual([]);
  });
});

// ── 法規搜尋 ──────────────────────────────────────

describe("searchRegulations", () => {
  it("空搜尋回傳全部", () => {
    const results = searchRegulations(DEFAULT_REG_DB, "", "all", "集合住宅", {});
    expect(results.length).toBe(DEFAULT_REG_DB.length);
  });

  it("關鍵字搜尋：陽台", () => {
    const results = searchRegulations(DEFAULT_REG_DB, "陽台", "all", "集合住宅", {});
    expect(results.length).toBeGreaterThan(0);
    expect(results.some(r => r.code === "§162")).toBe(true);
  });

  it("條文編號搜尋", () => {
    const results = searchRegulations(DEFAULT_REG_DB, "§164", "all", "集合住宅", {});
    expect(results.some(r => r.code === "§164")).toBe(true);
  });

  it("已標記過濾", () => {
    const checkedRegs = { "162": true, "99": true };
    const results = searchRegulations(DEFAULT_REG_DB, "", "checked", "集合住宅", checkedRegs);
    expect(results.length).toBe(2);
  });

  it("相關條文過濾", () => {
    const results = searchRegulations(DEFAULT_REG_DB, "", "relevant", "危老重建", {});
    expect(results.some(r => r.bt.includes("危老重建") || r.bt.includes("all"))).toBe(true);
  });

  it("分類過濾", () => {
    const results = searchRegulations(DEFAULT_REG_DB, "", "防火規定", "集合住宅", {});
    expect(results.every(r => r.ch === "防火規定")).toBe(true);
  });
});

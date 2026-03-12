// ══════════════════════════════════════════════════════════════════
// 純計算引擎 — 所有建築法規計算邏輯（無 UI 依賴）
// ══════════════════════════════════════════════════════════════════

import { pf } from "./utils.js";

/**
 * §162 容積免計計算
 * @param {number} indoor - 室內面積
 * @param {number} corr - 梯廳/走廊面積
 * @param {number} bal - 陽台面積
 * @param {number} mep - 機電面積
 * @param {boolean} hasSharedLobby - 是否有共用梯廳
 */
export function calcFAR162(indoor, corr, bal, mep, hasSharedLobby) {
  const floor = indoor + corr;
  if (floor <= 0 && !indoor && !corr && !bal && !mep) {
    return {
      floor: 0, far: 0, balExempt: 0, corrExempt: 0,
      balCounted: 0, corrCounted: 0, corrPct: 0, balPct: 0,
      combPct: 0, balMax: 0, corrMax: 0, combinedMax: 0,
    };
  }
  const base = Math.max(floor, 1);
  let balExempt, corrExempt, balMax, corrMax, combinedMax;

  if (hasSharedLobby) {
    balMax = base * 0.10;
    corrMax = base * 0.10;
    combinedMax = base * 0.15;
    balExempt = Math.min(bal, balMax);
    corrExempt = Math.min(corr, corrMax);
    if (balExempt + corrExempt > combinedMax) {
      const r = combinedMax / (balExempt + corrExempt);
      balExempt *= r;
      corrExempt *= r;
    }
  } else {
    balMax = Math.max(base * 0.125, 8);
    corrMax = 0;
    combinedMax = balMax;
    balExempt = Math.min(bal, balMax);
    corrExempt = 0;
  }

  const balCounted = Math.max(0, bal - balExempt);
  const corrCounted = Math.max(0, corr - corrExempt);
  const far = Math.max(0, indoor + corrCounted + balCounted - mep);

  return {
    floor, far, balExempt, corrExempt, balCounted, corrCounted,
    balMax, corrMax, combinedMax,
    corrPct: base > 0 ? (corr / base) * 100 : 0,
    balPct: base > 0 ? (bal / base) * 100 : 0,
    combPct: base > 0 ? ((corr + bal) / base) * 100 : 0,
  };
}

/**
 * §164 高度限制計算
 * @param {string|number} roadW - 道路寬度
 * @param {string|number} setbackD - 退縮距離
 * @returns {number|null} 最大允建高度
 */
export function calcMaxH(roadW, setbackD) {
  const sw = pf(roadW);
  const d = pf(setbackD);
  return sw > 0 ? 3.6 * (sw + d) : null;
}

/**
 * §164-1 樓層高度檢查
 * @param {number} idx - 樓層索引（0=地面層）
 * @param {number} fh - 樓層高度
 * @param {string} btype - 建築類型
 * @param {boolean} hasVoid - 是否有挑空設計
 */
export function checkFH(idx, fh, btype, hasVoid) {
  if (!["集合住宅", "透天厝", "危老重建"].includes(btype)) {
    return { ok: true, limit: null };
  }
  if (hasVoid && idx === 0) return { ok: fh <= 6.0, limit: 6.0 };
  if (idx === 0) return { ok: fh <= 4.2, limit: 4.2 };
  return { ok: fh <= 3.6, limit: 3.6 };
}

/**
 * 計算所有樓層的容積資訊
 * @param {Array} floorMix - 樓層資料
 * @param {Array} utSum - 戶型摘要
 * @param {number} defaultGfh - 預設層高
 * @param {boolean} hasSharedLobby - 共用梯廳
 * @param {boolean} useMepTemplate - 使用機電模板
 */
export function computeFloorCalcs(floorMix, utSum, defaultGfh, hasSharedLobby, useMepTemplate) {
  return floorMix.map((f, idx) => {
    const fhv = pf(f.fh) || pf(defaultGfh) || 3.0;
    let indoor, corr, bal, mep;

    if (f.isSpec) {
      indoor = pf(f.ci);
      corr = pf(f.cc);
      bal = pf(f.cb);
      mep = pf(f.cm);
    } else {
      indoor = 0;
      bal = 0;
      Object.entries(f.mix).forEach(([utId, cnt]) => {
        const ut = utSum.find(u => u.id === parseInt(utId));
        if (ut && cnt > 0) {
          indoor += ut.indoor * cnt;
          bal += ut.bal * cnt;
        }
      });
      corr = pf(f.corr);
      mep = (useMepTemplate && f.mepItems && f.mepItems.length > 0)
        ? getMepFromItems(f.mepItems) : pf(f.mep);
    }

    const c = calcFAR162(indoor, corr, bal, mep, hasSharedLobby);
    return {
      ...c, fh: fhv, indoor, corr, bal, mep,
      hasData: indoor > 0 || f.isSpec,
      id: f.id, label: f.label, isSpec: f.isSpec, idx,
    };
  });
}

/**
 * 從機電項目列表計算總面積
 */
export function getMepFromItems(items) {
  if (!items || !items.length) return 0;
  return items.reduce((s, it) => s + (parseFloat(it.area) || 0), 0);
}

/**
 * 計算戶型摘要
 */
export function computeUnitTypeSummaries(unitTypes) {
  return unitTypes.map(ut => {
    const indoor = ut.spaces.filter(s => s.cat !== "bal").reduce((a, s) => a + (parseFloat(s.area) || 0), 0);
    const bal = ut.spaces.filter(s => s.cat === "bal").reduce((a, s) => a + (parseFloat(s.area) || 0), 0);
    return { id: ut.id, name: ut.name, indoor, bal, total: indoor + bal };
  });
}

/**
 * 計算地下室摘要
 */
export function computeBasementCalcs(bsData, maxExc, useMepTemplate) {
  return bsData.map(f => {
    const pk = pf(f.pk);
    const mp = (useMepTemplate && f.mepItems && f.mepItems.length > 0)
      ? getMepFromItems(f.mepItems) : pf(f.mep);
    const oth = f.other.reduce((s, o) => s + (parseFloat(o.area) || 0), 0);
    return { ...f, pk, mp, oth, tot: pk + mp + oth, over: (pk + mp + oth) > maxExc && maxExc > 0 };
  });
}

/**
 * 計算屋突摘要
 */
export function computeRoofCalcs(rfFloors, rfCount) {
  return rfFloors.slice(0, rfCount).map(rf => {
    const total = rf.items.reduce((s, it) => s + (parseFloat(it.area) || 0), 0);
    return { ...rf, total, fhv: pf(rf.fh) || 3.0 };
  });
}

/**
 * 智慧法規自動提示
 */
export function computeAutoAlerts({
  fl, bfl, avgFlr, totalH, btype, units, rfMaxArea, rfTotal,
  mepOverCap, mepCapArea, mepCapPct, sumMep, bonus, fhViolations,
}) {
  const a = [];
  if (!fl) return a;

  if (avgFlr > 0) {
    const limit = fl >= 11 ? 100 : 1500;
    const withSprinkler = fl >= 11 ? 300 : 4500;
    if (avgFlr > limit) {
      a.push({ code: "§79", level: "error", msg: `防火區劃：平均層面積 ${avgFlr.toFixed(0)}㎡ 超過 ${limit}㎡ 限制（設自動撒水可放寬至${withSprinkler}㎡）`, ch: "防火規定" });
    }
  }
  if (fl >= 11) {
    a.push({ code: "§96", level: "warn", msg: `${fl}層以上 → 應設特別安全梯（需排煙設備+緊急電力）`, ch: "避難設施" });
  } else if (fl >= 4) {
    a.push({ code: "§95", level: "info", msg: `${fl}層 → 應設安全梯`, ch: "避難設施" });
  }
  if (totalH > 50) {
    a.push({ code: "§106", level: "error", msg: `建築高度 ${totalH.toFixed(1)}M > 50M → 須設緊急昇降機（梯廂≥1.5㎡，載重≥1000kg）`, ch: "昇降設備" });
  }
  if (fl >= 11) {
    a.push({ code: "消防§11", level: "warn", msg: `${fl}層以上 → 全棟應設自動撒水設備（可放寬防火區劃3倍）`, ch: "消防設備" });
  }
  if (fl >= 11 || bfl >= 1) {
    a.push({ code: "消防§14", level: "warn", msg: `${fl}層以上/地下層 → 應設排煙設備；特別安全梯前室須設排煙`, ch: "消防設備" });
  }
  if (fl >= 11 || bfl >= 3) {
    a.push({ code: "消防§16", level: "info", msg: `地上${fl}層/地下${bfl}層 → 應設緊急廣播設備`, ch: "消防設備" });
  }
  if (["集合住宅", "辦公大樓", "商業用途", "危老重建"].includes(btype) && (fl >= 5 || pf(units) >= 16)) {
    a.push({ code: "無障§2", level: "warn", msg: `5層以上/16戶以上集合住宅 → 全棟應設無障礙設施（坡道、電梯、廁所、停車）`, ch: "無障礙設施" });
  }
  if (["集合住宅", "危老重建"].includes(btype)) {
    a.push({ code: "§46", level: "info", msg: `集合住宅分戶牆Rw≥45dB，分戶樓板衝擊音Ln,w≤50dB`, ch: "隔音規定" });
  }
  if (fl >= 4) {
    a.push({ code: "§100", level: "info", msg: `${fl}層以上 → 應設置電梯`, ch: "昇降設備" });
  }
  if (rfMaxArea > 0 && rfTotal > rfMaxArea) {
    a.push({ code: "§99", level: "error", msg: `屋突面積 ${rfTotal.toFixed(1)}㎡ 超過建築面積×1/8 = ${rfMaxArea.toFixed(1)}㎡`, ch: "屋頂突出物" });
  }
  if (mepOverCap) {
    a.push({ code: "§162-2", level: "error", msg: `機電免計 ${sumMep.toFixed(0)}㎡ 超過上限 ${mepCapArea.toFixed(0)}㎡（允建容積×${mepCapPct}%）`, ch: "容積率" });
  }
  if (btype === "危老重建") {
    const totalBonus = pf(bonus.lw) + pf(bonus.sd) + pf(bonus.cp) + pf(bonus.tr);
    if (totalBonus > 40) {
      a.push({ code: "危老§6", level: "error", msg: `危老容積獎勵 ${totalBonus.toFixed(0)}% 超過上限40%`, ch: "危老重建" });
    }
  }
  if (fl >= 1) {
    a.push({ code: "§90", level: "info", msg: `走廊淨寬：住宅單側≥1.2M；雙側≥1.6M；辦公商業雙側≥2.0M`, ch: "避難設施" });
  }
  a.push({ code: "§92", level: "info", msg: `防火建築物任一點至直通樓梯步行距離≤50M（其他≤30M）`, ch: "避難設施" });
  if (fhViolations > 0) {
    a.push({ code: "§164-1", level: "error", msg: `有 ${fhViolations} 層樓高超限（一般層≤3.6M；地面層≤4.2M）`, ch: "建築高度" });
  }
  return a;
}

/**
 * 法規搜尋
 */
export function searchRegulations(REG_DB, searchQ, searchCat, btype, checkedRegs) {
  const relevant = searchCat === "relevant"
    ? REG_DB.filter(r => r.bt.includes("all") || r.bt.includes(btype))
    : REG_DB;
  const q = searchQ.trim().toLowerCase();

  if (!q && searchCat !== "relevant" && searchCat !== "all" && searchCat !== "checked") {
    return relevant.filter(r => r.ch === searchCat);
  }
  if (searchCat === "checked") {
    return REG_DB.filter(r => checkedRegs[r.id]);
  }
  if (!q) return relevant;

  return relevant.filter(r =>
    r.code.toLowerCase().includes(q) ||
    r.title.toLowerCase().includes(q) ||
    r.summary.toLowerCase().includes(q) ||
    r.kw.some(k => k.toLowerCase().includes(q)) ||
    (r.formula && r.formula.toLowerCase().includes(q)) ||
    r.ch.toLowerCase().includes(q)
  );
}

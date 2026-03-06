import { useState, useEffect, useRef, useMemo, useCallback, Fragment } from "react";
import * as XLSX from "xlsx";

// ══════════════════════════════════════════════════════════════════
// § RWD Hook — 偵測手機螢幕
// ══════════════════════════════════════════════════════════════════
function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && window.innerWidth < breakpoint);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < breakpoint);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [breakpoint]);
  return isMobile;
}

// ══════════════════════════════════════════════════════════════════
// § localStorage 封裝 — 取代 window.storage API
// ══════════════════════════════════════════════════════════════════
const storage = {
  async get(key) {
    try {
      const raw = localStorage.getItem("bcode:" + key);
      if (raw === null) return null;
      return { key, value: raw };
    } catch { return null; }
  },
  async set(key, value) {
    try {
      localStorage.setItem("bcode:" + key, value);
      return { key, value };
    } catch { return null; }
  },
  async delete(key) {
    try {
      localStorage.removeItem("bcode:" + key);
      return { key, deleted: true };
    } catch { return null; }
  },
  async list(prefix = "") {
    try {
      const keys = [];
      const fullPrefix = "bcode:" + prefix;
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(fullPrefix)) {
          keys.push(k.replace("bcode:", ""));
        }
      }
      return { keys };
    } catch { return { keys: [] }; }
  },
};

// ══════════════════════════════════════════════════════════════════
// § 完整法規資料庫 — 建築技術規則 + 相關法令
// ══════════════════════════════════════════════════════════════════
const DEFAULT_REG_DB = [
  // ─ 基地 ─
  { id:"25",  code:"§25",   ch:"基地規定",   title:"基地面積最小限制",       summary:"住宅用地最小基地面積依各縣市規定，一般≥165㎡",                 formula:"基地面積 ≥ 地方規定最小值",           kw:["基地","最小面積","基地面積"],           bt:["all"],                                         pri:"中", note:"需查詢各縣市細則" },
  { id:"28",  code:"§28",   ch:"基地規定",   title:"地下室距基地境界線距離",  summary:"地下室外牆面應自地界線退縮，不得超過地界線",                       formula:"地下室牆→不得超越地界",               kw:["地下室","境界線","退縮","地下"],          bt:["all"],                                         pri:"高", note:"地下室開挖不得超越地界" },
  { id:"29",  code:"§29",   ch:"基地規定",   title:"地下室居室規定",         summary:"地下室居室須有採光通風；地下三層以下不得作居室用途",               formula:"地下3層以下→禁止居室",                kw:["地下室","居室","採光","通風","地下三層"],  bt:["all"],                                         pri:"中", note:"" },
  // ─ 採光通風 ─
  { id:"43",  code:"§43",   ch:"採光通風",   title:"居室採光",               summary:"居室窗戶採光面積≥樓地板面積1/8",                               formula:"採光面積 ≥ 樓板面積 × 1/8",           kw:["採光","窗戶","居室","1/8","採光面積"],    bt:["集合住宅","透天厝","危老重建"],             pri:"高", note:"" },
  { id:"44",  code:"§44",   ch:"採光通風",   title:"居室通風",               summary:"居室可開啟通風面積≥樓地板面積1/20",                            formula:"通風面積 ≥ 樓板面積 × 1/20",          kw:["通風","開口","居室","1/20","通風面積"],   bt:["集合住宅","透天厝","危老重建"],             pri:"高", note:"" },
  { id:"45",  code:"§45",   ch:"採光通風",   title:"廚房/廁所通風設備",       summary:"廚房設排油煙設備；廁所設通風換氣設備（無窗→強制換氣）",           formula:"廚房→排油煙；廁所→機械換氣",           kw:["廚房","排油煙","廁所","通風","換氣"],     bt:["all"],                                         pri:"中", note:"" },
  { id:"46",  code:"§46",   ch:"隔音規定",   title:"分戶牆/樓板隔音",        summary:"集合住宅分戶牆隔音Rw≥45dB；樓板衝擊音Ln,w≤50dB",              formula:"牆：Rw≥45dB；樓板：Ln,w≤50dB",      kw:["隔音","分戶牆","樓板","衝擊音","45dB"],  bt:["集合住宅","危老重建"],                       pri:"高", note:"" },
  // ─ 停車空間 ─
  { id:"59",  code:"§59",   ch:"停車空間",   title:"停車空間設置標準",        summary:"住宅每戶0.5位（依地方法規）；辦公商業每100㎡設1位",               formula:"住宅：每戶≥0.5位；辦公：每100㎡≥1位", kw:["停車","停車位","停車空間","每戶","法定"],  bt:["all"],                                         pri:"高", note:"各縣市另訂細則" },
  { id:"60",  code:"§60",   ch:"停車空間",   title:"停車位尺寸",             summary:"一般停車位：6×2.5M；無障礙：6×3.5M；機車：2.2×1.5M",         formula:"普通：6.0×2.5M；無障礙：6.0×3.5M",  kw:["停車位","尺寸","2.5M","3.5M","機車"],    bt:["all"],                                         pri:"中", note:"" },
  // ─ 防火規定 ─
  { id:"69",  code:"§69",   ch:"防火規定",   title:"防火構造等級",           summary:"依建築物用途及高度分甲乙丙丁種防火構造；11層以上全棟防火",        formula:"≥11層 or H>21M → 防火構造",           kw:["防火構造","甲種","乙種","11層","防火"],   bt:["all"],                                         pri:"高", note:"" },
  { id:"79",  code:"§79",   ch:"防火規定",   title:"防火區劃面積限制",        summary:"≤10層：每區≤1500㎡；11層以上：每區≤100㎡；設自動滅火可放寬至3倍",formula:"≤10層：≤1500㎡；≥11層：≤100㎡",      kw:["防火區劃","1500㎡","100㎡","自動滅火","區劃"],bt:["all"],                                    pri:"高", note:"設自動撒水放寬3倍" },
  { id:"86",  code:"§86",   ch:"防火規定",   title:"防火門窗",               summary:"防火區劃開口：甲種防火門（一小時）或乙種（半小時）",              formula:"區劃開口→甲種（1hr）或乙種（0.5hr）", kw:["防火門","防火窗","甲種","乙種","一小時"], bt:["all"],                                         pri:"高", note:"" },
  { id:"88",  code:"§88",   ch:"防火規定",   title:"防火牆",                 summary:"防火牆應具≥二小時耐火時效，連接開口設甲種防火門",                formula:"防火牆耐火≥2hr",                       kw:["防火牆","耐火","二小時","甲種防火門"],    bt:["all"],                                         pri:"中", note:"" },
  // ─ 避難設施 ─
  { id:"90",  code:"§90",   ch:"避難設施",   title:"走廊/通道淨寬",          summary:"住宅走廊單側≥1.2M；雙側≥1.6M；辦公商業雙側≥2.0M",            formula:"住宅單側≥1.2M；辦公雙側≥2.0M",       kw:["走廊","廊寬","淨寬","通道","走道"],       bt:["all"],                                         pri:"高", note:"" },
  { id:"92",  code:"§92",   ch:"避難設施",   title:"直通樓梯步行距離",        summary:"防火建築物任一點至直通樓梯≤50M；其他≤30M；設自動滅火可放寬1.5倍", formula:"防火→≤50M；其他→≤30M",               kw:["直通樓梯","步行距離","50M","30M","避難"],  bt:["all"],                                         pri:"高", note:"" },
  { id:"93",  code:"§93",   ch:"避難設施",   title:"11層以上安全梯距離",      summary:"11層以上建築任一居室至安全梯≤30M；設自動撒水可放寬→50M",       formula:"≥11層→≤30M（撒水→≤50M）",            kw:["安全梯","距離","30M","11層","50M"],       bt:["集合住宅","辦公大樓","商業用途","危老重建"], pri:"高", note:"" },
  { id:"95",  code:"§95",   ch:"避難設施",   title:"安全梯設置條件",          summary:"4~10層建築物應設安全梯；直通樓梯應達安全梯標準",                formula:"4~10層→安全梯；≥11層→特別安全梯",    kw:["安全梯","4層","10層","直通樓梯","設置"],  bt:["all"],                                         pri:"高", note:"" },
  { id:"96",  code:"§96",   ch:"避難設施",   title:"特別安全梯",             summary:"≥11層或H>36M應設特別安全梯，設排煙設備及緊急電力",              formula:"≥11層 or H>36M → 特別安全梯",         kw:["特別安全梯","11層","36M","排煙","緊急電力"],bt:["all"],                                    pri:"高", note:"" },
  { id:"97",  code:"§97",   ch:"避難設施",   title:"特別安全梯數量",          summary:"集合住宅≥11層，每500㎡（其他用途每300㎡）增設一座特別安全梯",   formula:"住宅：每500㎡設1座；其他：每300㎡設1座",kw:["特別安全梯","數量","500㎡","300㎡"],      bt:["集合住宅","辦公大樓","商業用途","危老重建"], pri:"高", note:"" },
  { id:"99",  code:"§99",   ch:"屋頂突出物", title:"屋頂突出物面積",          summary:"屋突（樓梯間、電梯機房、水箱）合計≤建築面積×1/8，高度≤9M",    formula:"屋突面積 ≤ 建築面積 × 1/8；H ≤ 9M", kw:["屋突","屋頂","樓梯間","1/8","9M","水箱"],  bt:["all"],                                         pri:"高", note:"" },
  // ─ 昇降設備 ─
  { id:"100", code:"§100",  ch:"昇降設備",   title:"電梯設置條件",            summary:"四層以上應設電梯；醫療院所三層以上應設",                         formula:"≥4層→設電梯",                         kw:["電梯","昇降機","4層","設置","電梯設備"],  bt:["all"],                                         pri:"高", note:"" },
  { id:"106", code:"§106",  ch:"昇降設備",   title:"緊急昇降機",             summary:"H>50M應設緊急昇降機；梯廂面積≥1.5㎡（深≥1.35M）；載重≥1000kg",formula:"H > 50M → 緊急昇降機；載重≥1000kg", kw:["緊急昇降機","緊急電梯","50M","1000kg","避難"],bt:["all"],                                   pri:"高", note:"" },
  // ─ 建蔽/容積 ─
  { id:"161", code:"§161",  ch:"容積率",     title:"建蔽率/容積率規定",       summary:"建築面積÷基地面積≤法定建蔽率；容積計算面積÷基地≤法定容積率",      formula:"建蔽=建築面積÷基地；容積=樓地板÷基地",  kw:["建蔽率","容積率","建築面積","基地面積"],   bt:["all"],                                         pri:"高", note:"" },
  { id:"162", code:"§162",  ch:"容積率",     title:"陽台/梯廳免計容積",       summary:"有共梯：陽台≤10%+梯廳≤10%，合計≤15%；無共梯住宅：≤12.5%或8㎡", formula:"共梯：陽台≤10%+梯廳≤10%→合計≤15%",  kw:["容積","陽台","梯廳","免計","10%","12.5%","8㎡"],bt:["all"],                               pri:"高", note:"" },
  { id:"162-2",code:"§162-2",ch:"容積率",   title:"機電設備免計容積",        summary:"機電免計≤允建容積×15%（僅一座直通梯者≤10%）",                   formula:"機電免計≤允建容積×15%（或10%）",       kw:["機電","免計","容積","機械室","管道間","15%"],bt:["all"],                                   pri:"高", note:"" },
  { id:"162-3",code:"§162-3",ch:"容積率",   title:"停車免計容積",            summary:"法定停車+獎勵停車+自設停車均免計容積",                           formula:"全部停車空間→免計容積",               kw:["停車","免計","容積","停車場"],             bt:["all"],                                         pri:"高", note:"" },
  { id:"163", code:"§163",  ch:"基地通路",   title:"基地通路寬度",            summary:"基地內通路：L<10M→W≥2M；10≤L<20M→W≥3M；L≥20M→W≥5M",    formula:"L<10→W≥2M；L10~20→W≥3M；L≥20→W≥5M",kw:["通路","基地通路","2M","3M","5M","路寬"],  bt:["all"],                                         pri:"高", note:"" },
  { id:"164", code:"§164",  ch:"建築高度",   title:"建築物斜線高度限制",       summary:"建築物高度H≤3.6×(前面道路寬Sw+退縮深D)",                       formula:"H ≤ 3.6 × (Sw + D)",                 kw:["高度","斜線","道路寬","退縮","日照","3.6"],bt:["all"],                                         pri:"高", note:"" },
  { id:"164-1",code:"§164-1",ch:"建築高度",  title:"住宅樓層高度限制",        summary:"集合住宅各層高≤3.6M；地面層≤4.2M；挑空（§164-1特例）≤6.0M",    formula:"一般層≤3.6M；1F≤4.2M；挑空≤6.0M",   kw:["層高","3.6M","4.2M","6M","挑空","住宅"],  bt:["集合住宅","透天厝","危老重建"],             pri:"高", note:"" },
  // ─ 無障礙設施 ─
  { id:"wa1", code:"無障§2", ch:"無障礙設施", title:"無障礙設施適用範圍",       summary:"公共建築物及16戶以上或5層以上集合住宅應設無障礙設施",             formula:"≥16戶 or ≥5層集合住宅→設無障礙設施",  kw:["無障礙","輪椅","坡道","殘障","16戶","5層"],bt:["集合住宅","辦公大樓","商業用途","危老重建"],pri:"高", note:"" },
  { id:"wa2", code:"無障§3", ch:"無障礙設施", title:"無障礙坡道",              summary:"坡道坡度≤1/12（最長9M）；淨寬≥1.2M；扶手高0.7~0.9M；防滑地面",  formula:"坡度≤1/12；寬≥1.2M；扶手高0.7~0.9M", kw:["坡道","1/12","無障礙坡道","輪椅","1.2M"],  bt:["集合住宅","辦公大樓","商業用途","危老重建"],pri:"高", note:"" },
  { id:"wa3", code:"無障§4", ch:"無障礙設施", title:"無障礙廁所",              summary:"廁所淨空間≥1.5M×1.5M；門寬≥0.8M；L型扶手設置",               formula:"廁所淨1.5×1.5M；門寬≥0.8M",          kw:["無障礙廁所","1.5M","0.8M","扶手","廁所"], bt:["集合住宅","辦公大樓","商業用途","危老重建"],pri:"中", note:"" },
  { id:"wa4", code:"無障§5", ch:"無障礙設施", title:"無障礙電梯",              summary:"梯廂寬≥1.1M×深≥1.4M；門淨寬≥0.8M；按鈕高0.9~1.2M",           formula:"梯廂≥1.1×1.4M；門寬≥0.8M",           kw:["無障礙電梯","梯廂","門寬","0.8M","1.1M"],  bt:["集合住宅","辦公大樓","商業用途","危老重建"],pri:"中", note:"" },
  { id:"wa5", code:"無障§6", ch:"無障礙設施", title:"無障礙停車位",             summary:"每50一般車位設1無障礙車位；寬3.5M×長6.0M",                     formula:"每50位設1個；3.5M×6.0M",              kw:["無障礙停車","3.5M","停車位","殘障停車"],   bt:["集合住宅","辦公大樓","商業用途","危老重建"],pri:"中", note:"" },
  { id:"wa6", code:"無障§7", ch:"無障礙設施", title:"無障礙出入口",             summary:"主要出入口門淨寬≥0.9M；門檻高度≤0.5㎝；不得設門檻",            formula:"門淨寬≥0.9M；門檻≤0.5cm",            kw:["出入口","門寬","0.9M","門檻","無障礙"],    bt:["集合住宅","辦公大樓","商業用途","危老重建"],pri:"高", note:"" },
  // ─ 消防設備 ─
  { id:"fp1", code:"消防§11", ch:"消防設備",  title:"自動撒水設備",            summary:"11層以上全棟設自動撒水；6~10層特定場所（≥150㎡）設自動撒水",     formula:"≥11層→全棟自動撒水",                  kw:["自動撒水","灑水","消防","11層","撒水頭"],  bt:["all"],                                         pri:"高", note:"設自動撒水可放寬防火區劃3倍" },
  { id:"fp2", code:"消防§12", ch:"消防設備",  title:"室內消防栓",              summary:"建築物依用途面積設室內消防栓；一般建築≥500㎡設置",               formula:"≥500㎡→室內消防栓",                   kw:["消防栓","室內消防栓","消防設備"],          bt:["all"],                                         pri:"高", note:"" },
  { id:"fp3", code:"消防§14", ch:"消防設備",  title:"排煙設備",               summary:"11層以上、地下層、無開口樓層應設排煙設備；特別安全梯前室設排煙",   formula:"≥11層→排煙；地下→排煙；特安梯前室→排煙",kw:["排煙","排煙設備","特別安全梯","前室","地下"],bt:["all"],                                   pri:"高", note:"" },
  { id:"fp4", code:"消防§16", ch:"消防設備",  title:"緊急廣播",               summary:"地上11層或地下3層以上建築物應設緊急廣播設備",                   formula:"≥11層 or ≥地下3層→緊急廣播",          kw:["緊急廣播","廣播","11層","消防廣播"],       bt:["all"],                                         pri:"中", note:"" },
  { id:"fp5", code:"消防§17", ch:"消防設備",  title:"瓦斯漏氣偵測",            summary:"使用燃氣場所應設瓦斯漏氣自動警報設備",                          formula:"廚房/燃氣空間→瓦斯警報",              kw:["瓦斯","漏氣","偵測","廚房","瓦斯警報"],   bt:["集合住宅","透天厝","危老重建"],             pri:"中", note:"" },
  // ─ 污水設備 ─
  { id:"ww1", code:"§49",   ch:"衛生設備",   title:"污水處理設備",             summary:"建築物應設污水處理；集合住宅需化糞池或接通公共污水下水道",        formula:"集合住宅→化糞池或下水道",              kw:["污水","化糞池","污水處理","廢水","下水道"], bt:["all"],                                         pri:"中", note:"" },
  // ─ 危老重建 ─
  { id:"lda1",code:"危老§6", ch:"危老重建",   title:"危老基本容積獎勵",         summary:"危老重建基本獎勵10%；耐震評估1.0~1.1加10%；≥1.25加15%；合計≤40%",formula:"基本10%+耐震10~15%+綠建3~5%+時程5~10%≤40%",kw:["危老","容積獎勵","耐震","40%","重建"],   bt:["危老重建"],                                    pri:"高", note:"" },
  { id:"lda2",code:"危老§8", ch:"危老重建",   title:"危老耐震標章",             summary:"重建建築物取得耐震設計標章可獲額外容積獎勵",                    formula:"耐震標章→額外5~10%獎勵",              kw:["耐震標章","危老","結構","標章","耐震"],    bt:["危老重建"],                                    pri:"高", note:"" },
  { id:"lda3",code:"危老§9", ch:"危老重建",   title:"危老綠建築獎勵",           summary:"取得綠建築候選證書（銅級以上）→額外3~5%容積獎勵",               formula:"銅級→3%；銀級→4%；金級→5%",           kw:["綠建築","危老","候選證書","EEWH","銅級"],  bt:["危老重建"],                                    pri:"中", note:"" },
  { id:"lda4",code:"危老§10",ch:"危老重建",   title:"危老智慧建築獎勵",         summary:"取得智慧建築候選證書可獲額外2~10%容積獎勵",                    formula:"通過→2~10%",                          kw:["智慧建築","危老","IBAS","候選證書"],       bt:["危老重建"],                                    pri:"低", note:"" },
  { id:"lda5",code:"危老§11",ch:"危老重建",   title:"危老時程獎勵",             summary:"依申請時程可獲額外5~10%容積獎勵（需確認當前適用期限）",           formula:"時程獎勵5~10%",                       kw:["危老","時程","時間","建照","獎勵"],        bt:["危老重建"],                                    pri:"中", note:"需確認當前時程規定" },
  // ─ 綠建築 ─
  { id:"gb1", code:"綠建§2", ch:"綠建築",     title:"綠建築七大指標",           summary:"綠建築候選評估：生物多樣性、綠化、基地保水、日常節能、CO₂減量、廢棄物、水資源",formula:"七大指標評估通過→EEWH標章",          kw:["綠建築","七大指標","節能","保水","EEWH"],  bt:["all"],                                         pri:"低", note:"" },
  // ─ 室內裝修 ─
  { id:"ir1", code:"§77-2", ch:"室內裝修",   title:"室內裝修申請",             summary:"建築物室內裝修應向直轄市、縣市主管機關申請審查許可",              formula:"裝修→申請審查",                       kw:["室內裝修","裝修","申請","內部裝修"],       bt:["all"],                                         pri:"中", note:"" },
  // ─ 外牆 ─
  { id:"ew1", code:"§99-2", ch:"外牆規定",   title:"外牆防火材料",             summary:"高度超過21M之非防火構造建築物外牆不得使用可燃材料",              formula:"H>21M→外牆防火材料",                  kw:["外牆","21M","防火","可燃","材料"],         bt:["all"],                                         pri:"中", note:"" },
  // ─ 結構 ─
  { id:"st1", code:"§42",   ch:"結構設計",   title:"耐震設計",                summary:"建築物依所在地震區及用途係數設計地震力；住宅用途係數I=1.0",        formula:"地震力=Z×I×W×Sa",                    kw:["耐震","地震","結構","設計地震力","用途係數","抗震"],bt:["all"],                              pri:"高", note:"" },
  // ─ 招牌廣告 ─
  { id:"sg1", code:"§97-1", ch:"招牌廣告",   title:"廣告物安全",              summary:"建築物附設廣告物（招牌）應符合安全規定，不得妨礙採光、通風",       formula:"廣告物→申請許可",                     kw:["廣告","招牌","廣告物","安全"],             bt:["辦公大樓","商業用途"],                       pri:"低", note:"" },
];

// ══════════════════════════════════════════════════════════════════
// ZONES / BTYPES / CHECKLISTS (原有資料)
// ══════════════════════════════════════════════════════════════════
const ZONES = {
  "台北市":{zones:{"第一種住宅區":{b:30,f:60,s:3},"第二種住宅區":{b:35,f:120,s:2},"第三種住宅區":{b:45,f:225,s:2},"第四種住宅區":{b:50,f:300,s:1.5},"第一種商業區":{b:55,f:360,s:0},"第二種商業區":{b:65,f:560,s:0},"工業區":{b:55,f:300,s:2}},pk:"每戶1輛（集合住宅）"},
  "新北市":{zones:{"第一種住宅區":{b:30,f:60,s:3},"第二種住宅區":{b:35,f:120,s:2},"第三種住宅區":{b:45,f:180,s:2},"第四種住宅區":{b:50,f:240,s:1.5},"住(一)":{b:50,f:200,s:3},"住(二)":{b:60,f:300,s:2},"第一種商業區":{b:55,f:360,s:0},"工業區":{b:55,f:200,s:3}},pk:"依新北市停車場設置規定"},
  "台中市":{zones:{"第一種住宅區":{b:30,f:60,s:3},"第二種住宅區":{b:40,f:160,s:2},"第三種住宅區":{b:50,f:240,s:2},"第一種商業區":{b:55,f:360,s:0},"第二種商業區":{b:65,f:480,s:0}},pk:"依台中市停車空間設置標準"},
  "台南市":{zones:{"第一種住宅區":{b:35,f:80,s:3},"第二種住宅區":{b:45,f:180,s:2},"第三種住宅區":{b:55,f:280,s:2},"第一種商業區":{b:60,f:480,s:0},"工業區":{b:55,f:250,s:2}},pk:"依台南市停車場設置自治條例"},
  "高雄市":{zones:{"第一種住宅區":{b:35,f:70,s:3},"第二種住宅區":{b:45,f:180,s:2},"第三種住宅區":{b:55,f:280,s:2},"第一種商業區":{b:60,f:480,s:0}},pk:"依高雄市停車場用地開發管理辦法"},
  "桃園市":{zones:{"第一種住宅區":{b:30,f:60,s:3},"第二種住宅區":{b:40,f:160,s:2},"第三種住宅區":{b:50,f:240,s:2},"第一種商業區":{b:55,f:360,s:0}},pk:"依桃園市停車空間設置基準"},
  "新竹市":{zones:{"第一種住宅區":{b:30,f:60,s:3},"第二種住宅區":{b:40,f:160,s:2},"第一種商業區":{b:55,f:360,s:0}},pk:"依新竹市停車場設置管理辦法"},
  "新竹縣":{zones:{"第一種住宅區":{b:35,f:80,s:3},"第二種住宅區":{b:45,f:180,s:2},"第一種商業區":{b:55,f:360,s:0},"工業區":{b:55,f:250,s:3}},pk:"依新竹縣停車空間設置規定"},
};
const BTYPES = ["集合住宅","透天厝","辦公大樓","商業用途","工廠/廠房","危老重建"];
const CHKLIST = {
  "集合住宅":["§建蔽率","§容積率","§退縮","§建築高度","§停車位","§無障礙設施","§採光≥1/8","§通風≥1/20","§緊急進口","§防火區劃","§安全梯","§昇降設備","§屋頂突出物","§污水處理","§綠建築"],
  "透天厝":["§建蔽率","§容積率","§退縮","§建築高度","§停車位","§採光","§通風","§地下層限制","§外牆距鄰地","§屋頂突出物","§污水處理"],
  "辦公大樓":["§建蔽率","§容積率","§退縮","§建築高度","§停車位","§無障礙設施","§防火區劃","§特別安全梯","§昇降設備","§消防設備","§緊急電力"],
  "商業用途":["§建蔽率","§容積率","§退縮","§停車位","§無障礙設施","§防火區劃","§出口寬度","§特別安全梯","§昇降設備","§消防設備","§廚房排油煙"],
  "工廠/廠房":["§建蔽率","§容積率","§退縮","§建築高度","§停車裝卸位","§廠房排水","§防火區劃1500㎡","§消防設備","§通風排煙","§噪音振動防制"],
  "危老重建":["§危老容積獎勵","§容積率（含獎勵）","§退縮獎勵條件","§耐震設計標章","§綠建築候選證書","§智慧建築候選證書","§時程獎勵","§無障礙環境","§停車位","§安全梯","§昇降設備","§防火區劃","§公共設施"],
};
const DEFAULT_MEP_ITEMS = [
  { id:1, name:"安全梯", area:"" },
  { id:2, name:"電梯間", area:"" },
  { id:3, name:"機電室", area:"" },
  { id:4, name:"管道間", area:"" },
];

// ── utils ──
const pf = v => parseFloat(v)||0;
const n2 = v => isNaN(v) ? "—" : pf(v).toFixed(2);
const n1 = v => isNaN(v) ? "—" : pf(v).toFixed(1);
const py = v => (!v||isNaN(v)) ? "—" : (pf(v)*0.3025).toFixed(2);

function calcFAR162(indoor, corr, bal, mep, hasSharedLobby) {
  const floor = indoor + corr;
  if (floor<=0&&!indoor&&!corr&&!bal&&!mep) return { floor:0,far:0,balExempt:0,corrExempt:0,balCounted:0,corrCounted:0,corrPct:0,balPct:0,combPct:0,balMax:0,corrMax:0,combinedMax:0 };
  const base = Math.max(floor,1);
  let balExempt, corrExempt, balMax, corrMax, combinedMax;
  if (hasSharedLobby) {
    balMax=base*0.10; corrMax=base*0.10; combinedMax=base*0.15;
    balExempt=Math.min(bal,balMax); corrExempt=Math.min(corr,corrMax);
    if (balExempt+corrExempt>combinedMax) { const r=combinedMax/(balExempt+corrExempt); balExempt*=r; corrExempt*=r; }
  } else {
    balMax=Math.max(base*0.125,8); corrMax=0; combinedMax=balMax;
    balExempt=Math.min(bal,balMax); corrExempt=0;
  }
  const balCounted=Math.max(0,bal-balExempt), corrCounted=Math.max(0,corr-corrExempt);
  const far=Math.max(0,indoor+corrCounted+balCounted-mep);
  return { floor,far,balExempt,corrExempt,balCounted,corrCounted,balMax,corrMax,combinedMax,corrPct:base>0?(corr/base)*100:0,balPct:base>0?(bal/base)*100:0,combPct:base>0?((corr+bal)/base)*100:0 };
}
function calcMaxH(roadW,setbackD) { const sw=pf(roadW),d=pf(setbackD); return sw>0?3.6*(sw+d):null; }
function checkFH(idx,fh,btype,hasVoid) {
  if (!["集合住宅","透天厝","危老重建"].includes(btype)) return {ok:true,limit:null};
  if (hasVoid&&idx===0) return {ok:fh<=6.0,limit:6.0};
  if (idx===0) return {ok:fh<=4.2,limit:4.2};
  return {ok:fh<=3.6,limit:3.6};
}

// ── keyword highlight ──
function highlight(text, query) {
  if (!query||!text) return text;
  const q = query.trim().toLowerCase();
  if (!q) return text;
  const idx = text.toLowerCase().indexOf(q);
  if (idx===-1) return text;
  return (
    <span>
      {text.slice(0,idx)}
      <mark style={{background:"#fbbf2488",color:"#fbbf24",borderRadius:2,padding:"0 1px"}}>{text.slice(idx,idx+q.length)}</mark>
      {text.slice(idx+q.length)}
    </span>
  );
}

// ── colors/styles ──
const C = {
  bg:"#080e17",bg2:"#0a1628",bg3:"#0d1f38",bg4:"#0d253f",
  border:"#1e3050",border2:"#1e2d40",
  cyan:"#38bdf8",purple:"#6366f1",green:"#4ade80",yellow:"#fbbf24",
  red:"#f87171",teal:"#06b6d4",lav:"#a78bfa",orange:"#fb923c",
  text:"#e2e8f0",muted:"#94a3b8",dim:"#475569",faint:"#334155",
};
const CARD={background:C.bg2,border:"1px solid "+C.border,borderRadius:10,overflow:"hidden"};
const INP={background:"#0f1923",border:"1px solid "+C.border,color:C.text,padding:"6px 9px",borderRadius:5,fontSize:12,width:"100%",outline:"none",fontFamily:"monospace",boxSizing:"border-box"};

function Arc({value,max,color,label,unit="%",isMobile}) {
  const v=isNaN(value)||!value?0:value, over=v>max, pct=Math.min((v/(max||1))*100,100);
  const sz=isMobile?64:80;
  const r=isMobile?26:32,cx=sz/2,cy=sz/2,al=Math.PI*r,off=al*(1-pct/100);
  const svgH=isMobile?38:46;
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",minWidth:isMobile?60:80}}>
      <svg width={sz} height={svgH} viewBox={"0 0 "+sz+" "+svgH}>
        <path d={"M"+(cx-r)+" "+cy+" A"+r+" "+r+" 0 0 1 "+(cx+r)+" "+cy} fill="none" stroke="#1e2d40" strokeWidth={isMobile?4:5} strokeLinecap="round"/>
        <path d={"M"+(cx-r)+" "+cy+" A"+r+" "+r+" 0 0 1 "+(cx+r)+" "+cy} fill="none" stroke={over?"#ef4444":color} strokeWidth={isMobile?4:5} strokeLinecap="round" strokeDasharray={al} strokeDashoffset={off}/>
        <text x={cx} y={cy-3} textAnchor="middle" fill={over?"#ef4444":color} fontSize={isMobile?10:11} fontWeight="bold" fontFamily="monospace">{v===0?"—":v.toFixed(1)}</text>
        <text x={cx} y={cy+8} textAnchor="middle" fill="#475569" fontSize={isMobile?7:8} fontFamily="monospace">{"/"}{max}{unit}</text>
      </svg>
      <div style={{fontSize:isMobile?9:10,color:C.muted,marginTop:-2}}>{label}</div>
    </div>
  );
}
function Badge({pass,idle}) {
  if (idle) return <span style={{background:"#1e2433",color:C.muted,border:"1px solid "+C.faint,padding:"2px 8px",borderRadius:4,fontSize:11,fontWeight:700,fontFamily:"monospace"}}>— 待輸入</span>;
  return pass
    ? <span style={{background:"#1a3a2a",color:C.green,border:"1px solid #4ade8055",padding:"2px 8px",borderRadius:4,fontSize:11,fontWeight:700,fontFamily:"monospace"}}>✓ 符合</span>
    : <span style={{background:"#3a1a1a",color:C.red,border:"1px solid #f8717155",padding:"2px 8px",borderRadius:4,fontSize:11,fontWeight:700,fontFamily:"monospace"}}>✗ 不符</span>;
}
function CRow({label,val,unit,limit,lLabel,inv=false,note,isMobile}) {
  const nv=parseFloat(val),lv=parseFloat(limit);
  const idle=isNaN(nv)||val==="";
  const pass=!idle&&!isNaN(lv)&&(inv?nv>=lv:nv<=lv);
  return (
    <div style={{borderBottom:"1px solid "+C.border2}}>
      <div style={{display:"flex",alignItems:"center",padding:isMobile?"7px 10px":"9px 13px",gap:isMobile?6:10,flexWrap:isMobile?"wrap":"nowrap"}}>
        <span style={{color:C.muted,fontSize:isMobile?11:12,flex:1,minWidth:isMobile?100:undefined}}>{label}</span>
        <span style={{color:C.text,fontFamily:"monospace",fontSize:isMobile?12:13,minWidth:isMobile?60:80,textAlign:"right"}}>{!idle?nv.toFixed(2)+" "+unit:<span style={{color:C.faint}}>—</span>}</span>
        <span style={{color:C.dim,fontSize:isMobile?10:11,minWidth:isMobile?60:78,textAlign:"center"}}>{lLabel||(inv?"≥"+lv+unit:"≤"+lv+unit)}</span>
        <Badge pass={pass} idle={idle||isNaN(lv)}/>
      </div>
      {note&&<div style={{padding:"0 13px 6px",fontSize:10,color:C.dim,fontStyle:"italic"}}>{note}</div>}
    </div>
  );
}
function RL({label,val,unit="㎡",color,sub,bold}) {
  return (
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 14px",borderBottom:"1px solid #1a2a3a"}}>
      <span style={{color:C.muted,fontSize:12}}>{label}</span>
      <div style={{textAlign:"right"}}>
        <span style={{color:color||C.text,fontFamily:"monospace",fontSize:bold?15:13,fontWeight:bold?700:400}}>{val} {unit}</span>
        {sub&&<div style={{color:C.dim,fontSize:10}}>{sub} 坪</div>}
      </div>
    </div>
  );
}
function SH(icon,label,color) {
  return <div style={{background:C.bg3,padding:"8px 13px",fontSize:11,color:color||C.cyan,fontWeight:700,borderBottom:"1px solid "+C.border2}}>{icon} {label}</div>;
}

// ══════════════════════════════════════════════════════════════════
export default function App() {
  const isMobile = useIsMobile();

  // ── 基本狀態 ──
  const [zones,setZones]=useState(ZONES);
  const [county,setCounty]=useState("新北市");
  const [zone,setZone]=useState("住(一)");
  const [btype,setBtype]=useState("危老重建");
  const [proj,setProj]=useState("鶯歌昌福段");
  const [siteArea,setSiteArea]=useState("3214.36");
  const [footArea,setFootArea]=useState("");
  const [floors,setFloors]=useState("26");
  const [bsFlrs,setBsFlrs]=useState("5");
  const [gfh,setGfh]=useState("3.35");
  const [bsfh,setBsfh]=useState("3.5");
  const [units,setUnits]=useState("");
  const [parking,setParking]=useState("68");
  const [notes,setNotes]=useState("危老重建案，危老獎勵36%，地下5層地上26層");
  const [hasSharedLobby,setHasSharedLobby]=useState(true);
  const [singleStair,setSingleStair]=useState(false);
  const [roadWidth,setRoadWidth]=useState("");
  const [setbackDist,setSetbackDist]=useState("");
  const [hasVoid,setHasVoid]=useState(false);
  const [excRate,setExcRate]=useState("0.75");
  const [mepPct,setMepPct]=useState("12.4");
  const [bsMepPct,setBsMepPct]=useState("30");
  const [bonus,setBonus]=useState({lw:"36",sd:"0",cp:"0",tr:"0"});
  const [tab,setTab]=useState("calc");
  const [winA,setWinA]=useState("");
  const [ventA,setVentA]=useState("");
  const [showZone,setShowZone]=useState(false);
  const [showRules,setShowRules]=useState(false);
  const [nzC,setNzC]=useState("新北市");
  const [nzN,setNzN]=useState("");
  const [nzB,setNzB]=useState("");
  const [nzF,setNzF]=useState("");
  const [nzS,setNzS]=useState("");
  const [aiList,setAiList]=useState([]);
  const [aiLoad,setAiLoad]=useState(false);
  const [aiErr,setAiErr]=useState("");
  const [chk,setChk]=useState({});
  const [saved,setSaved]=useState([]);
  const [saveMsg,setSaveMsg]=useState("");
  const [impMsg,setImpMsg]=useState("");
  const fileRef=useRef(null);
  const [batchSel,setBatchSel]=useState(new Set());
  const [showBatch,setShowBatch]=useState(false);
  const [batchTpl,setBatchTpl]=useState({});
  const [batchRangeFrom,setBatchRangeFrom]=useState("");
  const [batchRangeTo,setBatchRangeTo]=useState("");
  const [batchMsg,setBatchMsg]=useState("");
  const [mepTemplate,setMepTemplate]=useState(DEFAULT_MEP_ITEMS);
  const [nextMepId,setNextMepId]=useState(5);
  const [useMepTemplate,setUseMepTemplate]=useState(true);
  const [rfFloors,setRfFloors]=useState([
    {id:"rf1",label:"RF1",fh:"3.0",items:[{id:1,name:"樓梯間",area:""},{id:2,name:"電梯機房",area:""},{id:3,name:"水箱",area:""}]},
    {id:"rf2",label:"RF2",fh:"2.5",items:[{id:1,name:"樓梯間",area:""},{id:2,name:"水箱",area:""}]},
  ]);
  const [rfCount,setRfCount]=useState(2);
  const [unitTypes,setUnitTypes]=useState([
    {id:1,name:"A戶",spaces:[{id:1,name:"客廳",cat:"res",area:""},{id:2,name:"主臥",cat:"res",area:""},{id:3,name:"次臥",cat:"res",area:""},{id:4,name:"廚房",cat:"bath",area:""},{id:5,name:"主衛",cat:"bath",area:""},{id:6,name:"陽台",cat:"bal",area:""}]},
    {id:2,name:"B戶",spaces:[{id:1,name:"客廳",cat:"res",area:""},{id:2,name:"主臥",cat:"res",area:""},{id:3,name:"次臥",cat:"res",area:""},{id:4,name:"廚房",cat:"bath",area:""},{id:5,name:"衛浴",cat:"bath",area:""},{id:6,name:"陽台",cat:"bal",area:""}]},
  ]);
  const [nextUTId,setNextUTId]=useState(3);
  const [expandUT,setExpandUT]=useState(1);
  const mkFloorRow=useCallback((i,mixInit)=>({id:i,label:(i+1)+"F",isSpec:i===0,mix:mixInit||{},corr:"",mep:"",fh:"",ci:"",cc:"",cb:"",cm:"",mepItems:null}),[]);
  const [floorMix,setFloorMix]=useState(()=>{ const m={};[1,2].forEach(id=>{m[id]=0;});return Array.from({length:26},(_,i)=>mkFloorRow(i,{...m})); });
  const [bsData,setBsData]=useState(()=>Array.from({length:5},(_,i)=>({id:i,label:"B"+(i+1),pk:"",mep:"",mepItems:null,other:[],fh:""})));
  const [expandedMepRow,setExpandedMepRow]=useState(null);

  // ── 法規查詢狀態 ──
  const [searchQ,setSearchQ]=useState("");
  const [searchCat,setSearchCat]=useState("all");
  const [expandedReg,setExpandedReg]=useState(null);
  const [checkedRegs,setCheckedRegs]=useState({});
  const [showAutoAlerts,setShowAutoAlerts]=useState(true);
  const searchInputRef=useRef(null);

  // ── 自訂法規（本地儲存）──
  const [customRegs,setCustomRegs]=useState([]);
  const [showAddReg,setShowAddReg]=useState(false);
  const [newReg,setNewReg]=useState({code:"",ch:"自訂",title:"",summary:"",formula:"",kw:"",pri:"中"});

  // ── 合併法規資料庫 ──
  const REG_DB = useMemo(() => [...DEFAULT_REG_DB, ...customRegs], [customRegs]);
  const REG_CHAPTERS = useMemo(() => [...new Set(REG_DB.map(r => r.ch))], [REG_DB]);

  // ── 載入本地自訂法規 & 已標記 ──
  useEffect(() => {
    try {
      const cr = localStorage.getItem("bcode:customRegs");
      if (cr) setCustomRegs(JSON.parse(cr));
      const ck = localStorage.getItem("bcode:checkedRegs");
      if (ck) setCheckedRegs(JSON.parse(ck));
    } catch {}
  }, []);

  // ── 自動儲存已標記和自訂法規 ──
  useEffect(() => {
    try { localStorage.setItem("bcode:checkedRegs", JSON.stringify(checkedRegs)); } catch {}
  }, [checkedRegs]);
  useEffect(() => {
    try { localStorage.setItem("bcode:customRegs", JSON.stringify(customRegs)); } catch {}
  }, [customRegs]);

  const addCustomReg = () => {
    if (!newReg.code.trim() || !newReg.title.trim()) return;
    const reg = {
      id: "custom_" + Date.now(),
      code: newReg.code.trim(),
      ch: newReg.ch || "自訂",
      title: newReg.title.trim(),
      summary: newReg.summary,
      formula: newReg.formula,
      kw: newReg.kw ? newReg.kw.split(",").map(s=>s.trim()).filter(Boolean) : [],
      bt: ["all"],
      pri: newReg.pri || "中",
      note: "自訂條文",
      isCustom: true,
    };
    setCustomRegs(prev => [...prev, reg]);
    setNewReg({code:"",ch:"自訂",title:"",summary:"",formula:"",kw:"",pri:"中"});
    setShowAddReg(false);
  };
  const deleteCustomReg = (id) => {
    setCustomRegs(prev => prev.filter(r => r.id !== id));
  };

  // ── 計算 ──
  const zd=zones[county]?.zones?.[zone]||{};
  const BCR=pf(zd.b),FAR=pf(zd.f);
  const sa=pf(siteArea),fa=pf(footArea),fl=pf(floors),bfl=pf(bsFlrs);
  const lFAR=sa?sa*(FAR/100):0;
  const maxBld=sa?sa*(BCR/100):0;
  const bLw=lFAR*pf(bonus.lw)/100,bSd=lFAR*pf(bonus.sd)/100;
  const bCp=lFAR*Math.min(pf(bonus.cp),30)/100,bTr=lFAR*Math.min(pf(bonus.tr),30)/100;
  const totB=bLw+bSd+bCp+bTr;
  const allowFAR=lFAR+totB;
  const mepR=pf(mepPct)/100;
  const maxFlr=mepR<1?allowFAR/(1-mepR):0;
  const allowFARr=sa?(allowFAR/sa)*100:0;
  const bsArea=sa*pf(excRate)*bfl;
  const maxExc=sa*pf(excRate);
  const estPk=Math.floor((bsArea-bsArea*pf(bsMepPct)/100)/40);
  const mepCapPct=singleStair?10:15;
  const mepCapArea=lFAR*(mepCapPct/100);
  const shadowMaxH=calcMaxH(roadWidth,setbackDist);
  const isRes=["集合住宅","透天厝","危老重建"].includes(btype);

  const getMepFromItems=useCallback((items)=>{ if(!items||!items.length)return 0; return items.reduce((s,it)=>s+(parseFloat(it.area)||0),0); },[]);
  const getFloorMep=useCallback((f)=>{ if(f.isSpec)return pf(f.cm); if(useMepTemplate&&f.mepItems&&f.mepItems.length>0)return getMepFromItems(f.mepItems); return pf(f.mep); },[useMepTemplate,getMepFromItems]);

  const utSum=useMemo(()=>unitTypes.map(ut=>{ const indoor=ut.spaces.filter(s=>s.cat!=="bal").reduce((a,s)=>a+(parseFloat(s.area)||0),0); const bal=ut.spaces.filter(s=>s.cat==="bal").reduce((a,s)=>a+(parseFloat(s.area)||0),0); return {id:ut.id,name:ut.name,indoor,bal,total:indoor+bal}; }),[unitTypes]);

  const floorCalcs=useMemo(()=>floorMix.map((f,idx)=>{
    const fhv=pf(f.fh)||pf(gfh)||3.0;
    let indoor,corr,bal,mep;
    if (f.isSpec){indoor=pf(f.ci);corr=pf(f.cc);bal=pf(f.cb);mep=pf(f.cm);}
    else {
      indoor=0;bal=0;
      Object.entries(f.mix).forEach(([utId,cnt])=>{const ut=utSum.find(u=>u.id===parseInt(utId));if(ut&&cnt>0){indoor+=ut.indoor*cnt;bal+=ut.bal*cnt;}});
      corr=pf(f.corr);
      mep=(useMepTemplate&&f.mepItems&&f.mepItems.length>0)?getMepFromItems(f.mepItems):pf(f.mep);
    }
    const c=calcFAR162(indoor,corr,bal,mep,hasSharedLobby);
    return {...c,fh:fhv,indoor,corr,bal,mep,hasData:indoor>0||f.isSpec,id:f.id,label:f.label,isSpec:f.isSpec,idx};
  }),[floorMix,utSum,gfh,hasSharedLobby,useMepTemplate,getMepFromItems]);

  const fhChecks=useMemo(()=>floorCalcs.map(fc=>checkFH(fc.idx,fc.fh,btype,hasVoid)),[floorCalcs,btype,hasVoid]);
  const fhViolations=fhChecks.filter(c=>c.limit&&!c.ok).length;

  const bsCalcs=useMemo(()=>bsData.map(f=>{
    const pk=pf(f.pk);
    const mp=(useMepTemplate&&f.mepItems&&f.mepItems.length>0)?getMepFromItems(f.mepItems):pf(f.mep);
    const oth=f.other.reduce((s,o)=>s+(parseFloat(o.area)||0),0);
    return {...f,pk,mp,oth,tot:pk+mp+oth,over:(pk+mp+oth)>maxExc&&maxExc>0};
  }),[bsData,maxExc,useMepTemplate,getMepFromItems]);
  const bsFARContrib=useMemo(()=>bsCalcs.reduce((s,f)=>s+f.oth,0),[bsCalcs]);

  const rfCalcs=useMemo(()=>rfFloors.slice(0,rfCount).map(rf=>{ const total=rf.items.reduce((s,it)=>s+(parseFloat(it.area)||0),0); return {...rf,total,fhv:pf(rf.fh)||3.0}; }),[rfFloors,rfCount]);
  const rfTotal=rfCalcs.reduce((s,r)=>s+r.total,0);
  const rfMaxArea=maxBld*0.125;

  const sumFlr=floorCalcs.reduce((s,f)=>s+f.floor,0);
  const sumFAR=floorCalcs.reduce((s,f)=>s+f.far,0)+bsFARContrib;
  const sumBal=floorCalcs.reduce((s,f)=>s+f.bal,0);
  const sumBalExempt=floorCalcs.reduce((s,f)=>s+f.balExempt,0);
  const sumBalCounted=floorCalcs.reduce((s,f)=>s+f.balCounted,0);
  const sumMep=floorCalcs.reduce((s,f)=>s+f.mep,0);
  const sumCorr=floorCalcs.reduce((s,f)=>s+f.corr,0);
  const sumCorrExempt=floorCalcs.reduce((s,f)=>s+f.corrExempt,0);
  const sumCorrCounted=floorCalcs.reduce((s,f)=>s+f.corrCounted,0);
  const aboveFAR=floorCalcs.reduce((s,f)=>s+f.far,0);
  const actFARr=sa?(sumFAR/sa)*100:0;
  const avgFlr=sumFlr&&fl?sumFlr/fl:null;
  const totalH=floorCalcs.reduce((s,f)=>s+f.fh,0);
  const totalHWithRF=totalH+rfCalcs.reduce((s,r)=>s+r.fhv,0);
  const bcrC=sa&&fa?(fa/sa)*100:NaN;
  const parkReq=btype==="集合住宅"&&units?Math.ceil(pf(units)*0.5):NaN;
  const mepOverCap=mepCapArea>0&&sumMep>mepCapArea;
  const bsTotalArea=bsCalcs.reduce((s,f)=>s+f.tot,0);
  const grandTotalArea=sumFlr+rfTotal+bsTotalArea;

  // ══ 智慧自動法規提示 ══
  const autoAlerts = useMemo(() => {
    const a = [];
    if (!fl) return a;
    if (avgFlr > 0) {
      const limit = fl >= 11 ? 100 : 1500;
      const withSprinkler = fl >= 11 ? 300 : 4500;
      if (avgFlr > limit) {
        a.push({ code:"§79", level:"error", msg:`防火區劃：平均層面積 ${avgFlr.toFixed(0)}㎡ 超過 ${limit}㎡ 限制（設自動撒水可放寬至${withSprinkler}㎡）`, ch:"防火規定" });
      }
    }
    if (fl >= 11) {
      a.push({ code:"§96", level:"warn", msg:`${fl}層以上 → 應設特別安全梯（需排煙設備+緊急電力）`, ch:"避難設施" });
    } else if (fl >= 4) {
      a.push({ code:"§95", level:"info", msg:`${fl}層 → 應設安全梯`, ch:"避難設施" });
    }
    if (totalH > 50) {
      a.push({ code:"§106", level:"error", msg:`建築高度 ${totalH.toFixed(1)}M > 50M → 須設緊急昇降機（梯廂≥1.5㎡，載重≥1000kg）`, ch:"昇降設備" });
    }
    if (fl >= 11) {
      a.push({ code:"消防§11", level:"warn", msg:`${fl}層以上 → 全棟應設自動撒水設備（可放寬防火區劃3倍）`, ch:"消防設備" });
    }
    if (fl >= 11 || bfl >= 1) {
      a.push({ code:"消防§14", level:"warn", msg:`${fl}層以上/地下層 → 應設排煙設備；特別安全梯前室須設排煙`, ch:"消防設備" });
    }
    if (fl >= 11 || bfl >= 3) {
      a.push({ code:"消防§16", level:"info", msg:`地上${fl}層/地下${bfl}層 → 應設緊急廣播設備`, ch:"消防設備" });
    }
    if (["集合住宅","辦公大樓","商業用途","危老重建"].includes(btype) && (fl >= 5 || pf(units) >= 16)) {
      a.push({ code:"無障§2", level:"warn", msg:`5層以上/16戶以上集合住宅 → 全棟應設無障礙設施（坡道、電梯、廁所、停車）`, ch:"無障礙設施" });
    }
    if (["集合住宅","危老重建"].includes(btype)) {
      a.push({ code:"§46", level:"info", msg:`集合住宅分戶牆Rw≥45dB，分戶樓板衝擊音Ln,w≤50dB`, ch:"隔音規定" });
    }
    if (fl >= 4) {
      a.push({ code:"§100", level:"info", msg:`${fl}層以上 → 應設置電梯`, ch:"昇降設備" });
    }
    if (rfMaxArea > 0 && rfTotal > rfMaxArea) {
      a.push({ code:"§99", level:"error", msg:`屋突面積 ${rfTotal.toFixed(1)}㎡ 超過建築面積×1/8 = ${rfMaxArea.toFixed(1)}㎡`, ch:"屋頂突出物" });
    }
    if (mepOverCap) {
      a.push({ code:"§162-2", level:"error", msg:`機電免計 ${sumMep.toFixed(0)}㎡ 超過上限 ${mepCapArea.toFixed(0)}㎡（允建容積×${mepCapPct}%）`, ch:"容積率" });
    }
    if (btype === "危老重建") {
      const totalBonus = pf(bonus.lw)+pf(bonus.sd)+pf(bonus.cp)+pf(bonus.tr);
      if (totalBonus > 40) {
        a.push({ code:"危老§6", level:"error", msg:`危老容積獎勵 ${totalBonus.toFixed(0)}% 超過上限40%`, ch:"危老重建" });
      }
    }
    if (fl >= 1) {
      a.push({ code:"§90", level:"info", msg:`走廊淨寬：住宅單側≥1.2M；雙側≥1.6M；辦公商業雙側≥2.0M`, ch:"避難設施" });
    }
    a.push({ code:"§92", level:"info", msg:`防火建築物任一點至直通樓梯步行距離≤50M（其他≤30M）`, ch:"避難設施" });
    if (fhViolations > 0) {
      a.push({ code:"§164-1", level:"error", msg:`有 ${fhViolations} 層樓高超限（一般層≤3.6M；地面層≤4.2M）`, ch:"建築高度" });
    }
    return a;
  }, [fl, bfl, avgFlr, totalH, btype, units, rfMaxArea, rfTotal, mepOverCap, mepCapArea, mepCapPct, sumMep, bonus, fhViolations, bcrC, BCR]);

  // ── 法規搜尋 ──
  const searchResults = useMemo(() => {
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
  }, [searchQ, searchCat, btype, checkedRegs, REG_DB]);

  // ── Effects ──
  useEffect(()=>{
    const n=Math.max(1,Math.min(60,Math.round(fl)));
    if(!isNaN(n)) setFloorMix(prev=>{
      if(prev.length===n)return prev;
      const m={};unitTypes.forEach(u=>{m[u.id]=0;});
      if(n>prev.length)return[...prev,...Array.from({length:n-prev.length},(_,i)=>mkFloorRow(prev.length+i,{...m}))];
      return prev.slice(0,n);
    });
  },[floors,unitTypes,mkFloorRow]);
  useEffect(()=>{
    const n=Math.max(0,Math.min(15,Math.round(bfl)));
    if(!isNaN(n)) setBsData(prev=>{
      if(prev.length===n)return prev;
      if(n>prev.length)return[...prev,...Array.from({length:n-prev.length},(_,i)=>({id:prev.length+i,label:"B"+(prev.length+i+1),pk:"",mep:"",mepItems:null,other:[],fh:""}))];
      return prev.slice(0,n);
    });
  },[bsFlrs]);
  useEffect(()=>{
    setBatchTpl(prev=>{const next={corr:prev.corr||"",mep:prev.mep||"",fh:prev.fh||""};unitTypes.forEach(ut=>{next["ut_"+ut.id]=prev["ut_"+ut.id]||0;});return next;});
  },[unitTypes]);
  useEffect(()=>{
    setRfFloors(prev=>{
      const n=Math.max(0,Math.min(3,rfCount));
      if(prev.length>=n)return prev;
      return [...prev,...Array.from({length:n-prev.length},(_,i)=>({id:"rf"+(prev.length+i+1),label:"RF"+(prev.length+i+1),fh:"2.5",items:[{id:1,name:"樓梯間",area:""}]}))];
    });
  },[rfCount]);

  const upFM=useCallback((id,field,val)=>setFloorMix(p=>p.map(f=>f.id===id?{...f,[field]:val}:f)),[]);
  const upFMMix=useCallback((fid,utId,val)=>setFloorMix(p=>p.map(f=>f.id===fid?{...f,mix:{...f.mix,[utId]:parseInt(val)||0}}:f)),[]);
  const togSpec=useCallback(id=>setFloorMix(p=>p.map(f=>f.id===id?{...f,isSpec:!f.isSpec}:f)),[]);
  const copyDown=useCallback(id=>{
    setFloorMix(p=>{const s=p.find(f=>f.id===id);if(!s)return p;return p.map(f=>f.id>id&&!f.isSpec?{...f,mix:{...s.mix},corr:s.corr,mep:s.mep,fh:s.fh,mepItems:s.mepItems?JSON.parse(JSON.stringify(s.mepItems)):null}:f);});
  },[]);
  const toggleBatchSel=useCallback(id=>{setBatchSel(prev=>{const n=new Set(prev);if(n.has(id))n.delete(id);else n.add(id);return n;});},[]);
  const selectRange=useCallback(()=>{const from=Math.max(1,parseInt(batchRangeFrom)||1),to=Math.min(floorMix.length,parseInt(batchRangeTo)||floorMix.length);const n=new Set();for(let i=from-1;i<to;i++){if(floorMix[i]&&!floorMix[i].isSpec)n.add(floorMix[i].id);}setBatchSel(n);},[batchRangeFrom,batchRangeTo,floorMix]);
  const selectAllStd=useCallback(()=>setBatchSel(new Set(floorMix.filter(f=>!f.isSpec).map(f=>f.id))),[floorMix]);
  const clearBatchSel=useCallback(()=>setBatchSel(new Set()),[]);
  const applyMepTemplateToFloor=useCallback((floorId)=>{setFloorMix(p=>p.map(f=>f.id===floorId?{...f,mepItems:mepTemplate.map(t=>({...t}))}:f));},[mepTemplate]);
  const applyMepTemplateToBs=useCallback((bsId)=>{setBsData(p=>p.map(f=>f.id===bsId?{...f,mepItems:mepTemplate.map(t=>({...t}))}:f));},[mepTemplate]);
  const applyBatch=useCallback(()=>{
    if(!batchSel.size){setBatchMsg("⚠ 請先勾選");setTimeout(()=>setBatchMsg(""),2500);return;}
    setFloorMix(p=>p.map(f=>{
      if(!batchSel.has(f.id)||f.isSpec)return f;
      const nm={};unitTypes.forEach(ut=>{const v=batchTpl["ut_"+ut.id];nm[ut.id]=v!==""&&v!==undefined?parseInt(v)||0:(f.mix[ut.id]||0);});
      const newF={...f,mix:nm,corr:batchTpl.corr!==""?batchTpl.corr:f.corr,mep:batchTpl.mep!==""?batchTpl.mep:f.mep,fh:batchTpl.fh!==""?batchTpl.fh:f.fh};
      if(useMepTemplate){newF.mepItems=mepTemplate.map(t=>({...t}));}
      return newF;
    }));
    setBatchMsg("✓ 已套用 "+batchSel.size+" 層");setTimeout(()=>setBatchMsg(""),2500);
  },[batchSel,batchTpl,unitTypes,useMepTemplate,mepTemplate]);

  const addUT=()=>{const id=nextUTId;setUnitTypes(p=>[...p,{id,name:String.fromCharCode(64+p.length+1)+"戶",spaces:[{id:1,name:"客廳",cat:"res",area:""},{id:2,name:"主臥",cat:"res",area:""},{id:3,name:"衛浴",cat:"bath",area:""},{id:4,name:"陽台",cat:"bal",area:""}]}]);setNextUTId(id+1);setExpandUT(id);setFloorMix(p=>p.map(f=>({...f,mix:{...f.mix,[id]:0}})));};
  const delUT=utId=>{if(unitTypes.length<=1)return;setUnitTypes(p=>p.filter(u=>u.id!==utId));setFloorMix(p=>p.map(f=>{const m={...f.mix};delete m[utId];return{...f,mix:m};}));};
  const addSp=utId=>setUnitTypes(p=>p.map(u=>u.id===utId?{...u,spaces:[...u.spaces,{id:Date.now(),name:"新空間",cat:"res",area:""}]}:u));
  const upSp=(utId,spId,field,val)=>setUnitTypes(p=>p.map(u=>u.id===utId?{...u,spaces:u.spaces.map(s=>s.id===spId?{...s,[field]:val}:s)}:u));
  const delSp=(utId,spId)=>setUnitTypes(p=>p.map(u=>u.id===utId?{...u,spaces:u.spaces.filter(s=>s.id!==spId)}:u));
  const upBs=useCallback((id,field,val)=>setBsData(p=>p.map(f=>f.id===id?{...f,[field]:val}:f)),[]);
  const addBsOth=useCallback(id=>setBsData(p=>p.map(f=>f.id===id?{...f,other:[...f.other,{id:Date.now(),name:"其他",area:""}]}:f)),[]);
  const upBsOth=useCallback((fid,oid,field,val)=>setBsData(p=>p.map(f=>f.id===fid?{...f,other:f.other.map(o=>o.id===oid?{...o,[field]:val}:o)}:f)),[]);
  const delBsOth=useCallback((fid,oid)=>setBsData(p=>p.map(f=>f.id===fid?{...f,other:f.other.filter(o=>o.id!==oid)}:f)),[]);
  const addZone=()=>{if(!nzN.trim()||!nzB||!nzF)return;setZones(p=>({...p,[nzC]:{...p[nzC],zones:{...p[nzC]?.zones,[nzN.trim()]:{b:pf(nzB),f:pf(nzF),s:pf(nzS)}}}}));setCounty(nzC);setZone(nzN.trim());setNzN("");setNzB("");setNzF("");setNzS("");setShowZone(false);};
  const upRfItem=useCallback((rfId,itemId,field,val)=>{setRfFloors(p=>p.map(rf=>rf.id===rfId?{...rf,items:rf.items.map(it=>it.id===itemId?{...it,[field]:val}:it)}:rf));},[]);
  const addRfItem=useCallback((rfId)=>{setRfFloors(p=>p.map(rf=>rf.id===rfId?{...rf,items:[...rf.items,{id:Date.now(),name:"新項目",area:""}]}:rf));},[]);
  const delRfItem=useCallback((rfId,itemId)=>{setRfFloors(p=>p.map(rf=>rf.id===rfId?{...rf,items:rf.items.filter(it=>it.id!==itemId)}:rf));},[]);
  const upRf=useCallback((rfId,field,val)=>{setRfFloors(p=>p.map(rf=>rf.id===rfId?{...rf,[field]:val}:rf));},[]);
  const addMepItem=useCallback(()=>{const id=nextMepId;setMepTemplate(p=>[...p,{id,name:"新項目",area:""}]);setNextMepId(id+1);},[nextMepId]);
  const upMepItem=useCallback((id,field,val)=>{setMepTemplate(p=>p.map(it=>it.id===id?{...it,[field]:val}:it));},[]);
  const delMepItem=useCallback((id)=>{setMepTemplate(p=>p.filter(it=>it.id!==id));},[]);
  const upFloorMepItem=useCallback((floorId,itemId,field,val)=>{setFloorMix(p=>p.map(f=>f.id===floorId&&f.mepItems?{...f,mepItems:f.mepItems.map(it=>it.id===itemId?{...it,[field]:val}:it)}:f));},[]);
  const upBsMepItem=useCallback((bsId,itemId,field,val)=>{setBsData(p=>p.map(f=>f.id===bsId&&f.mepItems?{...f,mepItems:f.mepItems.map(it=>it.id===itemId?{...it,[field]:val}:it)}:f));},[]);

  // ── 專案儲存（localStorage 版）──
  useEffect(()=>{loadSaved();},[]);
  const loadSaved=async()=>{try{const r=await storage.list("v5:");if(!r?.keys?.length)return;const l=[];for(const k of r.keys){try{const g=await storage.get(k);if(g?.value)l.push({k,...JSON.parse(g.value)});}catch(_){}}setSaved(l);}catch(_){}};
  const doSave=async()=>{if(!proj.trim())return;const d={proj,county,zone,btype,siteArea,footArea,floors,bsFlrs,gfh,bsfh,units,parking,notes,excRate,mepPct,bonus,unitTypes,floorMix:floorMix.slice(0,60),bsData:bsData.slice(0,15),hasSharedLobby,singleStair,roadWidth,setbackDist,hasVoid,rfFloors,rfCount,mepTemplate,useMepTemplate,at:new Date().toLocaleDateString("zh-TW")};try{await storage.set("v5:"+proj.trim(),JSON.stringify(d));setSaveMsg("✓ 已儲存");loadSaved();}catch(_){setSaveMsg("⚠ 失敗");}setTimeout(()=>setSaveMsg(""),2500);};
  const doLoad=p=>{setProj(p.proj||"");setCounty(p.county||"新北市");setZone(p.zone||"");setBtype(p.btype||"集合住宅");setSiteArea(p.siteArea||"");setFootArea(p.footArea||"");setFloors(p.floors||"");setBsFlrs(p.bsFlrs||"5");setGfh(p.gfh||"3.35");setBsfh(p.bsfh||"3.5");setUnits(p.units||"");setParking(p.parking||"");setNotes(p.notes||"");setExcRate(p.excRate||"0.75");setMepPct(p.mepPct||"12.4");setBonus(p.bonus||{lw:"0",sd:"0",cp:"0",tr:"0"});if(p.unitTypes)setUnitTypes(p.unitTypes);if(p.floorMix?.length)setFloorMix(p.floorMix);if(p.bsData?.length)setBsData(p.bsData);setHasSharedLobby(p.hasSharedLobby!==false);setSingleStair(!!p.singleStair);setRoadWidth(p.roadWidth||"");setSetbackDist(p.setbackDist||"");setHasVoid(!!p.hasVoid);if(p.rfFloors)setRfFloors(p.rfFloors);if(p.rfCount!==undefined)setRfCount(p.rfCount);if(p.mepTemplate)setMepTemplate(p.mepTemplate);if(p.useMepTemplate!==undefined)setUseMepTemplate(p.useMepTemplate);setChk({});setAiList([]);setTab("calc");};
  const doDel=async k=>{try{await storage.delete(k);loadSaved();}catch(_){}};
  const onImport=e=>{const file=e.target.files[0];if(!file)return;setImpMsg("⏳ 讀取中…");const reader=new FileReader();reader.onload=ev=>{try{const wb=XLSX.read(ev.target.result,{type:"array"});const ws=wb.Sheets["輸入"]||wb.Sheets[wb.SheetNames[0]];const rows=XLSX.utils.sheet_to_json(ws,{header:1,defval:null});let sa2="",nm="",zn="";rows.forEach(row=>{const k=String(row[0]||"").trim(),v=row[1];if(k==="案名"&&v)nm=String(v).substring(0,24);if(k==="基地面積"&&v)sa2=String(parseFloat(v));if(k==="使用分區"&&v)zn=String(v).trim();});if(sa2)setSiteArea(sa2);if(nm)setProj(nm.replace(/新北市|台北市/g,"").trim());if(zn&&zones["新北市"]?.zones[zn]){setCounty("新北市");setZone(zn);}setImpMsg("✓ 匯入成功");}catch(_){setImpMsg("⚠ 解析失敗");}setTimeout(()=>setImpMsg(""),3000);};reader.readAsArrayBuffer(file);e.target.value="";};

  const aiPrompt=useCallback(()=>"你是台灣建築法規專家，以JSON格式回覆（不加markdown）。專案："+proj+"|"+county+zone+"|"+btype+"|基地"+siteArea+"㎡|"+floors+'層。回傳：{"items":[{"category":"類別","title":"條文標題","rule":"法規","note":"說明","priority":"高|中|低"}]}',[proj,county,zone,btype,siteArea,floors]);
  const callAI=async()=>{setAiLoad(true);setAiErr("");setAiList([]);setChk({});try{const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,messages:[{role:"user",content:aiPrompt()}]})});const d=await res.json();const txt=d.content?.map(b=>b.text||"").join("")||"";setAiList(JSON.parse(txt.replace(/```json|```/g,"").trim()).items||[]);}catch(e){setAiErr("解析失敗："+e.message);}setAiLoad(false);};

  const PC={"高":C.red,"中":C.yellow,"低":C.green};
  const doneChk=Object.values(chk).filter(Boolean).length;
  const chkList=aiList.length>0?aiList:(CHKLIST[btype]||[]).map((t,i)=>({title:t,i}));
  const pctChk=chkList.length>0?Math.round((doneChk/chkList.length)*100):0;
  const TB=(t,l)=><button key={t} onClick={()=>setTab(t)} style={{padding:isMobile?"5px 8px":"6px 11px",borderRadius:"5px 5px 0 0",cursor:"pointer",background:tab===t?C.bg:"transparent",color:tab===t?C.cyan:C.dim,border:tab===t?"1px solid "+C.border:"1px solid transparent",borderBottom:tab===t?"1px solid "+C.bg:"none",fontSize:isMobile?10:11,fontWeight:tab===t?700:400,fontFamily:"monospace",marginBottom:-1,whiteSpace:"nowrap",flexShrink:0}}>{l}</button>;

  // ── alert level styles ──
  const AL = {
    error: { bg:"#2d1515", border:"#7f1d1d", icon:"✗", color:C.red },
    warn:  { bg:"#2d2410", border:"#78350f", icon:"⚠", color:C.yellow },
    info:  { bg:"#0d1f2d", border:"#164e63", icon:"ℹ", color:C.teal },
  };

  // ── Elevation SVG ──
  const ElevSVG = () => {
    const W=isMobile?140:180,PL=isMobile?22:28,PR=10,PT=18,PB=22,bsH=pf(bsfh)||3.5,bsCnt=Math.max(0,Math.round(bfl)),rfH=rfCalcs.reduce((s,r)=>s+r.fhv,0),aboveH=(totalH||1)+rfH,fullH=aboveH+bsCnt*bsH||1,drawH=(isMobile?260:340)-PT-PB,pxM=drawH/fullH,svgH=PT+drawH+PB;
    const aRects=[]; let cy=PT+(aboveH)*pxM;
    for(let i=0;i<floorCalcs.length;i++){const f=floorCalcs[i],bh=f.fh*pxM;cy-=bh;aRects.push({y:cy,h:bh,label:f.label,fh:f.fh,spec:floorMix[i]?.isSpec,has:f.hasData,id:f.id,fhBad:fhChecks[i]&&!fhChecks[i].ok});}
    const rfRects=[]; let ry=cy;
    for(let i=rfCalcs.length-1;i>=0;i--){const r=rfCalcs[i],bh=r.fhv*pxM;ry-=bh;rfRects.push({y:ry,h:bh,label:r.label,total:r.total});}
    const groundY=PT+(aboveH)*pxM;
    const bRects=[]; let by=groundY;
    for(let i=0;i<bsCnt;i++){const bh=bsH*pxM;bRects.push({y:by,h:bh,label:"B"+(i+1)});by+=bh;}
    return (
      <svg width={W} height={svgH} style={{display:"block",margin:"0 auto",overflow:"visible"}}>
        <line x1={PL} y1={PT} x2={PL} y2={svgH-PB} stroke="#1e3050" strokeWidth={1}/>
        {bRects.map((r,i)=>(<g key={i}><rect x={PL+2} y={r.y+0.5} width={W-PL-PR-2} height={Math.max(r.h-1,2)} fill="#0d1520" stroke="#283050" strokeWidth={1} strokeDasharray="3,2" rx={1}/>{r.h>=10&&<text x={PL+2+(W-PL-PR-2)/2} y={r.y+r.h/2+3} textAnchor="middle" fill="#334155" fontSize={Math.min(9,r.h-2)} fontFamily="monospace">{r.label}</text>}</g>))}
        {aRects.map(r=>(<g key={r.id}><rect x={PL+2} y={r.y+0.5} width={W-PL-PR-2} height={Math.max(r.h-1,2)} fill={r.fhBad?"#2d1515":r.spec?"#1a2a14":r.has?"#0d253f":"#0d1f38"} stroke={r.fhBad?"#f8717180":r.spec?"#fbbf2480":r.has?"#38bdf880":"#1e3050"} strokeWidth={r.has?1.5:0.5} rx={1}/>{r.h>=10&&<text x={PL+2+(W-PL-PR-2)/2} y={r.y+r.h/2+3} textAnchor="middle" fill={r.fhBad?"#f87171":r.has?"#38bdf8":"#334155"} fontSize={Math.min(9,r.h-2)} fontFamily="monospace">{r.label}</text>}</g>))}
        {rfRects.map((r,i)=>(<g key={i}><rect x={PL+2} y={r.y+0.5} width={W-PL-PR-2} height={Math.max(r.h-1,2)} fill="#1a1a0d" stroke="#fbbf2480" strokeWidth={1.5} strokeDasharray="4,2" rx={1}/>{r.h>=10&&<text x={PL+2+(W-PL-PR-2)/2} y={r.y+r.h/2+3} textAnchor="middle" fill="#fbbf24" fontSize={Math.min(9,r.h-2)} fontFamily="monospace">{r.label}</text>}</g>))}
        <line x1={PL-6} y1={groundY} x2={W-PR} y2={groundY} stroke="#10b981" strokeWidth={2}/>
        <text x={PL-8} y={groundY+3} fill="#10b981" fontSize={8} fontFamily="monospace" textAnchor="end">±0</text>
        {shadowMaxH&&totalH>0&&<><line x1={PL-6} y1={groundY-shadowMaxH*pxM} x2={W-PR} y2={groundY-shadowMaxH*pxM} stroke="#f59e0b" strokeWidth={1} strokeDasharray="4,3"/><text x={W-PR-2} y={groundY-shadowMaxH*pxM-3} textAnchor="end" fill="#f59e0b" fontSize={7} fontFamily="monospace">{"H限"+shadowMaxH.toFixed(1)+"M"}</text></>}
        <text x={PL+2+(W-PL-PR-2)/2} y={PT-4} textAnchor="middle" fill={totalHWithRF>0?"#4ade80":"#334155"} fontSize={9} fontWeight="bold" fontFamily="monospace">{totalHWithRF>0?("▲"+totalHWithRF.toFixed(1)+"M"):"—"}</text>
      </svg>
    );
  };

  // ══════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════
  return (
    <div style={{background:C.bg,minHeight:"100vh",fontFamily:"'IBM Plex Mono','Courier New',monospace",color:C.text}}>

      {/* HEADER */}
      <div style={{background:"linear-gradient(135deg,#0a1628,#0d1f38)",borderBottom:"1px solid "+C.border,padding:isMobile?"10px 12px":"13px 20px",display:"flex",alignItems:isMobile?"flex-start":"center",gap:isMobile?8:12,flexWrap:"wrap",flexDirection:isMobile?"column":"row"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:isMobile?28:34,height:isMobile?28:34,background:"linear-gradient(135deg,#0ea5e9,#6366f1)",borderRadius:7,display:"flex",alignItems:"center",justifyContent:"center",fontSize:isMobile?13:16,flexShrink:0}}>🏛</div>
          <div>
            <div style={{fontSize:isMobile?12:14,fontWeight:700,color:"#f1f5f9",letterSpacing:1}}>建築法規 AI 檢討系統</div>
            <div style={{fontSize:isMobile?9:10,color:C.dim}}>Building Code Review · v7.1 · {REG_DB.length} 條 · localStorage</div>
          </div>
        </div>
        <div style={{marginLeft:isMobile?0:"auto",display:"flex",gap:3,flexWrap:"nowrap",overflowX:"auto",WebkitOverflowScrolling:"touch",width:isMobile?"100%":"auto",paddingBottom:2}}>
          {[["calc","⚙ 驗算"],["dev","📊 開發量"],["space","🏠 面積"],["search","🔍 法規"],["ai","🤖 AI"],["ref","🗂 細則"],["projects","💾 專案"]].map(([t,l])=>TB(t,l))}
        </div>
      </div>

      {/* PROJECT BAR */}
      <div style={{background:C.bg2,borderBottom:"1px solid "+C.border,padding:isMobile?"10px 12px":"12px 20px"}}>
        <div style={{display:"flex",alignItems:"center",gap:9,marginBottom:9,flexWrap:"wrap"}}>
          <span style={{fontSize:10,color:C.dim,letterSpacing:2}}>▸ 專案資訊</span>
          <div style={{flex:1,minWidth:isMobile?120:150}}><input value={proj} onChange={e=>setProj(e.target.value)} placeholder="專案名稱" style={{...INP,background:C.bg3,border:"1px solid #38bdf822",color:C.cyan,fontWeight:700}}/></div>
          <button onClick={()=>fileRef.current?.click()} style={{background:"#0d2540",border:"1px solid #0ea5e944",color:"#0ea5e9",borderRadius:5,padding:"5px 11px",cursor:"pointer",fontSize:11,fontFamily:"monospace"}}>📂 匯入</button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={onImport} style={{display:"none"}}/>
          {impMsg&&<span style={{fontSize:10,color:impMsg.startsWith("✓")?C.green:C.yellow}}>{impMsg}</span>}
          <button onClick={doSave} style={{background:"#0d2a1a",border:"1px solid #4ade8044",color:C.green,borderRadius:5,padding:"5px 11px",cursor:"pointer",fontSize:11,fontFamily:"monospace"}}>💾 儲存</button>
          {saveMsg&&<span style={{fontSize:10,color:saveMsg.startsWith("✓")?C.green:C.yellow}}>{saveMsg}</span>}
        </div>
        <div style={{display:"grid",gridTemplateColumns:isMobile?"repeat(2,1fr)":"repeat(auto-fill,minmax(120px,1fr))",gap:8}}>
          {[{l:"縣市",el:<select value={county} onChange={e=>{setCounty(e.target.value);setZone(Object.keys(zones[e.target.value]?.zones||{})[0]||"");}} style={INP}>{Object.keys(zones).map(c=><option key={c}>{c}</option>)}</select>},{l:"用途分區",el:<select value={zone} onChange={e=>setZone(e.target.value)} style={INP}>{Object.keys(zones[county]?.zones||{}).map(z=><option key={z}>{z}</option>)}</select>},{l:"建築類型",el:<select value={btype} onChange={e=>{setBtype(e.target.value);setChk({});setAiList([]);}} style={INP}>{BTYPES.map(t=><option key={t}>{t}</option>)}</select>},{l:"基地面積㎡",el:<input type="number" value={siteArea} onChange={e=>setSiteArea(e.target.value)} style={INP}/>},{l:"建築面積㎡",el:<input type="number" value={footArea} onChange={e=>setFootArea(e.target.value)} style={INP}/>},{l:"地上層數",el:<input type="number" value={floors} onChange={e=>setFloors(e.target.value)} style={INP}/>},{l:"地下層數",el:<input type="number" value={bsFlrs} onChange={e=>setBsFlrs(e.target.value)} style={{...INP,color:C.purple}}/>},{l:"屋突層數",el:<input type="number" min={0} max={3} value={rfCount} onChange={e=>setRfCount(Math.max(0,Math.min(3,parseInt(e.target.value)||0)))} style={{...INP,color:C.yellow}}/>},{l:"地上層高M",el:<input type="number" step="0.1" value={gfh} onChange={e=>setGfh(e.target.value)} style={INP}/>},{l:"地下層高M",el:<input type="number" step="0.1" value={bsfh} onChange={e=>setBsfh(e.target.value)} style={{...INP,color:C.purple}}/>},{l:"戶數",el:<input type="number" value={units} onChange={e=>setUnits(e.target.value)} style={INP}/>},{l:"設計停車位",el:<input type="number" value={parking} onChange={e=>setParking(e.target.value)} style={INP}/>}].map(({l,el})=><div key={l}><div style={{fontSize:10,color:C.dim,marginBottom:3}}>{l}</div>{el}</div>)}
        </div>
        <div style={{marginTop:10,padding:"10px 12px",background:C.bg3,borderRadius:7,border:"1px solid "+C.border}}>
          <div style={{fontSize:10,color:C.orange,fontWeight:700,marginBottom:8}}>§162 / §164 參數設定</div>
          <div style={{display:"flex",gap:isMobile?8:12,flexWrap:"wrap",alignItems:"center"}}>
            <label style={{display:"flex",alignItems:"center",gap:4,fontSize:isMobile?10:11,color:C.muted,cursor:"pointer"}}><input type="checkbox" checked={hasSharedLobby} onChange={e=>setHasSharedLobby(e.target.checked)} style={{accentColor:C.cyan}}/>共用梯廳</label>
            <label style={{display:"flex",alignItems:"center",gap:4,fontSize:isMobile?10:11,color:C.muted,cursor:"pointer"}}><input type="checkbox" checked={singleStair} onChange={e=>setSingleStair(e.target.checked)} style={{accentColor:C.teal}}/>僅一座直通梯</label>
            {isRes&&<label style={{display:"flex",alignItems:"center",gap:4,fontSize:isMobile?10:11,color:C.muted,cursor:"pointer"}}><input type="checkbox" checked={hasVoid} onChange={e=>setHasVoid(e.target.checked)} style={{accentColor:C.lav}}/>挑空設計</label>}
            <div style={{display:"flex",alignItems:"center",gap:4}}><span style={{fontSize:10,color:C.dim}}>道路寬</span><input type="number" value={roadWidth} onChange={e=>setRoadWidth(e.target.value)} placeholder="—" style={{...INP,width:50,padding:"3px 5px",fontSize:11,textAlign:"center"}}/></div>
            <div style={{display:"flex",alignItems:"center",gap:4}}><span style={{fontSize:10,color:C.dim}}>退縮D</span><input type="number" value={setbackDist} onChange={e=>setSetbackDist(e.target.value)} placeholder="—" style={{...INP,width:50,padding:"3px 5px",fontSize:11,textAlign:"center"}}/></div>
            {shadowMaxH&&<span style={{fontSize:11,color:C.yellow,fontWeight:700}}>→ H≤{shadowMaxH.toFixed(1)}M</span>}
          </div>
        </div>
        {!isMobile&&<div style={{marginTop:8}}><div style={{fontSize:10,color:C.dim,marginBottom:3}}>備註</div><textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={1} style={{...INP,resize:"none"}}/></div>}
      </div>

      {/* ══ AUTO ALERTS BANNER ══ */}
      {autoAlerts.length > 0 && tab !== "search" && (
        <div style={{background:"#0a0e18",borderBottom:"1px solid "+C.border,padding:isMobile?"6px 12px":"8px 20px"}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:showAutoAlerts?7:0,flexWrap:"wrap"}}>
            <span style={{fontSize:10,color:C.orange,fontWeight:700}}>⚡ 智慧法規提示</span>
            <span style={{background:autoAlerts.filter(a=>a.level==="error").length>0?"#3a1a1a":"#1a2a14",color:autoAlerts.filter(a=>a.level==="error").length>0?C.red:C.green,border:"1px solid",borderColor:autoAlerts.filter(a=>a.level==="error").length>0?"#f8717144":"#4ade8044",borderRadius:10,padding:"1px 8px",fontSize:10,fontWeight:700}}>{autoAlerts.filter(a=>a.level==="error").length} 錯誤 · {autoAlerts.filter(a=>a.level==="warn").length} 警告</span>
            <button onClick={()=>setShowAutoAlerts(v=>!v)} style={{marginLeft:"auto",background:"transparent",border:"1px solid "+C.border,color:C.dim,borderRadius:4,padding:"2px 8px",cursor:"pointer",fontSize:10,fontFamily:"monospace"}}>{showAutoAlerts?"▲":"▼"}</button>
          </div>
          {showAutoAlerts&&(
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {autoAlerts.map((a,i)=>(
                <div key={i} style={{display:"flex",alignItems:"flex-start",gap:6,background:AL[a.level].bg,border:"1px solid "+AL[a.level].border,borderRadius:6,padding:"5px 9px",flex:isMobile?"1 1 100%":"1 1 280px",minWidth:isMobile?0:220}}>
                  <span style={{color:AL[a.level].color,fontWeight:700,fontSize:11,flexShrink:0}}>{AL[a.level].icon}</span>
                  <div style={{minWidth:0}}>
                    <span style={{color:AL[a.level].color,fontFamily:"monospace",fontSize:10,fontWeight:700,marginRight:5}}>{a.code}</span>
                    <span style={{color:C.muted,fontSize:10}}>{a.msg}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div style={{padding:isMobile?"10px 12px":"15px 20px"}}>

        {/* ═══ CALC TAB ═══ */}
        {tab==="calc"&&(
          <div style={{display:"flex",gap:14,flexWrap:"wrap",alignItems:"flex-start",flexDirection:isMobile?"column":"row"}}>
            <div style={{flex:"2 1 400px",display:"flex",flexDirection:"column",gap:13,minWidth:0,width:isMobile?"100%":undefined}}>
              <div style={{fontSize:10,color:C.dim,letterSpacing:2}}>▸ 條文自動驗算 — §160~§166</div>

              {((!isNaN(bcrC)&&bcrC>BCR)||actFARr>allowFARr||mepOverCap||fhViolations>0||(shadowMaxH&&totalH>shadowMaxH))&&(
                <div style={{background:"#2d1515",border:"1px solid #7f1d1d",borderRadius:8,padding:isMobile?"8px 12px":"10px 16px",display:"flex",gap:12,alignItems:"flex-start"}}>
                  <span style={{fontSize:18,marginTop:2}}>⚠</span>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{color:C.red,fontSize:12,fontWeight:700,marginBottom:4}}>法規超限警告</div>
                    {!isNaN(bcrC)&&bcrC>BCR&&<div style={{color:"#fca5a5",fontSize:11}}>§161 建蔽率 {bcrC.toFixed(1)}% 超過法定 {BCR}%</div>}
                    {actFARr>allowFARr&&<div style={{color:"#fca5a5",fontSize:11}}>§161 容積率 {actFARr.toFixed(1)}% 超過允建 {allowFARr.toFixed(1)}%</div>}
                    {mepOverCap&&<div style={{color:"#fca5a5",fontSize:11}}>§162-2 機電免計 {sumMep.toFixed(0)}㎡ 超過上限 {mepCapArea.toFixed(0)}㎡</div>}
                    {fhViolations>0&&<div style={{color:"#fca5a5",fontSize:11}}>§164-1 有 {fhViolations} 層樓高超過限制</div>}
                    {shadowMaxH&&totalH>shadowMaxH&&<div style={{color:"#fca5a5",fontSize:11}}>§164 建築高度 {totalH.toFixed(1)}M 超過限高 {shadowMaxH.toFixed(1)}M</div>}
                  </div>
                </div>
              )}

              <div style={{...CARD,padding:"13px 16px"}}>
                <div style={{display:"flex",justifyContent:"space-around",flexWrap:"wrap",gap:isMobile?6:10}}>
                  <Arc value={isNaN(bcrC)?0:bcrC} max={BCR||50} color={C.cyan} label="建蔽率" isMobile={isMobile}/>
                  <Arc value={actFARr||0} max={allowFARr||FAR||200} color={C.purple} label="容積率" isMobile={isMobile}/>
                  <Arc value={totalH||0} max={shadowMaxH||99} color={C.yellow} label="建築高度" unit="M" isMobile={isMobile}/>
                  {!isNaN(parkReq)&&<Arc value={pf(parking)} max={parkReq} color={C.green} label="停車位" unit="位" isMobile={isMobile}/>}
                </div>
                <div style={{marginTop:10,display:"flex",gap:isMobile?8:14,justifyContent:"center",flexWrap:"wrap"}}>
                  {[["法定建蔽",BCR+"%",C.cyan],["法定容積",FAR+"%",C.purple],["允建容積",n1(allowFARr)+"%",C.yellow],["退縮",zd.s||"—",C.green],["機電上限",mepCapPct+"%",C.teal]].map(([l,v,c])=>(<span key={l} style={{fontSize:isMobile?10:11,color:C.muted}}>{l}：<b style={{color:c}}>{v}</b></span>))}
                </div>
              </div>

              <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:13}}>
                <div style={CARD}>
                  {SH("📐","基本量體 §161")}
                  <CRow label="建蔽率" val={isNaN(bcrC)?"":bcrC} unit="%" limit={BCR} lLabel={"≤"+BCR+"%"} isMobile={isMobile}/>
                  <CRow label="容積率（實設）" val={actFARr||""} unit="%" limit={allowFARr||FAR} lLabel={"≤"+n1(allowFARr)+"%"} note={bsFARContrib>0?"含地下室計容 "+bsFARContrib.toFixed(1)+"㎡":""} isMobile={isMobile}/>
                  <CRow label="建築高度 §164" val={totalH||""} unit="M" limit={shadowMaxH||999} lLabel={shadowMaxH?"≤"+shadowMaxH.toFixed(1)+"M":"輸入道路寬啟用"} note={shadowMaxH?"H≤3.6×("+roadWidth+"+"+setbackDist+")":""} isMobile={isMobile}/>
                  <CRow label="停車位" val={parking!==""?pf(parking):""} unit="位" limit={parkReq} lLabel={!isNaN(parkReq)?"≥"+parkReq+"位":"依用途另計"} inv note="§162-3 停車免計容積" isMobile={isMobile}/>
                  <CRow label="屋突面積 §99" val={rfTotal||""} unit="㎡" limit={rfMaxArea||999} lLabel={rfMaxArea>0?"≤"+rfMaxArea.toFixed(1)+"㎡":"—"} note="≤建築面積×1/8" isMobile={isMobile}/>
                </div>

                <div style={CARD}>
                  {SH("📋","§162 容積免計明細",C.orange)}
                  <div style={{padding:"10px 13px",borderBottom:"1px solid "+C.border2}}>
                    <div style={{fontSize:11,color:C.yellow,fontWeight:700,marginBottom:6}}>{hasSharedLobby?"陽台≤10% + 梯廳≤10%（合計≤15%）":"無共用梯廳：陽台≤12.5%或8㎡"}</div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6}}>
                      {[["陽台總計",n2(sumBal),C.purple],["陽台免計",n2(sumBalExempt),C.green],["陽台計容",n2(sumBalCounted),sumBalCounted>0?C.red:C.faint]].map(([l,v,c])=>(<div key={l}><div style={{fontSize:9,color:C.dim}}>{l}</div><div style={{color:c,fontFamily:"monospace",fontSize:12,fontWeight:700}}>{v}</div></div>))}
                    </div>
                    {hasSharedLobby&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,marginTop:6}}>{[["梯廳總計",n2(sumCorr),C.lav],["梯廳免計",n2(sumCorrExempt),C.green],["梯廳計容",n2(sumCorrCounted),sumCorrCounted>0?C.red:C.faint]].map(([l,v,c])=>(<div key={l}><div style={{fontSize:9,color:C.dim}}>{l}</div><div style={{color:c,fontFamily:"monospace",fontSize:12,fontWeight:700}}>{v}</div></div>))}</div>}
                  </div>
                  <div style={{padding:"10px 13px",borderBottom:"1px solid "+C.border2}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:11,color:C.teal,fontWeight:700}}>§162-2 機電上限（{mepCapPct}%）</span><Badge pass={!mepOverCap} idle={sumMep===0||!lFAR}/></div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6}}>
                      {[["機電總計",n2(sumMep)+"㎡",C.teal],["免計上限",n2(mepCapArea)+"㎡",C.dim],[mepOverCap?"超出":"餘額",(mepOverCap?"+":"")+n2(Math.abs(mepCapArea-sumMep))+"㎡",mepOverCap?C.red:C.green]].map(([l,v,c])=>(<div key={l}><div style={{fontSize:9,color:C.dim}}>{l}</div><div style={{color:c,fontFamily:"monospace",fontSize:11,fontWeight:700}}>{v}</div></div>))}
                    </div>
                  </div>
                  {isRes&&<div style={{padding:"10px 13px"}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:11,color:C.lav,fontWeight:700}}>§164-1 樓層高度限制</span><Badge pass={fhViolations===0} idle={!fl}/></div>
                    <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{[hasVoid?["挑空層","≤6.0M"]:["地面層","≤4.2M"],["其餘層","≤3.6M"]].map(([l,v])=>(<span key={l} style={{fontSize:10,color:C.muted}}>{l} <b style={{color:C.text}}>{v}</b></span>))}</div>
                    {fhViolations>0&&<div style={{marginTop:4,fontSize:10,color:C.red}}>⚠ {fhChecks.map((c,i)=>c.limit&&!c.ok?(floorCalcs[i].label+"("+floorCalcs[i].fh.toFixed(2)+"M>"+c.limit+"M)"):null).filter(Boolean).join("、")}</div>}
                  </div>}
                </div>

                {/* ── 防火/安全梯 ── */}
                <div style={CARD}>
                  {SH("🔥","防火區劃 §79 · 安全梯",C.red)}
                  <div style={{padding:"11px 13px",borderBottom:"1px solid "+C.border2}}>
                    <div style={{fontSize:11,color:C.red,fontWeight:700,marginBottom:7}}>防火區劃面積上限</div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                      {[
                        ["無自動撒水",fl>=11?"每區≤100㎡":"每區≤1500㎡",fl>=11?C.red:C.yellow],
                        ["設自動撒水",fl>=11?"每區≤300㎡":"每區≤4500㎡",C.green],
                      ].map(([l,v,c])=>(<div key={l} style={{background:C.bg,borderRadius:5,padding:"6px 10px",border:"1px solid "+C.border}}>
                        <div style={{fontSize:10,color:C.dim,marginBottom:2}}>{l}</div>
                        <div style={{color:c,fontFamily:"monospace",fontWeight:700,fontSize:12}}>{v}</div>
                      </div>))}
                    </div>
                  </div>
                  <div style={{padding:"11px 13px"}}>
                    <div style={{fontSize:11,color:C.yellow,fontWeight:700,marginBottom:7}}>安全梯 / 消防</div>
                    <div style={{display:"flex",flexDirection:"column",gap:5}}>
                      {[
                        {l:"梯型",v:fl>=11?"特別安全梯":fl>=4?"安全梯":"一般",c:fl>=11?C.red:fl>=4?C.yellow:C.green},
                        {l:"電梯",v:fl>=4?"應設 §100":"不強制",c:fl>=4?C.yellow:C.faint},
                        {l:"緊急昇降",v:totalH>50?"須設 §106":"不需",c:totalH>50?C.red:C.faint},
                        {l:"消防",v:fl>=11?"全棟撒水+排煙":"依面積",c:fl>=11?C.orange:C.muted},
                      ].map(({l,v,c})=>(<div key={l} style={{display:"flex",justifyContent:"space-between",fontSize:11,borderBottom:"1px solid "+C.border2,paddingBottom:4}}>
                        <span style={{color:C.muted}}>{l}</span>
                        <span style={{color:c,fontFamily:"monospace",fontWeight:700}}>{v}</span>
                      </div>))}
                    </div>
                  </div>
                </div>

                <div style={CARD}>
                  {SH("🪟","採光 / 通風 · 無障礙",C.lav)}
                  <div style={{padding:"10px 13px",borderBottom:"1px solid "+C.border2}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><span style={{color:C.muted,fontSize:12}}>採光窗≥1/8 §43</span><Badge pass={winA&&avgFlr?pf(winA)>=avgFlr/8:undefined} idle={!winA||!avgFlr}/></div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7}}><div><div style={{color:C.dim,fontSize:10,marginBottom:2}}>下限</div><div style={{color:C.yellow,fontFamily:"monospace"}}>{avgFlr?"≥"+(avgFlr/8).toFixed(2)+"㎡":"—"}</div></div><div><div style={{color:C.dim,fontSize:10,marginBottom:2}}>設計窗面積</div><input type="number" value={winA} onChange={e=>setWinA(e.target.value)} style={{...INP,padding:"4px 7px"}}/></div></div>
                  </div>
                  <div style={{padding:"10px 13px",borderBottom:"1px solid "+C.border2}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><span style={{color:C.muted,fontSize:12}}>通風≥1/20 §44</span><Badge pass={ventA&&avgFlr?pf(ventA)>=avgFlr/20:undefined} idle={!ventA||!avgFlr}/></div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7}}><div><div style={{color:C.dim,fontSize:10,marginBottom:2}}>下限</div><div style={{color:C.yellow,fontFamily:"monospace"}}>{avgFlr?"≥"+(avgFlr/20).toFixed(2)+"㎡":"—"}</div></div><div><div style={{color:C.dim,fontSize:10,marginBottom:2}}>設計開口</div><input type="number" value={ventA} onChange={e=>setVentA(e.target.value)} style={{...INP,padding:"4px 7px"}}/></div></div>
                  </div>
                  <div style={{padding:"10px 13px"}}>
                    <div style={{fontSize:11,color:C.lav,fontWeight:700,marginBottom:6}}>無障礙 §167~</div>
                    <div style={{display:"flex",flexDirection:"column",gap:3}}>
                      {[
                        {l:"適用",v:fl>=5||pf(units)>=16?"需設":"確認",c:fl>=5||pf(units)>=16?C.yellow:C.faint},
                        {l:"坡道",v:"≤1/12；寬≥1.2M",c:C.muted},
                        {l:"電梯",v:"深≥1.4M；門≥0.8M",c:C.muted},
                        {l:"停車",v:"每50位設1個(3.5M)",c:C.muted},
                      ].map(({l,v,c})=>(<div key={l} style={{display:"flex",justifyContent:"space-between",fontSize:10,borderBottom:"1px solid "+C.border2,paddingBottom:3}}>
                        <span style={{color:C.dim}}>{l}</span><span style={{color:c,fontFamily:"monospace"}}>{v}</span>
                      </div>))}
                    </div>
                  </div>
                </div>

                <div style={{...CARD,gridColumn:isMobile?undefined:"1 / -1"}}>
                  <div style={{background:C.bg3,padding:"8px 13px",fontSize:11,color:C.yellow,fontWeight:700,borderBottom:"1px solid "+C.border2}}>⚡ §160~§166 法規速查表</div>
                  <div style={{padding:13,display:"grid",gridTemplateColumns:isMobile?"repeat(2,1fr)":"repeat(auto-fill,minmax(155px,1fr))",gap:7}}>
                    {[["§161 容積率","容積總樓地板÷基地面積","#0ea5e9"],["§162-1 陽台","≤10%免計；合計≤15%","#a78bfa"],["§162-2 機電","免計≤基地容積15%","#06b6d4"],["§162-3 停車","全部停車免計容積","#10b981"],["§164 日照","H≤3.6(Sw+D)","#ef4444"],["§164-1 層高","1F≤4.2M；餘≤3.6M","#a78bfa"],["§79 防火區劃","≤10層1500㎡；≥11層100㎡","#f87171"],["§95/96 安全梯","4層→安全梯；11層→特安梯","#fb923c"],["§100 電梯","≥4層須設置","#38bdf8"],["§106 緊急昇降","H>50M須設","#ef4444"],["§46 隔音","分戶牆Rw≥45dB","#a78bfa"],["§92 步行距離","防火建築≤50M","#10b981"]].map(([t,d,c])=>(<div key={t} style={{background:C.bg,border:"1px solid "+c+"33",borderRadius:7,padding:isMobile?"6px 8px":"8px 10px",cursor:"pointer"}} onClick={()=>{setSearchQ(t.replace("§","").split(" ")[0]);setTab("search");}}>
                      <div style={{color:c,fontSize:isMobile?10:11,fontWeight:700,marginBottom:2}}>{t}</div>
                      <div style={{color:C.muted,fontSize:isMobile?9:10}}>{d}</div>
                    </div>))}
                  </div>
                </div>
              </div>
            </div>

            {/* ── 立面圖（手機時全寬、桌面時側邊欄）── */}
            <div style={{flex:isMobile?"1 1 100%":"0 0 200px",width:isMobile?"100%":undefined}}>
              <div style={CARD}>
                {SH("🏗","立面示意圖",C.yellow)}
                <div style={{padding:"10px 6px"}}><ElevSVG/><div style={{marginTop:10,display:"flex",flexDirection:"column",gap:5,padding:"0 6px"}}>
                  {[["地上總高",totalH>0?totalH.toFixed(1)+"M":"—",C.green],["含屋突",totalHWithRF>0?totalHWithRF.toFixed(1)+"M":"—",C.yellow],["層數",fl+"層/B"+bsFlrs+"/RF"+rfCount,C.cyan]].map(([l,v,c])=>(<div key={l} style={{display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:11}}><span style={{color:C.dim}}>{l}</span><span style={{color:c,fontFamily:"monospace",fontWeight:700}}>{v}</span></div>))}
                  {shadowMaxH&&<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:11,borderTop:"1px solid "+C.border,paddingTop:4}}><span style={{color:C.dim}}>§164限高</span><span style={{color:totalH>shadowMaxH?C.red:C.yellow,fontFamily:"monospace",fontWeight:700}}>{shadowMaxH.toFixed(1)}M</span></div>}
                </div></div>
              </div>
            </div>
          </div>
        )}

        {/* ═══ DEV TAB ═══ */}
        {tab==="dev"&&(
          <div style={{display:"flex",flexDirection:"column",gap:13}}>
            <div style={{fontSize:10,color:C.dim,letterSpacing:2}}>▸ 開發量評估</div>
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1.4fr",gap:13}}>
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                <div style={CARD}>{SH("📌","基本參數")}<div style={{padding:"12px 13px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>{[["基地面積",(sa||"—")+"㎡",C.cyan],["法定建蔽",BCR+"%",C.cyan],["法定容積",FAR+"%",C.purple],["地上層數",(fl||"—")+"層",C.yellow]].map(([l,v,c])=>(<div key={l}><div style={{fontSize:10,color:C.dim,marginBottom:2}}>{l}</div><div style={{color:c,fontFamily:"monospace",fontSize:13,fontWeight:700}}>{v}</div></div>))}</div></div>
                <div style={CARD}>{SH("🏗","地下室參數",C.teal)}<div style={{padding:"12px 13px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>{[["開挖率",excRate,setExcRate,"×基地"],["地下層數",bsFlrs,setBsFlrs,"層"],["地下機電%",bsMepPct,setBsMepPct,"%"]].map(([l,v,sv,u])=>(<div key={l}><div style={{fontSize:10,color:C.dim,marginBottom:3}}>{l}</div><div style={{display:"flex",alignItems:"center",gap:5}}><input type="number" value={v} onChange={e=>sv(e.target.value)} style={{...INP,flex:1}}/><span style={{color:C.dim,fontSize:10}}>{u}</span></div></div>))}</div></div>
                <div style={CARD}>{SH("🎯","容積獎勵",C.yellow)}<div style={{padding:"12px 13px",display:"flex",flexDirection:"column",gap:8}}>{[["lw","危老獎勵","≤40%",C.red,bLw],["sd","海砂屋","≤30%",C.orange,bSd],["cp","綜合設計","≤30%",C.yellow,bCp],["tr","容積移轉","≤30%",C.green,bTr]].map(([k,label,hint,c,bv])=>(<div key={k} style={{display:"flex",alignItems:"center",gap:8}}><div style={{flex:1,fontSize:12,color:C.muted}}>{label} <span style={{fontSize:10,color:C.dim}}>({hint})</span></div><div style={{display:"flex",alignItems:"center",gap:4,width:80}}><input type="number" min={0} max={100} value={bonus[k]} onChange={e=>setBonus(p=>({...p,[k]:e.target.value}))} style={{...INP,width:55,textAlign:"right",color:c,fontWeight:700}}/><span style={{color:C.dim,fontSize:10}}>%</span></div><div style={{width:65,textAlign:"right",color:c,fontFamily:"monospace",fontSize:10}}>{lFAR?"+"+bv.toFixed(0)+"㎡":"—"}</div></div>))}<div style={{borderTop:"1px solid "+C.border2,paddingTop:8,display:"flex",alignItems:"center",gap:8}}><div style={{flex:1,fontSize:12,color:C.muted}}>機電佔比</div><div style={{display:"flex",alignItems:"center",gap:4,width:80}}><input type="number" min={0} max={50} step={0.1} value={mepPct} onChange={e=>setMepPct(e.target.value)} style={{...INP,width:55,textAlign:"right",color:C.teal,fontWeight:700}}/><span style={{color:C.dim,fontSize:10}}>%</span></div></div></div></div>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                <div style={CARD}>{SH("📊","容積計算結果")}<RL label="法定容積" val={n2(lFAR)} sub={py(lFAR)}/><RL label="最大建築面積" val={n2(maxBld)} sub={py(maxBld)}/>{bLw>0&&<RL label="  危老獎勵" val={n2(bLw)} sub={py(bLw)} color={C.red}/>}{bSd>0&&<RL label="  海砂屋" val={n2(bSd)} sub={py(bSd)} color={C.orange}/>}{bCp>0&&<RL label="  綜合設計" val={n2(bCp)} sub={py(bCp)} color={C.yellow}/>}{bTr>0&&<RL label="  容移" val={n2(bTr)} sub={py(bTr)} color={C.green}/>}<RL label="✦ 允建容積" val={n2(allowFAR)} sub={py(allowFAR)} color={C.cyan} bold/><RL label="✦ 允建容積率" val={n1(allowFARr)} unit="%" color={C.purple} bold/></div>
                <div style={CARD}>{SH("🏢","最大開發量")}<RL label="最大樓地板（含機電）" val={n2(maxFlr)} sub={py(maxFlr)} bold/><RL label="  機電估" val={n2(maxFlr*mepR)} sub={py(maxFlr*mepR)} color={C.teal}/><RL label={"  機電上限("+mepCapPct+"%)"} val={n2(mepCapArea)} color={mepOverCap?C.red:C.teal}/><RL label="最大陽台（≤10%）" val={n2(allowFAR*0.1)} sub={py(allowFAR*0.1)} color={C.lav}/><RL label="屋突上限（12.5%）" val={n2(rfMaxArea)} sub={py(rfMaxArea)} color={C.yellow}/><RL label="地下室總面積" val={n2(bsArea)} sub={py(bsArea)} color={C.green}/><RL label="估算停車位（40㎡/位）" val={estPk} unit="輛" color={C.green}/></div>
              </div>
            </div>
          </div>
        )}

        {/* ═══ SPACE TAB ═══ */}
        {tab==="space"&&(
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <div style={{fontSize:10,color:C.dim,letterSpacing:2}}>▸ 面積計算表</div>
            <div style={{...CARD,padding:isMobile?"12px":"14px 18px"}}>
              <div style={{display:"flex",gap:isMobile?10:20,flexWrap:"wrap",marginBottom:12}}>
                {[["屋突",n2(rfTotal),C.yellow],["地上容積",n2(aboveFAR),C.cyan],["地下計容",n2(bsFARContrib),bsFARContrib>0?C.orange:C.faint],["總容積",n2(sumFAR),C.cyan],["實設率",n1(actFARr)+"%",actFARr>allowFARr?C.red:C.green]].map(([l,v,c])=>(<div key={l} style={{minWidth:isMobile?70:90}}><div style={{fontSize:10,color:C.dim,marginBottom:2}}>{l}</div><div style={{fontSize:isMobile?13:15,fontWeight:700,color:c,fontFamily:"monospace"}}>{v}</div></div>))}
              </div>
              <div style={{height:7,background:"#1e2d40",borderRadius:3,overflow:"hidden"}}><div style={{width:Math.min((actFARr/(allowFARr||1))*100,100)+"%",height:"100%",background:actFARr>allowFARr?"#ef4444":"linear-gradient(90deg,#38bdf8,#6366f1)",borderRadius:3}}/></div>
              <div style={{marginTop:5,fontSize:10,textAlign:"right"}}>{actFARr>allowFARr?<span style={{color:C.red}}>⚠ 超過允建</span>:<span style={{color:C.green}}>✓ 符合管制</span>}</div>
            </div>
          </div>
        )}

        {/* ═══ 🔍 法規查詢 TAB ═══ */}
        {tab==="search"&&(
          <div style={{display:"flex",flexDirection:"column",gap:13}}>
            <div style={{fontSize:10,color:C.dim,letterSpacing:2}}>▸ 法規查詢 — 建技規 · 消防 · 無障礙 · 危老</div>

            {/* Search Bar */}
            <div style={{...CARD,padding:isMobile?"10px 12px":"14px 16px"}}>
              <div style={{display:"flex",gap:9,alignItems:"center",marginBottom:11}}>
                <div style={{position:"relative",flex:1}}>
                  <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:C.dim,fontSize:13}}>🔍</span>
                  <input
                    ref={searchInputRef}
                    value={searchQ}
                    onChange={e=>setSearchQ(e.target.value)}
                    placeholder={isMobile?"搜尋條文、關鍵字…":"關鍵字搜尋：條文編號、名稱或關鍵詞（例：陽台、防火、停車…）"}
                    style={{...INP,paddingLeft:32,fontSize:isMobile?12:13,background:C.bg3,border:"1px solid "+C.cyan+"44"}}
                    autoFocus
                  />
                  {searchQ&&<button onClick={()=>setSearchQ("")} style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",background:"transparent",border:"none",color:C.dim,cursor:"pointer",fontSize:14}}>✕</button>}
                </div>
                <span style={{color:C.muted,fontSize:11,whiteSpace:"nowrap"}}>{searchResults.length} 筆</span>
              </div>
              <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                {[["all","全部"],["relevant","本案相關"],["checked","已標記"],...REG_CHAPTERS.map(c=>[c,c])].map(([v,l])=>(
                  <button key={v} onClick={()=>setSearchCat(v)} style={{padding:"3px 10px",borderRadius:12,cursor:"pointer",background:searchCat===v?C.cyan+"22":"transparent",color:searchCat===v?C.cyan:C.dim,border:"1px solid "+(searchCat===v?C.cyan+"55":C.border),fontSize:10,fontFamily:"monospace",whiteSpace:"nowrap"}}>{l}</button>
                ))}
              </div>
              <div style={{marginTop:9,display:"flex",gap:5,flexWrap:"wrap"}}>
                <span style={{fontSize:10,color:C.faint,alignSelf:"center"}}>常用：</span>
                {["陽台","梯廳","防火區劃","安全梯","電梯","無障礙","停車","採光","容積","屋突","危老","排煙","隔音"].map(k=>(
                  <button key={k} onClick={()=>setSearchQ(k)} style={{padding:"2px 9px",borderRadius:10,cursor:"pointer",background:C.bg3,color:searchQ===k?C.cyan:C.muted,border:"1px solid "+(searchQ===k?C.cyan+"44":C.border),fontSize:10,fontFamily:"monospace"}}>{k}</button>
                ))}
              </div>
              {/* 新增自訂法規按鈕 */}
              <div style={{marginTop:10,borderTop:"1px solid "+C.border2,paddingTop:8}}>
                <button onClick={()=>setShowAddReg(v=>!v)} style={{background:C.bg3,border:"1px solid "+C.green+"44",color:C.green,borderRadius:5,padding:"5px 12px",cursor:"pointer",fontSize:11,fontFamily:"monospace"}}>＋ 新增自訂條文</button>
                {showAddReg&&(
                  <div style={{marginTop:8,display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:6}}>
                    <input value={newReg.code} onChange={e=>setNewReg(p=>({...p,code:e.target.value}))} placeholder="條文編號（例：地方§3）" style={INP}/>
                    <input value={newReg.title} onChange={e=>setNewReg(p=>({...p,title:e.target.value}))} placeholder="條文標題" style={INP}/>
                    <input value={newReg.ch} onChange={e=>setNewReg(p=>({...p,ch:e.target.value}))} placeholder="分類（例：自訂）" style={INP}/>
                    <select value={newReg.pri} onChange={e=>setNewReg(p=>({...p,pri:e.target.value}))} style={INP}><option value="高">高優先</option><option value="中">中優先</option><option value="低">低優先</option></select>
                    <input value={newReg.summary} onChange={e=>setNewReg(p=>({...p,summary:e.target.value}))} placeholder="摘要說明" style={{...INP,gridColumn:isMobile?undefined:"1 / -1"}}/>
                    <input value={newReg.formula} onChange={e=>setNewReg(p=>({...p,formula:e.target.value}))} placeholder="公式 / 數值（選填）" style={INP}/>
                    <input value={newReg.kw} onChange={e=>setNewReg(p=>({...p,kw:e.target.value}))} placeholder="關鍵詞（逗號分隔）" style={INP}/>
                    <button onClick={addCustomReg} style={{background:"#0d2a1a",border:"1px solid #4ade8044",color:C.green,borderRadius:5,padding:"6px 14px",cursor:"pointer",fontSize:11,fontFamily:"monospace"}}>✓ 確認新增</button>
                  </div>
                )}
              </div>
            </div>

            {/* Results */}
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {searchResults.length === 0 && (
                <div style={{...CARD,padding:"30px",textAlign:"center",color:C.faint,fontSize:12}}>無符合結果，請嘗試其他關鍵字</div>
              )}
              {searchResults.map(r=>{
                const isExp = expandedReg === r.id;
                const isChecked = checkedRegs[r.id];
                const priColor = r.pri==="高"?C.red:r.pri==="中"?C.yellow:C.green;
                return (
                  <div key={r.id} style={{...CARD,border:"1px solid "+(isExp?C.cyan:isChecked?"#4ade8044":r.isCustom?"#fb923c44":C.border)}}>
                    <div onClick={()=>setExpandedReg(isExp?null:r.id)} style={{padding:isMobile?"8px 10px":"10px 14px",cursor:"pointer",display:"flex",alignItems:"flex-start",gap:isMobile?6:10,background:isExp?C.bg4:"transparent"}}>
                      <div style={{display:"flex",alignItems:isMobile?"flex-start":"center",gap:6,flex:1,minWidth:0,flexDirection:isMobile?"column":"row"}}>
                        <div style={{display:"flex",alignItems:"center",gap:6}}>
                          <span style={{color:r.isCustom?C.orange:C.cyan,fontWeight:700,fontSize:isMobile?12:13,fontFamily:"monospace",flexShrink:0}}>{r.code}</span>
                          {r.isCustom&&<span style={{fontSize:8,color:C.orange,background:C.orange+"22",padding:"0 4px",borderRadius:3}}>自訂</span>}
                        </div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{color:C.text,fontSize:12,fontWeight:700,marginBottom:2}}>{highlight(r.title,searchQ)}</div>
                          {!isMobile&&<div style={{color:C.muted,fontSize:11,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{highlight(r.summary,searchQ)}</div>}
                        </div>
                      </div>
                      <div style={{display:"flex",alignItems:"center",gap:5,flexShrink:0}}>
                        <span style={{background:priColor+"22",color:priColor,border:"1px solid "+priColor+"44",borderRadius:3,padding:"1px 6px",fontSize:9,fontFamily:"monospace"}}>{r.pri}</span>
                        {!isMobile&&<span style={{background:"#1e3050",color:C.dim,borderRadius:3,padding:"1px 6px",fontSize:9}}>{r.ch}</span>}
                        <button onClick={e=>{e.stopPropagation();setCheckedRegs(p=>({...p,[r.id]:!p[r.id]}));}} style={{background:isChecked?"#1a3a2a":"transparent",border:"1px solid "+(isChecked?"#4ade8055":C.border),color:isChecked?C.green:C.faint,borderRadius:4,padding:"2px 7px",cursor:"pointer",fontSize:10,fontFamily:"monospace"}}>{isChecked?"✓":"標記"}</button>
                        <span style={{color:C.faint,fontSize:10}}>{isExp?"▲":"▼"}</span>
                      </div>
                    </div>
                    {isExp&&(
                      <div style={{padding:"12px 14px",borderTop:"1px solid "+C.border,background:C.bg}}>
                        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:12,marginBottom:10}}>
                          <div>
                            <div style={{fontSize:10,color:C.dim,marginBottom:4}}>條文摘要</div>
                            <div style={{color:C.text,fontSize:12,lineHeight:1.7}}>{r.summary}</div>
                          </div>
                          {r.formula&&<div>
                            <div style={{fontSize:10,color:C.dim,marginBottom:4}}>計算公式 / 數值規定</div>
                            <div style={{background:C.bg3,borderRadius:6,padding:"8px 12px",color:C.yellow,fontFamily:"monospace",fontSize:12,border:"1px solid "+C.yellow+"22"}}>{r.formula}</div>
                          </div>}
                        </div>
                        <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                          <div style={{fontSize:10,color:C.dim}}>關鍵詞：</div>
                          {r.kw.map(k=>(<span key={k} style={{background:"#1e3050",color:searchQ&&k.toLowerCase().includes(searchQ.toLowerCase())?C.yellow:C.muted,borderRadius:10,padding:"1px 8px",fontSize:10}}>{highlight(k,searchQ)}</span>))}
                          {r.note&&<div style={{width:"100%",marginTop:4,padding:"5px 10px",background:"#1e2433",borderRadius:5,color:C.dim,fontSize:10}}>💡 {r.note}</div>}
                          <div style={{display:"flex",gap:6,marginLeft:"auto",flexShrink:0}}>
                            {r.isCustom&&<button onClick={()=>deleteCustomReg(r.id)} style={{background:"#2d1515",border:"1px solid #f8717144",color:C.red,borderRadius:5,padding:"5px 10px",cursor:"pointer",fontSize:10,fontFamily:"monospace"}}>🗑 刪除</button>}
                            <button onClick={()=>{setCheckedRegs(p=>({...p,[r.id]:!p[r.id]}));}} style={{background:isChecked?"#1a3a2a":"#0d2a1a",border:"1px solid "+(isChecked?"#4ade8055":"#4ade8033"),color:isChecked?C.green:"#4ade8088",borderRadius:5,padding:"5px 12px",cursor:"pointer",fontSize:11,fontFamily:"monospace"}}>{isChecked?"✓ 已標記":"標記已審查"}</button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {Object.values(checkedRegs).some(Boolean)&&(
              <div style={{...CARD,padding:"11px 16px",borderColor:"#4ade8044"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{color:C.green,fontSize:12,fontWeight:700}}>✓ 已審查 {Object.values(checkedRegs).filter(Boolean).length} 條</span>
                  <button onClick={()=>setCheckedRegs({})} style={{background:"transparent",border:"1px solid "+C.border,color:C.dim,borderRadius:4,padding:"3px 9px",cursor:"pointer",fontSize:10,fontFamily:"monospace"}}>清除標記</button>
                </div>
                <div style={{display:"flex",gap:5,flexWrap:"wrap",marginTop:8}}>
                  {REG_DB.filter(r=>checkedRegs[r.id]).map(r=>(<span key={r.id} style={{background:"#1a3a2a",color:C.green,border:"1px solid #4ade8055",borderRadius:10,padding:"1px 8px",fontSize:10,fontFamily:"monospace"}}>{r.code} {r.title}</span>))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══ AI TAB ═══ */}
        {tab==="ai"&&(<div>
          <div style={{fontSize:10,color:C.dim,letterSpacing:2,marginBottom:11}}>▸ AI 法規清單</div>
          <div style={{...CARD,padding:"11px 14px",marginBottom:12}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><span style={{fontSize:11,color:C.muted}}>進度 — {btype}</span><span style={{fontSize:11,fontWeight:700,fontFamily:"monospace",color:pctChk===100?C.green:C.cyan}}>{doneChk}/{chkList.length}（{pctChk}%）</span></div><div style={{height:7,background:"#1e2d40",borderRadius:4,overflow:"hidden"}}><div style={{width:pctChk+"%",height:"100%",background:pctChk===100?C.green:"linear-gradient(90deg,#38bdf8,#6366f1)",borderRadius:4}}/></div></div>
          <button onClick={callAI} disabled={aiLoad} style={{background:aiLoad?"#1e2d40":"linear-gradient(135deg,#0ea5e9,#6366f1)",color:"white",border:"none",borderRadius:7,padding:"10px 22px",cursor:aiLoad?"not-allowed":"pointer",fontSize:12,fontWeight:700,fontFamily:"monospace",marginBottom:14}}>{aiLoad?"⏳ 分析中…":"🤖 生成AI法規清單"}</button>
          {aiErr&&<div style={{background:"#2d1515",border:"1px solid #7f1d1d",borderRadius:7,padding:12,color:C.red,fontSize:11,marginBottom:12}}>{aiErr}</div>}
          {aiList.length===0&&!aiLoad&&(<div style={CARD}><div style={{padding:"9px 14px",borderBottom:"1px solid "+C.border2,fontSize:10,color:C.dim}}>預設（{btype}）</div>{(CHKLIST[btype]||[]).map((item,i)=>(<div key={i} style={{display:"flex",alignItems:"center",gap:9,padding:"8px 14px",borderBottom:"1px solid #0d1f38"}}><input type="checkbox" checked={!!chk[i]} onChange={()=>setChk(p=>({...p,[i]:!p[i]}))} style={{accentColor:C.cyan}}/><span style={{color:chk[i]?C.faint:C.muted,fontSize:12,textDecoration:chk[i]?"line-through":"none"}}>{item}</span></div>))}</div>)}
          {aiList.length>0&&(<div style={{display:"flex",flexDirection:"column",gap:14}}>{["高","中","低"].map(pri=>{const items=aiList.map((x,i)=>({x,i})).filter(({x})=>x.priority===pri);if(!items.length)return null;return(<div key={pri}><div style={{fontSize:10,color:PC[pri],letterSpacing:2,marginBottom:8}}><span style={{width:5,height:5,borderRadius:"50%",background:PC[pri],display:"inline-block",marginRight:6}}/>{pri}優先（{items.length}項）</div>{items.map(({x,i})=>(<div key={i} style={{...CARD,padding:"11px 14px",display:"flex",gap:11,marginBottom:7,borderLeft:"3px solid "+PC[x.priority]}}><input type="checkbox" checked={!!chk[i]} onChange={()=>setChk(p=>({...p,[i]:!p[i]}))} style={{accentColor:C.cyan,marginTop:2}}/><div style={{flex:1,minWidth:0}}><div style={{display:"flex",gap:7,marginBottom:4,flexWrap:"wrap"}}><span style={{fontSize:10,color:C.dim}}>{x.category}</span><span style={{background:PC[x.priority]+"22",color:PC[x.priority],border:"1px solid "+PC[x.priority]+"44",borderRadius:3,padding:"0 6px",fontSize:10,fontWeight:700}}>{x.priority}</span></div><div style={{color:chk[i]?C.faint:C.text,fontSize:13,fontWeight:700,textDecoration:chk[i]?"line-through":"none",marginBottom:3}}>{x.title}</div><div style={{color:C.cyan,fontSize:10,marginBottom:3,fontFamily:"monospace"}}>{x.rule}</div><div style={{color:C.muted,fontSize:11}}>{x.note}</div></div></div>))}</div>);})}</div>)}
        </div>)}

        {/* ═══ REF TAB ═══ */}
        {tab==="ref"&&(<div>
          <div style={{fontSize:10,color:C.dim,letterSpacing:2,marginBottom:12}}>▸ 各縣市細則</div>
          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(auto-fill,minmax(280px,1fr))",gap:13}}>
            {Object.entries(zones).map(([c,data])=>(<div key={c} style={{...CARD,border:"1px solid "+(c===county?C.cyan:C.border)}}><div style={{background:c===county?C.bg4:C.bg3,padding:"8px 13px",display:"flex",justifyContent:"space-between"}}><span style={{fontWeight:700,color:c===county?C.cyan:C.text,fontSize:13}}>{c}</span>{c===county&&<span style={{fontSize:10,color:C.cyan,background:"#0ea5e922",padding:"1px 7px",borderRadius:3}}>當前</span>}</div><div style={{padding:11}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}><thead><tr style={{color:C.dim}}><th style={{textAlign:"left",padding:"3px 0",fontWeight:400}}>分區</th><th style={{textAlign:"center",fontWeight:400}}>建蔽</th><th style={{textAlign:"center",fontWeight:400}}>容積</th><th style={{textAlign:"center",fontWeight:400}}>退縮</th></tr></thead><tbody>{Object.entries(data.zones||{}).map(([z,v])=>(<tr key={z} style={{borderTop:"1px solid #0d1f38",background:z===zone&&c===county?C.bg4:"transparent"}}><td style={{padding:"4px 0",color:z===zone&&c===county?C.cyan:C.muted}}>{z}</td><td style={{textAlign:"center",color:C.red,fontFamily:"monospace"}}>{v.b}%</td><td style={{textAlign:"center",color:C.cyan,fontFamily:"monospace"}}>{v.f}%</td><td style={{textAlign:"center",color:C.green,fontFamily:"monospace"}}>{v.s}M</td></tr>))}</tbody></table><div style={{marginTop:9,background:C.bg3,borderRadius:5,padding:"5px 9px"}}><div style={{color:C.yellow,fontSize:10}}>🚗 {data.pk}</div></div></div></div>))}
          </div>
        </div>)}

        {/* ═══ PROJECTS TAB ═══ */}
        {tab==="projects"&&(<div>
          <div style={{fontSize:10,color:C.dim,letterSpacing:2,marginBottom:13}}>▸ 專案（localStorage）</div>
          {saved.length===0?<div style={{...CARD,padding:"22px",textAlign:"center",color:C.faint,fontSize:12}}>尚無儲存。</div>
          :<div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(auto-fill,minmax(260px,1fr))",gap:11}}>{saved.map(p=>(<div key={p.k} style={{...CARD,padding:14}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><div style={{fontSize:13,fontWeight:700,color:C.cyan}}>{p.proj}</div><span style={{fontSize:10,color:C.dim}}>{p.at}</span></div><div style={{fontSize:11,color:C.muted,marginBottom:3}}>{p.county}·{p.zone}·{p.btype}</div><div style={{fontSize:10,color:C.dim,marginBottom:11}}>基地{p.siteArea||"?"}㎡·{p.floors||"?"}層</div><div style={{display:"flex",gap:7}}><button onClick={()=>doLoad(p)} style={{flex:1,background:C.bg4,border:"1px solid #38bdf844",color:C.cyan,borderRadius:5,padding:"6px",cursor:"pointer",fontSize:11,fontFamily:"monospace"}}>↩ 載入</button><button onClick={()=>doDel(p.k)} style={{background:"#2d1515",border:"1px solid #f8717144",color:C.red,borderRadius:5,padding:"6px 12px",cursor:"pointer",fontSize:11}}>🗑</button></div></div>))}</div>}
        </div>)}
      </div>
    </div>
  );
}

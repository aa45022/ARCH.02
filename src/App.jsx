import { useState, useEffect, useRef, useMemo, useCallback, Fragment } from "react";
import { ZONES as INIT_ZONES, BTYPES, CHKLIST, DEFAULT_REG_DB, DEFAULT_MEP_ITEMS } from "./lib/constants.js";
import { pf, n2, n1, py } from "./lib/utils.js";
import { calcFAR162, calcMaxH, checkFH, computeFloorCalcs, getMepFromItems, computeUnitTypeSummaries, computeBasementCalcs, computeRoofCalcs, computeAutoAlerts, searchRegulations } from "./lib/calculations.js";
import { storage } from "./lib/storage.js";
import { colors as C, glass, alertStyles as AL, priorityColors as PC } from "./theme.js";
import { useIsMobile } from "./hooks/useIsMobile.js";
import { Arc, Badge, CRow, RL, SectionHeader as SH2, Card, StatCard, Highlight } from "./components/ui.jsx";

const loadXLSX = () => import("xlsx");

const INP={background:"rgba(15,23,42,0.5)",border:"1px solid rgba(56,189,248,0.1)",color:C.text,padding:"8px 12px",borderRadius:10,fontSize:13,width:"100%",outline:"none",fontFamily:"'Inter',sans-serif",boxSizing:"border-box",transition:"border-color 0.2s ease"};
const CARD={...glass.card};
function SH(icon,label,color){return <SH2 icon={icon} label={label} color={color}/>;}

export default function App() {
  const isMobile = useIsMobile();
  const [zones,setZones]=useState(INIT_ZONES);
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
  const [floorMix,setFloorMix]=useState(()=>{const m={};[1,2].forEach(id=>{m[id]=0;});return Array.from({length:26},(_,i)=>mkFloorRow(i,{...m}));});
  const [bsData,setBsData]=useState(()=>Array.from({length:5},(_,i)=>({id:i,label:"B"+(i+1),pk:"",mep:"",mepItems:null,other:[],fh:""})));
  const [expandedMepRow,setExpandedMepRow]=useState(null);
  const [searchQ,setSearchQ]=useState("");
  const [searchCat,setSearchCat]=useState("all");
  const [expandedReg,setExpandedReg]=useState(null);
  const [checkedRegs,setCheckedRegs]=useState({});
  const [showAutoAlerts,setShowAutoAlerts]=useState(true);
  const searchInputRef=useRef(null);
  const [customRegs,setCustomRegs]=useState([]);
  const [showAddReg,setShowAddReg]=useState(false);
  const [newReg,setNewReg]=useState({code:"",ch:"自訂",title:"",summary:"",formula:"",kw:"",pri:"中"});

  const REG_DB = useMemo(() => [...DEFAULT_REG_DB, ...customRegs], [customRegs]);
  const REG_CHAPTERS = useMemo(() => [...new Set(REG_DB.map(r => r.ch))], [REG_DB]);

  useEffect(() => { try { const cr=localStorage.getItem("bcode:customRegs"); if(cr)setCustomRegs(JSON.parse(cr)); const ck=localStorage.getItem("bcode:checkedRegs"); if(ck)setCheckedRegs(JSON.parse(ck)); } catch{} }, []);
  useEffect(() => { try{localStorage.setItem("bcode:checkedRegs",JSON.stringify(checkedRegs));}catch{} }, [checkedRegs]);
  useEffect(() => { try{localStorage.setItem("bcode:customRegs",JSON.stringify(customRegs));}catch{} }, [customRegs]);

  const addCustomReg = () => { if(!newReg.code.trim()||!newReg.title.trim())return; const reg={id:"custom_"+Date.now(),code:newReg.code.trim(),ch:newReg.ch||"自訂",title:newReg.title.trim(),summary:newReg.summary,formula:newReg.formula,kw:newReg.kw?newReg.kw.split(",").map(s=>s.trim()).filter(Boolean):[],bt:["all"],pri:newReg.pri||"中",note:"自訂條文",isCustom:true}; setCustomRegs(prev=>[...prev,reg]); setNewReg({code:"",ch:"自訂",title:"",summary:"",formula:"",kw:"",pri:"中"}); setShowAddReg(false); };
  const deleteCustomReg = (id) => { setCustomRegs(prev=>prev.filter(r=>r.id!==id)); };

  // calculations
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

  const utSum=useMemo(()=>computeUnitTypeSummaries(unitTypes),[unitTypes]);
  const floorCalcs=useMemo(()=>computeFloorCalcs(floorMix,utSum,gfh,hasSharedLobby,useMepTemplate),[floorMix,utSum,gfh,hasSharedLobby,useMepTemplate]);
  const fhChecks=useMemo(()=>floorCalcs.map(fc=>checkFH(fc.idx,fc.fh,btype,hasVoid)),[floorCalcs,btype,hasVoid]);
  const fhViolations=fhChecks.filter(c=>c.limit&&!c.ok).length;
  const bsCalcs=useMemo(()=>computeBasementCalcs(bsData,maxExc,useMepTemplate),[bsData,maxExc,useMepTemplate]);
  const bsFARContrib=useMemo(()=>bsCalcs.reduce((s,f)=>s+f.oth,0),[bsCalcs]);
  const rfCalcs=useMemo(()=>computeRoofCalcs(rfFloors,rfCount),[rfFloors,rfCount]);
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

  const autoAlerts=useMemo(()=>computeAutoAlerts({fl,bfl,avgFlr,totalH,btype,units,rfMaxArea,rfTotal,mepOverCap,mepCapArea,mepCapPct,sumMep,bonus,fhViolations}),[fl,bfl,avgFlr,totalH,btype,units,rfMaxArea,rfTotal,mepOverCap,mepCapArea,mepCapPct,sumMep,bonus,fhViolations]);
  const searchResults=useMemo(()=>searchRegulations(REG_DB,searchQ,searchCat,btype,checkedRegs),[searchQ,searchCat,btype,checkedRegs,REG_DB]);

  // Effects
  useEffect(()=>{const n=Math.max(1,Math.min(60,Math.round(fl)));if(!isNaN(n))setFloorMix(prev=>{if(prev.length===n)return prev;const m={};unitTypes.forEach(u=>{m[u.id]=0;});if(n>prev.length)return[...prev,...Array.from({length:n-prev.length},(_,i)=>mkFloorRow(prev.length+i,{...m}))];return prev.slice(0,n);});},[floors,unitTypes,mkFloorRow]);
  useEffect(()=>{const n=Math.max(0,Math.min(15,Math.round(bfl)));if(!isNaN(n))setBsData(prev=>{if(prev.length===n)return prev;if(n>prev.length)return[...prev,...Array.from({length:n-prev.length},(_,i)=>({id:prev.length+i,label:"B"+(prev.length+i+1),pk:"",mep:"",mepItems:null,other:[],fh:""}))];return prev.slice(0,n);});},[bsFlrs]);
  useEffect(()=>{setBatchTpl(prev=>{const next={corr:prev.corr||"",mep:prev.mep||"",fh:prev.fh||""};unitTypes.forEach(ut=>{next["ut_"+ut.id]=prev["ut_"+ut.id]||0;});return next;});},[unitTypes]);
  useEffect(()=>{setRfFloors(prev=>{const n=Math.max(0,Math.min(3,rfCount));if(prev.length>=n)return prev;return[...prev,...Array.from({length:n-prev.length},(_,i)=>({id:"rf"+(prev.length+i+1),label:"RF"+(prev.length+i+1),fh:"2.5",items:[{id:1,name:"樓梯間",area:""}]}))];});},[rfCount]);

  // Callbacks
  const upFM=useCallback((id,field,val)=>setFloorMix(p=>p.map(f=>f.id===id?{...f,[field]:val}:f)),[]);
  const upFMMix=useCallback((fid,utId,val)=>setFloorMix(p=>p.map(f=>f.id===fid?{...f,mix:{...f.mix,[utId]:parseInt(val)||0}}:f)),[]);
  const togSpec=useCallback(id=>setFloorMix(p=>p.map(f=>f.id===id?{...f,isSpec:!f.isSpec}:f)),[]);
  const copyDown=useCallback(id=>{setFloorMix(p=>{const s=p.find(f=>f.id===id);if(!s)return p;return p.map(f=>f.id>id&&!f.isSpec?{...f,mix:{...s.mix},corr:s.corr,mep:s.mep,fh:s.fh,mepItems:s.mepItems?JSON.parse(JSON.stringify(s.mepItems)):null}:f);});},[]);
  const toggleBatchSel=useCallback(id=>{setBatchSel(prev=>{const n=new Set(prev);if(n.has(id))n.delete(id);else n.add(id);return n;});},[]);
  const selectRange=useCallback(()=>{const from=Math.max(1,parseInt(batchRangeFrom)||1),to=Math.min(floorMix.length,parseInt(batchRangeTo)||floorMix.length);const n=new Set();for(let i=from-1;i<to;i++){if(floorMix[i]&&!floorMix[i].isSpec)n.add(floorMix[i].id);}setBatchSel(n);},[batchRangeFrom,batchRangeTo,floorMix]);
  const selectAllStd=useCallback(()=>setBatchSel(new Set(floorMix.filter(f=>!f.isSpec).map(f=>f.id))),[floorMix]);
  const clearBatchSel=useCallback(()=>setBatchSel(new Set()),[]);
  const applyMepTemplateToFloor=useCallback((floorId)=>{setFloorMix(p=>p.map(f=>f.id===floorId?{...f,mepItems:mepTemplate.map(t=>({...t}))}:f));},[mepTemplate]);
  const applyMepTemplateToBs=useCallback((bsId)=>{setBsData(p=>p.map(f=>f.id===bsId?{...f,mepItems:mepTemplate.map(t=>({...t}))}:f));},[mepTemplate]);
  const applyBatch=useCallback(()=>{if(!batchSel.size){setBatchMsg("請先勾選");setTimeout(()=>setBatchMsg(""),2500);return;}setFloorMix(p=>p.map(f=>{if(!batchSel.has(f.id)||f.isSpec)return f;const nm={};unitTypes.forEach(ut=>{const v=batchTpl["ut_"+ut.id];nm[ut.id]=v!==""&&v!==undefined?parseInt(v)||0:(f.mix[ut.id]||0);});const newF={...f,mix:nm,corr:batchTpl.corr!==""?batchTpl.corr:f.corr,mep:batchTpl.mep!==""?batchTpl.mep:f.mep,fh:batchTpl.fh!==""?batchTpl.fh:f.fh};if(useMepTemplate){newF.mepItems=mepTemplate.map(t=>({...t}));}return newF;}));setBatchMsg("已套用 "+batchSel.size+" 層");setTimeout(()=>setBatchMsg(""),2500);},[batchSel,batchTpl,unitTypes,useMepTemplate,mepTemplate]);

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

  // Project save/load (IndexedDB)
  useEffect(()=>{loadSaved();},[]);
  const loadSaved=async()=>{try{const r=await storage.list("v5:");if(!r?.keys?.length)return;const l=[];for(const k of r.keys){try{const g=await storage.get(k);if(g?.value)l.push({k,...JSON.parse(g.value)});}catch(_){}}setSaved(l);}catch(_){}};
  const doSave=async()=>{if(!proj.trim())return;const d={proj,county,zone,btype,siteArea,footArea,floors,bsFlrs,gfh,bsfh,units,parking,notes,excRate,mepPct,bonus,unitTypes,floorMix:floorMix.slice(0,60),bsData:bsData.slice(0,15),hasSharedLobby,singleStair,roadWidth,setbackDist,hasVoid,rfFloors,rfCount,mepTemplate,useMepTemplate,at:new Date().toLocaleDateString("zh-TW")};try{await storage.set("v5:"+proj.trim(),JSON.stringify(d));setSaveMsg("已儲存");loadSaved();}catch(_){setSaveMsg("失敗");}setTimeout(()=>setSaveMsg(""),2500);};
  const doLoad=p=>{setProj(p.proj||"");setCounty(p.county||"新北市");setZone(p.zone||"");setBtype(p.btype||"集合住宅");setSiteArea(p.siteArea||"");setFootArea(p.footArea||"");setFloors(p.floors||"");setBsFlrs(p.bsFlrs||"5");setGfh(p.gfh||"3.35");setBsfh(p.bsfh||"3.5");setUnits(p.units||"");setParking(p.parking||"");setNotes(p.notes||"");setExcRate(p.excRate||"0.75");setMepPct(p.mepPct||"12.4");setBonus(p.bonus||{lw:"0",sd:"0",cp:"0",tr:"0"});if(p.unitTypes)setUnitTypes(p.unitTypes);if(p.floorMix?.length)setFloorMix(p.floorMix);if(p.bsData?.length)setBsData(p.bsData);setHasSharedLobby(p.hasSharedLobby!==false);setSingleStair(!!p.singleStair);setRoadWidth(p.roadWidth||"");setSetbackDist(p.setbackDist||"");setHasVoid(!!p.hasVoid);if(p.rfFloors)setRfFloors(p.rfFloors);if(p.rfCount!==undefined)setRfCount(p.rfCount);if(p.mepTemplate)setMepTemplate(p.mepTemplate);if(p.useMepTemplate!==undefined)setUseMepTemplate(p.useMepTemplate);setChk({});setAiList([]);setTab("calc");};
  const doDel=async k=>{try{await storage.delete(k);loadSaved();}catch(_){}};
  const onImport=async(e)=>{const file=e.target.files[0];if(!file)return;setImpMsg("讀取中…");const reader=new FileReader();reader.onload=async(ev)=>{try{const XLSX=await loadXLSX();const wb=XLSX.read(ev.target.result,{type:"array"});const ws=wb.Sheets["輸入"]||wb.Sheets[wb.SheetNames[0]];const rows=XLSX.utils.sheet_to_json(ws,{header:1,defval:null});let sa2="",nm="",zn="";rows.forEach(row=>{const k=String(row[0]||"").trim(),v=row[1];if(k==="案名"&&v)nm=String(v).substring(0,24);if(k==="基地面積"&&v)sa2=String(parseFloat(v));if(k==="使用分區"&&v)zn=String(v).trim();});if(sa2)setSiteArea(sa2);if(nm)setProj(nm.replace(/新北市|台北市/g,"").trim());if(zn&&zones["新北市"]?.zones[zn]){setCounty("新北市");setZone(zn);}setImpMsg("匯入成功");}catch(_){setImpMsg("解析失敗");}setTimeout(()=>setImpMsg(""),3000);};reader.readAsArrayBuffer(file);e.target.value="";};

  const aiPrompt=useCallback(()=>"你是台灣建築法規專家，以JSON格式回覆（不加markdown）。專案："+proj+"|"+county+zone+"|"+btype+"|基地"+siteArea+"㎡|"+floors+'層。回傳：{"items":[{"category":"類別","title":"條文標題","rule":"法規","note":"說明","priority":"高|中|低"}]}',[proj,county,zone,btype,siteArea,floors]);
  const callAI=async()=>{setAiLoad(true);setAiErr("");setAiList([]);setChk({});try{const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,messages:[{role:"user",content:aiPrompt()}]})});const d=await res.json();const txt=d.content?.map(b=>b.text||"").join("")||"";setAiList(JSON.parse(txt.replace(/```json|```/g,"").trim()).items||[]);}catch(e){setAiErr("解析失敗："+e.message);}setAiLoad(false);};

  const doneChk=Object.values(chk).filter(Boolean).length;
  const chkList=aiList.length>0?aiList:(CHKLIST[btype]||[]).map((t,i)=>({title:t,i}));
  const pctChk=chkList.length>0?Math.round((doneChk/chkList.length)*100):0;

  const TB=(t,l)=><button key={t} onClick={()=>setTab(t)} style={{padding:isMobile?"6px 12px":"8px 16px",borderRadius:20,cursor:"pointer",background:tab===t?"rgba(56,189,248,0.15)":"transparent",color:tab===t?C.cyan:C.dim,border:tab===t?"1px solid rgba(56,189,248,0.3)":"1px solid transparent",fontSize:isMobile?10:11,fontWeight:tab===t?600:400,whiteSpace:"nowrap",flexShrink:0,transition:"all 0.2s ease",boxShadow:tab===t?"0 0 12px rgba(56,189,248,0.1)":"none"}}>{l}</button>;

  // Elevation SVG
  const ElevSVG = () => {
    const W=isMobile?150:190,PL=isMobile?24:30,PR=10,PT=18,PB=22,bsH=pf(bsfh)||3.5,bsCnt=Math.max(0,Math.round(bfl)),rfH=rfCalcs.reduce((s,r)=>s+r.fhv,0),aboveH=(totalH||1)+rfH,fullH=aboveH+bsCnt*bsH||1,drawH=(isMobile?260:340)-PT-PB,pxM=drawH/fullH,svgH=PT+drawH+PB;
    const aRects=[]; let cy=PT+(aboveH)*pxM;
    for(let i=0;i<floorCalcs.length;i++){const f=floorCalcs[i],bh=f.fh*pxM;cy-=bh;aRects.push({y:cy,h:bh,label:f.label,fh:f.fh,spec:floorMix[i]?.isSpec,has:f.hasData,id:f.id,fhBad:fhChecks[i]&&!fhChecks[i].ok});}
    const rfRects=[]; let ry=cy;
    for(let i=rfCalcs.length-1;i>=0;i--){const r=rfCalcs[i],bh=r.fhv*pxM;ry-=bh;rfRects.push({y:ry,h:bh,label:r.label,total:r.total});}
    const groundY=PT+(aboveH)*pxM;
    const bRects=[]; let by=groundY;
    for(let i=0;i<bsCnt;i++){const bh=bsH*pxM;bRects.push({y:by,h:bh,label:"B"+(i+1)});by+=bh;}
    return (
      <svg width={W} height={svgH} style={{display:"block",margin:"0 auto",overflow:"visible"}}>
        <defs><linearGradient id="elev-above" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#38bdf8" stopOpacity="0.08"/><stop offset="100%" stopColor="#38bdf8" stopOpacity="0.02"/></linearGradient><linearGradient id="elev-below" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#818cf8" stopOpacity="0.02"/><stop offset="100%" stopColor="#818cf8" stopOpacity="0.08"/></linearGradient></defs>
        <line x1={PL} y1={PT} x2={PL} y2={svgH-PB} stroke="rgba(56,189,248,0.1)" strokeWidth={1}/>
        {bRects.map((r,i)=>(<g key={i}><rect x={PL+2} y={r.y+0.5} width={W-PL-PR-2} height={Math.max(r.h-1,2)} fill="url(#elev-below)" stroke="rgba(129,140,248,0.2)" strokeWidth={1} strokeDasharray="3,2" rx={3}/>{r.h>=10&&<text x={PL+2+(W-PL-PR-2)/2} y={r.y+r.h/2+3} textAnchor="middle" fill="rgba(129,140,248,0.4)" fontSize={Math.min(9,r.h-2)} fontFamily="'Inter',sans-serif">{r.label}</text>}</g>))}
        {aRects.map(r=>(<g key={r.id}><rect x={PL+2} y={r.y+0.5} width={W-PL-PR-2} height={Math.max(r.h-1,2)} fill={r.fhBad?"rgba(248,113,113,0.1)":r.spec?"rgba(251,191,36,0.06)":r.has?"rgba(56,189,248,0.08)":"url(#elev-above)"} stroke={r.fhBad?"rgba(248,113,113,0.3)":r.spec?"rgba(251,191,36,0.3)":r.has?"rgba(56,189,248,0.3)":"rgba(56,189,248,0.06)"} strokeWidth={r.has?1.5:0.5} rx={3}/>{r.h>=10&&<text x={PL+2+(W-PL-PR-2)/2} y={r.y+r.h/2+3} textAnchor="middle" fill={r.fhBad?"rgba(248,113,113,0.7)":r.has?"rgba(56,189,248,0.7)":"rgba(255,255,255,0.15)"} fontSize={Math.min(9,r.h-2)} fontFamily="'Inter',sans-serif">{r.label}</text>}</g>))}
        {rfRects.map((r,i)=>(<g key={i}><rect x={PL+2} y={r.y+0.5} width={W-PL-PR-2} height={Math.max(r.h-1,2)} fill="rgba(251,191,36,0.06)" stroke="rgba(251,191,36,0.3)" strokeWidth={1.5} strokeDasharray="4,2" rx={3}/>{r.h>=10&&<text x={PL+2+(W-PL-PR-2)/2} y={r.y+r.h/2+3} textAnchor="middle" fill="rgba(251,191,36,0.7)" fontSize={Math.min(9,r.h-2)} fontFamily="'Inter',sans-serif">{r.label}</text>}</g>))}
        <line x1={PL-6} y1={groundY} x2={W-PR} y2={groundY} stroke="#34d399" strokeWidth={2}/>
        <text x={PL-8} y={groundY+3} fill="#34d399" fontSize={8} fontFamily="'Inter',sans-serif" textAnchor="end">±0</text>
        {shadowMaxH&&totalH>0&&<><line x1={PL-6} y1={groundY-shadowMaxH*pxM} x2={W-PR} y2={groundY-shadowMaxH*pxM} stroke="#fbbf24" strokeWidth={1} strokeDasharray="4,3"/><text x={W-PR-2} y={groundY-shadowMaxH*pxM-3} textAnchor="end" fill="#fbbf24" fontSize={7} fontFamily="'Inter',sans-serif">{"H限"+shadowMaxH.toFixed(1)+"M"}</text></>}
        <text x={PL+2+(W-PL-PR-2)/2} y={PT-4} textAnchor="middle" fill={totalHWithRF>0?"#34d399":"rgba(255,255,255,0.15)"} fontSize={10} fontWeight="700" fontFamily="'Inter',sans-serif">{totalHWithRF>0?("▲"+totalHWithRF.toFixed(1)+"M"):"—"}</text>
      </svg>
    );
  };

  // ═══ RENDER ═══
  return (
    <div style={{background:`linear-gradient(180deg, ${C.bg} 0%, #0a1220 100%)`,minHeight:"100vh",color:C.text}}>

      {/* HEADER */}
      <div style={{background:"linear-gradient(135deg, rgba(6,11,20,0.95), rgba(14,26,46,0.95))",backdropFilter:"blur(20px)",borderBottom:"1px solid "+C.border3,padding:isMobile?"14px 16px":"16px 24px",display:"flex",alignItems:isMobile?"flex-start":"center",gap:isMobile?10:16,flexWrap:"wrap",flexDirection:isMobile?"column":"row"}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:isMobile?32:40,height:isMobile?32:40,background:"linear-gradient(135deg,#0ea5e9,#818cf8)",borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",fontSize:isMobile?15:18,flexShrink:0,boxShadow:"0 4px 16px rgba(14,165,233,0.3)"}}>🏛</div>
          <div>
            <div style={{fontSize:isMobile?14:16,fontWeight:700,color:"#f8fafc",letterSpacing:0.5}}>建築法規 AI 檢討系統</div>
            <div style={{fontSize:isMobile?10:11,color:C.dim,fontWeight:400}}>Building Code Review · v8.0 · {REG_DB.length} 條 · IndexedDB</div>
          </div>
        </div>
        <div style={{marginLeft:isMobile?0:"auto",display:"flex",gap:6,flexWrap:"nowrap",overflowX:"auto",WebkitOverflowScrolling:"touch",width:isMobile?"100%":"auto",paddingBottom:2}}>
          {[["calc","⚖ 驗算"],["dev","📊 開發量"],["space","📐 面積"],["search","📖 法規"],["ai","✨ AI"],["ref","🗺 細則"],["projects","💾 專案"]].map(([t,l])=>TB(t,l))}
        </div>
      </div>

      {/* PROJECT BAR */}
      <div style={{background:"rgba(10,18,32,0.6)",backdropFilter:"blur(10px)",borderBottom:"1px solid "+C.border,padding:isMobile?"14px 16px":"16px 24px"}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12,flexWrap:"wrap"}}>
          <span style={{fontSize:11,color:C.dim,letterSpacing:2,fontWeight:600}}>PROJ</span>
          <div style={{flex:1,minWidth:isMobile?120:150}}><input value={proj} onChange={e=>setProj(e.target.value)} placeholder="專案名稱" style={{...INP,background:"rgba(56,189,248,0.05)",border:"1px solid rgba(56,189,248,0.15)",color:C.cyan,fontWeight:600}}/></div>
          <button onClick={()=>fileRef.current?.click()} style={{background:"rgba(14,165,233,0.1)",border:"1px solid rgba(14,165,233,0.2)",color:"#0ea5e9",borderRadius:10,padding:"7px 14px",cursor:"pointer",fontSize:11,fontWeight:500}}>匯入</button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={onImport} style={{display:"none"}}/>
          {impMsg&&<span style={{fontSize:10,color:impMsg.includes("成功")?C.green:C.yellow}}>{impMsg}</span>}
          <button onClick={doSave} style={{background:"rgba(52,211,153,0.1)",border:"1px solid rgba(52,211,153,0.2)",color:C.green,borderRadius:10,padding:"7px 14px",cursor:"pointer",fontSize:11,fontWeight:500}}>儲存</button>
          {saveMsg&&<span style={{fontSize:10,color:saveMsg.includes("儲存")?C.green:C.yellow}}>{saveMsg}</span>}
        </div>
        <div style={{display:"grid",gridTemplateColumns:isMobile?"repeat(2,1fr)":"repeat(auto-fill,minmax(130px,1fr))",gap:10}}>
          {[{l:"縣市",el:<select value={county} onChange={e=>{setCounty(e.target.value);setZone(Object.keys(zones[e.target.value]?.zones||{})[0]||"");}} style={INP}>{Object.keys(zones).map(c=><option key={c}>{c}</option>)}</select>},{l:"用途分區",el:<select value={zone} onChange={e=>setZone(e.target.value)} style={INP}>{Object.keys(zones[county]?.zones||{}).map(z=><option key={z}>{z}</option>)}</select>},{l:"建築類型",el:<select value={btype} onChange={e=>{setBtype(e.target.value);setChk({});setAiList([]);}} style={INP}>{BTYPES.map(t=><option key={t}>{t}</option>)}</select>},{l:"基地面積㎡",el:<input type="number" value={siteArea} onChange={e=>setSiteArea(e.target.value)} style={INP}/>},{l:"建築面積㎡",el:<input type="number" value={footArea} onChange={e=>setFootArea(e.target.value)} style={INP}/>},{l:"地上層數",el:<input type="number" value={floors} onChange={e=>setFloors(e.target.value)} style={INP}/>},{l:"地下層數",el:<input type="number" value={bsFlrs} onChange={e=>setBsFlrs(e.target.value)} style={{...INP,color:C.purple}}/>},{l:"屋突層數",el:<input type="number" min={0} max={3} value={rfCount} onChange={e=>setRfCount(Math.max(0,Math.min(3,parseInt(e.target.value)||0)))} style={{...INP,color:C.yellow}}/>},{l:"地上層高M",el:<input type="number" step="0.1" value={gfh} onChange={e=>setGfh(e.target.value)} style={INP}/>},{l:"地下層高M",el:<input type="number" step="0.1" value={bsfh} onChange={e=>setBsfh(e.target.value)} style={{...INP,color:C.purple}}/>},{l:"戶數",el:<input type="number" value={units} onChange={e=>setUnits(e.target.value)} style={INP}/>},{l:"設計停車位",el:<input type="number" value={parking} onChange={e=>setParking(e.target.value)} style={INP}/>}].map(({l,el})=><div key={l}><div style={{fontSize:10,color:C.dim,marginBottom:4,fontWeight:500}}>{l}</div>{el}</div>)}
        </div>
        <div style={{marginTop:12,padding:"12px 14px",background:"rgba(15,23,42,0.4)",borderRadius:12,border:"1px solid "+C.border}}>
          <div style={{fontSize:10,color:C.orange,fontWeight:600,marginBottom:8,letterSpacing:0.5}}>§162 / §164 參數設定</div>
          <div style={{display:"flex",gap:isMobile?10:14,flexWrap:"wrap",alignItems:"center"}}>
            <label style={{display:"flex",alignItems:"center",gap:5,fontSize:isMobile?10:11,color:C.muted,cursor:"pointer"}}><input type="checkbox" checked={hasSharedLobby} onChange={e=>setHasSharedLobby(e.target.checked)}/>共用梯廳</label>
            <label style={{display:"flex",alignItems:"center",gap:5,fontSize:isMobile?10:11,color:C.muted,cursor:"pointer"}}><input type="checkbox" checked={singleStair} onChange={e=>setSingleStair(e.target.checked)}/>僅一座直通梯</label>
            {isRes&&<label style={{display:"flex",alignItems:"center",gap:5,fontSize:isMobile?10:11,color:C.muted,cursor:"pointer"}}><input type="checkbox" checked={hasVoid} onChange={e=>setHasVoid(e.target.checked)}/>挑空設計</label>}
            <div style={{display:"flex",alignItems:"center",gap:5}}><span style={{fontSize:10,color:C.dim}}>道路寬</span><input type="number" value={roadWidth} onChange={e=>setRoadWidth(e.target.value)} placeholder="—" style={{...INP,width:56,padding:"5px 7px",fontSize:11,textAlign:"center"}}/></div>
            <div style={{display:"flex",alignItems:"center",gap:5}}><span style={{fontSize:10,color:C.dim}}>退縮D</span><input type="number" value={setbackDist} onChange={e=>setSetbackDist(e.target.value)} placeholder="—" style={{...INP,width:56,padding:"5px 7px",fontSize:11,textAlign:"center"}}/></div>
            {shadowMaxH&&<span style={{fontSize:11,color:C.yellow,fontWeight:600}}>→ H≤{shadowMaxH.toFixed(1)}M</span>}
          </div>
        </div>
        {!isMobile&&<div style={{marginTop:10}}><div style={{fontSize:10,color:C.dim,marginBottom:4}}>備註</div><textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={1} style={{...INP,resize:"none"}}/></div>}
      </div>

      {/* AUTO ALERTS */}
      {autoAlerts.length>0&&tab!=="search"&&(
        <div style={{background:"rgba(6,11,20,0.8)",backdropFilter:"blur(10px)",borderBottom:"1px solid "+C.border,padding:isMobile?"8px 16px":"10px 24px"}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:showAutoAlerts?8:0,flexWrap:"wrap"}}>
            <span style={{fontSize:11,color:C.orange,fontWeight:600}}>智慧法規提示</span>
            <span style={{background:autoAlerts.filter(a=>a.level==="error").length>0?"rgba(248,113,113,0.1)":"rgba(52,211,153,0.1)",color:autoAlerts.filter(a=>a.level==="error").length>0?C.red:C.green,border:"1px solid",borderColor:autoAlerts.filter(a=>a.level==="error").length>0?"rgba(248,113,113,0.2)":"rgba(52,211,153,0.2)",borderRadius:12,padding:"2px 10px",fontSize:10,fontWeight:600}}>{autoAlerts.filter(a=>a.level==="error").length} 錯誤 · {autoAlerts.filter(a=>a.level==="warn").length} 警告</span>
            <button onClick={()=>setShowAutoAlerts(v=>!v)} style={{marginLeft:"auto",background:"transparent",border:"1px solid "+C.border,color:C.dim,borderRadius:8,padding:"3px 10px",cursor:"pointer",fontSize:10}}>{showAutoAlerts?"收合":"展開"}</button>
          </div>
          {showAutoAlerts&&(
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}} className="animate-fade-in">
              {autoAlerts.map((a,i)=>(
                <div key={i} style={{display:"flex",alignItems:"flex-start",gap:8,background:AL[a.level].bg,border:"1px solid "+AL[a.level].border,borderRadius:10,padding:"7px 12px",flex:isMobile?"1 1 100%":"1 1 280px",minWidth:isMobile?0:220}}>
                  <span style={{color:AL[a.level].color,fontWeight:700,fontSize:12,flexShrink:0}}>{AL[a.level].icon}</span>
                  <div style={{minWidth:0}}>
                    <span style={{color:AL[a.level].color,fontSize:10,fontWeight:700,marginRight:6}}>{a.code}</span>
                    <span style={{color:C.muted,fontSize:10}}>{a.msg}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div style={{padding:isMobile?"14px 16px":"20px 24px"}} className="tab-content">

        {/* ═══ CALC TAB ═══ */}
        {tab==="calc"&&(
          <div style={{display:"flex",gap:16,flexWrap:"wrap",alignItems:"flex-start",flexDirection:isMobile?"column":"row"}}>
            <div style={{flex:"2 1 400px",display:"flex",flexDirection:"column",gap:16,minWidth:0,width:isMobile?"100%":undefined}}>
              <div style={{fontSize:11,color:C.dim,letterSpacing:2,fontWeight:600}}>條文自動驗算 — §160~§166</div>

              {((!isNaN(bcrC)&&bcrC>BCR)||actFARr>allowFARr||mepOverCap||fhViolations>0||(shadowMaxH&&totalH>shadowMaxH))&&(
                <div style={{background:"rgba(127,29,29,0.2)",border:"1px solid rgba(248,113,113,0.2)",borderRadius:14,padding:isMobile?"10px 14px":"12px 18px",display:"flex",gap:14,alignItems:"flex-start"}} className="animate-fade-in">
                  <span style={{fontSize:20,marginTop:2}}>⚠</span>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{color:C.red,fontSize:13,fontWeight:700,marginBottom:5}}>法規超限警告</div>
                    {!isNaN(bcrC)&&bcrC>BCR&&<div style={{color:"#fca5a5",fontSize:11}}>§161 建蔽率 {bcrC.toFixed(1)}% 超過法定 {BCR}%</div>}
                    {actFARr>allowFARr&&<div style={{color:"#fca5a5",fontSize:11}}>§161 容積率 {actFARr.toFixed(1)}% 超過允建 {allowFARr.toFixed(1)}%</div>}
                    {mepOverCap&&<div style={{color:"#fca5a5",fontSize:11}}>§162-2 機電免計 {sumMep.toFixed(0)}㎡ 超過上限 {mepCapArea.toFixed(0)}㎡</div>}
                    {fhViolations>0&&<div style={{color:"#fca5a5",fontSize:11}}>§164-1 有 {fhViolations} 層樓高超過限制</div>}
                    {shadowMaxH&&totalH>shadowMaxH&&<div style={{color:"#fca5a5",fontSize:11}}>§164 建築高度 {totalH.toFixed(1)}M 超過限高 {shadowMaxH.toFixed(1)}M</div>}
                  </div>
                </div>
              )}

              <Card><div style={{padding:"16px 20px"}}><div style={{display:"flex",justifyContent:"space-around",flexWrap:"wrap",gap:isMobile?8:12}}>
                <Arc value={isNaN(bcrC)?0:bcrC} max={BCR||50} color={C.cyan} label="建蔽率" isMobile={isMobile}/>
                <Arc value={actFARr||0} max={allowFARr||FAR||200} color={C.purple} label="容積率" isMobile={isMobile}/>
                <Arc value={totalH||0} max={shadowMaxH||99} color={C.yellow} label="建築高度" unit="M" isMobile={isMobile}/>
                {!isNaN(parkReq)&&<Arc value={pf(parking)} max={parkReq} color={C.green} label="停車位" unit="位" isMobile={isMobile}/>}
              </div>
              <div style={{marginTop:12,display:"flex",gap:isMobile?10:16,justifyContent:"center",flexWrap:"wrap"}}>
                {[["法定建蔽",BCR+"%",C.cyan],["法定容積",FAR+"%",C.purple],["允建容積",n1(allowFARr)+"%",C.yellow],["退縮",zd.s||"—",C.green],["機電上限",mepCapPct+"%",C.teal]].map(([l,v,c])=>(<span key={l} style={{fontSize:isMobile?10:11,color:C.muted}}>{l}：<b style={{color:c}}>{v}</b></span>))}
              </div></div></Card>

              <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:16}}>
                <Card>{SH("📐","基本量體 §161")}
                  <CRow label="建蔽率" val={isNaN(bcrC)?"":bcrC} unit="%" limit={BCR} lLabel={"≤"+BCR+"%"} isMobile={isMobile}/>
                  <CRow label="容積率（實設）" val={actFARr||""} unit="%" limit={allowFARr||FAR} lLabel={"≤"+n1(allowFARr)+"%"} note={bsFARContrib>0?"含地下室計容 "+bsFARContrib.toFixed(1)+"㎡":""} isMobile={isMobile}/>
                  <CRow label="建築高度 §164" val={totalH||""} unit="M" limit={shadowMaxH||999} lLabel={shadowMaxH?"≤"+shadowMaxH.toFixed(1)+"M":"輸入道路寬啟用"} note={shadowMaxH?"H≤3.6×("+roadWidth+"+"+setbackDist+")":""} isMobile={isMobile}/>
                  <CRow label="停車位" val={parking!==""?pf(parking):""} unit="位" limit={parkReq} lLabel={!isNaN(parkReq)?"≥"+parkReq+"位":"依用途另計"} inv note="§162-3 停車免計容積" isMobile={isMobile}/>
                  <CRow label="屋突面積 §99" val={rfTotal||""} unit="㎡" limit={rfMaxArea||999} lLabel={rfMaxArea>0?"≤"+rfMaxArea.toFixed(1)+"㎡":"—"} note="≤建築面積×1/8" isMobile={isMobile}/>
                </Card>

                <Card>{SH("📋","§162 容積免計明細",C.orange)}
                  <div style={{padding:"12px 16px",borderBottom:"1px solid "+C.border2}}>
                    <div style={{fontSize:11,color:C.yellow,fontWeight:600,marginBottom:8}}>{hasSharedLobby?"陽台≤10% + 梯廳≤10%（合計≤15%）":"無共用梯廳：陽台≤12.5%或8㎡"}</div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                      {[["陽台總計",n2(sumBal),C.purple],["陽台免計",n2(sumBalExempt),C.green],["陽台計容",n2(sumBalCounted),sumBalCounted>0?C.red:C.faint]].map(([l,v,c])=>(<div key={l}><div style={{fontSize:9,color:C.dim}}>{l}</div><div style={{color:c,fontFamily:"'JetBrains Mono',monospace",fontSize:12,fontWeight:700}}>{v}</div></div>))}
                    </div>
                    {hasSharedLobby&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginTop:8}}>{[["梯廳總計",n2(sumCorr),C.lav],["梯廳免計",n2(sumCorrExempt),C.green],["梯廳計容",n2(sumCorrCounted),sumCorrCounted>0?C.red:C.faint]].map(([l,v,c])=>(<div key={l}><div style={{fontSize:9,color:C.dim}}>{l}</div><div style={{color:c,fontFamily:"'JetBrains Mono',monospace",fontSize:12,fontWeight:700}}>{v}</div></div>))}</div>}
                  </div>
                  <div style={{padding:"12px 16px",borderBottom:"1px solid "+C.border2}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><span style={{fontSize:11,color:C.teal,fontWeight:600}}>§162-2 機電上限（{mepCapPct}%）</span><Badge pass={!mepOverCap} idle={sumMep===0||!lFAR}/></div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                      {[["機電總計",n2(sumMep)+"㎡",C.teal],["免計上限",n2(mepCapArea)+"㎡",C.dim],[mepOverCap?"超出":"餘額",(mepOverCap?"+":"")+n2(Math.abs(mepCapArea-sumMep))+"㎡",mepOverCap?C.red:C.green]].map(([l,v,c])=>(<div key={l}><div style={{fontSize:9,color:C.dim}}>{l}</div><div style={{color:c,fontFamily:"'JetBrains Mono',monospace",fontSize:11,fontWeight:700}}>{v}</div></div>))}
                    </div>
                  </div>
                  {isRes&&<div style={{padding:"12px 16px"}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><span style={{fontSize:11,color:C.lav,fontWeight:600}}>§164-1 樓層高度限制</span><Badge pass={fhViolations===0} idle={!fl}/></div>
                    <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>{[hasVoid?["挑空層","≤6.0M"]:["地面層","≤4.2M"],["其餘層","≤3.6M"]].map(([l,v])=>(<span key={l} style={{fontSize:10,color:C.muted}}>{l} <b style={{color:C.text}}>{v}</b></span>))}</div>
                    {fhViolations>0&&<div style={{marginTop:5,fontSize:10,color:C.red}}>⚠ {fhChecks.map((c,i)=>c.limit&&!c.ok?(floorCalcs[i].label+"("+floorCalcs[i].fh.toFixed(2)+"M>"+c.limit+"M)"):null).filter(Boolean).join("、")}</div>}
                  </div>}
                </Card>

                <Card>{SH("🔥","防火區劃 §79 · 安全梯",C.red)}
                  <div style={{padding:"12px 16px",borderBottom:"1px solid "+C.border2}}>
                    <div style={{fontSize:11,color:C.red,fontWeight:600,marginBottom:8}}>防火區劃面積上限</div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                      {[["無自動撒水",fl>=11?"每區≤100㎡":"每區≤1500㎡",fl>=11?C.red:C.yellow],["設自動撒水",fl>=11?"每區≤300㎡":"每區≤4500㎡",C.green]].map(([l,v,c])=>(<div key={l} style={{background:"rgba(15,23,42,0.4)",borderRadius:10,padding:"8px 12px",border:"1px solid "+C.border}}>
                        <div style={{fontSize:10,color:C.dim,marginBottom:3}}>{l}</div>
                        <div style={{color:c,fontFamily:"'JetBrains Mono',monospace",fontWeight:700,fontSize:12}}>{v}</div>
                      </div>))}
                    </div>
                  </div>
                  <div style={{padding:"12px 16px"}}>
                    <div style={{fontSize:11,color:C.yellow,fontWeight:600,marginBottom:8}}>安全梯 / 消防</div>
                    <div style={{display:"flex",flexDirection:"column",gap:6}}>
                      {[{l:"梯型",v:fl>=11?"特別安全梯":fl>=4?"安全梯":"一般",c:fl>=11?C.red:fl>=4?C.yellow:C.green},{l:"電梯",v:fl>=4?"應設 §100":"不強制",c:fl>=4?C.yellow:C.faint},{l:"緊急昇降",v:totalH>50?"須設 §106":"不需",c:totalH>50?C.red:C.faint},{l:"消防",v:fl>=11?"全棟撒水+排煙":"依面積",c:fl>=11?C.orange:C.muted}].map(({l,v,c})=>(<div key={l} style={{display:"flex",justifyContent:"space-between",fontSize:11,borderBottom:"1px solid "+C.border2,paddingBottom:5}}>
                        <span style={{color:C.muted}}>{l}</span>
                        <span style={{color:c,fontFamily:"'JetBrains Mono',monospace",fontWeight:600}}>{v}</span>
                      </div>))}
                    </div>
                  </div>
                </Card>

                <Card>{SH("🪟","採光 / 通風 · 無障礙",C.lav)}
                  <div style={{padding:"12px 16px",borderBottom:"1px solid "+C.border2}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><span style={{color:C.muted,fontSize:12}}>採光窗≥1/8 §43</span><Badge pass={winA&&avgFlr?pf(winA)>=avgFlr/8:undefined} idle={!winA||!avgFlr}/></div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}><div><div style={{color:C.dim,fontSize:10,marginBottom:3}}>下限</div><div style={{color:C.yellow,fontFamily:"'JetBrains Mono',monospace"}}>{avgFlr?"≥"+(avgFlr/8).toFixed(2)+"㎡":"—"}</div></div><div><div style={{color:C.dim,fontSize:10,marginBottom:3}}>設計窗面積</div><input type="number" value={winA} onChange={e=>setWinA(e.target.value)} style={{...INP,padding:"5px 8px"}}/></div></div>
                  </div>
                  <div style={{padding:"12px 16px",borderBottom:"1px solid "+C.border2}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><span style={{color:C.muted,fontSize:12}}>通風≥1/20 §44</span><Badge pass={ventA&&avgFlr?pf(ventA)>=avgFlr/20:undefined} idle={!ventA||!avgFlr}/></div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}><div><div style={{color:C.dim,fontSize:10,marginBottom:3}}>下限</div><div style={{color:C.yellow,fontFamily:"'JetBrains Mono',monospace"}}>{avgFlr?"≥"+(avgFlr/20).toFixed(2)+"㎡":"—"}</div></div><div><div style={{color:C.dim,fontSize:10,marginBottom:3}}>設計開口</div><input type="number" value={ventA} onChange={e=>setVentA(e.target.value)} style={{...INP,padding:"5px 8px"}}/></div></div>
                  </div>
                  <div style={{padding:"12px 16px"}}>
                    <div style={{fontSize:11,color:C.lav,fontWeight:600,marginBottom:8}}>無障礙 §167~</div>
                    <div style={{display:"flex",flexDirection:"column",gap:4}}>
                      {[{l:"適用",v:fl>=5||pf(units)>=16?"需設":"確認",c:fl>=5||pf(units)>=16?C.yellow:C.faint},{l:"坡道",v:"≤1/12；寬≥1.2M",c:C.muted},{l:"電梯",v:"深≥1.4M；門≥0.8M",c:C.muted},{l:"停車",v:"每50位設1個(3.5M)",c:C.muted}].map(({l,v,c})=>(<div key={l} style={{display:"flex",justifyContent:"space-between",fontSize:10,borderBottom:"1px solid "+C.border2,paddingBottom:4}}>
                        <span style={{color:C.dim}}>{l}</span><span style={{color:c,fontFamily:"'JetBrains Mono',monospace"}}>{v}</span>
                      </div>))}
                    </div>
                  </div>
                </Card>

                <Card style={{gridColumn:isMobile?undefined:"1 / -1"}}>
                  <div style={{background:"rgba(15,23,42,0.4)",padding:"10px 16px",fontSize:12,color:C.yellow,fontWeight:600,borderBottom:"1px solid "+C.border2}}>§160~§166 法規速查表</div>
                  <div style={{padding:16,display:"grid",gridTemplateColumns:isMobile?"repeat(2,1fr)":"repeat(auto-fill,minmax(160px,1fr))",gap:8}}>
                    {[["§161 容積率","容積總樓地板÷基地面積","#0ea5e9"],["§162-1 陽台","≤10%免計；合計≤15%","#a78bfa"],["§162-2 機電","免計≤基地容積15%","#2dd4bf"],["§162-3 停車","全部停車免計容積","#34d399"],["§164 日照","H≤3.6(Sw+D)","#ef4444"],["§164-1 層高","1F≤4.2M；餘≤3.6M","#a78bfa"],["§79 防火區劃","≤10層1500㎡；≥11層100㎡","#f87171"],["§95/96 安全梯","4層→安全梯；11層→特安梯","#fb923c"],["§100 電梯","≥4層須設置","#60a5fa"],["§106 緊急昇降","H>50M須設","#ef4444"],["§46 隔音","分戶牆Rw≥45dB","#a78bfa"],["§92 步行距離","防火建築≤50M","#34d399"]].map(([t,d,c])=>(<div key={t} style={{background:"rgba(15,23,42,0.3)",border:"1px solid "+c+"22",borderRadius:10,padding:isMobile?"8px 10px":"10px 12px",cursor:"pointer",transition:"all 0.2s ease"}} onClick={()=>{setSearchQ(t.replace("§","").split(" ")[0]);setTab("search");}}>
                      <div style={{color:c,fontSize:isMobile?10:11,fontWeight:600,marginBottom:3}}>{t}</div>
                      <div style={{color:C.muted,fontSize:isMobile?9:10}}>{d}</div>
                    </div>))}
                  </div>
                </Card>
              </div>
            </div>

            <div style={{flex:isMobile?"1 1 100%":"0 0 210px",width:isMobile?"100%":undefined}}>
              <Card>{SH("🏗","立面示意圖",C.yellow)}
                <div style={{padding:"12px 8px"}}><ElevSVG/><div style={{marginTop:12,display:"flex",flexDirection:"column",gap:6,padding:"0 8px"}}>
                  {[["地上總高",totalH>0?totalH.toFixed(1)+"M":"—",C.green],["含屋突",totalHWithRF>0?totalHWithRF.toFixed(1)+"M":"—",C.yellow],["層數",fl+"層/B"+bsFlrs+"/RF"+rfCount,C.cyan]].map(([l,v,c])=>(<div key={l} style={{display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:11}}><span style={{color:C.dim}}>{l}</span><span style={{color:c,fontFamily:"'JetBrains Mono',monospace",fontWeight:600}}>{v}</span></div>))}
                  {shadowMaxH&&<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:11,borderTop:"1px solid "+C.border,paddingTop:5}}><span style={{color:C.dim}}>§164限高</span><span style={{color:totalH>shadowMaxH?C.red:C.yellow,fontFamily:"'JetBrains Mono',monospace",fontWeight:600}}>{shadowMaxH.toFixed(1)}M</span></div>}
                </div></div>
              </Card>
            </div>
          </div>
        )}

        {/* ═══ DEV TAB ═══ */}
        {tab==="dev"&&(
          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            <div style={{fontSize:11,color:C.dim,letterSpacing:2,fontWeight:600}}>開發量評估</div>
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1.4fr",gap:16}}>
              <div style={{display:"flex",flexDirection:"column",gap:12}}>
                <Card>{SH("📌","基本參數")}<div style={{padding:"14px 16px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>{[["基地面積",(sa||"—")+"㎡",C.cyan],["法定建蔽",BCR+"%",C.cyan],["法定容積",FAR+"%",C.purple],["地上層數",(fl||"—")+"層",C.yellow]].map(([l,v,c])=>(<div key={l}><div style={{fontSize:10,color:C.dim,marginBottom:3}}>{l}</div><div style={{color:c,fontFamily:"'JetBrains Mono',monospace",fontSize:14,fontWeight:700}}>{v}</div></div>))}</div></Card>
                <Card>{SH("🏗","地下室參數",C.teal)}<div style={{padding:"14px 16px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>{[["開挖率",excRate,setExcRate,"×基地"],["地下層數",bsFlrs,setBsFlrs,"層"],["地下機電%",bsMepPct,setBsMepPct,"%"]].map(([l,v,sv,u])=>(<div key={l}><div style={{fontSize:10,color:C.dim,marginBottom:4}}>{l}</div><div style={{display:"flex",alignItems:"center",gap:6}}><input type="number" value={v} onChange={e=>sv(e.target.value)} style={{...INP,flex:1}}/><span style={{color:C.dim,fontSize:10}}>{u}</span></div></div>))}</div></Card>
                <Card>{SH("🎯","容積獎勵",C.yellow)}<div style={{padding:"14px 16px",display:"flex",flexDirection:"column",gap:10}}>{[["lw","危老獎勵","≤40%",C.red,bLw],["sd","海砂屋","≤30%",C.orange,bSd],["cp","綜合設計","≤30%",C.yellow,bCp],["tr","容積移轉","≤30%",C.green,bTr]].map(([k,label,hint,c,bv])=>(<div key={k} style={{display:"flex",alignItems:"center",gap:10}}><div style={{flex:1,fontSize:12,color:C.muted}}>{label} <span style={{fontSize:10,color:C.dim}}>({hint})</span></div><div style={{display:"flex",alignItems:"center",gap:5,width:85}}><input type="number" min={0} max={100} value={bonus[k]} onChange={e=>setBonus(p=>({...p,[k]:e.target.value}))} style={{...INP,width:58,textAlign:"right",color:c,fontWeight:700}}/><span style={{color:C.dim,fontSize:10}}>%</span></div><div style={{width:68,textAlign:"right",color:c,fontFamily:"'JetBrains Mono',monospace",fontSize:10}}>{lFAR?"+"+bv.toFixed(0)+"㎡":"—"}</div></div>))}<div style={{borderTop:"1px solid "+C.border2,paddingTop:10,display:"flex",alignItems:"center",gap:10}}><div style={{flex:1,fontSize:12,color:C.muted}}>機電佔比</div><div style={{display:"flex",alignItems:"center",gap:5,width:85}}><input type="number" min={0} max={50} step={0.1} value={mepPct} onChange={e=>setMepPct(e.target.value)} style={{...INP,width:58,textAlign:"right",color:C.teal,fontWeight:700}}/><span style={{color:C.dim,fontSize:10}}>%</span></div></div></div></Card>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:12}}>
                <Card>{SH("📊","容積計算結果")}<RL label="法定容積" val={n2(lFAR)} sub={py(lFAR)}/><RL label="最大建築面積" val={n2(maxBld)} sub={py(maxBld)}/>{bLw>0&&<RL label="  危老獎勵" val={n2(bLw)} sub={py(bLw)} color={C.red}/>}{bSd>0&&<RL label="  海砂屋" val={n2(bSd)} sub={py(bSd)} color={C.orange}/>}{bCp>0&&<RL label="  綜合設計" val={n2(bCp)} sub={py(bCp)} color={C.yellow}/>}{bTr>0&&<RL label="  容移" val={n2(bTr)} sub={py(bTr)} color={C.green}/>}<RL label="允建容積" val={n2(allowFAR)} sub={py(allowFAR)} color={C.cyan} bold/><RL label="允建容積率" val={n1(allowFARr)} unit="%" color={C.purple} bold/></Card>
                <Card>{SH("🏢","最大開發量")}<RL label="最大樓地板（含機電）" val={n2(maxFlr)} sub={py(maxFlr)} bold/><RL label="  機電估" val={n2(maxFlr*mepR)} sub={py(maxFlr*mepR)} color={C.teal}/><RL label={"  機電上限("+mepCapPct+"%)"} val={n2(mepCapArea)} color={mepOverCap?C.red:C.teal}/><RL label="最大陽台（≤10%）" val={n2(allowFAR*0.1)} sub={py(allowFAR*0.1)} color={C.lav}/><RL label="屋突上限（12.5%）" val={n2(rfMaxArea)} sub={py(rfMaxArea)} color={C.yellow}/><RL label="地下室總面積" val={n2(bsArea)} sub={py(bsArea)} color={C.green}/><RL label="估算停車位（40㎡/位）" val={estPk} unit="輛" color={C.green}/></Card>
              </div>
            </div>
          </div>
        )}

        {/* ═══ SPACE TAB ═══ */}
        {tab==="space"&&(
          <div style={{display:"flex",flexDirection:"column",gap:20}}>
            <div style={{fontSize:11,color:C.dim,letterSpacing:2,fontWeight:600}}>面積計算表 — §162 容積免計 · 樓層詳細輸入</div>

            {/* Summary bar */}
            <div style={{display:"grid",gridTemplateColumns:isMobile?"repeat(2,1fr)":"repeat(auto-fill,minmax(130px,1fr))",gap:10}}>
              <StatCard label="地上樓地板" value={n2(sumFlr)} unit="㎡" color={C.text}/>
              <StatCard label="地上容積" value={n2(aboveFAR)} unit="㎡" color={C.cyan}/>
              <StatCard label="地下計容" value={n2(bsFARContrib)} unit="㎡" color={bsFARContrib>0?C.orange:C.dim}/>
              <StatCard label="總容積" value={n2(sumFAR)} unit="㎡" color={C.cyan}/>
              <StatCard label="陽台免計" value={n2(sumBalExempt)} unit="㎡" color={C.lav}/>
              <StatCard label="梯廳免計" value={n2(sumCorrExempt)} unit="㎡" color={C.green}/>
              <StatCard label="屋突合計" value={n2(rfTotal)} unit="㎡" color={rfTotal>rfMaxArea?C.red:C.yellow} warn={rfTotal>rfMaxArea}/>
              <StatCard label="容積實設率" value={n1(actFARr)} unit="%" color={actFARr>allowFARr?C.red:C.green} warn={actFARr>allowFARr} sub={"允建 "+n1(allowFARr)+"%"}/>
            </div>
            <Card style={{padding:"14px 18px",background:"rgba(15,23,42,0.5)"}}>
              <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:6}}>
                <span style={{fontSize:11,color:C.dim}}>容積達成率</span>
                <span style={{fontSize:11,fontWeight:700,fontFamily:"'JetBrains Mono',monospace",color:actFARr>allowFARr?C.red:C.cyan}}>
                  {n1(actFARr)}% / {n1(allowFARr)}%
                </span>
                <span style={{marginLeft:"auto",fontSize:11,fontWeight:700,color:actFARr>allowFARr?C.red:C.green}}>{actFARr>allowFARr?"⚠ 超過允建":"✓ 符合法規"}</span>
              </div>
              <div style={{height:10,background:"rgba(30,45,64,0.6)",borderRadius:5,overflow:"hidden",border:"1px solid rgba(56,189,248,0.06)"}}>
                <div className="progress-bar" style={{width:Math.min((actFARr/(allowFARr||1))*100,100)+"%",height:"100%",background:actFARr>allowFARr?"linear-gradient(90deg,#ef4444,#f87171)":"linear-gradient(90deg,#38bdf8,#818cf8)",borderRadius:5,boxShadow:actFARr>allowFARr?"0 0 8px rgba(239,68,68,0.4)":"0 0 8px rgba(56,189,248,0.3)"}}/>
              </div>
            </Card>

            {/* Unit Types */}
            <Card>
              {SH("🏠","戶型設定",C.cyan)}
              <div style={{padding:"14px 16px",display:"flex",flexDirection:"column",gap:10}}>
                <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center",marginBottom:4}}>
                  <button onClick={addUT} style={{background:"rgba(56,189,248,0.08)",border:"1px solid rgba(56,189,248,0.2)",color:C.cyan,borderRadius:8,padding:"5px 14px",cursor:"pointer",fontSize:11}}>＋ 新增戶型</button>
                  <span style={{fontSize:10,color:C.dim}}>共 {unitTypes.length} 種戶型</span>
                </div>
                {unitTypes.map(ut=>{
                  const sum=utSum.find(s=>s.id===ut.id)||{};
                  const isExp=expandUT===ut.id;
                  return (
                    <div key={ut.id} style={{border:"1px solid "+(isExp?"rgba(56,189,248,0.2)":"rgba(56,189,248,0.06)"),borderRadius:12,overflow:"hidden"}}>
                      <div onClick={()=>setExpandUT(isExp?null:ut.id)} style={{padding:"10px 14px",cursor:"pointer",display:"flex",alignItems:"center",gap:10,background:isExp?"rgba(18,33,58,0.5)":"rgba(15,23,42,0.3)"}}>
                        <span style={{color:C.cyan,fontWeight:700,fontSize:13}}>{ut.name}</span>
                        <span style={{fontSize:10,color:C.muted,flex:1}}>室內 {n2(sum.indoor||0)}㎡ · 陽台 {n2(sum.bal||0)}㎡ · 合計 {n2(sum.total||0)}㎡</span>
                        {unitTypes.length>1&&<button onClick={e=>{e.stopPropagation();delUT(ut.id);}} style={{background:"rgba(127,29,29,0.2)",border:"1px solid rgba(248,113,113,0.2)",color:C.red,borderRadius:6,padding:"2px 8px",cursor:"pointer",fontSize:10}}>刪除</button>}
                        <span style={{color:C.faint,fontSize:10}}>{isExp?"▲":"▼"}</span>
                      </div>
                      {isExp&&(
                        <div style={{padding:"12px 14px",borderTop:"1px solid rgba(56,189,248,0.08)"}} className="animate-fade-in">
                          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                            <thead><tr style={{color:C.dim}}><th style={{textAlign:"left",padding:"4px 6px",fontWeight:400}}>空間</th><th style={{textAlign:"center",fontWeight:400,padding:"4px 6px"}}>類別</th><th style={{textAlign:"right",fontWeight:400,padding:"4px 6px"}}>面積(㎡)</th><th style={{width:40}}></th></tr></thead>
                            <tbody>
                              {ut.spaces.map(sp=>(
                                <tr key={sp.id} style={{borderTop:"1px solid rgba(56,189,248,0.04)"}}>
                                  <td style={{padding:"5px 6px"}}><input value={sp.name} onChange={e=>upSp(ut.id,sp.id,"name",e.target.value)} style={{...INP,padding:"4px 8px",fontSize:11}}/></td>
                                  <td style={{padding:"5px 6px"}}><select value={sp.cat} onChange={e=>upSp(ut.id,sp.id,"cat",e.target.value)} style={{...INP,padding:"4px 8px",fontSize:11,width:"auto"}}>
                                    <option value="res">居室</option><option value="bath">附屬</option><option value="bal">陽台</option>
                                  </select></td>
                                  <td style={{padding:"5px 6px"}}><input type="number" step="0.01" value={sp.area} onChange={e=>upSp(ut.id,sp.id,"area",e.target.value)} style={{...INP,padding:"4px 8px",fontSize:11,textAlign:"right"}}/></td>
                                  <td style={{padding:"5px 6px",textAlign:"center"}}><button onClick={()=>delSp(ut.id,sp.id)} style={{background:"transparent",border:"none",color:C.dim,cursor:"pointer",fontSize:13}}>✕</button></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          <button onClick={()=>addSp(ut.id)} style={{marginTop:8,background:"rgba(52,211,153,0.06)",border:"1px solid rgba(52,211,153,0.15)",color:C.green,borderRadius:7,padding:"4px 12px",cursor:"pointer",fontSize:10}}>＋ 新增空間</button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* MEP Template */}
            <Card>
              {SH("⚡","機電模板",C.teal)}
              <div style={{padding:"14px 16px"}}>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10,flexWrap:"wrap"}}>
                  <label style={{display:"flex",alignItems:"center",gap:6,fontSize:11,color:C.muted,cursor:"pointer"}}>
                    <input type="checkbox" checked={useMepTemplate} onChange={e=>setUseMepTemplate(e.target.checked)}/>自動套用機電模板至各樓層
                  </label>
                  <span style={{fontSize:10,color:C.dim}}>合計 {n2(getMepFromItems(mepTemplate))}㎡</span>
                </div>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                  <thead><tr style={{color:C.dim}}><th style={{textAlign:"left",padding:"4px 6px",fontWeight:400}}>項目</th><th style={{textAlign:"right",padding:"4px 6px",fontWeight:400}}>面積(㎡)</th><th style={{width:40}}></th></tr></thead>
                  <tbody>
                    {mepTemplate.map(it=>(
                      <tr key={it.id} style={{borderTop:"1px solid rgba(56,189,248,0.04)"}}>
                        <td style={{padding:"4px 6px"}}><input value={it.name} onChange={e=>upMepItem(it.id,"name",e.target.value)} style={{...INP,padding:"4px 8px",fontSize:11}}/></td>
                        <td style={{padding:"4px 6px"}}><input type="number" step="0.01" value={it.area} onChange={e=>upMepItem(it.id,"area",e.target.value)} style={{...INP,padding:"4px 8px",fontSize:11,textAlign:"right"}}/></td>
                        <td style={{padding:"4px 6px",textAlign:"center"}}><button onClick={()=>delMepItem(it.id)} style={{background:"transparent",border:"none",color:C.dim,cursor:"pointer",fontSize:13}}>✕</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <button onClick={addMepItem} style={{marginTop:8,background:"rgba(20,184,166,0.06)",border:"1px solid rgba(20,184,166,0.15)",color:C.teal,borderRadius:7,padding:"4px 12px",cursor:"pointer",fontSize:10}}>＋ 新增項目</button>
              </div>
            </Card>

            {/* Batch Settings */}
            <Card>
              {SH("📋","批次設定",C.orange)}
              <div style={{padding:"14px 16px"}}>
                <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center",marginBottom:10}}>
                  <button onClick={()=>setShowBatch(v=>!v)} style={{background:"rgba(251,146,60,0.08)",border:"1px solid rgba(251,146,60,0.2)",color:C.orange,borderRadius:8,padding:"5px 14px",cursor:"pointer",fontSize:11}}>{showBatch?"收合批次面板":"展開批次面板"}</button>
                  <span style={{fontSize:10,color:C.dim}}>已選 {batchSel.size} 層</span>
                </div>
                {showBatch&&(
                  <div className="animate-fade-in">
                    <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:12}}>
                      <button onClick={selectAllStd} style={{background:"rgba(30,45,64,0.5)",border:"1px solid "+C.border,color:C.muted,borderRadius:7,padding:"4px 10px",cursor:"pointer",fontSize:10}}>全選標準層</button>
                      <button onClick={clearBatchSel} style={{background:"rgba(30,45,64,0.5)",border:"1px solid "+C.border,color:C.muted,borderRadius:7,padding:"4px 10px",cursor:"pointer",fontSize:10}}>清除選取</button>
                      <div style={{display:"flex",gap:5,alignItems:"center"}}>
                        <input type="number" value={batchRangeFrom} onChange={e=>setBatchRangeFrom(e.target.value)} placeholder="從" style={{...INP,width:55,padding:"4px 7px",fontSize:11,textAlign:"center"}}/>
                        <span style={{color:C.dim,fontSize:10}}>~</span>
                        <input type="number" value={batchRangeTo} onChange={e=>setBatchRangeTo(e.target.value)} placeholder="至" style={{...INP,width:55,padding:"4px 7px",fontSize:11,textAlign:"center"}}/>
                        <span style={{color:C.dim,fontSize:10}}>層</span>
                        <button onClick={selectRange} style={{background:"rgba(30,45,64,0.5)",border:"1px solid "+C.border,color:C.muted,borderRadius:7,padding:"4px 10px",cursor:"pointer",fontSize:10}}>選取範圍</button>
                      </div>
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(auto-fill,minmax(130px,1fr))",gap:8,marginBottom:10}}>
                      {unitTypes.map(ut=>(
                        <div key={ut.id}><div style={{fontSize:10,color:C.dim,marginBottom:4}}>{ut.name}戶數</div>
                          <input type="number" min={0} value={batchTpl["ut_"+ut.id]||0} onChange={e=>setBatchTpl(p=>({...p,["ut_"+ut.id]:parseInt(e.target.value)||0}))} style={{...INP,fontSize:11}}/>
                        </div>
                      ))}
                      <div><div style={{fontSize:10,color:C.dim,marginBottom:4}}>共用梯廳(㎡)</div><input type="number" step="0.01" value={batchTpl.corr||""} onChange={e=>setBatchTpl(p=>({...p,corr:e.target.value}))} placeholder="—" style={{...INP,fontSize:11}}/></div>
                      <div><div style={{fontSize:10,color:C.dim,marginBottom:4}}>樓高(M)</div><input type="number" step="0.1" value={batchTpl.fh||""} onChange={e=>setBatchTpl(p=>({...p,fh:e.target.value}))} placeholder="—" style={{...INP,fontSize:11}}/></div>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <button onClick={applyBatch} style={{background:"rgba(251,146,60,0.1)",border:"1px solid rgba(251,146,60,0.2)",color:C.orange,borderRadius:8,padding:"6px 18px",cursor:"pointer",fontSize:11,fontWeight:600}}>套用至選取樓層</button>
                      {batchMsg&&<span style={{fontSize:11,color:C.green}}>{batchMsg}</span>}
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Floor Mix Table */}
            <Card>
              {SH("🏢","樓層配置",C.cyan)}
              <div style={{padding:"0 0 14px"}}>
                <div style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:11,minWidth:isMobile?500:600}}>
                    <thead style={{position:"sticky",top:0,zIndex:1}}>
                      <tr style={{background:"rgba(6,11,20,0.9)"}}>
                        <th style={{padding:"8px 12px",textAlign:"left",color:C.dim,fontWeight:500,width:50}}>層</th>
                        <th style={{padding:"8px 6px",textAlign:"center",color:C.dim,fontWeight:500,width:36}}>特殊</th>
                        {unitTypes.map(ut=><th key={ut.id} style={{padding:"8px 6px",textAlign:"center",color:C.cyan,fontWeight:500,minWidth:60}}>{ut.name}</th>)}
                        <th style={{padding:"8px 6px",textAlign:"right",color:C.green,fontWeight:500,minWidth:70}}>梯廳(㎡)</th>
                        <th style={{padding:"8px 6px",textAlign:"right",color:C.purple,fontWeight:500,minWidth:60}}>層高(M)</th>
                        <th style={{padding:"8px 6px",textAlign:"right",color:C.teal,fontWeight:500,minWidth:70}}>容積(㎡)</th>
                        <th style={{padding:"8px 4px",width:28}}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {floorMix.map((f,i)=>{
                        const fc=floorCalcs[i]||{};
                        const fhBad=fhChecks[i]&&!fhChecks[i].ok;
                        const isSel=batchSel.has(f.id);
                        return (
                          <tr key={f.id} onClick={()=>toggleBatchSel(f.id)} style={{borderTop:"1px solid rgba(56,189,248,0.04)",cursor:"pointer",background:isSel?"rgba(56,189,248,0.05)":f.isSpec?"rgba(251,191,36,0.03)":"transparent",transition:"background 0.15s"}}>
                            <td style={{padding:"5px 12px"}}>
                              <span style={{color:f.isSpec?C.yellow:C.muted,fontFamily:"'JetBrains Mono',monospace",fontWeight:f.isSpec?600:400,fontSize:11}}>{f.label}</span>
                            </td>
                            <td style={{padding:"5px 6px",textAlign:"center"}} onClick={e=>e.stopPropagation()}>
                              <input type="checkbox" checked={f.isSpec} onChange={()=>togSpec(f.id)} style={{accentColor:C.yellow}}/>
                            </td>
                            {unitTypes.map(ut=>(
                              <td key={ut.id} style={{padding:"4px 4px"}} onClick={e=>e.stopPropagation()}>
                                <input type="number" min={0} value={f.mix[ut.id]||0} onChange={e=>upFMMix(f.id,ut.id,e.target.value)} style={{...INP,padding:"4px 6px",fontSize:11,textAlign:"center",color:pf(f.mix[ut.id])>0?C.cyan:C.faint}} disabled={f.isSpec}/>
                              </td>
                            ))}
                            <td style={{padding:"4px 4px"}} onClick={e=>e.stopPropagation()}>
                              <input type="number" step="0.01" value={f.corr} onChange={e=>upFM(f.id,"corr",e.target.value)} placeholder="—" style={{...INP,padding:"4px 6px",fontSize:11,textAlign:"right",color:C.green}}/>
                            </td>
                            <td style={{padding:"4px 4px"}} onClick={e=>e.stopPropagation()}>
                              <input type="number" step="0.1" value={f.fh} onChange={e=>upFM(f.id,"fh",e.target.value)} placeholder={gfh} style={{...INP,padding:"4px 6px",fontSize:11,textAlign:"right",color:fhBad?C.red:C.purple}}/>
                            </td>
                            <td style={{padding:"5px 6px",textAlign:"right",fontFamily:"'JetBrains Mono',monospace",color:fc.far>0?C.cyan:C.faint,fontWeight:fc.far>0?600:400,fontSize:10}}>{fc.far>0?n2(fc.far):"—"}</td>
                            <td style={{padding:"4px",textAlign:"center"}} onClick={e=>e.stopPropagation()}>
                              <button onClick={()=>copyDown(f.id)} title="往下複製" style={{background:"transparent",border:"none",color:C.dim,cursor:"pointer",fontSize:11,padding:2}}>↓</button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr style={{borderTop:"2px solid rgba(56,189,248,0.15)",background:"rgba(6,11,20,0.8)"}}>
                        <td colSpan={2+unitTypes.length} style={{padding:"8px 12px",color:C.dim,fontSize:11}}>合計</td>
                        <td style={{padding:"8px 6px",textAlign:"right",color:C.green,fontFamily:"'JetBrains Mono',monospace",fontWeight:700,fontSize:11}}>{n2(sumCorrExempt)}+{n2(sumCorrCounted)}</td>
                        <td style={{padding:"8px 6px",textAlign:"right",color:C.purple,fontFamily:"'JetBrains Mono',monospace",fontWeight:700,fontSize:11}}>H {n1(totalH)}M</td>
                        <td style={{padding:"8px 6px",textAlign:"right",color:C.cyan,fontFamily:"'JetBrains Mono',monospace",fontWeight:700,fontSize:12}}>{n2(aboveFAR)}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </Card>

            {/* Basement */}
            {bsData.length>0&&(
              <Card>
                {SH("🔽","地下室",C.purple)}
                <div style={{padding:"0 0 14px",overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:11,minWidth:400}}>
                    <thead><tr style={{background:"rgba(6,11,20,0.9)"}}>
                      <th style={{padding:"8px 12px",textAlign:"left",color:C.dim,fontWeight:500,width:50}}>層</th>
                      <th style={{padding:"8px 6px",textAlign:"right",color:C.purple,fontWeight:500,minWidth:80}}>停車(輛)</th>
                      <th style={{padding:"8px 6px",textAlign:"right",color:C.teal,fontWeight:500,minWidth:80}}>機電(㎡)</th>
                      <th style={{padding:"8px 6px",textAlign:"right",color:C.orange,fontWeight:500,minWidth:80}}>計容(㎡)</th>
                      <th style={{padding:"8px 6px",textAlign:"right",color:C.dim,fontWeight:500,minWidth:70}}>層高(M)</th>
                    </tr></thead>
                    <tbody>
                      {bsData.map(f=>{
                        const bc=bsCalcs.find(c=>c.id===f.id)||{};
                        return (
                          <tr key={f.id} style={{borderTop:"1px solid rgba(129,140,248,0.06)"}}>
                            <td style={{padding:"5px 12px",color:C.purple,fontFamily:"'JetBrains Mono',monospace",fontWeight:600,fontSize:11}}>{f.label}</td>
                            <td style={{padding:"4px 6px"}}><input type="number" min={0} value={f.pk} onChange={e=>upBs(f.id,"pk",e.target.value)} placeholder="—" style={{...INP,padding:"4px 6px",fontSize:11,textAlign:"right",color:C.purple}}/></td>
                            <td style={{padding:"4px 6px"}}><input type="number" step="0.01" value={f.mep} onChange={e=>upBs(f.id,"mep",e.target.value)} placeholder="—" style={{...INP,padding:"4px 6px",fontSize:11,textAlign:"right",color:C.teal}}/></td>
                            <td style={{padding:"5px 6px",textAlign:"right",fontFamily:"'JetBrains Mono',monospace",color:bc.oth>0?C.orange:C.faint,fontSize:11}}>{bc.oth>0?n2(bc.oth):"—"}</td>
                            <td style={{padding:"4px 6px"}}><input type="number" step="0.1" value={f.fh} onChange={e=>upBs(f.id,"fh",e.target.value)} placeholder={bsfh} style={{...INP,padding:"4px 6px",fontSize:11,textAlign:"right",color:C.dim}}/></td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr style={{borderTop:"2px solid rgba(129,140,248,0.15)",background:"rgba(6,11,20,0.8)"}}>
                        <td colSpan={2} style={{padding:"8px 12px",color:C.dim,fontSize:11}}>合計</td>
                        <td style={{padding:"8px 6px",textAlign:"right",color:C.teal,fontFamily:"'JetBrains Mono',monospace",fontWeight:700,fontSize:11}}>{n2(bsCalcs.reduce((s,f)=>s+f.mep,0))}</td>
                        <td style={{padding:"8px 6px",textAlign:"right",color:C.orange,fontFamily:"'JetBrains Mono',monospace",fontWeight:700,fontSize:12}}>{n2(bsFARContrib)}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </Card>
            )}

            {/* Roof Structures */}
            {rfCount>0&&(
              <Card>
                {SH("🏗","屋突詳細",C.yellow)}
                <div style={{padding:"14px 16px",display:"flex",flexDirection:"column",gap:16}}>
                  {rfFloors.slice(0,rfCount).map(rf=>{
                    const rc=rfCalcs.find(r=>r.id===rf.id)||{};
                    return (
                      <div key={rf.id} style={{border:"1px solid rgba(251,191,36,0.12)",borderRadius:10,overflow:"hidden"}}>
                        <div style={{padding:"9px 14px",background:"rgba(251,191,36,0.05)",display:"flex",alignItems:"center",gap:10}}>
                          <span style={{color:C.yellow,fontWeight:700,fontSize:12}}>{rf.label}</span>
                          <div style={{display:"flex",alignItems:"center",gap:6}}>
                            <span style={{fontSize:10,color:C.dim}}>層高</span>
                            <input type="number" step="0.1" value={rf.fh} onChange={e=>upRf(rf.id,"fh",e.target.value)} style={{...INP,width:70,padding:"3px 8px",fontSize:11,textAlign:"right",color:C.yellow}}/>
                            <span style={{fontSize:10,color:C.dim}}>M</span>
                          </div>
                          <span style={{marginLeft:"auto",fontSize:11,color:C.yellow,fontFamily:"'JetBrains Mono',monospace",fontWeight:600}}>合計 {n2(rc.total||0)}㎡</span>
                          {rc.total>rfMaxArea&&<span style={{fontSize:10,color:C.red,background:"rgba(127,29,29,0.2)",padding:"1px 7px",borderRadius:5}}>超限</span>}
                        </div>
                        <div style={{padding:"10px 14px"}}>
                          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                            <thead><tr style={{color:C.dim}}><th style={{textAlign:"left",fontWeight:400,padding:"3px 4px"}}>項目</th><th style={{textAlign:"right",fontWeight:400,padding:"3px 4px"}}>面積(㎡)</th><th style={{width:30}}></th></tr></thead>
                            <tbody>
                              {rf.items.map(it=>(
                                <tr key={it.id} style={{borderTop:"1px solid rgba(251,191,36,0.05)"}}>
                                  <td style={{padding:"4px 4px"}}><input value={it.name} onChange={e=>upRfItem(rf.id,it.id,"name",e.target.value)} style={{...INP,padding:"4px 8px",fontSize:11}}/></td>
                                  <td style={{padding:"4px 4px"}}><input type="number" step="0.01" value={it.area} onChange={e=>upRfItem(rf.id,it.id,"area",e.target.value)} placeholder="—" style={{...INP,padding:"4px 8px",fontSize:11,textAlign:"right",color:C.yellow}}/></td>
                                  <td style={{padding:"4px",textAlign:"center"}}><button onClick={()=>delRfItem(rf.id,it.id)} style={{background:"transparent",border:"none",color:C.dim,cursor:"pointer",fontSize:12}}>✕</button></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          <button onClick={()=>addRfItem(rf.id)} style={{marginTop:8,background:"rgba(251,191,36,0.06)",border:"1px solid rgba(251,191,36,0.15)",color:C.yellow,borderRadius:7,padding:"4px 12px",cursor:"pointer",fontSize:10}}>＋ 新增項目</button>
                        </div>
                      </div>
                    );
                  })}
                  <div style={{padding:"10px 14px",background:"rgba(30,45,64,0.3)",borderRadius:8,border:"1px solid rgba(251,191,36,0.08)",display:"flex",gap:20,flexWrap:"wrap"}}>
                    <div><div style={{fontSize:10,color:C.dim,marginBottom:3}}>屋突上限 (12.5%建面)</div><div style={{color:C.yellow,fontFamily:"'JetBrains Mono',monospace",fontSize:13,fontWeight:700}}>{n2(rfMaxArea)}㎡</div></div>
                    <div><div style={{fontSize:10,color:C.dim,marginBottom:3}}>屋突合計</div><div style={{color:rfTotal>rfMaxArea?C.red:C.yellow,fontFamily:"'JetBrains Mono',monospace",fontSize:13,fontWeight:700}}>{n2(rfTotal)}㎡</div></div>
                    <div><div style={{fontSize:10,color:C.dim,marginBottom:3}}>剩餘額度</div><div style={{color:rfMaxArea-rfTotal>0?C.green:C.red,fontFamily:"'JetBrains Mono',monospace",fontSize:13,fontWeight:700}}>{n2(rfMaxArea-rfTotal)}㎡</div></div>
                  </div>
                </div>
              </Card>
            )}
          </div>
        )}

        {/* ═══ SEARCH TAB ═══ */}
        {tab==="search"&&(
          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            <div style={{fontSize:11,color:C.dim,letterSpacing:2,fontWeight:600}}>法規查詢 — 建技規 · 消防 · 無障礙 · 危老</div>
            <Card style={{padding:isMobile?"12px 14px":"16px 20px"}}>
              <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:12}}>
                <div style={{position:"relative",flex:1}}>
                  <span style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",color:C.dim,fontSize:14}}>🔍</span>
                  <input ref={searchInputRef} value={searchQ} onChange={e=>setSearchQ(e.target.value)} placeholder={isMobile?"搜尋條文…":"關鍵字搜尋：條文編號、名稱或關鍵詞"} style={{...INP,paddingLeft:36,fontSize:isMobile?12:13,background:"rgba(56,189,248,0.03)",border:"1px solid rgba(56,189,248,0.15)"}} autoFocus/>
                  {searchQ&&<button onClick={()=>setSearchQ("")} style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"transparent",border:"none",color:C.dim,cursor:"pointer",fontSize:14}}>✕</button>}
                </div>
                <span style={{color:C.muted,fontSize:11,whiteSpace:"nowrap"}}>{searchResults.length} 筆</span>
              </div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {[["all","全部"],["relevant","本案相關"],["checked","已標記"],...REG_CHAPTERS.map(c=>[c,c])].map(([v,l])=>(
                  <button key={v} onClick={()=>setSearchCat(v)} style={{padding:"4px 12px",borderRadius:14,cursor:"pointer",background:searchCat===v?"rgba(56,189,248,0.12)":"transparent",color:searchCat===v?C.cyan:C.dim,border:"1px solid "+(searchCat===v?"rgba(56,189,248,0.25)":C.border),fontSize:10,whiteSpace:"nowrap"}}>{l}</button>
                ))}
              </div>
              <div style={{marginTop:10,display:"flex",gap:6,flexWrap:"wrap"}}>
                <span style={{fontSize:10,color:C.faint,alignSelf:"center"}}>常用：</span>
                {["陽台","梯廳","防火區劃","安全梯","電梯","無障礙","停車","採光","容積","屋突","危老","排煙","隔音"].map(k=>(
                  <button key={k} onClick={()=>setSearchQ(k)} style={{padding:"3px 10px",borderRadius:12,cursor:"pointer",background:"rgba(15,23,42,0.4)",color:searchQ===k?C.cyan:C.muted,border:"1px solid "+(searchQ===k?"rgba(56,189,248,0.2)":C.border),fontSize:10}}>{k}</button>
                ))}
              </div>
              <div style={{marginTop:12,borderTop:"1px solid "+C.border2,paddingTop:10}}>
                <button onClick={()=>setShowAddReg(v=>!v)} style={{background:"rgba(52,211,153,0.08)",border:"1px solid rgba(52,211,153,0.2)",color:C.green,borderRadius:10,padding:"6px 14px",cursor:"pointer",fontSize:11}}>＋ 新增自訂條文</button>
                {showAddReg&&(
                  <div style={{marginTop:10,display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:8}}>
                    <input value={newReg.code} onChange={e=>setNewReg(p=>({...p,code:e.target.value}))} placeholder="條文編號" style={INP}/>
                    <input value={newReg.title} onChange={e=>setNewReg(p=>({...p,title:e.target.value}))} placeholder="條文標題" style={INP}/>
                    <input value={newReg.ch} onChange={e=>setNewReg(p=>({...p,ch:e.target.value}))} placeholder="分類" style={INP}/>
                    <select value={newReg.pri} onChange={e=>setNewReg(p=>({...p,pri:e.target.value}))} style={INP}><option value="高">高優先</option><option value="中">中優先</option><option value="低">低優先</option></select>
                    <input value={newReg.summary} onChange={e=>setNewReg(p=>({...p,summary:e.target.value}))} placeholder="摘要說明" style={{...INP,gridColumn:isMobile?undefined:"1 / -1"}}/>
                    <input value={newReg.formula} onChange={e=>setNewReg(p=>({...p,formula:e.target.value}))} placeholder="公式（選填）" style={INP}/>
                    <input value={newReg.kw} onChange={e=>setNewReg(p=>({...p,kw:e.target.value}))} placeholder="關鍵詞（逗號分隔）" style={INP}/>
                    <button onClick={addCustomReg} style={{background:"rgba(52,211,153,0.1)",border:"1px solid rgba(52,211,153,0.2)",color:C.green,borderRadius:10,padding:"7px 16px",cursor:"pointer",fontSize:11}}>確認新增</button>
                  </div>
                )}
              </div>
            </Card>

            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {searchResults.length===0&&(<Card style={{padding:"30px",textAlign:"center",color:C.faint,fontSize:12}}>無符合結果</Card>)}
              {searchResults.map(r=>{
                const isExp=expandedReg===r.id,isChecked=checkedRegs[r.id];
                const priColor=r.pri==="高"?C.red:r.pri==="中"?C.yellow:C.green;
                return (
                  <Card key={r.id} style={{border:"1px solid "+(isExp?"rgba(56,189,248,0.2)":isChecked?"rgba(52,211,153,0.15)":r.isCustom?"rgba(251,146,60,0.15)":"rgba(56,189,248,0.06)")}}>
                    <div onClick={()=>setExpandedReg(isExp?null:r.id)} style={{padding:isMobile?"10px 12px":"12px 16px",cursor:"pointer",display:"flex",alignItems:"flex-start",gap:isMobile?8:12,background:isExp?"rgba(18,33,58,0.5)":"transparent"}}>
                      <div style={{display:"flex",alignItems:isMobile?"flex-start":"center",gap:8,flex:1,minWidth:0,flexDirection:isMobile?"column":"row"}}>
                        <div style={{display:"flex",alignItems:"center",gap:6}}>
                          <span style={{color:r.isCustom?C.orange:C.cyan,fontWeight:700,fontSize:isMobile?12:13,fontFamily:"'JetBrains Mono',monospace",flexShrink:0}}>{r.code}</span>
                          {r.isCustom&&<span style={{fontSize:8,color:C.orange,background:"rgba(251,146,60,0.12)",padding:"1px 5px",borderRadius:4}}>自訂</span>}
                        </div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{color:C.text,fontSize:12,fontWeight:600,marginBottom:2}}><Highlight text={r.title} query={searchQ}/></div>
                          {!isMobile&&<div style={{color:C.muted,fontSize:11,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}><Highlight text={r.summary} query={searchQ}/></div>}
                        </div>
                      </div>
                      <div style={{display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
                        <span style={{background:priColor+"18",color:priColor,border:"1px solid "+priColor+"33",borderRadius:6,padding:"2px 8px",fontSize:9}}>{r.pri}</span>
                        {!isMobile&&<span style={{background:"rgba(30,48,80,0.5)",color:C.dim,borderRadius:6,padding:"2px 8px",fontSize:9}}>{r.ch}</span>}
                        <button onClick={e=>{e.stopPropagation();setCheckedRegs(p=>({...p,[r.id]:!p[r.id]}));}} style={{background:isChecked?"rgba(52,211,153,0.12)":"transparent",border:"1px solid "+(isChecked?"rgba(52,211,153,0.25)":C.border),color:isChecked?C.green:C.faint,borderRadius:8,padding:"3px 8px",cursor:"pointer",fontSize:10}}>{isChecked?"✓":"標記"}</button>
                        <span style={{color:C.faint,fontSize:10}}>{isExp?"▲":"▼"}</span>
                      </div>
                    </div>
                    {isExp&&(
                      <div style={{padding:"14px 16px",borderTop:"1px solid "+C.border,background:"rgba(6,11,20,0.4)"}} className="animate-fade-in">
                        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:14,marginBottom:12}}>
                          <div><div style={{fontSize:10,color:C.dim,marginBottom:5}}>條文摘要</div><div style={{color:C.text,fontSize:12,lineHeight:1.7}}>{r.summary}</div></div>
                          {r.formula&&<div><div style={{fontSize:10,color:C.dim,marginBottom:5}}>計算公式</div><div style={{background:"rgba(15,23,42,0.5)",borderRadius:8,padding:"10px 14px",color:C.yellow,fontFamily:"'JetBrains Mono',monospace",fontSize:12,border:"1px solid rgba(251,191,36,0.1)"}}>{r.formula}</div></div>}
                        </div>
                        <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                          <div style={{fontSize:10,color:C.dim}}>關鍵詞：</div>
                          {r.kw.map(k=>(<span key={k} style={{background:"rgba(30,48,80,0.4)",color:searchQ&&k.toLowerCase().includes(searchQ.toLowerCase())?C.yellow:C.muted,borderRadius:12,padding:"2px 10px",fontSize:10}}><Highlight text={k} query={searchQ}/></span>))}
                          {r.note&&<div style={{width:"100%",marginTop:5,padding:"6px 12px",background:"rgba(30,36,51,0.5)",borderRadius:8,color:C.dim,fontSize:10}}>💡 {r.note}</div>}
                          <div style={{display:"flex",gap:8,marginLeft:"auto",flexShrink:0}}>
                            {r.isCustom&&<button onClick={()=>deleteCustomReg(r.id)} style={{background:"rgba(127,29,29,0.2)",border:"1px solid rgba(248,113,113,0.2)",color:C.red,borderRadius:8,padding:"5px 12px",cursor:"pointer",fontSize:10}}>刪除</button>}
                            <button onClick={()=>{setCheckedRegs(p=>({...p,[r.id]:!p[r.id]}));}} style={{background:isChecked?"rgba(52,211,153,0.12)":"rgba(52,211,153,0.06)",border:"1px solid rgba(52,211,153,0.2)",color:isChecked?C.green:"rgba(52,211,153,0.5)",borderRadius:8,padding:"5px 14px",cursor:"pointer",fontSize:11}}>{isChecked?"已標記":"標記已審查"}</button>
                          </div>
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>

            {Object.values(checkedRegs).some(Boolean)&&(
              <Card style={{padding:"12px 18px",borderColor:"rgba(52,211,153,0.15)"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{color:C.green,fontSize:12,fontWeight:600}}>已審查 {Object.values(checkedRegs).filter(Boolean).length} 條</span>
                  <button onClick={()=>setCheckedRegs({})} style={{background:"transparent",border:"1px solid "+C.border,color:C.dim,borderRadius:8,padding:"4px 10px",cursor:"pointer",fontSize:10}}>清除</button>
                </div>
                <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:8}}>
                  {REG_DB.filter(r=>checkedRegs[r.id]).map(r=>(<span key={r.id} style={{background:"rgba(52,211,153,0.08)",color:C.green,border:"1px solid rgba(52,211,153,0.2)",borderRadius:12,padding:"2px 10px",fontSize:10}}>{r.code} {r.title}</span>))}
                </div>
              </Card>
            )}
          </div>
        )}

        {/* ═══ AI TAB ═══ */}
        {tab==="ai"&&(<div>
          <div style={{fontSize:11,color:C.dim,letterSpacing:2,fontWeight:600,marginBottom:14}}>AI 法規清單</div>
          <Card style={{padding:"14px 18px",marginBottom:14}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><span style={{fontSize:11,color:C.muted}}>進度 — {btype}</span><span style={{fontSize:11,fontWeight:700,fontFamily:"'JetBrains Mono',monospace",color:pctChk===100?C.green:C.cyan}}>{doneChk}/{chkList.length}（{pctChk}%）</span></div><div style={{height:8,background:"rgba(30,45,64,0.5)",borderRadius:5,overflow:"hidden"}}><div className="progress-bar" style={{width:pctChk+"%",height:"100%",background:pctChk===100?C.green:"linear-gradient(90deg,#38bdf8,#818cf8)",borderRadius:5}}/></div></Card>
          <button onClick={callAI} disabled={aiLoad} style={{background:aiLoad?"rgba(30,45,64,0.5)":"linear-gradient(135deg,#0ea5e9,#818cf8)",color:"white",border:"none",borderRadius:12,padding:"12px 24px",cursor:aiLoad?"not-allowed":"pointer",fontSize:12,fontWeight:600,marginBottom:16,boxShadow:aiLoad?"none":"0 4px 16px rgba(14,165,233,0.3)",transition:"all 0.2s ease"}}>{aiLoad?"分析中…":"生成 AI 法規清單"}</button>
          {aiErr&&<div style={{background:"rgba(127,29,29,0.2)",border:"1px solid rgba(248,113,113,0.2)",borderRadius:10,padding:14,color:C.red,fontSize:11,marginBottom:14}}>{aiErr}</div>}
          {aiList.length===0&&!aiLoad&&(<Card><div style={{padding:"10px 16px",borderBottom:"1px solid "+C.border2,fontSize:10,color:C.dim}}>預設（{btype}）</div>{(CHKLIST[btype]||[]).map((item,i)=>(<div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 16px",borderBottom:"1px solid "+C.border2}}><input type="checkbox" checked={!!chk[i]} onChange={()=>setChk(p=>({...p,[i]:!p[i]}))}/><span style={{color:chk[i]?C.faint:C.muted,fontSize:12,textDecoration:chk[i]?"line-through":"none"}}>{item}</span></div>))}</Card>)}
          {aiList.length>0&&(<div style={{display:"flex",flexDirection:"column",gap:16}}>{["高","中","低"].map(pri=>{const items=aiList.map((x,i)=>({x,i})).filter(({x})=>x.priority===pri);if(!items.length)return null;return(<div key={pri}><div style={{fontSize:11,color:PC[pri],letterSpacing:2,marginBottom:10,fontWeight:600}}><span style={{width:6,height:6,borderRadius:"50%",background:PC[pri],display:"inline-block",marginRight:8}}/>{pri}優先（{items.length}項）</div>{items.map(({x,i})=>(<Card key={i} style={{padding:"12px 16px",display:"flex",gap:12,marginBottom:8,borderLeft:"3px solid "+PC[x.priority]}}><input type="checkbox" checked={!!chk[i]} onChange={()=>setChk(p=>({...p,[i]:!p[i]}))}/><div style={{flex:1,minWidth:0}}><div style={{display:"flex",gap:8,marginBottom:5,flexWrap:"wrap"}}><span style={{fontSize:10,color:C.dim}}>{x.category}</span><span style={{background:PC[x.priority]+"18",color:PC[x.priority],border:"1px solid "+PC[x.priority]+"33",borderRadius:6,padding:"1px 8px",fontSize:10,fontWeight:600}}>{x.priority}</span></div><div style={{color:chk[i]?C.faint:C.text,fontSize:13,fontWeight:600,textDecoration:chk[i]?"line-through":"none",marginBottom:4}}>{x.title}</div><div style={{color:C.cyan,fontSize:10,marginBottom:4,fontFamily:"'JetBrains Mono',monospace"}}>{x.rule}</div><div style={{color:C.muted,fontSize:11}}>{x.note}</div></div></Card>))}</div>);})}</div>)}
        </div>)}

        {/* ═══ REF TAB ═══ */}
        {tab==="ref"&&(<div>
          <div style={{fontSize:11,color:C.dim,letterSpacing:2,fontWeight:600,marginBottom:14}}>各縣市細則</div>
          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(auto-fill,minmax(290px,1fr))",gap:14}}>
            {Object.entries(zones).map(([c,data])=>(<Card key={c} style={{border:"1px solid "+(c===county?"rgba(56,189,248,0.2)":"rgba(56,189,248,0.06)")}}><div style={{background:c===county?"rgba(18,33,58,0.5)":"rgba(15,23,42,0.3)",padding:"10px 16px",display:"flex",justifyContent:"space-between"}}><span style={{fontWeight:600,color:c===county?C.cyan:C.text,fontSize:13}}>{c}</span>{c===county&&<span style={{fontSize:10,color:C.cyan,background:"rgba(56,189,248,0.12)",padding:"2px 8px",borderRadius:6}}>當前</span>}</div><div style={{padding:14}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}><thead><tr style={{color:C.dim}}><th style={{textAlign:"left",padding:"4px 0",fontWeight:400}}>分區</th><th style={{textAlign:"center",fontWeight:400}}>建蔽</th><th style={{textAlign:"center",fontWeight:400}}>容積</th><th style={{textAlign:"center",fontWeight:400}}>退縮</th></tr></thead><tbody>{Object.entries(data.zones||{}).map(([z,v])=>(<tr key={z} style={{borderTop:"1px solid rgba(56,189,248,0.04)",background:z===zone&&c===county?"rgba(18,33,58,0.3)":"transparent"}}><td style={{padding:"5px 0",color:z===zone&&c===county?C.cyan:C.muted}}>{z}</td><td style={{textAlign:"center",color:C.red,fontFamily:"'JetBrains Mono',monospace"}}>{v.b}%</td><td style={{textAlign:"center",color:C.cyan,fontFamily:"'JetBrains Mono',monospace"}}>{v.f}%</td><td style={{textAlign:"center",color:C.green,fontFamily:"'JetBrains Mono',monospace"}}>{v.s}M</td></tr>))}</tbody></table><div style={{marginTop:10,background:"rgba(15,23,42,0.3)",borderRadius:8,padding:"6px 10px"}}><div style={{color:C.yellow,fontSize:10}}>🚗 {data.pk}</div></div></div></Card>))}
          </div>
        </div>)}

        {/* ═══ PROJECTS TAB ═══ */}
        {tab==="projects"&&(<div>
          <div style={{fontSize:11,color:C.dim,letterSpacing:2,fontWeight:600,marginBottom:14}}>專案管理（IndexedDB）</div>
          {saved.length===0?<Card style={{padding:"24px",textAlign:"center",color:C.faint,fontSize:12}}>尚無儲存專案</Card>
          :<div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(auto-fill,minmax(270px,1fr))",gap:12}}>{saved.map(p=>(<Card key={p.k} style={{padding:16}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}><div style={{fontSize:14,fontWeight:600,color:C.cyan}}>{p.proj}</div><span style={{fontSize:10,color:C.dim}}>{p.at}</span></div><div style={{fontSize:11,color:C.muted,marginBottom:4}}>{p.county}·{p.zone}·{p.btype}</div><div style={{fontSize:10,color:C.dim,marginBottom:12}}>基地{p.siteArea||"?"}㎡·{p.floors||"?"}層</div><div style={{display:"flex",gap:8}}><button onClick={()=>doLoad(p)} style={{flex:1,background:"rgba(56,189,248,0.08)",border:"1px solid rgba(56,189,248,0.2)",color:C.cyan,borderRadius:10,padding:"8px",cursor:"pointer",fontSize:11,fontWeight:500}}>載入</button><button onClick={()=>doDel(p.k)} style={{background:"rgba(127,29,29,0.2)",border:"1px solid rgba(248,113,113,0.2)",color:C.red,borderRadius:10,padding:"8px 14px",cursor:"pointer",fontSize:11}}>刪除</button></div></Card>))}</div>}
        </div>)}

      </div>
    </div>
  );
}

/* ========= Storage selection (local vs session) ========= */
function storageOf(privateSession){
  return privateSession ? sessionStorage : localStorage;
}

/* ========= Accounts & Keys ========= */
const ACCOUNTS_KEY = "fbmAccounts_v2";
const CURRENT_USER_KEY = "fbmCurrentUserId_v2";
const PREFS_KEY = uid => `fbmPrefs_${uid}`;
const STORE_KEY = (uid, priv) => `${priv ? "S" : "L"}_fbmStore_v4_${uid}`; // S=session, L=local

/* ========= Crypto helpers ========= */
async function sha256Hex(text){
  const buf = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash)).map(b=>b.toString(16).padStart(2,"0")).join("");
}
function rid(n=16){ const a=new Uint8Array(n); crypto.getRandomValues(a); return Array.from(a).map(b=>b.toString(16).padStart(2,"0")).join(""); }

/* ========= Data Models ========= */
class Behavior {
  constructor(id, title, anchor, tiny){
    this.id = id; this.title = title; this.anchor = anchor||""; this.tiny = tiny||"";
    this.createdAt = new Date().toISOString();
  }
}
class Entry {
  constructor(id, behaviorId, datetimeISO, motivation, ability, did, note){
    this.id = id; this.behaviorId = behaviorId;
    this.datetimeISO = datetimeISO;                    // full ISO timestamp
    this.dateISO = datetimeISO.slice(0,10);           // YYYY-MM-DD
    this.time = new Date(datetimeISO).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"});
    this.motivation = motivation; this.ability = ability;
    this.did = did; this.note = note||"";
  }
}

/* ========= App State ========= */
let accounts = [];
let current = null;        // { userId, name, email, pinHash, privateSession }
let store = null;          // { behaviors:[], entries:[] }
let prefs = null;          // { focusMode, blindHistory, privateSession, showPath, showSeq, graphDays }

let uiState = {
  selectedBehaviorId: null,
  historyRange: "all"
};

/* ========= DOM ========= */
const $ = sel => document.querySelector(sel);
const els = {
  // welcome / login
  welcome: $("#welcomeScreen"),
  tabs: document.querySelectorAll(".tab"),
  panels: document.querySelectorAll(".tab-panel"),
  accountList: $("#accountList"),
  newUserName: $("#newUserName"),
  newUserEmail: $("#newUserEmail"),
  newUserPin: $("#newUserPin"),
  createPrivateToggle: $("#createPrivateToggle"),
  consentChk: $("#consentChk"),
  createUserBtn: $("#createUserBtn"),
  useGuestBtn: $("#useGuestBtn"),

  // header
  today: $("#today"),
  currentUserBadge: $("#currentUserBadge"),
  openSettingsBtn: $("#openSettingsBtn"),
  switchUserBtn: $("#switchUserBtn"),
  exportOptionsBtn: $("#exportOptionsBtn"),
  importBtn: $("#importBtn"),
  importFile: $("#importFile"),
  resetBtn: $("#resetBtn"),

  // settings modal
  settingsModal: $("#settingsModal"),
  focusModeChk: $("#focusModeChk"),
  blindHistoryChk: $("#blindHistoryChk"),
  privateSessionChk: $("#privateSessionChk"),
  closeSettingsBtn: $("#closeSettingsBtn"),

  // behaviors
  behaviorList: $("#behaviorList"),
  addBehaviorBtn: $("#addBehaviorBtn"),
  behaviorModal: $("#behaviorModal"),
  behaviorModalTitle: $("#behaviorModalTitle"),
  behaviorForm: $("#behaviorForm"),
  behaviorTitle: $("#behaviorTitle"),
  behaviorAnchor: $("#behaviorAnchor"),
  behaviorTiny: $("#behaviorTiny"),

  // daily
  selectedBehaviorName: $("#selectedBehaviorName"),
  focusBanner: $("#focusBanner"),
  motivation: $("#motivation"), motivationVal: $("#motivationVal"),
  ability: $("#ability"), abilityVal: $("#abilityVal"),
  didToggle: $("#didToggle"),
  note: $("#note"),
  saveEntryBtn: $("#saveEntryBtn"),
  suggestionBox: $("#suggestionBox"),

  // graph
  graphCard: $("#graphCard"),
  svg: $("#fbmGraph"),
  rangeDays: $("#rangeDays"), daysVal: $("#daysVal"),
  showPathChk: $("#showPathChk"),
  showSeqChk: $("#showSeqChk"),
  pointDetails: $("#pointDetails"),

  // history
  historyTableBody: $("#historyTable tbody"),
  filterBtns: Array.from(document.querySelectorAll(".filter-btn")),

  // export modal
  exportModal: $("#exportModal"),
  exportForm: $("#exportForm"),
  optCSV: $("#optCSV"), optJSON: $("#optJSON"),
  optNotes: $("#optNotes"), optBehaviorMeta: $("#optBehaviorMeta"),
  doExportBtn: $("#doExportBtn"),

  // confirm reset
  confirmModal: $("#confirmModal"),
  cancelReset: $("#cancelReset"),
  confirmReset: $("#confirmReset")
};

/* ========= Bootstrap ========= */
init();

function init(){
  displayToday();
  wireWelcome();
  wireApp();
  loadAccounts();
  openWelcome(); // start with welcome screen
}

/* ========= Welcome / Login ========= */
function wireWelcome(){
  els.tabs.forEach(tab=>{
    tab.addEventListener("click", ()=>{
      els.tabs.forEach(t=>t.classList.remove("active"));
      tab.classList.add("active");
      const name = tab.getAttribute("data-tab");
      els.panels.forEach(p=> p.style.display = (p.getAttribute("data-panel")===name) ? "block" : "none");
    });
  });

  els.createPrivateToggle.addEventListener("click", ()=> toggleEl(els.createPrivateToggle));
  els.createPrivateToggle.addEventListener("keydown", e=>{
    if(e.key===" "||e.key==="Enter"){ e.preventDefault(); toggleEl(els.createPrivateToggle); }
  });

  els.createUserBtn.addEventListener("click", createUser);
  els.useGuestBtn.addEventListener("click", useGuest);
}

function openWelcome(){
  renderAccountList();
  els.welcome.style.display = "flex";
}

function closeWelcome(){
  els.welcome.style.display = "none";
}

function loadAccounts(){
  try { accounts = JSON.parse(localStorage.getItem(ACCOUNTS_KEY)) || []; }
  catch { accounts = []; }
}

function saveAccounts(){
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

function renderAccountList(){
  els.accountList.innerHTML = "";
  if(accounts.length===0){
    const empty = document.createElement("div");
    empty.className = "muted";
    empty.textContent = "No users yet. Create one, or use Guest.";
    els.accountList.appendChild(empty);
    return;
  }
  accounts.forEach(acc=>{
    const card = document.createElement("div");
    card.className = "account-card";
    const left = document.createElement("div");
    left.innerHTML = `<strong>${esc(acc.name)}</strong><br><span class="muted">${esc(acc.email||"")}</span>`;
    const right = document.createElement("div"); right.className = "account-actions";

    const useBtn = document.createElement("button");
    useBtn.className = "btn small primary"; useBtn.textContent = "Use";
    useBtn.addEventListener("click", ()=> signIn(acc));
    const delBtn = document.createElement("button");
    delBtn.className = "btn small danger"; delBtn.textContent = "Delete";
    delBtn.addEventListener("click", ()=>{
      if(!confirm(`Delete user "${acc.name}" and all local data?`)) return;
      // remove stores (both local & session variants)
      localStorage.removeItem(STORE_KEY(acc.userId,false));
      sessionStorage.removeItem(STORE_KEY(acc.userId,true));
      localStorage.removeItem(PREFS_KEY(acc.userId));
      accounts = accounts.filter(a=>a.userId!==acc.userId);
      saveAccounts(); renderAccountList();
    });
    right.append(useBtn, delBtn);
    card.append(left,right);
    els.accountList.appendChild(card);
  });
}

async function signIn(acc){
  if(!els.consentChk.checked){ alert("Please acknowledge the consent checkbox first."); return; }
  // If PIN protected, prompt
  if(acc.pinHash){
    const pin = prompt("Enter PIN (digits):") || "";
    const hash = await sha256Hex(pin);
    if(hash !== acc.pinHash){ alert("Wrong PIN."); return; }
  }
  current = { ...acc, privateSession: !!acc.privateSession };
  enterApp();
}

async function createUser(){
  if(!els.consentChk.checked){ alert("Please acknowledge the consent checkbox first."); return; }
  const name = (els.newUserName.value||"").trim();
  if(!name){ alert("Please enter a display name."); return; }
  const email = (els.newUserEmail.value||"").trim();
  const pinRaw = (els.newUserPin.value||"").trim();
  const pinHash = pinRaw ? await sha256Hex(pinRaw) : null;
  const privateSession = !els.createPrivateToggle.classList.contains("off"); // Yes if ON

  const userId = rid();
  const acc = { userId, name, email, pinHash, createdAt: new Date().toISOString(), privateSession };
  accounts.push(acc); saveAccounts();

  current = { ...acc };
  writePrefs({ focusMode:true, blindHistory:true, privateSession, showPath:true, showSeq:false, graphDays:14 });

  // init empty store
  writeStore({ behaviors:[], entries:[] });

  enterApp();
}

function useGuest(){
  if(!els.consentChk.checked){ alert("Please acknowledge the consent checkbox first."); return; }
  const userId = `guest_${rid(8)}`;
  current = { userId, name:"Guest", email:"", pinHash:null, createdAt:new Date().toISOString(), privateSession:true };
  writePrefs({ focusMode:true, blindHistory:true, privateSession:true, showPath:true, showSeq:false, graphDays:14 });
  writeStore({ behaviors:[], entries:[] });
  enterApp();
}

function enterApp(){
  closeWelcome();
  // Load prefs & store
  prefs = readPrefs() || { focusMode:true, blindHistory:true, privateSession:!!current.privateSession, showPath:true, showSeq:false, graphDays:14 };
  store = readStore() || { behaviors:[], entries:[] };
  uiState.selectedBehaviorId = store.behaviors[0]?.id || null;

  // Header
  updateHeader();

  // Settings checkboxes
  els.focusModeChk.checked = !!prefs.focusMode;
  els.blindHistoryChk.checked = !!prefs.blindHistory;
  els.privateSessionChk.checked = !!prefs.privateSession;
  els.rangeDays.value = prefs.graphDays || 14;
  els.daysVal.textContent = els.rangeDays.value;
  els.showPathChk.checked = !!prefs.showPath;
  els.showSeqChk.checked = !!prefs.showSeq;

  // Initial renders
  renderBehaviors();
  refreshCenterAndRight();
}

/* ========= Header / Settings ========= */
function updateHeader(){
  els.currentUserBadge.textContent = `User: ${current?.name || "—"}`;
}
function openSettings(){ els.settingsModal.showModal(); }
function closeSettings(){ els.settingsModal.close(); savePrefs(); refreshCenterAndRight(); }

function readPrefs(){
  try { return JSON.parse(localStorage.getItem(PREFS_KEY(current.userId))) || null; }
  catch { return null; }
}
function writePrefs(obj){
  localStorage.setItem(PREFS_KEY(current.userId), JSON.stringify(obj));
}
function savePrefs(){
  prefs.focusMode = els.focusModeChk.checked;
  prefs.blindHistory = els.blindHistoryChk.checked;
  prefs.privateSession = els.privateSessionChk.checked;
  prefs.showPath = els.showPathChk.checked;
  prefs.showSeq = els.showSeqChk.checked;
  prefs.graphDays = parseInt(els.rangeDays.value,10);
  writePrefs(prefs);
}

/* ========= Store read/write ========= */
function readStore(){
  const s = storageOf(!!prefs?.privateSession);
  try{ return JSON.parse(s.getItem(STORE_KEY(current.userId, !!prefs?.privateSession))) || null; }
  catch { return null; }
}
function writeStore(obj){
  const s = storageOf(!!(prefs?.privateSession ?? current?.privateSession));
  s.setItem(STORE_KEY(current.userId, !!(prefs?.privateSession ?? current?.privateSession)), JSON.stringify(obj));
}

/* ========= Wire app events ========= */
function wireApp(){
  // header
  els.openSettingsBtn.addEventListener("click", openSettings);
  els.closeSettingsBtn.addEventListener("click", closeSettings);
  els.switchUserBtn.addEventListener("click", ()=> { openWelcome(); renderAccountList(); });

  els.exportOptionsBtn.addEventListener("click", ()=> els.exportModal.showModal());
  els.doExportBtn.addEventListener("click", doExport);
  els.importBtn.addEventListener("click", ()=> els.importFile.click());
  els.importFile.addEventListener("change", importData);

  els.resetBtn.addEventListener("click", ()=> els.confirmModal.showModal());
  els.cancelReset.addEventListener("click", ()=> els.confirmModal.close());
  els.confirmReset.addEventListener("click", doReset);

  // behaviors
  els.addBehaviorBtn.addEventListener("click", ()=> openBehaviorModal());
  els.behaviorForm.addEventListener("submit", onSaveBehavior);

  // sliders
  els.motivation.addEventListener("input", ()=> els.motivationVal.textContent = els.motivation.value);
  els.ability.addEventListener("input", ()=> els.abilityVal.textContent = els.ability.value);

  // did toggle
  els.didToggle.addEventListener("click", ()=> toggleEl(els.didToggle));
  els.didToggle.addEventListener("keydown", e=>{
    if(e.key===" "||e.key==="Enter"){ e.preventDefault(); toggleEl(els.didToggle); }
  });

  // daily save
  els.saveEntryBtn.addEventListener("click", saveEntry);

  // graph controls
  els.rangeDays.addEventListener("input", ()=>{
    els.daysVal.textContent = els.rangeDays.value;
    prefs.graphDays = parseInt(els.rangeDays.value,10);
    writePrefs(prefs); drawGraph();
  });
  els.showPathChk.addEventListener("change", ()=> { prefs.showPath = els.showPathChk.checked; writePrefs(prefs); drawGraph(); });
  els.showSeqChk.addEventListener("change", ()=> { prefs.showSeq = els.showSeqChk.checked; writePrefs(prefs); drawGraph(); });

  // history filters
  els.filterBtns.forEach(btn=>{
    btn.addEventListener("click", ()=>{
      els.filterBtns.forEach(b=>b.classList.remove("active"));
      btn.classList.add("active");
      const r = btn.getAttribute("data-range");
      uiState.historyRange = (r==="all") ? "all" : parseInt(r,10);
      renderHistory();
    });
  });
}

/* ========= Header date ========= */
function displayToday(){
  els.today.textContent = new Date().toLocaleDateString(undefined,{year:"numeric",month:"short",day:"numeric"});
}

/* ========= Behaviors ========= */
function renderBehaviors(){
  els.behaviorList.innerHTML = "";
  if(!store.behaviors.length){
    const li = document.createElement("li");
    li.className = "beh-item"; li.innerHTML = `<div>No behaviors yet</div><div></div>`;
    els.behaviorList.appendChild(li); return;
  }
  store.behaviors
    .slice().sort((a,b)=> new Date(a.createdAt)-new Date(b.createdAt))
    .forEach(b=>{
      const li = document.createElement("li"); li.className="beh-item"; li.tabIndex=0;
      const left = document.createElement("div");
      left.innerHTML = `<strong>${esc(b.title)}</strong><br><span class="muted">${esc(b.anchor||"No anchor")}</span>`;
      const right = document.createElement("div"); right.className="beh-actions";

      const selectBtn = iconBtn("✅","Select", ()=>{ uiState.selectedBehaviorId=b.id; refreshCenterAndRight(); highlightSelected(li); });
      const editBtn   = iconBtn("✏️","Edit", ()=> openBehaviorModal(b));
      const delBtn    = iconBtn("🗑️","Delete", ()=>{
        if(confirm(`Delete behavior "${b.title}" and its entries?`)){
          store.entries = store.entries.filter(e=> e.behaviorId!==b.id);
          store.behaviors = store.behaviors.filter(x=> x.id!==b.id);
          writeStore(store);
          if(uiState.selectedBehaviorId===b.id) uiState.selectedBehaviorId=null;
          renderBehaviors(); refreshCenterAndRight();
        }
      });

      right.append(selectBtn, editBtn, delBtn);
      li.append(left,right);
      li.addEventListener("click",(e)=>{
        if(e.target.closest(".icon-btn")) return;
        uiState.selectedBehaviorId=b.id; refreshCenterAndRight(); highlightSelected(li);
      });
      els.behaviorList.appendChild(li);
      if(uiState.selectedBehaviorId===b.id) highlightSelected(li);
    });
}
function iconBtn(txt,title,fn){ const b=document.createElement("button"); b.className="icon-btn"; b.title=title; b.textContent=txt; b.addEventListener("click",fn); return b; }
function highlightSelected(li){ Array.from(els.behaviorList.children).forEach(n=> n.style.outline="none"); li.style.outline="3px solid rgba(59,130,246,.25)"; }

function openBehaviorModal(behavior){
  els.behaviorModalTitle.textContent = behavior ? "Edit Behavior" : "Add Behavior";
  els.behaviorTitle.value  = behavior?.title || "";
  els.behaviorAnchor.value = behavior?.anchor || "";
  els.behaviorTiny.value   = behavior?.tiny || "";
  els.behaviorModal.showModal();
  els.behaviorForm.dataset.editId = behavior?.id || "";
  setTimeout(()=> els.behaviorTitle.focus(), 10);
}
function onSaveBehavior(e){
  e.preventDefault();
  const title=els.behaviorTitle.value.trim(), anchor=els.behaviorAnchor.value.trim(), tiny=els.behaviorTiny.value.trim();
  if(!title){ alert("Please provide a title."); return; }
  const editId = els.behaviorForm.dataset.editId;
  if(editId){
    const b = store.behaviors.find(x=> x.id===editId);
    if(b){ b.title=title; b.anchor=anchor; b.tiny=tiny; }
  }else{
    const id=rid(); store.behaviors.push(new Behavior(id,title,anchor,tiny)); uiState.selectedBehaviorId=id;
  }
  writeStore(store); els.behaviorModal.close(); renderBehaviors(); refreshCenterAndRight();
}

/* ========= Daily Log (Focus-first) ========= */
function saveEntry(){
  if(!uiState.selectedBehaviorId){ alert("Select a behavior first."); return; }
  const m = parseInt(els.motivation.value,10), a = parseInt(els.ability.value,10);
  if(Number.isNaN(m)||Number.isNaN(a)){ alert("Set Motivation and Ability."); return; }
  const did = els.didToggle.classList.contains("off") ? "no" : "yes";
  const note = els.note.value.trim();
  const id = rid(); const dt = new Date().toISOString();

  store.entries.push(new Entry(id, uiState.selectedBehaviorId, dt, m, a, did, note));
  writeStore(store);

  // UX sugar
  els.saveEntryBtn.disabled = true; els.saveEntryBtn.textContent="Saved ✓";
  setTimeout(()=>{ els.saveEntryBtn.disabled=false; els.saveEntryBtn.textContent="Save today"; }, 1100);

  // Show suggestions AFTER saving (reduces bias during input)
  showSuggestions(m,a,did);
  refreshCenterAndRight();
}

/* ========= Suggestions (neutral, autonomy-supportive) ========= */
function showSuggestions(m,a,did){
  const tips=[];
  if(a<4) tips.push("Shrink the step and remove friction (prep tools, 30-sec version).");
  if(m<4 && a>=6) tips.push("Lightly boost motivation: pair with music or a small reward.");
  if(did==="no" && m>=6 && a>=6) tips.push("Refine your prompt/anchor and make the cue obvious.");
  if(m>=6 && a>=6 && did==="yes") tips.push("Nice! Consider a tiny progression next week.");
  els.suggestionBox.textContent = tips.length? tips.join(" ") : "Keep going — consistency compounds.";
  els.suggestionBox.classList.remove("hidden");
}

/* ========= Graph (time-aware, bias-guarded) ========= */
function drawGraph(){
  const svg = els.svg; svg.innerHTML="";
  const W=420,H=420,mar=36;
  const x = a => mar + (a/10)*(W-2*mar);
  const y = m => H - mar - (m/10)*(H-2*mar);

  // axes
  svg.appendChild(line(mar,H-mar,W-mar,H-mar,"#94a3b8",1.2));
  svg.appendChild(line(mar,H-mar,mar,mar,"#94a3b8",1.2));
  svg.appendChild(label(W/2,H-6,"Ability ➜","middle"));
  svg.appendChild(label(12,H/2,"Motivation ▲","middle",-90));

  // action line
  const d=[]; for(let a=0;a<=10;a+=0.25){ const mot=Math.max(0,12-a); d.push(`${d.length?"L":"M"} ${x(a)} ${y(mot)}`); }
  const path=document.createElementNS("http://www.w3.org/2000/svg","path");
  path.setAttribute("d", d.join(" ")); path.setAttribute("stroke","#f59e0b");
  path.setAttribute("stroke-width","2"); path.setAttribute("fill","none"); path.setAttribute("stroke-dasharray","5,4");
  svg.appendChild(path);

  // filter range + behavior
  const cutoffDays = prefs.graphDays || 14;
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate()-cutoffDays+1);
  const entries = store.entries
    .filter(e=> (!uiState.selectedBehaviorId || e.behaviorId===uiState.selectedBehaviorId) &&
                 new Date(e.dateISO) >= cutoff)
    .sort((a,b)=> a.datetimeISO.localeCompare(b.datetimeISO));

  if(!entries.length) return;

  // recency color gradient (older => gray, newer => blue/green)
  const N = entries.length;
  function recencyColor(i, did, successZone){
    const t = (i+1)/N; // 0..1
    if(did==="yes" && successZone){
      // greenish gradient by recency
      return `hsl(${Math.round(130 + 20*t)}, 60%, ${Math.round(35+25*t)}%)`;
    }
    // neutral-gray → amber gradient for fails/borderline
    return successZone ? `hsl(${Math.round(45+10*t)}, 85%, ${Math.round(45+10*t)}%)` : "#475569";
  }

  // optional path (sparkline)
  if(prefs.showPath && entries.length>1){
    const p = document.createElementNS("http://www.w3.org/2000/svg","path");
    const segs = entries.map((e,i)=> `${i?"L":"M"} ${x(e.ability)} ${y(e.motivation)}`);
    p.setAttribute("d", segs.join(" "));
    p.setAttribute("stroke","#2563eb"); p.setAttribute("stroke-width","1.6"); p.setAttribute("fill","none"); p.setAttribute("opacity",".7");
    svg.appendChild(p);
  }

  // draw points
  entries.forEach((e,i)=>{
    const successZone = aboveActionLine(e.motivation,e.ability);
    const color = recencyColor(i, e.did, successZone);
    const c = dot(x(e.ability), y(e.motivation), 5, color);
    c.setAttribute("data-i", String(i+1));
    c.setAttribute("data-date", e.dateISO);
    c.setAttribute("data-time", e.time);
    c.setAttribute("data-m", e.motivation);
    c.setAttribute("data-a", e.ability);
    c.setAttribute("data-did", e.did);
    c.addEventListener("mouseenter", ()=> showPointDetails(c));
    c.addEventListener("focus", ()=> showPointDetails(c));
    c.addEventListener("click", ()=> showPointDetails(c));
    svg.appendChild(c);

    if(prefs.showSeq){
      const t = label(x(e.ability)+8, y(e.motivation)-8, String(i+1), "start");
      t.setAttribute("font-size","10"); t.setAttribute("fill","#334155");
      svg.appendChild(t);
    }
  });

  // helpers
  function line(x1,y1,x2,y2,stroke,w){ const el=NS("line"); attr(el,{x1,y1,x2,y2,stroke,"stroke-width":w}); return el; }
  function label(xv,yv,txt,anc="start",rot=0){
    const el=NS("text"); attr(el,{x:xv,y:yv,"text-anchor":anc,fill:"#334155","font-size":12}); if(rot){ el.setAttribute("transform",`rotate(${rot} ${xv} ${yv})`); }
    el.textContent = txt; return el;
  }
  function dot(cx,cy,r,fill){ const el=NS("circle"); attr(el,{cx,cy,r,fill}); el.style.transition="r .12s ease"; el.setAttribute("tabindex","0"); el.addEventListener("mouseenter",()=>el.setAttribute("r","7")); el.addEventListener("mouseleave",()=>el.setAttribute("r","5")); return el; }
  function NS(n){ return document.createElementNS("http://www.w3.org/2000/svg", n); }
  function attr(el, o){ for(const k in o){ el.setAttribute(k, o[k]); } }

  function showPointDetails(c){
    els.pointDetails.innerHTML = `
      <div class="pd-title">Point Details</div>
      <div class="pd-body">
        <div><strong>#${c.getAttribute("data-i")}</strong> • ${c.getAttribute("data-date")} ${c.getAttribute("data-time")}</div>
        <div>M:${c.getAttribute("data-m")} | A:${c.getAttribute("data-a")} | Did: ${c.getAttribute("data-did").toUpperCase()}</div>
      </div>
    `;
  }
}

function aboveActionLine(m,a){ return m >= (12 - a); }

/* ========= History (bias-aware) ========= */
function renderHistory(){
  const body = els.historyTableBody; body.innerHTML="";
  let rows = store.entries
    .filter(e=> !uiState.selectedBehaviorId || e.behaviorId === uiState.selectedBehaviorId)
    .sort((a,b)=> b.datetimeISO.localeCompare(a.datetimeISO));

  if(uiState.historyRange!=="all"){
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate()-(uiState.historyRange-1));
    const iso = cutoff.toISOString().slice(0,10);
    rows = rows.filter(e=> e.dateISO >= iso);
  }

  rows.slice(0,200).forEach(e=>{
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${e.dateISO}</td><td>${e.time}</td><td>${e.motivation}</td><td>${e.ability}</td><td>${e.did}</td><td>${esc(e.note||"")}</td>`;
    body.appendChild(tr);
  });
}

/* ========= Export / Import ========= */
function doExport(e){
  e.preventDefault();
  const includeCSV = els.optCSV.checked;
  const includeJSON = els.optJSON.checked;
  const includeNotes = els.optNotes.checked;
  const includeBehaviorMeta = els.optBehaviorMeta.checked;
  if(!includeCSV && !includeJSON){ alert("Select at least one format."); return; }
  const uname = (current?.name||"user").replace(/\s+/g,"_");
  const ts = new Date().toISOString().replace(/[:.]/g,"-");
  if(includeCSV){
    const csv = buildEntriesCSV({ includeNotes, includeBehaviorMeta, userId: current.userId });
    download(csv, `fbm_entries_${uname}_${ts}.csv`, "text/csv");
  }
  if(includeJSON){
    const pkg = buildJSONPackage({ includeNotes, userId: current.userId });
    download(JSON.stringify(pkg,null,2), `fbm_package_${uname}_${ts}.json`, "application/json");
  }
  els.exportModal.close();
}
function buildEntriesCSV({ includeNotes, includeBehaviorMeta, userId }){
  const header = ["user_id","behavior_id","behavior_title","date","time","datetime","motivation","ability","did","did_numeric","note","anchor","tiny"];
  const lines=[header.join(",")];
  const bMap = new Map(store.behaviors.map(b=>[b.id,b]));
  store.entries.forEach(e=>{
    const b=bMap.get(e.behaviorId);
    const didNum = e.did==="yes" ? 1 : 0;
    const row = [
      userId,
      e.behaviorId,
      csvEsc(b?.title||""),
      e.dateISO,
      e.time,
      e.datetimeISO,
      e.motivation,
      e.ability,
      e.did,
      didNum,
      csvEsc(includeNotes ? e.note||"" : ""),
      csvEsc(includeBehaviorMeta ? (b?.anchor||"") : ""),
      csvEsc(includeBehaviorMeta ? (b?.tiny||"") : "")
    ];
    lines.push(row.join(","));
  });
  return lines.join("\n");
}
function buildJSONPackage({ includeNotes, userId }){
  const codebook = {
    version:"1.1",
    variables:{
      user_id:"Local user identifier",
      behavior_id:"Unique behavior identifier",
      behavior_title:"Behavior title at export",
      date:"YYYY-MM-DD (local)",
      time:"HH:MM (local)",
      datetime:"ISO timestamp",
      motivation:"0–10",
      ability:"0–10",
      did:"yes/no",
      did_numeric:"1 if yes else 0",
      note: includeNotes? "Free text" : "Excluded",
      anchor:"Prompt/anchor",
      tiny:"≤2 minute version"
    },
    fbm_rule:"Success ~ m >= (12 - a)"
  };
  return {
    package_version:"1.1",
    exported_at:new Date().toISOString(),
    user:{ user_id:userId, name: current?.name||"", email: current?.email||"", privateSession: !!prefs?.privateSession },
    prefs,
    behaviors: store.behaviors,
    entries: store.entries.map(e=> ({
      ...e,
      did_numeric: e.did==="yes"?1:0,
      note: includeNotes ? e.note : ""
    })),
    codebook
  };
}
function csvEsc(s){ return /[",\n]/.test(s) ? `"${String(s).replace(/"/g,'""')}"` : String(s); }
function download(text, name, mime){ const blob=new Blob([text],{type:mime}); const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=name; a.click(); }

function importData(ev){
  const file = ev.target.files[0]; if(!file) return;
  const fr = new FileReader();
  fr.onload = (e)=>{
    try{
      const txt = e.target.result;
      let data; try{ data=JSON.parse(txt); }catch{ data=null; }
      if(data && data.behaviors && data.entries){
        store.behaviors = data.behaviors;
        store.entries = data.entries;
        writeStore(store);
        uiState.selectedBehaviorId = store.behaviors[0]?.id || null;
        renderBehaviors(); refreshCenterAndRight();
        alert("Imported JSON package.");
      }else{
        // CSV
        const rows = txt.split(/\r?\n/).filter(Boolean);
        const header = rows.shift().split(",");
        const idx = Object.fromEntries(header.map((h,i)=>[h,i]));
        const entries = rows.map(line=>{
          const cols = parseCSV(line);
          return new Entry(
            rid(),
            cols[idx["behavior_id"]],
            cols[idx["datetime"]] || new Date(`${cols[idx["date"]]}T${(cols[idx["time"]]||"00:00")}:00`).toISOString(),
            parseInt(cols[idx["motivation"]],10),
            parseInt(cols[idx["ability"]],10),
            (cols[idx["did"]]||"no").toLowerCase()==="yes"?"yes":"no",
            cols[idx["note"]]||""
          );
        });
        store.entries.push(...entries); writeStore(store);
        renderHistory(); drawGraph(); alert(`Imported ${entries.length} CSV rows.`);
      }
    }catch{ alert("Import failed."); }
  };
  fr.readAsText(file); ev.target.value="";
}
function parseCSV(line){
  const out=[]; let cur="",q=false;
  for(let i=0;i<line.length;i++){
    const ch=line[i];
    if(q){ if(ch=='"' && line[i+1]=='"'){cur+='"'; i++;} else if(ch=='"'){q=false;} else cur+=ch; }
    else { if(ch=='"'){q=true;} else if(ch==','){out.push(cur); cur="";} else cur+=ch; }
  }
  out.push(cur); return out;
}

/* ========= Reset ========= */
function doReset(){
  store = { behaviors:[], entries:[] };
  writeStore(store);
  uiState.selectedBehaviorId=null;
  els.confirmModal.close();
  renderBehaviors(); refreshCenterAndRight();
}

/* ========= Helpers ========= */
function toggleEl(el){
  const off = el.classList.toggle("off");
  el.setAttribute("aria-pressed", String(!off));
  el.textContent = off ? "No" : "Yes";
}
function esc(s){ return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

/* ========= Refresh center/right with bias guards ========= */
function refreshCenterAndRight(){
  // set current behavior label
  if(uiState.selectedBehaviorId){
    const b=store.behaviors.find(x=>x.id===uiState.selectedBehaviorId);
    els.selectedBehaviorName.textContent = b ? b.title : "Unknown behavior";
  }else{
    els.selectedBehaviorName.textContent = "No behavior selected";
  }

  const todayISO = new Date().toISOString().slice(0,10);
  const hasToday = store.entries.some(e=> e.dateISO===todayISO && (!uiState.selectedBehaviorId || e.behaviorId===uiState.selectedBehaviorId));

  // Focus Mode & Blind History
  const shouldBlind = prefs.focusMode && !hasToday;
  els.focusBanner.classList.toggle("hidden", !shouldBlind);
  els.graphCard.style.opacity = shouldBlind ? .25 : 1;
  document.getElementById("historyCard").style.opacity = shouldBlind ? .25 : 1;

  // If blinding is on, don't render graph/history until after saving today
  if(shouldBlind){
    els.svg.innerHTML=""; els.historyTableBody.innerHTML="";
  }else{
    renderHistory();
    drawGraph();
  }

  // clear input & hide suggestions until save
  els.note.value=""; els.suggestionBox.classList.add("hidden");
}

/* ========= END ========= */

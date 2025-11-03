// ---------- Data Models ----------
class Behavior {
  constructor(id, title, anchor, tiny) {
    this.id = id;
    this.title = title;
    this.anchor = anchor;
    this.tiny = tiny;
  }
}

class Entry {
  constructor(id, behaviorId, dateISO, motivation, ability, did, note) {
    this.id = id;
    this.behaviorId = behaviorId;
    this.dateISO = dateISO;
    this.motivation = motivation;
    this.ability = ability;
    this.did = did;
    this.note = note;
  }
}

const store = JSON.parse(localStorage.getItem("fbmStore")) || {
  behaviors: [],
  entries: []
};

function saveStore() {
  localStorage.setItem("fbmStore", JSON.stringify(store));
}

// ---------- UI Elements ----------
const behaviorSelect = document.getElementById("behaviorSelect");
const suggestionBox = document.getElementById("suggestionBox");
const historyTable = document.querySelector("#historyTable tbody");
const svg = document.getElementById("fbmGraph");

// ---------- Behavior CRUD ----------
function refreshBehaviorSelect() {
  behaviorSelect.innerHTML = "";
  store.behaviors.forEach(b => {
    const opt = document.createElement("option");
    opt.value = b.id;
    opt.textContent = b.title;
    behaviorSelect.appendChild(opt);
  });
}

document.getElementById("addBehaviorBtn").onclick = () => {
  const title = document.getElementById("behaviorTitle").value.trim();
  const anchor = document.getElementById("behaviorAnchor").value.trim();
  const tiny = document.getElementById("behaviorTiny").value.trim();
  if (!title) return alert("Please enter a behavior title!");
  const id = Date.now();
  store.behaviors.push(new Behavior(id, title, anchor, tiny));
  saveStore();
  refreshBehaviorSelect();
};

// ---------- Entry Save ----------
document.getElementById("saveEntryBtn").onclick = () => {
  const behaviorId = +behaviorSelect.value;
  if (!behaviorId) return alert("Select a behavior first.");
  const motivation = +document.getElementById("motivation").value;
  const ability = +document.getElementById("ability").value;
  const did = document.getElementById("did").value;
  const note = document.getElementById("note").value.trim();
  if (isNaN(motivation) || isNaN(ability)) return alert("Enter M and A numbers!");
  const id = Date.now();
  const dateISO = new Date().toISOString().slice(0,10);
  store.entries.push(new Entry(id, behaviorId, dateISO, motivation, ability, did, note));
  saveStore();
  drawGraph();
  showHistory();
  showSuggestions(motivation, ability, did);
};

// ---------- Suggestions ----------
function showSuggestions(m, a, did) {
  let tips = [];
  if (a < 4) tips.push("Simplify the task. Make it tiny and remove obstacles.");
  if (m < 4 && a >= 6) tips.push("Boost motivation—pair the task with music or reward.");
  if (did === "no" && m >= 6 && a >= 6) tips.push("Review your prompt—when will you do it?");
  if (m >= 6 && a >= 6 && did === "yes") tips.push("Excellent! Consider making it slightly harder next week.");
  if (did === "no") tips.push("No worries. Try again tomorrow and focus on consistency.");
  suggestionBox.textContent = tips.join(" ");
}

// ---------- Graph ----------
function drawGraph() {
  svg.innerHTML = "";
  const w = 400, h = 400;
  const margin = 30;
  const toX = a => margin + (a / 10) * (w - 2 * margin);
  const toY = m => h - margin - (m / 10) * (h - 2 * margin);

  // Axes
  const axis = document.createElementNS("http://www.w3.org/2000/svg", "line");
  axis.setAttribute("x1", margin);
  axis.setAttribute("y1", h - margin);
  axis.setAttribute("x2", w - margin);
  axis.setAttribute("y2", margin);
  axis.setAttribute("stroke", "#888");
  axis.setAttribute("stroke-dasharray", "4");
  svg.appendChild(axis);

  // Action Line (threshold = 12 - A)
  const actionLine = document.createElementNS("http://www.w3.org/2000/svg", "path");
  let pathData = "";
  for (let a = 0; a <= 10; a += 0.5) {
    const m = Math.max(0, 12 - a);
    pathData += `${pathData ? "L" : "M"} ${toX(a)} ${toY(m)}`;
  }
  actionLine.setAttribute("d", pathData);
  actionLine.setAttribute("stroke", "#f59e0b");
  actionLine.setAttribute("fill", "none");
  actionLine.setAttribute("stroke-width", "2");
  svg.appendChild(actionLine);

  // Points
  store.entries.forEach(e => {
    const point = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    point.setAttribute("cx", toX(e.ability));
    point.setAttribute("cy", toY(e.motivation));
    point.setAttribute("r", 5);
    const color = e.did === "yes" ? (aboveActionLine(e.motivation, e.ability) ? "green" : "gold") : "gray";
    point.setAttribute("fill", color);
    point.title = `${e.dateISO} M:${e.motivation} A:${e.ability} ${e.did}`;
    svg.appendChild(point);
  });
}

function aboveActionLine(m, a) {
  const threshold = 12 - a;
  return m >= threshold;
}

// ---------- History ----------
function showHistory() {
  historyTable.innerHTML = "";
  store.entries.slice().reverse().forEach(e => {
    const row = document.createElement("tr");
    row.innerHTML = `<td>${e.dateISO}</td><td>${e.motivation}</td><td>${e.ability}</td><td>${e.did}</td><td>${e.note}</td>`;
    historyTable.appendChild(row);
  });
}

// ---------- Export / Import ----------
document.getElementById("exportBtn").onclick = () => {
  const blob = new Blob([JSON.stringify(store)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "fbm-data.json";
  a.click();
};

document.getElementById("importBtn").onclick = () => {
  document.getElementById("importFile").click();
};

document.getElementById("importFile").onchange = e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = evt => {
    try {
      const data = JSON.parse(evt.target.result);
      if (data.behaviors && data.entries) {
        store.behaviors = data.behaviors;
        store.entries = data.entries;
        saveStore();
        refreshBehaviorSelect();
        drawGraph();
        showHistory();
        alert("Data imported successfully!");
      }
    } catch {
      alert("Invalid file format!");
    }
  };
  reader.readAsText(file);
};

// ---------- Init ----------
refreshBehaviorSelect();
drawGraph();
showHistory();

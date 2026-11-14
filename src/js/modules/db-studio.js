// --- PHASE 8: DATA & REALTIME ENGINE (Database Studio & Presence) ---

// 1. CSV Utility Functions
function tableToCsv(cols, rows) {
  const escapeCsv = v => {
    if (v == null) return "";
    const str = String(v);
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  };
  const header = cols.map(escapeCsv).join(",");
  const body = rows.map(r => cols.map(c => escapeCsv(r[c])).join(",")).join("\n");
  return header + (body ? "\n" + body : "");
}

function csvToTable(csvStr) {
  const lines = csvStr.trim().split(/\r?\n/).filter(Boolean);
  if (!lines.length) return { cols: [], rows: [] };
  const parseLine = line => {
    const res = [];
    let cur = "", inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (c === ',' && !inQuotes) {
        res.push(cur); cur = "";
      } else {
        cur += c;
      }
    }
    res.push(cur);
    return res;
  };

  const cols = parseLine(lines[0]).map(c => c.trim().toLowerCase());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = parseLine(lines[i]);
    const row = {};
    cols.forEach((col, idx) => {
      let v = vals[idx] != null ? vals[idx] : "";
      if (v !== "" && !isNaN(v)) v = Number(v);
      row[col] = v;
    });
    rows.push(row);
  }
  return { cols, rows };
}

// 2. Database Studio State & Controller
let activeStudioTable = "";

async function openDatabaseStudio() {
  if (!siteId) { toast("Open or build a site first"); return; }
  await refreshStudioTables();
  await refreshStudioKv();
  $("#dbStudioDlg").showModal();
}

async function refreshStudioTables() {
  const db = await getSqlDb(siteId);
  const tables = Object.keys(db.state.tables || {});
  const sel = $("#dbTableSelect");
  sel.textContent = "";
  if (!tables.length) {
    sel.append(new Option("No tables found", ""));
    activeStudioTable = "";
    $("#dbStudioThead").textContent = "";
    $("#dbStudioTbody").textContent = "";
    $("#dbSchemaBar").textContent = "No tables created yet. Click '+ New Table' or run poppy.db.exec().";
    return;
  }
  tables.forEach(t => sel.append(new Option(t, t)));
  if (!activeStudioTable || !tables.includes(activeStudioTable)) activeStudioTable = tables[0];
  sel.value = activeStudioTable;
  renderStudioTableData(activeStudioTable);
}

async function renderStudioTableData(tableName) {
  if (!tableName) return;
  activeStudioTable = tableName;
  const db = await getSqlDb(siteId);
  const table = db.state.tables[tableName];
  if (!table) return;

  const cols = table.cols || ["id"];
  const rows = table.rows || [];

  $("#dbSchemaBar").textContent = `Table: ${tableName} (${rows.length} rows) · Columns: ${cols.join(", ")}`;

  // Render headers
  const thead = $("#dbStudioThead");
  thead.textContent = "";
  cols.forEach(col => {
    const th = document.createElement("th");
    th.textContent = col;
    thead.append(th);
  });
  const actTh = document.createElement("th");
  actTh.style.width = "60px";
  actTh.textContent = "Action";
  thead.append(actTh);

  // Render rows
  const tbody = $("#dbStudioTbody");
  tbody.textContent = "";
  if (!rows.length) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="${cols.length + 1}" style="text-align:center;padding:24px;color:var(--sub);font-family:inherit">No rows in this table. Click "+ Add Row" above.</td>`;
    tbody.append(tr);
    return;
  }

  rows.forEach(r => {
    const tr = document.createElement("tr");
    cols.forEach(col => {
      const td = document.createElement("td");
      td.textContent = r[col] == null ? "" : String(r[col]);
      if (col !== "id") {
        td.contentEditable = "true";
        td.onblur = async () => {
          const newVal = td.textContent.trim();
          let v = newVal;
          if (v !== "" && !isNaN(v)) v = Number(v);
          r[col] = v;
          await db.exec(`UPDATE ${tableName} SET ${col} = ? WHERE id = ?`, [v, r.id]);
        };
        td.onkeydown = e => {
          if (e.key === "Enter") { e.preventDefault(); td.blur(); }
        };
      } else {
        td.style.color = "var(--sub)";
        td.title = "Primary key (auto)";
      }
      tr.append(td);
    });

    const actTd = document.createElement("td");
    const delBtn = document.createElement("button");
    delBtn.className = "link sm del";
    delBtn.style.color = "var(--red)";
    delBtn.textContent = "Delete";
    delBtn.onclick = async () => {
      await db.exec(`DELETE FROM ${tableName} WHERE id = ?`, [r.id]);
      renderStudioTableData(tableName);
    };
    actTd.append(delBtn);
    tr.append(actTd);
    tbody.append(tr);
  });
}

async function addStudioRow() {
  if (!activeStudioTable) {
    toast("Create or select a table first");
    return;
  }
  const db = await getSqlDb(siteId);
  const table = db.state.tables[activeStudioTable];
  if (!table) return;
  const cols = table.cols.filter(c => c !== "id");
  if (cols.length) {
    const phs = cols.map(() => "?").join(", ");
    const vals = cols.map(() => "");
    await db.exec(`INSERT INTO ${activeStudioTable} (${cols.join(", ")}) VALUES (${phs})`, vals);
  } else {
    await db.exec(`INSERT INTO ${activeStudioTable} (id) VALUES (?)`, [table.nextId++]);
  }
  renderStudioTableData(activeStudioTable);
}

async function createStudioTable() {
  const name = prompt("Enter new table name (e.g. products):");
  if (!name) return;
  const cleanName = name.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
  if (!cleanName) { toast("Invalid table name"); return; }
  const colsStr = prompt("Enter comma-separated column names (e.g. name, price, stock):", "title, status, created_at");
  if (!colsStr) return;
  const cols = colsStr.split(",").map(c => c.trim().toLowerCase().replace(/[^a-z0-9_]/g, "")).filter(Boolean);
  if (!cols.length) { toast("At least one column is required"); return; }

  const db = await getSqlDb(siteId);
  await db.exec(`CREATE TABLE IF NOT EXISTS ${cleanName} (id INTEGER PRIMARY KEY, ${cols.map(c => c + " TEXT").join(", ")})`);
  activeStudioTable = cleanName;
  await refreshStudioTables();
  toast(`Created table "${cleanName}"`);
}

async function dropStudioTable() {
  if (!activeStudioTable) return;
  if (!confirm(`Are you sure you want to delete table "${activeStudioTable}" and all its rows?`)) return;
  const db = await getSqlDb(siteId);
  await db.exec(`DROP TABLE IF EXISTS ${activeStudioTable}`);
  activeStudioTable = "";
  await refreshStudioTables();
  toast("Table deleted");
}

async function exportStudioCsv() {
  if (!activeStudioTable) return;
  const db = await getSqlDb(siteId);
  const t = db.state.tables[activeStudioTable];
  if (!t) return;
  const csvStr = tableToCsv(t.cols, t.rows);
  const blob = new Blob([csvStr], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${activeStudioTable}.csv`;
  a.click();
  toast(`Exported ${activeStudioTable}.csv`);
}

async function importStudioCsv(file) {
  if (!file) return;
  const text = await file.text();
  const parsed = csvToTable(text);
  if (!parsed.cols.length) { toast("CSV is empty or invalid"); return; }
  const db = await getSqlDb(siteId);
  const tName = activeStudioTable || file.name.replace(/\.csv$/i, "").toLowerCase().replace(/[^a-z0-9_]/g, "") || "imported_data";
  
  if (!db.state.tables[tName]) {
    await db.exec(`CREATE TABLE IF NOT EXISTS ${tName} (${parsed.cols.map(c => c + " TEXT").join(", ")})`);
  }
  const cols = parsed.cols.filter(c => c !== "id");
  const phs = cols.map(() => "?").join(", ");
  for (const row of parsed.rows) {
    const vals = cols.map(c => row[c] == null ? "" : row[c]);
    await db.exec(`INSERT INTO ${tName} (${cols.join(", ")}) VALUES (${phs})`, vals);
  }
  activeStudioTable = tName;
  await refreshStudioTables();
  toast(`Imported ${parsed.rows.length} rows into ${tName}`);
}

async function refreshStudioKv() {
  if (!siteId) return;
  const tbody = $("#dbKvTbody");
  tbody.textContent = "";
  const prefix = siteId + "\u0000";
  const allKeys = await idb("kv", "readonly", s => s.getAllKeys());
  const siteKeys = allKeys.filter(k => k.startsWith(prefix)).map(k => k.slice(prefix.length));
  
  const filter = ($("#dbKvSearch").value || "").toLowerCase().trim();
  const matched = siteKeys.filter(k => !filter || k.toLowerCase().includes(filter));

  if (!matched.length) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="4" style="text-align:center;padding:24px;color:var(--sub);font-family:inherit">No store keys found for this site.</td>`;
    tbody.append(tr);
    return;
  }

  for (const key of matched) {
    const val = await idb("kv", "readonly", s => s.get(kk(key)));
    const tr = document.createElement("tr");
    
    const keyTd = document.createElement("td");
    keyTd.style.fontWeight = "700";
    keyTd.textContent = key;

    const typeTd = document.createElement("td");
    const tBadge = document.createElement("span");
    tBadge.className = "studio-badge";
    tBadge.textContent = Array.isArray(val) ? "array" : typeof val;
    typeTd.append(tBadge);

    const valTd = document.createElement("td");
    valTd.textContent = typeof val === "object" ? JSON.stringify(val) : String(val);
    valTd.contentEditable = "true";
    valTd.title = "Click to edit JSON value";
    valTd.onblur = async () => {
      const raw = valTd.textContent.trim();
      let parsed = raw;
      try { parsed = JSON.parse(raw); } catch {}
      await idb("kv", "readwrite", s => s.put(parsed, kk(key)));
      runAutomations("change", { key });
      refreshStudioKv();
    };

    const actTd = document.createElement("td");
    const delBtn = document.createElement("button");
    delBtn.className = "link sm del";
    delBtn.style.color = "var(--red)";
    delBtn.textContent = "Delete";
    delBtn.onclick = async () => {
      await idb("kv", "readwrite", s => s.delete(kk(key)));
      runAutomations("change", { key });
      refreshStudioKv();
    };
    actTd.append(delBtn);

    tr.append(keyTd, typeTd, valTd, actTd);
    tbody.append(tr);
  }
}

async function addStudioKvKey() {
  const k = prompt("Enter key name:");
  if (!k) return;
  const cleanK = k.trim();
  const v = prompt("Enter initial value (raw text or JSON):", '{"active": true}');
  if (v == null) return;
  let parsed = v;
  try { parsed = JSON.parse(v); } catch {}
  await idb("kv", "readwrite", s => s.put(parsed, kk(cleanK)));
  runAutomations("change", { key: cleanK });
  await refreshStudioKv();
  toast(`Saved store key "${cleanK}"`);
}

// 3. Realtime Presence & Cursor Engine
const PEER_ANIMALS = ["Fox", "Owl", "Lynx", "Bear", "Hare", "Wolf", "Falcon", "Otter"];
const PEER_COLORS = ["#ff4438", "#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ec4899", "#06b6d4", "#14b8a6"];

function getPeerIdentity(seed) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash << 5) - hash + seed.charCodeAt(i);
  const uHash = Math.abs(hash);
  const color = PEER_COLORS[uHash % PEER_COLORS.length];
  const animal = PEER_ANIMALS[Math.floor(uHash / PEER_COLORS.length) % PEER_ANIMALS.length];
  return { id: seed, color, name: animal, initials: animal.slice(0, 2).toUpperCase() };
}

let myPeerId = crypto.randomUUID().slice(0, 8);
let myPeerUser = getPeerIdentity(myPeerId);
const remotePeers = new Map();

function initPresence() {
  const rid = currentRoomId || "lobby";
  const room = getRoom(rid);
  if (room.bc) {
    const origHandler = room.bc.onmessage;
    room.bc.onmessage = e => {
      if (origHandler) origHandler(e);
      const m = e.data;
      if (!m || m.from === myPeerId) return;
      if (m.type === "peer_presence" && m.peer) {
        remotePeers.set(m.peer.id, { ...m.peer, lastSeen: Date.now() });
        updatePresenceBar();
      } else if (m.type === "peer_cursor" && m.peer) {
        const p = remotePeers.get(m.peer.id) || { ...m.peer };
        p.x = m.x; p.y = m.y; p.lastSeen = Date.now();
        remotePeers.set(m.peer.id, p);
        renderPeerCursor(p);
      } else if (m.type === "peer_ping" && m.peer) {
        toast(`[${m.peer.name}] wave: Realtime connection active!`);
      } else if (m.type === "peer_sync" && m.peer) {
        toast(`[${m.peer.name}] shared updates: ${m.prompt || "Site updated"}`);
      }
    };
  }

  setInterval(() => {
    if (room.bc) {
      room.bc.postMessage({ from: myPeerId, type: "peer_presence", peer: myPeerUser });
    }
    const now = Date.now();
    let changed = false;
    for (const [id, p] of remotePeers.entries()) {
      if (now - p.lastSeen > 10000) {
        remotePeers.delete(id);
        removePeerCursor(id);
        changed = true;
      }
    }
    if (changed) updatePresenceBar();
  }, 4000);

  updatePresenceBar();
}

function updatePresenceBar() {
  const bar = $("#presenceBar");
  if (!bar) return;
  bar.textContent = "";

  const allPeers = [myPeerUser, ...remotePeers.values()];
  allPeers.slice(0, 4).forEach(p => {
    const av = document.createElement("div");
    av.className = "presence-avatar";
    av.style.background = p.color;
    av.textContent = p.initials;
    av.title = p.id === myPeerId ? `You (${p.name})` : p.name;
    av.onclick = openRoomDrawer;
    bar.append(av);
  });

  if (allPeers.length > 4) {
    const pill = document.createElement("div");
    pill.className = "presence-count-pill";
    pill.textContent = `+${allPeers.length - 4}`;
    pill.onclick = openRoomDrawer;
    bar.append(pill);
  }

  $("#roomPeersCount").textContent = `${allPeers.length} active`;
}

function renderPeerCursor(p) {
  const container = $("#peerCursors");
  if (!container || p.x == null || p.y == null) return;
  let curEl = document.getElementById("peer_cur_" + p.id);
  if (!curEl) {
    curEl = document.createElement("div");
    curEl.id = "peer_cur_" + p.id;
    curEl.className = "peer-cursor";
    curEl.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="${p.color}"><path d="M4 0l16 12.279-6.951 1.17 4.325 8.817-3.596 1.734-4.35-8.879-5.428 5.428z"/></svg><div class="peer-cursor-label" style="background:${p.color}">${p.name}</div>`;
    container.append(curEl);
  }
  const stage = $("#stage").getBoundingClientRect();
  curEl.style.left = `${Math.min(stage.width - 60, Math.max(0, p.x * stage.width))}px`;
  curEl.style.top = `${Math.min(stage.height - 30, Math.max(0, p.y * stage.height))}px`;
}

function removePeerCursor(id) {
  const el = document.getElementById("peer_cur_" + id);
  if (el) el.remove();
}

function openRoomDrawer() {
  $("#roomNameIn").value = currentRoomId || "lobby";
  renderRoomPeersList();
  $("#roomDlg").showModal();
}

function renderRoomPeersList() {
  const list = $("#roomPeersList");
  list.textContent = "";
  const allPeers = [myPeerUser, ...remotePeers.values()];
  allPeers.forEach(p => {
    const row = document.createElement("div");
    row.style.cssText = "display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:#f9fafb;border-radius:8px;border:1px solid var(--line);";
    row.innerHTML = `<div style="display:flex;align-items:center;gap:10px"><div class="presence-avatar" style="width:26px;height:26px;background:${p.color};font-size:10px">${p.initials}</div><strong>${p.name}</strong> ${p.id === myPeerId ? '<span style="font-size:11px;color:var(--sub);font-weight:normal">(You)</span>' : ""}</div><span class="studio-badge" style="background:#e5fbe9;color:#047857">Connected</span>`;
    list.append(row);
  });
}

function switchRoom(newRoomId) {
  if (!newRoomId) return;
  const clean = newRoomId.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
  if (!clean) return;
  currentRoomId = clean;
  remotePeers.clear();
  $("#peerCursors").textContent = "";
  initPresence();
  toast(`Switched to room "${clean}"`);
  renderRoomPeersList();
}

// Stage cursor tracking
let lastCursorBroadcast = 0;
$("#stage").addEventListener("mousemove", e => {
  const now = Date.now();
  if (now - lastCursorBroadcast < 45) return;
  lastCursorBroadcast = now;
  const rect = $("#stage").getBoundingClientRect();
  const nx = (e.clientX - rect.left) / rect.width;
  const ny = (e.clientY - rect.top) / rect.height;
  const room = getRoom(currentRoomId || "lobby");
  if (room.bc) {
    room.bc.postMessage({ from: myPeerId, type: "peer_cursor", x: nx, y: ny, peer: myPeerUser });
  }
});

// Wire up Database Studio tabs and controls
if ($("#dbStudioTabs")) $("#dbStudioTabs").onclick = e => {
  const b = e.target.closest("button.tab");
  if (!b) return;
  $("#dbStudioTabs").querySelectorAll(".tab").forEach(t => t.setAttribute("aria-pressed", "false"));
  b.setAttribute("aria-pressed", "true");
  const tab = b.dataset.tab;
  $("#dbStudioTabSql").style.display = tab === "sql" ? "flex" : "none";
  $("#dbStudioTabKv").style.display = tab === "kv" ? "flex" : "none";
};

if ($("#dbTableSelect")) $("#dbTableSelect").onchange = e => renderStudioTableData(e.target.value);
if ($("#dbAddRowBtn")) $("#dbAddRowBtn").onclick = addStudioRow;
if ($("#dbNewTableBtn")) $("#dbNewTableBtn").onclick = createStudioTable;
if ($("#dbDropTableBtn")) $("#dbDropTableBtn").onclick = dropStudioTable;
if ($("#dbExportCsvBtn")) $("#dbExportCsvBtn").onclick = exportStudioCsv;
if ($("#dbImportCsvBtn")) $("#dbImportCsvBtn").onclick = () => $("#dbCsvIn").click();
if ($("#dbCsvIn")) $("#dbCsvIn").onchange = e => { importStudioCsv(e.target.files[0]); e.target.value = ""; };
$("#dbKvSearch").oninput = refreshStudioKv;
if ($("#dbAddKeyBtn")) $("#dbAddKeyBtn").onclick = addStudioKvKey;
if ($("#dbRefreshKvBtn")) $("#dbRefreshKvBtn").onclick = refreshStudioKv;
if ($("#dbStudioClose")) $("#dbStudioClose").onclick = () => $("#dbStudioDlg").close();

if ($("#dbStudioBtn")) $("#dbStudioBtn").onclick = openDatabaseStudio;
if ($("#dbStudioMenuBtn")) $("#dbStudioMenuBtn").onclick = () => { $("#menu").hidden = true; openDatabaseStudio(); };

// Wire up Realtime Room controls
if ($("#roomMenuBtn")) $("#roomMenuBtn").onclick = () => { $("#menu").hidden = true; openRoomDrawer(); };
if ($("#roomClose")) $("#roomClose").onclick = () => $("#roomDlg").close();
if ($("#roomJoinBtn")) $("#roomJoinBtn").onclick = () => switchRoom($("#roomNameIn").value);
if ($("#roomCopyLinkBtn")) $("#roomCopyLinkBtn").onclick = () => {
  navigator.clipboard.writeText(location.origin + location.pathname + "#room=" + encodeURIComponent(currentRoomId)).then(() => toast("Copied invite link!"));
};
if ($("#roomBroadcastPingBtn")) $("#roomBroadcastPingBtn").onclick = () => {
  const room = getRoom(currentRoomId || "lobby");
  if (room.bc) {
    room.bc.postMessage({ from: myPeerId, type: "peer_ping", peer: myPeerUser });
    toast("Ping sent to peers");
  }
};

initPresence();


// ================= Firebase =================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  setDoc,
  doc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const app = initializeApp({
  apiKey: "AIzaSyCzbAnlP-XRNZe210GEYvEVFskayxjUI",
  authDomain: "clan-ranking-661e3.firebaseapp.com",
  projectId: "clan-ranking-661e3",
});

const db = getFirestore(app);
const colRef = collection(db, "items");

let chart;
let csvBuffer = {};

// ================= 共通 =================
const toDate = d => new Date(d);
const toSlash = d => d.replaceAll("-", "/");

// ================= 保存（完全上書き） =================
async function saveByDate(date, data) {
  await setDoc(doc(db, "items", date), {
    date,
    data
  });
}

// ================= 手動 =================
function createTable(data = null) {
  const div = document.getElementById("table");
  div.innerHTML = "";

  for (let i = 1; i <= 15; i++) {
    div.innerHTML += `
      <div>
        ${i}位
        <input id="name${i}" value="${data?.[i - 1]?.name || ""}">
      </div>
    `;
  }
}

document.getElementById("saveBtn").addEventListener("click", async () => {

  const date = document.getElementById("date").value;
  if (!date) return alert("日付必須");

  const data = [];

  for (let i = 1; i <= 15; i++) {
    const name = document.getElementById(`name${i}`).value.trim();
    data.push({ rank: i, name });
  }

  await saveByDate(toSlash(date), data);

  init();
});

// ================= 一覧（削除のみ） =================
async function loadList() {

  const snap = await getDocs(colRef);

  const docs = snap.docs
    .map(d => d.data())
    .sort((a, b) => toDate(b.date) - toDate(a.date));

  const list = document.getElementById("list");
  list.innerHTML = "";

  docs.forEach(d => {

    const div = document.createElement("div");

    div.innerHTML = `
      <b>${d.date}</b><br>
      ${d.data.map(p => `${p.rank}位 ${p.name}`).join("<br>")}
      <br>
      <button class="del">削除</button>
    `;

    div.querySelector(".del").addEventListener("click", async (e) => {
      e.stopPropagation();
      await deleteDoc(doc(db, "items", d.date));
      init();
    });

    list.appendChild(div);
  });
}

// ================= CSV読み込み =================
document.getElementById("csvLoadBtn").addEventListener("click", async () => {

  const file = document.getElementById("csvFile").files[0];
  if (!file) return;

  const text = await file.text();
  const rows = text.split(/\r?\n/).slice(1);

  csvBuffer = {};

  rows.forEach(r => {
    const [date, rank, name] = r.split(",");
    if (!date || !rank) return;

    const d = toSlash(date.trim());

    if (!csvBuffer[d]) csvBuffer[d] = [];

    csvBuffer[d].push({
      rank: Number(rank),
      name: name?.trim() || ""
    });
  });

  alert("CSV読み込み完了");
});

// ================= CSV保存 =================
document.getElementById("csvSaveBtn").addEventListener("click", async () => {

  for (const date in csvBuffer) {

    csvBuffer[date].sort((a, b) => a.rank - b.rank);

    await saveByDate(date, csvBuffer[date]);
  }

  csvBuffer = {};
  init();
});

// ================= 平均 =================
document.getElementById("avgBtn").addEventListener("click", async () => {

  const start = document.getElementById("startAvg").value;
  const end = document.getElementById("endAvg").value;

  const snap = await getDocs(colRef);

  const data = snap.docs
    .map(d => d.data())
    .filter(d =>
      toDate(d.date) >= toDate(start) &&
      toDate(d.date) <= toDate(end)
    );

  const map = {};

  data.forEach(d => {
    d.data.forEach(p => {
      if (!p.name) return;

      if (!map[p.name]) map[p.name] = { sum: 0, count: 0 };

      map[p.name].sum += p.rank;
      map[p.name].count++;
    });
  });

  const result = Object.entries(map)
    .map(([name, v]) => ({
      name,
      avg: v.sum / v.count
    }))
    .sort((a, b) => a.avg - b.avg);

  document.getElementById("avgResult").innerHTML =
    result.map((r, i) =>
      `${i + 1}. ${r.name} (${r.avg.toFixed(2)})`
    ).join("<br>");
});

// ================= グラフ =================
document.getElementById("graphBtn").addEventListener("click", async () => {

  const start = document.getElementById("start").value;
  const end = document.getElementById("end").value;

  const snap = await getDocs(colRef);

  const docs = snap.docs
    .map(d => d.data())
    .filter(d =>
      toDate(d.date) >= toDate(start) &&
      toDate(d.date) <= toDate(end)
    )
    .sort((a, b) => toDate(a.date) - toDate(b.date));

  const labels = docs.map(d => d.date);

  const selected = [...document.querySelectorAll("#playerList input:checked")]
    .map(cb => cb.value);

  const datasets = selected.map((name, i) => ({
    label: name,
    data: docs.map(d => {
      const f = d.data.find(p => p.name === name);
      return f ? f.rank : null;
    }),
    borderWidth: 2
  }));

  if (chart) chart.destroy();

  chart = new Chart(document.getElementById("chart"), {
    type: "line",
    data: { labels, datasets },
    options: {
      scales: {
        y: { reverse: true, ticks: { stepSize: 1 } }
      }
    }
  });
});

// ================= メンバー =================
async function buildMembers() {

  const snap = await getDocs(colRef);
  const set = new Set();

  snap.docs.forEach(d => {
    d.data().data.forEach(p => set.add(p.name));
  });

  const list = document.getElementById("playerList");
  list.innerHTML = "";

  [...set].sort().forEach(name => {
    list.innerHTML += `
      <label>
        <input type="checkbox" value="${name}" checked>
        ${name}
      </label><br>
    `;
  });
}

document.getElementById("memberBtn").addEventListener("click", async () => {
  await buildMembers();
  document.getElementById("modal").classList.remove("hidden");
});

document.getElementById("closeModal").addEventListener("click", () => {
  document.getElementById("modal").classList.add("hidden");
});

document.getElementById("selectAll").addEventListener("change", e => {
  document.querySelectorAll("#playerList input")
    .forEach(cb => cb.checked = e.target.checked);
});

// ================= 初期化 =================
async function init() {
  await loadList();
  createTable();
}

init();

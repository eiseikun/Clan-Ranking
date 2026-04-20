import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  deleteDoc,
  doc,
  setDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCzbAnlP-XRNZe210GEYvEVFskayxjX9UI",
  authDomain: "clan-ranking-661e3.firebaseapp.com",
  projectId: "clan-ranking-661e3",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const colRef = collection(db, "items");

// 日付
const toDate = d => {
  const p = d.replaceAll("-", "/").split("/");
  return new Date(p[0], p[1] - 1, p[2]);
};
const toSlash = d => d.replaceAll("-", "/");
const toKey = d => d.replaceAll("/", "-");

// テーブル入力
function createTable(data = []) {
  const el = document.getElementById("table");
  el.innerHTML = "";

  for (let i = 1; i <= 15; i++) {
    el.innerHTML += `
      <div>${i}位
      <input id="name${i}" value="${data?.[i - 1]?.name || ""}">
      </div>
    `;
  }
}

// 保存
window.saveData = async () => {
  let date = document.getElementById("date").value;
  if (!date) return alert("日付必須");

  date = toSlash(date);
  const key = toKey(date);

  const data = [];
  for (let i = 1; i <= 15; i++) {
    data.push({
      rank: i,
      name: document.getElementById(`name${i}`).value.trim()
    });
  }

  await setDoc(doc(db, "items", key), { date, data });
  init();
};

// CSV
window.importCSV = async () => {
  const file = document.getElementById("csvFile").files[0];
  if (!file) return alert("ファイル選択");

  const text = await file.text();
  const rows = text.split(/\r?\n/).slice(1);

  const map = {};

  rows.forEach(r => {
    const [date, rank, name] = r.split(",");
    if (!date || !rank) return;

    const d = toSlash(date.trim());
    if (!map[d]) map[d] = [];

    map[d].push({
      rank: Number(rank),
      name: name?.trim() || ""
    });
  });

  for (const date in map) {
    const key = toKey(date);
    map[date].sort((a, b) => a.rank - b.rank);

    await setDoc(doc(db, "items", key), {
      date,
      data: map[date]
    });
  }

  init();
};

// 一覧（横並び）
async function loadList() {
  const snap = await getDocs(colRef);
  const data = snap.docs.map(d => d.data())
    .sort((a, b) => toDate(a.date) - toDate(b.date));

  const table = document.getElementById("listTable");
  table.innerHTML = "";

  let html = "<tr><th>順位</th>";
  data.forEach(d => html += `<th>${d.date}</th>`);
  html += "</tr>";

  for (let i = 1; i <= 15; i++) {
    html += `<tr><td>${i}位</td>`;
    data.forEach(d => {
      const f = d.data.find(p => p.rank === i);
      html += `<td>${f?.name || ""}</td>`;
    });
    html += "</tr>";
  }

  table.innerHTML = html;
}

// 平均
window.calcAvg = async () => {
  const start = document.getElementById("startAvg").value;
  const end = document.getElementById("endAvg").value;

  const snap = await getDocs(colRef);

  const map = {};

  snap.docs.forEach(doc => {
    const d = doc.data();
    if (toDate(d.date) < toDate(start) || toDate(d.date) > toDate(end)) return;

    d.data.forEach(p => {
      if (!p.name) return;
      if (!map[p.name]) map[p.name] = { total: 0, count: 0 };

      map[p.name].total += p.rank;
      map[p.name].count++;
    });
  });

  const result = Object.entries(map)
    .map(([name, v]) => ({
      name,
      avg: v.total / v.count
    }))
    .sort((a, b) => a.avg - b.avg);

  let html = "<table><tr><th>順位</th><th>名前</th><th>平均</th></tr>";

  result.forEach((r, i) => {
    html += `<tr><td>${i + 1}</td><td>${r.name}</td><td>${r.avg.toFixed(2)}</td></tr>`;
  });

  html += "</table>";
  document.getElementById("avgResult").innerHTML = html;
};

// 初期化
async function init() {
  await loadList();
}

createTable();
init();

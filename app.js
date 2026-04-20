
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

const firebaseConfig = {
  apiKey: "AIzaSyCzbAnlP-XRNZe210GEyVevFskajxUI",
  authDomain: "clan-ranking-661e3.firebaseapp.com",
  projectId: "clan-ranking-661e3",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const colRef = collection(db, "items");

let chart;

// ================= 状態（CSVバッファ） =================
let csvBuffer = {};

// ================= 共通 =================
const toDate = d => new Date(d);
const toSlash = d => d.replaceAll("-", "/");

// ================= 保存（共通コア） =================
async function saveByDate(date, data) {
  await setDoc(doc(db, "items", date), {
    date,
    data
  });
}

// ================= テーブル =================
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

// ================= 手動入力（バッファ化） =================
window.saveData = async () => {

  const date = document.getElementById("date").value;
  if (!date) return alert("日付必須");

  const data = [];

  for (let i = 1; i <= 15; i++) {
    const name = document.getElementById(`name${i}`).value.trim();
    data.push({ rank: i, name });
  }

  // 🔥 即保存（上書き）
  await saveByDate(toSlash(date), data);

  init();
};

// ================= CSV読み込み（まだ保存しない） =================
window.importCSV = async () => {

  const file = document.getElementById("csvFile").files[0];
  if (!file) return alert("ファイル選択して");

  const text = await file.text();
  const rows = text.split(/\r?\n/).slice(1);

  csvBuffer = {}; // 初期化

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

  alert("CSV読み込み完了（未保存）");
};

// ================= CSV保存ボタン（追加） =================
window.commitCSV = async () => {

  for (const date in csvBuffer) {

    csvBuffer[date].sort((a, b) => a.rank - b.rank);

    await saveByDate(date, csvBuffer[date]);
  }

  csvBuffer = {};
  init();
};

// ================= 一覧 =================
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
    `;

    // ❌ 編集なし（要件通り）
    list.appendChild(div);
  });
}

// ================= 平均順位 =================
window.calcAvg = async () => {

  const start = document.getElementById("startAvg").value;
  const end = document.getElementById("endAvg").value;

  if (!start || !end) return alert("期間指定");

  const snap = await getDocs(colRef);

  const docs = snap.docs
    .map(d => d.data())
    .filter(d =>
      toDate(d.date) >= toDate(start) &&
      toDate(d.date) <= toDate(end)
    );

  const map = {};

  docs.forEach(d => {
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

  const el = document.getElementById("avgResult");

  el.innerHTML = `
    <table>
      <tr><th>順位</th><th>名前</th><th>平均</th></tr>
      ${result.map((r, i) =>
        `<tr>
          <td>${i + 1}</td>
          <td>${r.name}</td>
          <td>${r.avg.toFixed(2)}</td>
        </tr>`
      ).join("")}
    </table>
  `;
};

// ================= グラフ =================
window.drawChart = async () => {

  const start = document.getElementById("start").value;
  const end = document.getElementById("end").value;

  const selected = [...document.querySelectorAll("#playerList input:checked")]
    .map(cb => cb.value);

  const snap = await getDocs(colRef);

  const docs = snap.docs
    .map(d => d.data())
    .filter(d =>
      toDate(d.date) >= toDate(start) &&
      toDate(d.date) <= toDate(end)
    )
    .sort((a, b) => toDate(a.date) - toDate(b.date));

  const labels = docs.map(d => d.date);

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
};

// ================= 初期化 =================
async function init() {
  await loadList();
}

document.addEventListener("DOMContentLoaded", () => {
  createTable();
  init();
});

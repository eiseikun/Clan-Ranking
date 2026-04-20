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

// ================= 共通 =================
const toDate = d => new Date(d);

// ================= ドキュメント保存（核心） =================
async function saveByDate(date, data) {
  const id = date; // ★ここが最重要（＝日付がID）

  await setDoc(doc(db, "items", id), {
    date,
    data
  });
}

// ================= 手動入力UI =================
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

// ================= 手動保存 =================
async function saveData() {

  const date = document.getElementById("date").value;
  if (!date) return alert("日付必須");

  const data = [];

  for (let i = 1; i <= 15; i++) {
    const name = document.getElementById(`name${i}`).value.trim();
    data.push({ rank: i, name });
  }

  await saveByDate(date, data);

  init();
}

// ================= 一覧 =================
async function loadList() {

  const snap = await getDocs(colRef);

  const data = snap.docs
    .map(d => d.data())
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const list = document.getElementById("list");
  list.innerHTML = "";

  data.forEach(d => {

    const div = document.createElement("div");

    div.innerHTML = `
      <b>${d.date}</b><br>
      ${d.data.map(p => `${p.rank}位 ${p.name}`).join("<br>")}
      <br>
      <button onclick="remove('${d.date}')">削除</button>
    `;

    div.onclick = e => {
      if (e.target.tagName === "BUTTON") return;

      document.getElementById("date").value = d.date;
      createTable(d.data);
    };

    list.appendChild(div);
  });
}

// ================= 削除 =================
window.remove = async (date) => {
  if (!confirm("削除しますか？")) return;

  await deleteDoc(doc(db, "items", date));
  init();
};

// ================= CSV（完全統一） =================
document.getElementById("csvBtn").onclick = async () => {

  const file = document.getElementById("csvFile").files[0];
  if (!file) return;

  const text = await file.text();
  const lines = text.split(/\r?\n/).filter(Boolean);

  const grouped = {};

  for (const line of lines) {

    const parts = line.split(",");
    const date = parts[0];
    const names = parts.slice(1);

    grouped[date] = names.slice(0, 15).map((name, i) => ({
      rank: i + 1,
      name
    }));
  }

  for (const [date, data] of Object.entries(grouped)) {
    await saveByDate(date, data); // ★完全統一
  }

  init();
};

// ================= 平均順位 =================
document.getElementById("avgBtn").onclick = async () => {

  const from = new Date(document.getElementById("from").value);
  const to = new Date(document.getElementById("to").value);

  const snap = await getDocs(colRef);

  const data = snap.docs.map(d => d.data())
    .filter(d => {
      const date = new Date(d.date);
      return date >= from && date <= to;
    });

  const map = {};

  data.forEach(d => {
    d.data.forEach(p => {
      if (!map[p.name]) map[p.name] = { sum: 0, count: 0 };
      map[p.name].sum += p.rank;
      map[p.name].count++;
    });
  });

  let html = "<table><tr><th>名前</th><th>平均順位</th></tr>";

  for (const [name, v] of Object.entries(map)) {
    html += `<tr><td>${name}</td><td>${(v.sum / v.count).toFixed(2)}</td></tr>`;
  }

  html += "</table>";

  document.getElementById("avgResult").innerHTML = html;
};

// ================= グラフ =================
document.getElementById("graphBtn").onclick = async () => {

  const from = new Date(document.getElementById("gFrom").value);
  const to = new Date(document.getElementById("gTo").value);

  const members = document.getElementById("members").value.split(",").map(s => s.trim());

  const snap = await getDocs(colRef);

  const docs = snap.docs.map(d => d.data())
    .filter(d => {
      const date = new Date(d.date);
      return date >= from && date <= to;
    })
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const labels = docs.map(d => d.date);

  const datasets = members.map(name => ({
    label: name,
    data: docs.map(d => {
      const found = d.data.find(p => p.name === name);
      return found ? found.rank : null;
    }),
    borderWidth: 2
  }));

  if (chart) chart.destroy();

  chart = new Chart(document.getElementById("chart"), {
    type: "line",
    data: { labels, datasets }
  });
};

// ================= 初期化 =================
async function init() {
  await loadList();
}

document.addEventListener("DOMContentLoaded", () => {
  createTable();
  document.getElementById("saveBtn").onclick = saveData;
  init();
});

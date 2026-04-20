// =========================
// 🔥 Firebase
// =========================
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

// =========================
// 🗓 日付処理
// =========================
const toDate = d => {
  if (!d) return new Date(0);
  const p = d.replaceAll("-", "/").split("/");
  return new Date(p[0], p[1] - 1, p[2]);
};

const toSlash = d => d.replaceAll("-", "/");
const toKey = d => d.replaceAll("/", "-");

// =========================
// 🧱 テーブル
// =========================
function createTable(data = null) {
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

// =========================
// 💾 保存（上書き）
// =========================
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

  alert("保存完了");
  init();
};

// =========================
// 📋 一覧
// =========================
async function loadList() {
  const list = document.getElementById("list");
  list.innerHTML = "";

  const snap = await getDocs(colRef);

  const docs = snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => toDate(b.date) - toDate(a.date));

  docs.forEach(d => {
    const div = document.createElement("div");
    div.className = "card";

    div.innerHTML = `
      <b>${d.date}</b><br>
      ${d.data.map(p => `${p.rank}位 ${p.name}`).join("<br>")}
      <br><button class="del">削除</button>
    `;

    div.onclick = e => {
      if (e.target.classList.contains("del")) return;
      document.getElementById("date").value = d.date.replaceAll("/", "-");
      createTable(d.data);
    };

    div.querySelector(".del").onclick = async e => {
      e.stopPropagation();
      await deleteDoc(doc(db, "items", d.id));
      init();
    };

    list.appendChild(div);
  });
}

// =========================
// 📥 CSV取込
// =========================
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

  alert("CSV完了");
  init();
};

// =========================
// 📈 グラフ
// =========================
let chart;

async function getAll() {
  const snap = await getDocs(colRef);
  return snap.docs.map(d => d.data());
}

window.drawChart = async () => {
  const start = document.getElementById("start").value;
  const end = document.getElementById("end").value;

  const all = await getAll();

  const filtered = all
    .filter(d => toDate(d.date) >= toDate(start) && toDate(d.date) <= toDate(end))
    .sort((a, b) => toDate(a.date) - toDate(b.date));

  const selected = [...document.querySelectorAll("#playerList input:checked")]
    .map(cb => cb.value);

  const labels = filtered.map(d => d.date);

  const datasets = selected.map((name, i) => ({
    label: name,
    data: filtered.map(d => {
      const f = d.data.find(p => p.name === name);
      return f ? f.rank : null;
    }),
    borderColor: `hsl(${i * 60},70%,50%)`,
    tension: 0.2,
    spanGaps: true
  }));

  if (chart) chart.destroy();

  chart = new Chart(document.getElementById("chart"), {
    type: "line",
    data: { labels, datasets },
    options: {
      scales: {
        y: { reverse: true }
      }
    }
  });
};

// =========================
// 👥 メンバー選択
// =========================
async function buildMemberList() {
  const data = await getAll();
  const set = new Set();

  data.forEach(d => d.data.forEach(p => p.name && set.add(p.name)));

  const list = document.getElementById("playerList");
  list.innerHTML = "";

  [...set].sort().forEach(name => {
    list.innerHTML += `
      <label><input type="checkbox" value="${name}" checked> ${name}</label><br>
    `;
  });
}

document.getElementById("memberBtn").onclick = async () => {
  await buildMemberList();
  document.getElementById("modal").classList.remove("hidden");
};

document.getElementById("closeModal").onclick = () => {
  document.getElementById("modal").classList.add("hidden");
};

document.getElementById("selectAll").onchange = e => {
  document.querySelectorAll("#playerList input")
    .forEach(cb => cb.checked = e.target.checked);
};

// =========================
// 🚀 初期化
// =========================
async function init() {
  await loadList();
}

createTable();
init();

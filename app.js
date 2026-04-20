
// ================= Firebase =================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCzbAnlP-XRNZe210GEYvEVFskajxUI",
  authDomain: "clan-ranking-661e3.firebaseapp.com",
  projectId: "clan-ranking-661e3",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const colRef = collection(db, "items");

let chart;

// ================= 日付処理 =================
const toDate = d => {
  if (!d) return new Date(0);
  const parts = d.replaceAll("-", "/").split("/");
  return new Date(parts[0], parts[1] - 1, parts[2]);
};

// ================= 共通保存関数 =================
async function saveOrUpdate(date, data) {
  const snap = await getDocs(colRef);

  for (const d of snap.docs) {
    if (d.data().date === date) {
      await deleteDoc(doc(db, "items", d.id));
    }
  }

  await addDoc(colRef, { date, data });
}

// ================= 入力テーブル =================
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
  let date = document.getElementById("date").value;
  if (!date) return alert("日付必須");

  date = date.replaceAll("-", "/");

  const data = [];

  for (let i = 1; i <= 15; i++) {
    const name = document.getElementById(`name${i}`).value.trim();
    data.push({ rank: i, name });
  }

  await saveOrUpdate(date, data);

  alert("登録完了");
  init();
}

// ================= 一覧 =================
async function loadList() {
  const list = document.getElementById("list");
  list.innerHTML = "";

  const snap = await getDocs(colRef);

  const map = new Map();

  snap.docs.forEach(d => {
    map.set(d.data().date, { id: d.id, ...d.data() });
  });

  const docs = [...map.values()]
    .sort((a, b) => toDate(b.date) - toDate(a.date));

  docs.forEach(d => {
    const div = document.createElement("div");
    div.className = "card";

    div.innerHTML = `
      <b>${d.date}</b><br>
      ${d.data
        .filter(p => p.name)
        .map(p => `${p.rank}位 ${p.name}`)
        .join("<br>")}
      <br>
      <button class="del">削除</button>
    `;

    // 編集
    div.onclick = e => {
      if (e.target.classList.contains("del")) return;

      document.getElementById("date").value = d.date.replaceAll("/", "-");
      createTable(d.data);
    };

    // 削除
    div.querySelector(".del").onclick = async e => {
      e.stopPropagation();
      await deleteDoc(doc(db, "items", d.id));
      init();
    };

    list.appendChild(div);
  });
}

// ================= CSV（複数日対応） =================
document.getElementById("csvBtn").onclick = async () => {
  const file = document.getElementById("csvFile").files[0];
  if (!file) return alert("CSV選択して");

  const reader = new FileReader();

  reader.onload = async e => {
    const lines = e.target.result
      .split("\n")
      .map(l => l.trim())
      .filter(l => l);

    for (const line of lines) {
      const parts = line.split(",");

      const date = parts[0].trim();
      const names = parts.slice(1);

      if (!date || names.length === 0) continue;

      const formattedDate = date.replaceAll("-", "/");

      const data = names.slice(0, 15).map((name, i) => ({
        rank: i + 1,
        name: name.trim()
      }));

      await saveOrUpdate(formattedDate, data);
    }

    alert("CSV一括登録完了");
    init();
  };

  reader.readAsText(file);
};

// ================= 平均順位 =================
document.getElementById("avgBtn").onclick = async () => {
  const from = toDate(document.getElementById("from").value);
  const to = toDate(document.getElementById("to").value);

  const snap = await getDocs(colRef);

  const filtered = snap.docs.map(d => d.data())
    .filter(d => {
      const date = toDate(d.date);
      return date >= from && date <= to;
    });

  const map = {};

  filtered.forEach(d => {
    d.data.forEach(p => {
      if (!p.name) return;

      if (!map[p.name]) map[p.name] = { sum: 0, count: 0 };

      map[p.name].sum += p.rank;
      map[p.name].count++;
    });
  });

  let html = "<table><tr><th>名前</th><th>平均順位</th></tr>";

  Object.entries(map).forEach(([name, v]) => {
    html += `<tr><td>${name}</td><td>${(v.sum / v.count).toFixed(2)}</td></tr>`;
  });

  html += "</table>";

  document.getElementById("avgResult").innerHTML = html;
};

// ================= グラフ =================
document.getElementById("graphBtn").onclick = async () => {
  const from = toDate(document.getElementById("gFrom").value);
  const to = toDate(document.getElementById("gTo").value);
  const members = document.getElementById("members").value
    .split(",")
    .map(m => m.trim())
    .filter(Boolean);

  const snap = await getDocs(colRef);

  const docs = snap.docs.map(d => d.data())
    .filter(d => {
      const date = toDate(d.date);
      return date >= from && date <= to;
    })
    .sort((a, b) => toDate(a.date) - toDate(b.date));

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
  init();

  document.getElementById("saveBtn").onclick = saveData;
});

// ================= Firebase初期化 =================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, collection, setDoc, getDocs,
  deleteDoc, doc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "clan-ranking-661e3.firebaseapp.com",
  projectId: "clan-ranking-661e3",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const colRef = collection(db, "items");


// ================= 日付処理 =================
// yyyy/mm/dd ⇄ yyyy-mm-dd 両対応
const toDate = d => new Date(d.replaceAll("/", "-"));
const toSlash = d => d.replaceAll("-", "/");


// ================= 入力テーブル =================
function createTable(data = null) {
  const div = document.getElementById("table");

  // ★ CSS対応
  div.className = "rank-table";

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


// ================= 保存（完全上書き） =================
window.saveData = async () => {
  try {
    let date = document.getElementById("date").value;
    if (!date) return alert("日付必須");

    date = toSlash(date);

    const data = [];
    for (let i = 1; i <= 15; i++) {
      const name = document.getElementById(`name${i}`).value.trim();
      data.push({ rank: i, name });
    }

    // ★ 日付IDで上書き保存
    await setDoc(doc(db, "items", date), {
      date,
      data
    });

    alert("登録完了");

    await init(); // ★確実に再描画
  } catch (e) {
    console.error(e);
    alert("保存エラー");
  }
};


// ================= 一覧表示 =================
async function loadList() {
  const list = document.getElementById("list");
  list.innerHTML = "";

  const snap = await getDocs(colRef);

  const docs = snap.docs
    .map(d => d.data())
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
      await deleteDoc(doc(db, "items", d.date));
      await init();
    };

    list.appendChild(div);
  });
}


// ================= CSV取込 =================
window.importCSV = async () => {
  try {
    const file = document.getElementById("csvFile").files[0];
    if (!file) return alert("ファイル選択して");

    const text = await file.text();

    // ★ 改行対応（Windows対策）
    const rows = text.split(/\r?\n/).slice(1);

    const map = {};

    rows.forEach(r => {
      if (!r.trim()) return;

      const [date, rank, name] = r.split(",");

      if (!date || !rank) return;

      const fixedDate = toSlash(date.trim());

      if (!map[fixedDate]) map[fixedDate] = [];

      map[fixedDate].push({
        rank: Number(rank),
        name: name?.trim() || ""
      });
    });

    // ★ 日付ごとに上書き
    for (const date in map) {
      map[date].sort((a, b) => a.rank - b.rank);

      await setDoc(doc(db, "items", date), {
        date,
        data: map[date]
      });
    }

    alert("CSV取込完了");
    await init();

  } catch (e) {
    console.error(e);
    alert("CSVエラー");
  }
};


// ================= 平均順位 =================
window.calcAvg = async () => {
  const start = document.getElementById("startAvg").value;
  const end = document.getElementById("endAvg").value;

  if (!start || !end) return alert("期間指定");

  const snap = await getDocs(colRef);

  const docs = snap.docs
    .map(d => d.data())
    .filter(d => toDate(d.date) >= toDate(start) && toDate(d.date) <= toDate(end));

  const map = {};

  docs.forEach(d => {
    d.data.forEach(p => {
      if (!p.name) return;

      if (!map[p.name]) {
        map[p.name] = { total: 0, count: 0 };
      }

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

  renderAverage(result);
};

function renderAverage(list) {
  const el = document.getElementById("avgResult");

  let html = `
    <table class="avg-table">
      <tr>
        <th>順位</th>
        <th>名前</th>
        <th>平均順位</th>
      </tr>
  `;

  list.forEach((d, i) => {
    html += `
      <tr>
        <td>${i + 1}</td>
        <td>${d.name}</td>
        <td>${d.avg.toFixed(2)}</td>
      </tr>
    `;
  });

  html += "</table>";
  el.innerHTML = html;
}


// ================= グラフ =================
let chart;

async function getAllData() {
  const snap = await getDocs(colRef);
  return snap.docs.map(d => d.data());
}

window.drawChart = async () => {
  const start = document.getElementById("start").value;
  const end = document.getElementById("end").value;

  if (!start || !end) return alert("期間指定");

  const all = await getAllData();

  const filtered = all
    .filter(d => toDate(d.date) >= toDate(start) && toDate(d.date) <= toDate(end))
    .sort((a, b) => toDate(a.date) - toDate(b.date));

  const selected = [...document.querySelectorAll("#playerList input:checked")]
    .map(cb => cb.value);

  if (selected.length === 0) return alert("メンバー選択して");

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
        y: {
          reverse: true,
          ticks: { stepSize: 1 }
        }
      }
    }
  });
};


// ================= メンバー選択 =================
async function buildMemberList() {
  const data = await getAllData();
  const set = new Set();

  data.forEach(d => {
    d.data.forEach(p => {
      if (p.name) set.add(p.name);
    });
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


// ================= ファイル名表示 =================
document.getElementById("csvFile").onchange = e => {
  document.getElementById("fileName").textContent = e.target.files[0]?.name || "未選択";
};


// ================= 初期化 =================
async function init() {
  await loadList();
}

createTable();
init();

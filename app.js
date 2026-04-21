import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  doc,
  setDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ==============================
// Firebase
// ==============================
const firebaseConfig = {
  apiKey: "AIzaSyCzbAnlP-XRNZe210GEYvEVFskayxjX9UI",
  authDomain: "clan-ranking-661e3.firebaseapp.com",
  projectId: "clan-ranking-661e3",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ==============================
// 状態管理（安定化ポイント）
// ==============================
let dataList = [];
let chart = null;
let selectedClans = [];

// ==============================
// クラン
// ==============================
const clanColors = {
  "最狂会": "#ff0000",
  "魔導特務隊": "#0000ff",
  "IgnisFloris": "#00ff00",
  "ポケポケ会": "#ffa500",
  "のの教": "#800080",
  "PopoWarren": "#8b4513",
  "ねこねこねこ": "#ff69b4",
  "たまねぎ班": "#00ffff",
  "猫の旅": "#ffff00",
  "ねこ海賊団": "#00ff7f",
  "やまだ家": "#ff00ff",
  "アチャ伝": "#000000"
};

const clans = Object.keys(clanColors);

// ==============================
// 初期UI
// ==============================
window.addEventListener("DOMContentLoaded", () => {
  const clanSelect = document.getElementById("clan");

  clans.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    clanSelect.appendChild(opt);
  });

  document.getElementById("date").valueAsDate = new Date();

  // モーダル作成
  const modalWrap = document.getElementById("modalCheckboxes");

  clans.forEach(c => {
    const label = document.createElement("label");
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.value = c;
    label.appendChild(cb);
    label.appendChild(document.createTextNode(c));
    modalWrap.appendChild(label);
  });
});

// ==============================
// ページ切替
// ==============================
window.showPage = function (page) {
  document.getElementById("page1").style.display = page === 1 ? "block" : "none";
  document.getElementById("page2").style.display = page === 2 ? "block" : "none";

  document.getElementById("tab1").classList.toggle("active", page === 1);
  document.getElementById("tab2").classList.toggle("active", page === 2);
};

// ==============================
// データ追加（安全化）
// ==============================
window.add = async function () {
  const clan = document.getElementById("clan").value;
  const score = Number(document.getElementById("score").value);
  const date = document.getElementById("date").value;

  if (!date) return alert("日付入れて");
  if (!score || score <= 0) return alert("スコア入れて");

  const docId = `${date}_${clan}`;

  await setDoc(doc(db, "scores", docId), {
    clan,
    score,
    date,
    time: Date.now()
  });

  document.getElementById("score").value = "";
};

// ==============================
// リアルタイム取得
// ==============================
onSnapshot(collection(db, "scores"), (snapshot) => {

  const newData = [];

  snapshot.forEach(d => {
    newData.push(d.data());
  });

  dataList = newData;

  renderTables();
});

// ==============================
// テーブル描画
// ==============================
function renderTables() {

  // ======================
  // 曜日別
  // ======================
  const weekdayBest = {};
  const days = ["日","月","火","水","木","金","土"];

  dataList.forEach(d => {
    const day = new Date(d.date).getDay();

    if (!weekdayBest[d.clan]) weekdayBest[d.clan] = {};
    if (!weekdayBest[d.clan][day]) {
      weekdayBest[d.clan][day] = d.score;
    } else {
      weekdayBest[d.clan][day] =
        Math.max(weekdayBest[d.clan][day], d.score);
    }
  });

  let html = "<table><tr><th>クラン</th>";
  days.forEach(d => html += `<th>${d}</th>`);
  html += "</tr>";

  clans.forEach(clan => {
    html += `<tr><td>${clan}</td>`;
    for (let i = 0; i < 7; i++) {
      html += `<td>${weekdayBest[clan]?.[i] ?? "-"}</td>`;
    }
    html += "</tr>";
  });

  html += "</table>";
  document.getElementById("weekdayBest").innerHTML = html;

  // ======================
  // 一覧
  // ======================
  const table = {};

  dataList.forEach(d => {
    if (!table[d.date]) table[d.date] = {};
    table[d.date][d.clan] = Math.max(
      table[d.date][d.clan] ?? 0,
      d.score
    );
  });

  const dates = Object.keys(table)
    .sort((a, b) => new Date(a) - new Date(b));

  let html2 = "<table><tr><th>日付</th>";
  clans.forEach(c => html2 += `<th>${c}</th>`);
  html2 += "</tr>";

  dates.forEach(date => {
    html2 += `<tr><td>${date}</td>`;
    clans.forEach(c => {
      html2 += `<td>${table[date]?.[c] ?? "-"}</td>`;
    });
    html2 += "</tr>";
  });

  html2 += "</table>";

  document.getElementById("tableWrap").innerHTML = html2;
}

// ==============================
// モーダル
// ==============================
window.openModal = () => {
  document.getElementById("modal").style.display = "flex";
};

window.closeModal = () => {
  document.getElementById("modal").style.display = "none";
};

window.applySelection = function () {
  selectedClans = [...document.querySelectorAll("#modalCheckboxes input:checked")]
    .map(cb => cb.value);

  document.getElementById("selectedClansText").textContent =
    selectedClans.length ? selectedClans.join(", ") : "未選択";

  closeModal();
};

window.selectAllClans = function () {
  document.querySelectorAll("#modalCheckboxes input")
    .forEach(cb => cb.checked = true);
};

window.clearAllClans = function () {
  document.querySelectorAll("#modalCheckboxes input")
    .forEach(cb => cb.checked = false);
};

// ==============================
// グラフ
// ==============================
window.drawChart = function () {

  if (!dataList.length) return alert("データなし");
  if (!selectedClans.length) return alert("クラン選択して");

  const start = document.getElementById("startDate").value;
  const end = document.getElementById("endDate").value;
  const mode = document.getElementById("graphMode").value;

  const filtered = dataList.filter(d => {
    const t = new Date(d.date).getTime();
    const s = start ? new Date(start).getTime() : -Infinity;
    const e = end ? new Date(end).getTime() : Infinity;

    return t >= s && t <= e && selectedClans.includes(d.clan);
  });

  const dates = [...new Set(dataList.map(d => d.date))]
    .sort((a, b) => new Date(a) - new Date(b));

  const scoreMap = {};

  dataList.forEach(d => {
    if (!scoreMap[d.date]) scoreMap[d.date] = {};
    scoreMap[d.date][d.clan] = Math.max(
      scoreMap[d.date][d.clan] ?? 0,
      d.score
    );
  });

  let datasets = [];

  if (mode === "rank") {

    const rankMap = {};

    dates.forEach(date => {
      const list = dataList
        .filter(d => d.date === date)
        .sort((a, b) => b.score - a.score);

      rankMap[date] = {};
      list.forEach((d, i) => {
        rankMap[date][d.clan] = i + 1;
      });
    });

    datasets = selectedClans.map(clan => ({
      label: clan,
      data: dates.map(date => rankMap[date]?.[clan] ?? null),
      borderColor: clanColors[clan],
      spanGaps: true,
      pointRadius: 4
    }));

  } else {

    datasets = selectedClans.map(clan => ({
      label: clan,
      data: dates.map(date => scoreMap[date]?.[clan] ?? null),
      borderColor: clanColors[clan],
      spanGaps: true,
      pointRadius: 4
    }));
  }

  // モーダル表示（ここが重要）
  document.getElementById("graphModal").style.display = "block";
  document.body.style.overflow = "hidden";
  
  if (chart) chart.destroy();

  chart = new Chart(document.getElementById("modalChart"), {
    type: "line",
    data: {
      labels: dates,
      datasets
    },
    options: {
  responsive: true,
  maintainAspectRatio: false,

  layout: {
    padding: {
      left: 10,
      right: 10,
      top: 10,
      bottom: 10
    }
  },

  plugins: {
    legend: {
      position: "bottom",
      labels: {
        boxWidth: 14,
        boxHeight: 14,
        padding: 15,
        color: "#ffffff",
        font: {
          size: 14,
          weight: "bold"
        }
      }
    },
    tooltip: {
      titleColor: "#fff",
      bodyColor: "#fff"
    }
  },

  scales: {
    x: {
      ticks: {
        color: "#ffffff",
        font: {
          size: 12
        },
        maxRotation: 45,
        minRotation: 45
      },
      grid: {
        color: "rgba(255,255,255,0.1)"
      }
    },

    y: mode === "rank"
      ? {
          reverse: true,
          ticks: {
            stepSize: 1,
            color: "#ffffff",
            font: { size: 12 }
          },
          grid: {
            color: "rgba(255,255,255,0.1)"
          }
        }
      : {
          beginAtZero: true,
          ticks: {
            color: "#ffffff",
            font: { size: 12 }
          },
          grid: {
            color: "rgba(255,255,255,0.1)"
          }
        }
  }
}
  });
};

window.closeGraphModal = function () {
  document.getElementById("graphModal").style.display = "none";
  document.body.style.overflow = "auto";
};
// ==============================
// 管理
// ==============================
window.toggleManage = function () {
  const area = document.getElementById("manageArea");
  const btn = document.getElementById("manageBtn");

  const open = area.style.display === "block";

  area.style.display = open ? "none" : "block";
  btn.textContent = open ? "⚙️" : "閉じる";
};
// ==============================
// グラフの折り畳み
// ==============================
window.toggleGraphBox = function () {
  const box = document.getElementById("graphBox");

  if (box.style.display === "none") {
    box.style.display = "block";
  } else {
    box.style.display = "none";
  }
};
// ==============================
// CSV
// ==============================
window.importCSV = async function () {
  const file = document.getElementById("csvFile").files[0];
  if (!file) return alert("ファイル選んで");

  const text = await file.text();
  const rows = text.split("\n").slice(1);

  for (let row of rows) {
    if (!row.trim()) continue;

    let [date, clan, score] = row.split(",");
    if (!date || !clan || isNaN(Number(score))) continue;

    const fixedDate = date.trim().replace(/\//g, "-");

    await setDoc(doc(db, "scores", `${fixedDate}_${clan}`), {
      date: fixedDate,
      clan,
      score: Number(score),
      time: Date.now()
    });
  }

  alert("CSV取込完了");
};

window.exportCSV = function () {
  if (!dataList.length) return alert("データなし");

  let csv = "date,clan,score\n";

  dataList.forEach(d => {
    csv += `${d.date},${d.clan},${d.score}\n`;
  });

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "scores.csv";
  a.click();

  URL.revokeObjectURL(url);
};

// ==============================
// ■ Firebase
// ==============================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, onSnapshot, doc, setDoc,query, orderBy } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCzbAnlP-XRNZe210GEYvEVFskayxjX9UI",
  authDomain: "clan-ranking-661e3.firebaseapp.com",
  projectId: "clan-ranking-661e3",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ==============================
// ■ グローバル状態
// ==============================
let dataList = [];
let rankList = [];
let chart = null;
let selectedClans = [];

// ==============================
// ■ スコア変換（T / B）
// ==============================
// 入力 → Bに変換
function toB(value, unit) {
  if (!value) return null;
  return unit === "T" ? value * 1000 : value;
}
// 表示用（B → T/B）
function formatScore(value) {
  if (value == null) return "-";
  if (value >= 1000) {
    return (value / 1000).toFixed(2) + "T";
  } else {
    return value + "B";
  }
}
// ★ T固定表示（1ページ目用）
function formatScoreT(value) {
  if (value == null) return "-";
  return (value / 1000).toFixed(2) + "T";
}
// ==============================
// ■ クラン設定
// ==============================
const clanColors = {
  "最狂会": "#00B050",
  "魔導特務隊": "#4472C4",
  "IgnisFloris": "#FFCCFF",
  "ポケポケ会": "#E97132",
  "のの教": "#92D050",
  "PopoWarren": "#A02B93",
  "ねこねこねこ": "#FF66B2",
  "たまねぎ班": "#8FAADC",
  "猫の旅": "#FF0000",
  "ねこ海賊団": "#00AEF0",
  "やまだ家": "#FFC000",
  "アチャ伝": "#7030A0"
};
const clans = Object.keys(clanColors);

// ==============================
// ■ 初期UI
// ==============================
window.addEventListener("DOMContentLoaded", () => {

  // クラン選択
  const clanSelect = document.getElementById("clan");
  clans.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    clanSelect.appendChild(opt);
  });

  // 日付初期値
  document.getElementById("date").valueAsDate = new Date();

  // モーダル（クラン選択）
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

  // メンバー候補
  const members = [
    "えいせい","モジュ","にゃんこ船長","タケシEX","AK1104","Alutemaika",
    "大蒜マン","きゃりら","norix9815","かずまる55","すわろう","肉おじゃ",
    "なーさんdesu","なはやまか","アンロイ","ジャック99","マグノリア",
    "パルムぅ","もにゃか","トコブル","RIKKUN","ぽぽん390"
  ];

  const memberList = document.getElementById("memberList");
  members.forEach(m => {
    const opt = document.createElement("option");
    opt.value = m;
    memberList.appendChild(opt);
  });
});

// ==============================
// ■ ページ切替
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
onSnapshot(
  query(collection(db, "scores"), orderBy("date")),
  (snapshot) => {

  const newData = [];

  snapshot.forEach(d => {
    newData.push(d.data());
  });

  dataList = newData;

  renderTables();
});
// 2ページ目用
onSnapshot(
  query(collection(db, "ranks"), orderBy("date")),
  (snapshot) => {
    const newData = [];
    snapshot.forEach(d => {
      newData.push(d.data());
    });
    rankList = newData;
    renderRankTable();
  renderBestScore(); // ★追加
});
// ==============================
// ▼▼▼ ページ1：全体記録  ▼▼▼
// ==============================
// ==============================
// ■ テーブル描画（曜日別＋一覧）
// ==============================
function renderTables() {
  // 曜日別
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
      html += `<td>${formatScoreT(weekdayBest[clan]?.[i])}</td>`;
    }
    html += "</tr>";
  });

  html += "</table>";
  document.getElementById("weekdayBest").innerHTML = html;

  // 一覧
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

let html2 = "<table class='rank-table'><tr><th>日付</th>";
clans.forEach(c => html2 += `<th class="clan-col">${c}</th>`);
html2 += "</tr>";

  dates.forEach(date => {
    html2 += `<tr><td>${date}</td>`;
    clans.forEach(c => {
      html2 += `<td>${formatScoreT(table[date]?.[c])}</td>`;
    });
    html2 += "</tr>";
  });

  html2 += "</table>";

  document.getElementById("tableWrap").innerHTML = html2;
}

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
      borderWidth: 3,
      spanGaps: true,
      pointRadius: 4
    }));

  } else {

    datasets = selectedClans.map(clan => ({
      label: clan,
      data: dates.map(date => scoreMap[date]?.[clan] ?? null),
      borderColor: clanColors[clan],
      borderWidth: 3,
      spanGaps: true,
      pointRadius: 4
    }));
  }
// ==============================
// ▼ グラフ描画（Chart.js）
// ==============================
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
            font: { size: 14, weight: "bold" }
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
            font: { size: 12 },
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
              ticks: { stepSize: 1, color: "#ffffff", font: { size: 12 } },
              grid: { color: "rgba(255,255,255,0.1)" }
            }
          : {
              beginAtZero: true,
              ticks: { color: "#ffffff", font: { size: 12 } },
              grid: { color: "rgba(255,255,255,0.1)" }
            }
      }
    }
  });
};

// ==============================
// ▼▼▼ ページ2：ねこ海賊団 ▼▼▼
// ==============================
// ==============================
// ■ データ追加
// ==============================
window.addRank = async function () {

  const member = document.getElementById("member").value;
  const rank = Number(document.getElementById("rank").value);
   const scoreInput = Number(document.getElementById("score2").value);
   const unit = document.getElementById("scoreUnit2").value;
   const score = toB(scoreInput, unit);
  const date = document.getElementById("date2").value;

  if (!member) return alert("メンバー名");
  if (!rank) return alert("順位");
  if (!date) return alert("日付");

  const id = `${date}_${member}`;

  await setDoc(doc(db, "ranks", id), {
    clan: "ねこ海賊団",
    member,
    rank,
    score: score || null, // ★追加
    date,
    time: Date.now()
  });
};
// ==============================
// ■ ランキングテーブル
// ==============================
function renderRankTable() {

  const table = {};

  rankList.forEach(d => {
    if (!table[d.date]) table[d.date] = {};
    table[d.date][d.member] = d.rank;
  });

  const dates = Object.keys(table).sort();

  const members = [...new Set(rankList.map(d => d.member))];

  let html = "<table><tr><th>日付</th>";

  members.forEach(m => html += `<th>${m}</th>`);
  html += "</tr>";

  dates.forEach(date => {
    html += `<tr><td>${date}</td>`;
    members.forEach(m => {
      html += `<td>${table[date]?.[m] ?? "-"}</td>`;
    });
    html += "</tr>";
  });

  html += "</table>";

  document.getElementById("tableWrap2").innerHTML = html;
}
// ==============================
// ■ 平均順位
// ==============================
window.calcAvgRank = function () {

  const start = document.getElementById("startDateRank")?.value;
  const end = document.getElementById("endDateRank")?.value;

  const toTime = (str) => {
    if (!str) return null;
    const [y, m, d] = str.split("-").map(Number);
    return new Date(y, m - 1, d).getTime();
  };

  const s = start ? toTime(start) : -Infinity;
  const e = end ? toTime(end) : Infinity;

  const OUT_RANK = 16;

  const allDates = [...new Set(rankList.map(d => d.date))]
    .filter(date => {
      const t = toTime(date);
      return t >= s && t <= e;
    })
    .sort((a, b) => toTime(a) - toTime(b));

  const baseMembers = [
    "えいせい","モジュ","にゃんこ船長","タケシEX","AK1104","Alutemaika",
    "大蒜マン","きゃりら","norix9815","かずまる55","すわろう","肉おじゃ",
    "なーさんdesu","なはやまか","アンロイ","ジャック99","マグノリア",
    "パルムぅ","もにゃか","トコブル","RIKKUN","ぽぽん390"
  ];

  const dynamicMembers = [...new Set(rankList.map(d => d.member))];
  const members = [...new Set([...baseMembers, ...dynamicMembers])];

  const dateMap = {};
  rankList.forEach(d => {
    if (!dateMap[d.date]) dateMap[d.date] = {};
    dateMap[d.date][d.member] = d.rank;
  });

  const result = [];

  members.forEach(member => {

    let total = 0;
    let count = 0;

    allDates.forEach(date => {
      const rank = dateMap[date]?.[member];
      total += (rank !== undefined) ? rank : OUT_RANK;
      count++;
    });

    if (count > 0) {
      result.push({
        member,
        avg: total / count
      });
    }
  });

  result.sort((a, b) => a.avg - b.avg);

  let html = "<table>";
  result.forEach(d => {
    html += `<tr><td>${d.member}</td><td>${d.avg.toFixed(2)}</td></tr>`;
  });
  html += "</table>";
  document.getElementById("avgRankBox").innerHTML = html;
};
// ==============================
// ■ 個人別最高スコア
// ==============================
function renderBestScore() {
  const bestMap = {};
  rankList.forEach(d => {
    if (!d.score) return;
    if (!bestMap[d.member] || bestMap[d.member].score < d.score) {
      bestMap[d.member] = {
        score: d.score,
        date: d.date
      };
    }
  });
  const result = Object.entries(bestMap)
    .map(([member, v]) => ({
      member,
      score: v.score,
      date: v.date
    }))
    .sort((a, b) => b.score - a.score);
  let html = "<table>";
  result.forEach(d => {
    html += `<tr>
      <td>${d.member}</td>
      <td>${formatScore(d.score)}</td>
      <td>${d.date}</td>
    </tr>`;
  });
  html += "</table>";
  document.getElementById("bestScoreBox").innerHTML = html;
}
// ==============================
// ▼ モーダル・UI
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
// ▼ 管理・UI
// ==============================
window.toggleManage = function () {
  const area = document.getElementById("manageArea");
  const btn = document.getElementById("manageBtn");

  const open = area.style.display === "block";

  area.style.display = open ? "none" : "block";
  btn.textContent = open ? "⚙️" : "閉じる";
};

window.toggleManage2 = function () {
  const area = document.getElementById("manageArea2");
  const btn = document.getElementById("manageBtn2");

  const open = area.style.display === "block";

  area.style.display = open ? "none" : "block";
  btn.textContent = open ? "⚙️" : "閉じる";
};

// グラフの折り畳み
window.toggleGraphBox = function () {
  const box = document.getElementById("graphBox");

  if (box.style.display === "none") {
    box.style.display = "block";
  } else {
    box.style.display = "none";
  }
};

window.closeGraphModal = function () {
  document.getElementById("graphModal").style.display = "none";
  document.body.style.overflow = "auto";
};
// 2ページ目期間指定用
window.applyAvgRank = function () {
  calcAvgRank();
};

// ==============================
// CSV
// ==============================
// 1ページ目
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
  let csv = "date,clan,score\r\n";
  // 日付一覧（昇順）
  const dates = [...new Set(dataList.map(d => d.date))]
    .sort((a, b) => new Date(a) - new Date(b));
  // 最初の日付
  const firstDate = dates[0];
  // 最初の日のスコアでクラン順決定
  const firstDayData = dataList
    .filter(d => d.date === firstDate)
    .sort((a, b) => b.score - a.score);
  const clanOrder = firstDayData.map(d => d.clan);
  // 出力（日付 → 固定クラン順）
  dates.forEach(date => {
    clanOrder.forEach(clan => {

      const row = dataList.find(d =>
        d.date === date && d.clan === clan
      );
      if (row) {
        csv += `${row.date},${row.clan},${row.score}\r\n`;
      } else {
        csv += `${date},${clan},-\r\n`;
      }
    });
  });

  const BOM = "\uFEFF";
  const blob = new Blob([BOM + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "scores.csv";
  a.click();

  URL.revokeObjectURL(url);
};

// 2ページ目
window.importCSV2 = async function () {
  const file = document.getElementById("csvFile2").files[0];
  if (!file) return alert("ファイル選んで");
  const text = await file.text();
  const rows = text.split("\n").slice(1);
  for (let row of rows) {
    if (!row.trim()) continue;
    let [date, member, rank] = row.split(",");
    if (!date || !member || isNaN(Number(rank))) continue;
    const fixedDate = date.trim().replace(/\//g, "-");
    await setDoc(doc(db, "ranks", `${fixedDate}_${member}`), {
      clan: "ねこ海賊団",
      member,
      rank: Number(rank),
      date: fixedDate,
      time: Date.now()
    });
  }
  alert("CSV取込完了");
};

window.exportCSV2 = function () {
  if (!rankList.length) return alert("データなし");
  let csv = "date,member,rank\r\n";
// 🔥 日付 → 順位順にソート
const sorted = [...rankList].sort((a, b) => {
  const dateDiff = new Date(a.date) - new Date(b.date);
  if (dateDiff !== 0) return dateDiff;
  return a.rank - b.rank; // ←順位が小さいほど上（1位→2位→…）
});

sorted.forEach(d => {
  csv += `${d.date},${d.member},${d.rank}\r\n`;
});

  const BOM = "\uFEFF";
  const blob = new Blob([BOM + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "ranks.csv";
  a.click();

  URL.revokeObjectURL(url);
};


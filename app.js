// ==============================
// ■ Firebase
// ==============================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, onSnapshot, doc, setDoc,query, orderBy,getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

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

let myDataList = [];
let myChart = null;

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
  if (value == null || isNaN(value)) return "-";
  return (value / 1000).toFixed(2) + "T";
}
// ==============================
// ■ 曜日巻子
// ==============================
function getWeekday(dateStr) {
  const days = ["日","月","火","水","木","金","土"];
  const d = new Date(dateStr);
  return days[d.getDay()];
}
// ==============================
// ■ クラン設定
// ==============================
const clanColors = {
  "魔導特務隊": "#4472C4",
  "最狂会": "#00B050",
  "ねねこねこ教": "#92D050",
  "IgnisFloris": "#FFCCFF",
  "ポケポケ会": "#E97132",
  "PopoWarren": "#A02B93",
  "たまねぎ班": "#8FAADC",
  "ねこ海賊団": "#00AEF0",
  "猫の旅": "#FF0000",
  "やまだ家": "#FFC000",
  "アチャ伝": "#FF66B2",
  "天狼の戦弓団": "#00E5FF",
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
  // 3ページ目全曜日
  document.getElementById("allDays").addEventListener("change", function () {
    const checked = this.checked;

    document.querySelectorAll("#graphBox3 input[type=checkbox]")
      .forEach(cb => {
        if (cb.id !== "allDays") {
          cb.checked = checked;
        }
      });
  });

});

// ==============================
// ■ ページ切替
// ==============================
window.showPage = function (page) {
  document.getElementById("page1").style.display = page === 1 ? "block" : "none";
  document.getElementById("page2").style.display = page === 2 ? "block" : "none";
  document.getElementById("page3").style.display = page === 3 ? "block" : "none";

  document.getElementById("tab1").classList.toggle("active", page === 1);
  document.getElementById("tab2").classList.toggle("active", page === 2);
  document.getElementById("tab3").classList.toggle("active", page === 3);
};

// ==============================
// データ追加（安全化）
// ==============================
window.add = async function () {
  const clan = document.getElementById("clan").value;
  const scoreInput = Number(document.getElementById("score").value);
  const score = scoreInput * 1000; // ★ここ追加
  const date = document.getElementById("date").value;

  if (!date) return alert("日付入れて");
  if (!scoreInput || scoreInput <= 0) return alert("スコア入れて");

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
// メンバー候補
// ==============================
function updateMemberList() {
  const select = document.getElementById("member");
  if (!select) return;

  const dynamicMembers = [...new Set(rankList.map(d => d.member))];

  const members = [
    ...baseMembers,
    ...dynamicMembers.filter(m => !baseMembers.includes(m))
  ];

  select.innerHTML = '<option value="">選択してください</option>' +
    members.map(m => `<option value="${m}">${m}</option>`).join("");
}
// 表示順の基準メンバー
const baseMembers = [
  "モジュ","えいせい","にゃんこ船長","大蒜マン","タケシEX",
  "AK1104","ねこ0618","すわろう","きゃりら","かずまる55","肉おじゃ","アンロイ","マグノリア","なーさんdesu","norix9815","パルムぅ",
  "righter","RIKKUN","Alutemaika","2yan子","ジャック99","あき3","UUUUUY",
  "もにゃか","トコブル","EV5009","なはやまか"
];
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
    updateMemberList();
});
// 3ページ目用
onSnapshot(
  query(collection(db, "myScores"), orderBy("date")),
  (snapshot) => {
    const newData = [];
    snapshot.forEach(d => newData.push(d.data()));
    myDataList = newData;
    renderTables3();
  }
);
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

  // 🔥 scoreが無いデータは完全スキップ
  if (d.score == null) return;

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
    if (d.score != null && !isNaN(d.score)) {
      table[d.date][d.clan] = Math.max(
        table[d.date][d.clan] ?? d.score,
        d.score
      );
    }
  });

const dates = Object.keys(table)
  .sort((a, b) => new Date(b) - new Date(a));

let html2 = "<table class='rank-table'><tr><th>日付</th>";
clans.forEach(c => html2 += `<th class="clan-col">${c}</th>`);
html2 += "</tr>";

  dates.forEach(date => {
    html2 += `<tr><td>${date}</td>`;
    clans.forEach(c => {
      const val = table[date]?.[c];
      html2 += `<td>${val ? formatScoreT(val) : "-"}</td>`;
    });
    html2 += "</tr>";
  });

  html2 += "</table>";

  document.getElementById("tableWrap").innerHTML = html2;
}
// ==============================
// 画像スクショ
// ==============================
window.saveWeekdayBestImage = async function () {
  const original = document.getElementById("weekdayCapture");

  if (!original) return alert("対象が見つかりません");

  const clone = original.cloneNode(true);

  clone.style.position = "fixed";
  clone.style.top = "0";
  clone.style.left = "-9999px";  // ← 横に逃がすのが重要
  clone.style.pointerEvents = "none"; // ← 操作不可
  clone.style.background = "#111";
  clone.style.color = "white";
  clone.style.padding = "10px";
  clone.style.width = "fit-content";

  document.body.appendChild(clone);

  await new Promise(r => requestAnimationFrame(r));

  // ★実測（これが最重要）
  const rect = clone.getBoundingClientRect();

  // ★「ちょいだけ保険」5〜15pxで十分
  const fullWidth = Math.ceil(rect.width + 10);

  const canvas = await html2canvas(clone, {
    scale: 3,
    backgroundColor: "#111",
    windowWidth: fullWidth
  });

  document.body.removeChild(clone);

  canvas.toBlob(async (blob) => {
    const file = new File([blob], "weekday_best.png", { type: "image/png" });

    if (navigator.share && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file] });
    } else {
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "weekday_best.png";
      link.click();
    }
  });
};
// 画像スクショ(3ページ目)
window.saveWeekdayBestImage3 = async function () {
  const original = document.getElementById("weekdayCapture3");

  if (!original) return alert("対象が見つかりません");

  const clone = original.cloneNode(true);

  clone.style.position = "fixed";
  clone.style.top = "0";
  clone.style.left = "-9999px";
  clone.style.pointerEvents = "none";
  clone.style.background = "#111";
  clone.style.color = "white";
  clone.style.padding = "10px";
  clone.style.width = "fit-content";

  document.body.appendChild(clone);

  await new Promise(r => requestAnimationFrame(r));

  const rect = clone.getBoundingClientRect();
  const fullWidth = Math.ceil(rect.width + 10);

  const canvas = await html2canvas(clone, {
    scale: 3,
    backgroundColor: "#111",
    windowWidth: fullWidth
  });

  document.body.removeChild(clone);

  canvas.toBlob(async (blob) => {
    const file = new File([blob], "my_score.png", { type: "image/png" });

    if (navigator.share && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file] });
    } else {
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "my_score.png";
      link.click();
    }
  });
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
      borderWidth: 3,
      spanGaps: true,
      pointRadius: 2
    }));

  } else {

    datasets = selectedClans.map(clan => ({
      label: clan,
      data: dates.map(date => {
        const v = scoreMap[date]?.[clan];
        return (v === 0 || v == null) ? null : v;
      }),
      borderColor: clanColors[clan],
      borderWidth: 3,
      spanGaps: true,
      pointRadius: 2
    }));
  }
// ==============================
// ▼ グラフ描画（Chart.js）
// ==============================
  document.getElementById("graphModal3").style.display = "none";
  document.getElementById("graphModal1").style.display = "block";
  document.body.style.overflow = "hidden";

  if (chart) chart.destroy();

  chart = new Chart(document.getElementById("modalChart1"), {
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
              ticks: {
                color: "#ffffff",
                font: { size: 12 },
                callback: (value) => {
                  if (value >= 1000) return (value / 1000) + "T";
                  return value;
                }
                  },
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

  const selected = document.getElementById("member").value;
  const newMember = document.getElementById("newMember").value.trim();

  const member = newMember || selected;

  const rankInput = document.getElementById("rank").value;
  const scoreInput = document.getElementById("score2").value;

  const rank = rankInput ? Number(rankInput) : null;
  const score = scoreInput ? Number(scoreInput) : null;

  const date = document.getElementById("date2").value; // ←追加
  if (!date) return alert("日付入れて");

  if (rank === null && score === null) {
    return alert("順位かスコアどちらか入力して");
  }

  const id = `${date}_${member}`;

  await setDoc(doc(db, "ranks", id), {
    clan: "ねこ海賊団",
    member,
    rank,
    score,
    date,
    time: Date.now()
  });

  // 入力リセット
  document.getElementById("newMember").value = "";
};
// ==============================
// ■ 画像保存
// ==============================
window.saveBestScoreImage = async function () {
  const original = document.getElementById("bestScoreCapture");

  if (!original) return alert("対象が見つかりません");

  const clone = original.cloneNode(true);

  clone.style.position = "fixed";
  clone.style.top = "0";
  clone.style.left = "-9999px";
  clone.style.pointerEvents = "none";
  clone.style.background = "#111";
  clone.style.color = "white";
  clone.style.padding = "10px";
  clone.style.width = "fit-content";

  document.body.appendChild(clone);

  await new Promise(r => requestAnimationFrame(r));

  const rect = clone.getBoundingClientRect();
  const fullWidth = Math.ceil(rect.width + 10);

  const canvas = await html2canvas(clone, {
    scale: 3,
    backgroundColor: "#111",
    windowWidth: fullWidth
  });

  document.body.removeChild(clone);

  canvas.toBlob(async (blob) => {
    const file = new File([blob], "best_score.png", { type: "image/png" });

    if (navigator.share && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file] });
    } else {
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "best_score.png";
      link.click();
    }
  });
};
// ==============================
// ■ ランキングテーブル
// ==============================
function renderRankTable() {

  const table = {};

  rankList.forEach(d => {
    if (d.rank == null) return;
    if (!table[d.date]) table[d.date] = {};
    table[d.date][d.member] = d.rank;
  });

  const dates = Object.keys(table)
    .sort((a, b) => new Date(b) - new Date(a));

  // 👇ここを修正
  const dynamicMembers = [...new Set(rankList.map(d => d.member))];

  const members = [
    ...baseMembers,
    ...dynamicMembers.filter(m => !baseMembers.includes(m))
  ];

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
  // 日付ごとの参加人数
  const dateCounts = {};
  rankList.forEach(d => {
    if (d.rank != null) {
      if (!dateCounts[d.date]) dateCounts[d.date] = 0;
      dateCounts[d.date]++;
    }
  });
  // 有効日だけ
  const allDates = Object.keys(dateCounts)
    .filter(date => {
      const t = toTime(date);
      return t >= s && t <= e && dateCounts[date] > 0;
    })
    .sort((a, b) => toTime(a) - toTime(b));
  // メンバー一覧
  const dynamicMembers = [...new Set(rankList.map(d => d.member))];
  const members = [...new Set([...baseMembers, ...dynamicMembers])];
  // 日付→メンバー→順位
  const dateMap = {};
  rankList.forEach(d => {
    if (!dateMap[d.date]) dateMap[d.date] = {};
    dateMap[d.date][d.member] = d.rank;
  });
  // 計算
  const result = [];
  members.forEach(member => {
    let total = 0;
    let count = 0;
    allDates.forEach(date => {
      const rank = dateMap[date]?.[member];
      if (rank != null) {
        total += rank;
      } else {
        total += OUT_RANK; // 未参加は16位
      }
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
  // 表示
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

  result.forEach((d, i) => {

    const rank = i + 1;

    // ★クラス付与
    let rankClass = "";
    if (rank === 1) rankClass = "rank1";
    else if (rank === 2) rankClass = "rank2";
    else if (rank === 3) rankClass = "rank3";

html += `<tr>
  <td class="${rankClass}">${rank}位</td>
  <td>${d.member}</td>
  <td>${formatScore(d.score)}</td>
  <td>${d.date}（${getWeekday(d.date)}）</td>
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

window.toggleManage3 = function () {
  const area = document.getElementById("manageArea3");
  const btn = document.getElementById("manageBtn3");

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

window.toggleGraphBox3 = function () {
  const box = document.getElementById("graphBox3");
  box.style.display = (box.style.display === "none") ? "block" : "none";
};

window.closeGraphModal1 = function () {
  document.getElementById("graphModal1").style.display = "none";
  document.body.style.overflow = "auto";
};

window.closeGraphModal3 = function () {
  document.getElementById("graphModal3").style.display = "none";
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
    if (!date || !clan) continue;

    const fixedDate = date.trim().replace(/\//g, "-");

    // 🔥ここが最重要
    let scoreB = null;

    if (score && score !== "-") {
      const scoreT = Number(score);
      if (!isNaN(scoreT)) {
        scoreB = scoreT * 1000;
      }
    }

    const docData = {
      date: fixedDate,
      clan,
      time: Date.now()
    };
    if (scoreB != null) {
      docData.score = scoreB;
    }
    await setDoc(doc(db, "scores", `${fixedDate}_${clan}`), docData);
  }

  alert("CSV取込完了");
};

window.exportCSV = function () {
  if (!dataList.length) return alert("データなし");

  let csv = "date,clan,score(T)\r\n";

  const dates = [...new Set(dataList.map(d => d.date))]
    .sort((a, b) => new Date(a) - new Date(b));

  const clanOrder = clans;

  dates.forEach(date => {
    clanOrder.forEach(clan => {

      const row = dataList.find(d =>
        d.date === date && d.clan === clan
      );

      if (row && row.score != null && row.score !== 0) {
        // 🔥 B → T
        const scoreT = (row.score / 1000).toFixed(2);
        csv += `${row.date},${row.clan},${scoreT}\r\n`;
      } else {
        csv += `${date},${clan},-\r\n`;
      }
    });
  });

  const BOM = "\uFEFF";
  const blob = new Blob([BOM + csv], { type: "text/csv;charset=utf-8;" });

  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "scores_T.csv";
  a.click();
};

// 2ページ目
window.importCSV2 = async function () {
  const file = document.getElementById("csvFile2").files[0];
  if (!file) return alert("ファイル選んで");
  const text = await file.text();
  const rows = text.split("\n").slice(1);
  for (let row of rows) {
    if (!row.trim()) continue;
    let [date, member, rank, score] = row.split(",");
    if (!date || !member || isNaN(Number(rank))) continue;
    const scoreValue = Number(score);
    const fixedDate = date.trim().replace(/\//g, "-");
    await setDoc(doc(db, "ranks", `${fixedDate}_${member}`), {
      clan: "ねこ海賊団",
      member,
      rank: Number(rank),
      score: isNaN(scoreValue) ? null : scoreValue, // ★追加
      date: fixedDate,
      time: Date.now()
});
  }
  alert("CSV取込完了");
};

window.exportCSV2 = function () {
  if (!rankList.length) return alert("データなし");
  let csv = "date,member,rank,score\r\n";
// 🔥 日付 → 順位順にソート
const sorted = [...rankList].sort((a, b) => {
  const dateDiff = new Date(a.date) - new Date(b.date);
  if (dateDiff !== 0) return dateDiff;
  return a.rank - b.rank; // ←順位が小さいほど上（1位→2位→…）
});

sorted.forEach(d => {
  csv += `${d.date},${d.member},${d.rank},${d.score ?? ""}\r\n`;
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
// 3ページ目
window.importCSV3 = async function () {
  const file = document.getElementById("csvFile3").files[0];
  if (!file) return alert("ファイル選んで");

  const text = await file.text();
  const rows = text.split("\n").slice(1);

  for (let row of rows) {
    if (!row.trim()) continue;

    let [date, score, score1] = row.split(",");

    if (!date) continue;

    const fixedDate = date.trim().replace(/\//g, "-");

    const s = score ? Number(score.trim()) : null;
    const s1 = score1 ? Number(score1.trim()) : null;

    await setDoc(doc(db, "myScores", fixedDate + "_" + Date.now()), {
      date: fixedDate,
      score: s,
      score1: s1,
      time: Date.now()
    });
  }

  alert("CSV取込完了");
};
window.exportCSV3 = function () {
  let csv = "date,score,score1\n";

  const sorted = [...myDataList]
    .sort((a, b) => new Date(a.date) - new Date(b.date)); // ←昇順

  sorted.forEach(d => {
    csv += `${d.date},${d.score ?? ""},${d.score1 ?? ""}\n`;
  });

  const blob = new Blob([csv], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "myScores.csv";
  a.click();
};
// ==============================
// 3ページ目用
// ==============================
window.add3 = async function () {
const scoreInput = Number(document.getElementById("score3").value);
const score1Input = Number(document.getElementById("score3_1").value);

const score = scoreInput;     // 2回合計
const score1 = score1Input || null; // 1回（任意）
  const date = document.getElementById("date3").value;

  if (!date) return alert("日付入れて");
  if (!scoreInput) return alert("スコア入れて");

  await setDoc(doc(db, "myScores", date), {
  score,
  score1, // ←追加
  date,
  time: Date.now()
});

  document.getElementById("score3").value = "";
};

function renderTables3() {

  const best2 = {}; // 2回合計
  const best1 = {}; // 1回

  const days = ["日","月","火","水","木","金","土"];

  myDataList.forEach(d => {
    const day = new Date(d.date).getDay();

    // 2回合計
    if (d.score != null) {
      best2[day] = Math.max(best2[day] ?? 0, d.score);
    }

    // 1回
    if (d.score1 != null) {
      best1[day] = Math.max(best1[day] ?? 0, d.score1);
    }
  });

  // ▼ 表作成
  let html = "<table><tr><th>曜日</th>";
  days.forEach(d => html += `<th>${d}</th>`);
  html += "</tr>";

  // 2回合計
  html += "<tr><td>2回合計</td>";
  for (let i = 0; i < 7; i++) {
     html += `<td>${formatScore(best2[i])}</td>`;  }
  html += "</tr>";

  // 1回
  html += "<tr><td>1回</td>";
  for (let i = 0; i < 7; i++) {
     html += `<td>${formatScore(best1[i])}</td>`;  }
  html += "</tr>";

  html += "</table>";

  document.getElementById("weekdayBest3").innerHTML = html;

  // ======================
  // ▼ 一覧（2回のみ）
  // ======================
  let html2 = "<table><tr><th>日付</th><th>スコア</th></tr>";

  const sorted = [...myDataList]
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  sorted.forEach(d => {
    html2 += `<tr>
      <td>${d.date}</td>
      <td>${formatScore(d.score)}</td>
  </tr>`;
  });

  html2 += "</table>";

  document.getElementById("tableWrap3").innerHTML = html2;
}
document.getElementById("score3_1").value = "";

window.drawChart3 = function () {

  const start = document.getElementById("startDate3").value;
  const end = document.getElementById("endDate3").value;

  // ★曜日取得（チェックされてるやつ）
  const selectedDays = [...document.querySelectorAll("#graphBox3 input[type=checkbox]:checked")]
    .map(cb => Number(cb.value));

  const filtered = myDataList.filter(d => {
    const t = new Date(d.date).getTime();
    const s = start ? new Date(start).getTime() : -Infinity;
    const e = end ? new Date(end).getTime() : Infinity;

    const day = new Date(d.date).getDay();

    return t >= s && t <= e &&
      (selectedDays.length === 0 || selectedDays.includes(day));
  });
  const sorted = [...filtered]
  .sort((a, b) => new Date(a.date) - new Date(b.date));
  
  if (!filtered.length) {
    alert("データなし");
    return;
  }

const dates = sorted.map(d => d.date);
const scores = sorted.map(d => d.score);
  
  if (myChart) myChart.destroy();

  document.getElementById("graphModal1").style.display = "none";
  document.getElementById("graphModal3").style.display = "block";
  document.body.style.overflow = "hidden";

  myChart = new Chart(document.getElementById("modalChart3"), {
    type: "line",
    data: {
      labels: dates,
      datasets: [{
        label: "自分",
        data: scores,
        borderColor: "#00E5FF",
        borderWidth: 3,
        pointRadius: 2,
        spanGaps: true
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          labels: { color: "#fff" }
        }
      },
      scales: {
        x: {
          ticks: { color: "#fff" }
        },
        y: {
  ticks: {
    color: "#fff",
    callback: (value) => {
      if (value >= 1000) return (value / 1000) + "T";
      return value;
    }
  }
}
      }
    }
  });
};



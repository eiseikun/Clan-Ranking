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
// 🔥 Firebase
// ==============================
const firebaseConfig = {
  apiKey: "AIzaSyCzbAnlP-XRNZe210GEYvEVFskayxjX9UI",
  authDomain: "clan-ranking-661e3.firebaseapp.com",
  projectId: "clan-ranking-661e3",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ==============================
// 📄 ページ切り替え
// ==============================
window.showPage = function(page){
  const p1 = document.getElementById("page1");
  const p2 = document.getElementById("page2");
  const t1 = document.getElementById("tab1");
  const t2 = document.getElementById("tab2");
  const title = document.getElementById("title");

  if(page===1){
    p1.style.display="block";
    p2.style.display="none";
    t1.classList.add("active");
    t2.classList.remove("active");
    title.textContent="📘 全体記録ページ";
  } else {
    p1.style.display="none";
    p2.style.display="block";
    t1.classList.remove("active");
    t2.classList.add("active");
    title.textContent="💎 クラン内記録ページ";
  }
};



// ==============================
// 🏁 クラン定義（12個）
// ==============================
const clans = [
  "クランA","クランB","クランC","クランD",
  "クランE","クランF","クランG","クランH",
  "クランI","クランJ","クランK","クランL"
];

const clanSelect = document.getElementById("clan");

clans.forEach(c=>{
  const opt = document.createElement("option");
  opt.value = c;
  opt.textContent = c;
  clanSelect.appendChild(opt);
});

// 初期日付
document.getElementById("date").valueAsDate = new Date();

// ==============================
// ➕ データ追加
// ==============================
window.add = async function(){

  const clan = document.getElementById("clan").value;
  const score = Number(document.getElementById("score").value);
  const date = document.getElementById("date").value;

  if(!score || !date) return;

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
// 📡 リアルタイム更新
// ==============================
let dataList = [];
onSnapshot(collection(db,"scores"), (snapshot)=>{

  dataList = [];

  snapshot.forEach(d=>{
    dataList.push(d.data());
  });

  // =========================
  // 🏆 曜日別最高
  // =========================
  const weekdayBest = {};
  const days = ["日","月","火","水","木","金","土"];

  dataList.forEach(d=>{
    const day = new Date(d.date).getDay();

    if(!weekdayBest[d.clan]) weekdayBest[d.clan] = {};

    if(!weekdayBest[d.clan][day]){
      weekdayBest[d.clan][day] = d.score;
    } else {
      weekdayBest[d.clan][day] =
        Math.max(weekdayBest[d.clan][day], d.score);
    }
  });

  let html = "<table><tr><th>クラン</th>";
  days.forEach(d=> html += `<th>${d}</th>`);
  html += "</tr>";

  clans.forEach(clan=>{
    html += `<tr><td>${clan}</td>`;
    for(let i=0;i<7;i++){
      const val = weekdayBest[clan]?.[i] || "-";
      html += `<td>${val}</td>`;
    }
    html += "</tr>";
  });

  html += "</table>";
  document.getElementById("weekdayBest").innerHTML = html;

  // =========================
  // 📊 日付 × クラン表
  // =========================
  const table = {};

  dataList.forEach(d=>{
    if(!table[d.date]) table[d.date] = {};
    if(!table[d.date][d.clan]){
  table[d.date][d.clan] = d.score;
} else {
  table[d.date][d.clan] = Math.max(table[d.date][d.clan], d.score);
}
  });

  const dates = Object.keys(table).sort();

  let html2 = "<table><tr><th>日付</th>";

  clans.forEach(c=>{
    html2 += `<th>${c}</th>`;
  });

  html2 += "</tr>";

  dates.forEach(date=>{
    html2 += `<tr><td>${date}</td>`;
    clans.forEach(c=>{
      const val = table[date][c] || "-";
      html2 += `<td>${val}</td>`;
    });
    html2 += "</tr>";
  });

  html2 += "</table>";

  document.getElementById("tableWrap").innerHTML = html2;

});
// クランチェックモーダル生成
const modalWrap = document.getElementById("modalCheckboxes");
clans.forEach(c=>{
  const label = document.createElement("label");
  const cb = document.createElement("input");
  cb.type = "checkbox";
  cb.value = c;
  label.appendChild(cb);
  label.appendChild(document.createTextNode(c));
  modalWrap.appendChild(label);
});

window.openModal = function(){
  document.getElementById("modal").style.display = "flex";
};

window.closeModal = function(){
  document.getElementById("modal").style.display = "none";
};
let selectedClans = [];

window.applySelection = function(){

  selectedClans = [...document.querySelectorAll("#modalCheckboxes input:checked")]
    .map(cb => cb.value);

  document.getElementById("selectedClansText").textContent =
    selectedClans.length ? selectedClans.join(", ") : "未選択";

  closeModal();
};

 // =========================
  // グラフ
  // =========================
let chart;
window.drawChart = function(){

  const start = document.getElementById("startDate").value;
  const end = document.getElementById("endDate").value;
  const mode = document.getElementById("graphMode").value;

  // ✅ モーダルの選択を使う
  const checked = selectedClans;

  if(checked.length === 0) return alert("クラン選択して");

  // フィルタ
  const filtered = dataList.filter(d=>{
    return (!start || d.date >= start) &&
           (!end || d.date <= end) &&
           checked.includes(d.clan);
  });

  const dates = [...new Set(filtered.map(d=>d.date))].sort();

  let datasets;

  // =========================
  // 🏆 順位モード
  // =========================
  if(mode === "rank"){

    const rankTable = {};

    dates.forEach(date=>{
      const dayData = dataList
        .filter(d=>d.date === date)
        .sort((a,b)=>b.score - a.score);

      rankTable[date] = {};
      dayData.forEach((d,i)=>{
        rankTable[date][d.clan] = i + 1;
      });
    });

    datasets = checked.map(clan=>{
      return {
        label: clan,
        data: dates.map(date=>{
          return rankTable[date]?.[clan] || null;
        }),
        spanGaps: true
      };
    });

  } else {

    // =========================
    // 📈 スコアモード
    // =========================
    datasets = checked.map(clan=>{
      return {
        label: clan,
        data: dates.map(date=>{
          const item = filtered.find(d=>d.date===date && d.clan===clan);
          return item ? item.score : null;
        }),
        spanGaps: true
      };
    });
  }

  if(chart) chart.destroy();

  chart = new Chart(document.getElementById("chart"), {
    type: "line",
    data: {
      labels: dates,
      datasets: datasets
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: "bottom" }
      },
      scales: {
        y: mode === "rank"
          ? {
              reverse: true,
              ticks: { stepSize: 1 }
            }
          : {
              beginAtZero: true
            }
      }
    }
  });
};
// ==============================
// 入出力
// ==============================
window.toggleManage = function(){
  const area = document.getElementById("manageArea");
  const btn = document.getElementById("manageBtn");

  const isOpen = area.style.display === "block";

  area.style.display = isOpen ? "none" : "block";
  btn.textContent = isOpen ? "⚙️" : "閉じる";
};
window.importCSV = async function(){

  const file = document.getElementById("csvFile").files[0];
  if(!file) return alert("ファイル選んで");

  const text = await file.text();

  const rows = text.split("\n").slice(1);

  for(let row of rows){

    if(!row.trim()) continue;

    row = row.replace("\r","");

    const [date, clan, score] = row.split(",");

    if(!date || !clan || isNaN(Number(score))) continue;

    const docId = `${date}_${clan}`;

    await setDoc(doc(db, "scores", docId), {
      date,
      clan,
      score: Number(score),
      time: Date.now()
    });
  }

  alert("CSV取込完了");
};

window.exportCSV = function(){

  if(dataList.length === 0) return alert("データなし");

  let csv = "date,clan,score\n";

  dataList.forEach(d=>{
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

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  onSnapshot,
  doc,
  setDoc 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ==============================
// 🔥 Firebase
// ==============================
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "clan-ranking-661e3.firebaseapp.com",
  projectId: "clan-ranking-661e3",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ==============================
// 📄 ページ切り替え
// ==============================
window.showPage = function(page){
  page1.style.display = page===1 ? "block" : "none";
  page2.style.display = page===2 ? "block" : "none";

  tab1.classList.toggle("active", page===1);
  tab2.classList.toggle("active", page===2);

  title.textContent = page===1
    ? "📘 全体記録ページ"
    : "💎 クラン内記録ページ";
};

// ==============================
// 🏁 クラン定義
// ==============================
const clans = [
  "クランA","クランB","クランC","クランD",
  "クランE","クランF","クランG","クランH",
  "クランI","クランJ","クランK","クランL"
];

// セレクト
clans.forEach(c=>{
  const opt = document.createElement("option");
  opt.value = c;
  opt.textContent = c;
  clan.appendChild(opt);
});

// 初期日付
date.valueAsDate = new Date();

// ==============================
// ➕ 追加（上書きOK）
// ==============================
window.add = async function(){

  const docId = `${date.value}_${clan.value}`;

  await setDoc(doc(db, "scores", docId), {
    clan: clan.value,
    score: Number(score.value),
    date: date.value,
    time: Date.now()
  });

  score.value = "";
};

// ==============================
// 📡 データ取得
// ==============================
let dataList = [];

onSnapshot(collection(db,"scores"), (snapshot)=>{

  dataList = snapshot.docs.map(d=>d.data());

  // =========================
  // 🏆 曜日別最高
  // =========================
  const weekdayBest = {};
  const days = ["日","月","火","水","木","金","土"];

  dataList.forEach(d=>{
    const day = new Date(d.date).getDay();

    weekdayBest[d.clan] ??= {};
    weekdayBest[d.clan][day] =
      Math.max(weekdayBest[d.clan][day]||0, d.score);
  });

  weekdayBestEl.innerHTML = `
    <table>
      <tr><th>クラン</th>${days.map(d=>`<th>${d}</th>`).join("")}</tr>
      ${clans.map(c=>`
        <tr>
          <td>${c}</td>
          ${[0,1,2,3,4,5,6].map(i=>`<td>${weekdayBest[c]?.[i]||"-"}</td>`).join("")}
        </tr>
      `).join("")}
    </table>
  `;

  // =========================
  // 📊 一覧（←ここ修正ポイント）
  // =========================
  const table = {};

  dataList.forEach(d=>{
    table[d.date] ??= {};
    table[d.date][d.clan] = d.score; // ←上書きOKに変更
  });

  const dates = Object.keys(table).sort();

  tableWrap.innerHTML = `
    <table>
      <tr><th>日付</th>${clans.map(c=>`<th>${c}</th>`).join("")}</tr>
      ${dates.map(date=>`
        <tr>
          <td>${date}</td>
          ${clans.map(c=>`<td>${table[date][c]||"-"}</td>`).join("")}
        </tr>
      `).join("")}
    </table>
  `;
});

// ==============================
// 🔽 クラン選択（ドロップダウン）
// ==============================
clans.forEach(c=>{
  const label = document.createElement("label");

  const cb = document.createElement("input");
  cb.type = "checkbox";
  cb.value = c;
  cb.onchange = updateClanButton;

  label.append(cb, document.createTextNode(c));
  clanDropdown.appendChild(label);
});

window.toggleClan = function(){
  clanDropdown.classList.toggle("show");
};

document.addEventListener("click", (e)=>{
  if(!document.querySelector(".dropdown").contains(e.target)){
    clanDropdown.classList.remove("show");
  }
});

function updateClanButton(){
  const n = document.querySelectorAll("#clanDropdown input:checked").length;
  document.querySelector(".dropdown button").textContent =
    n ? `クラン(${n})` : "クラン選択 ▼";
}

// ==============================
// 📈 グラフ
// ==============================
let chart;

window.drawChart = function(){

  const mode = graphMode.value;

  const checked = [...document.querySelectorAll("#clanDropdown input:checked")]
    .map(cb => cb.value);

  if(!checked.length) return alert("クラン選択して");

  const filtered = dataList.filter(d=>
    (!startDate.value || d.date >= startDate.value) &&
    (!endDate.value || d.date <= endDate.value) &&
    checked.includes(d.clan)
  );

  const dates = [...new Set(filtered.map(d=>d.date))].sort();

  let datasets;

  // 順位
  if(mode==="rank"){
    const rankTable = {};

    dates.forEach(date=>{
      const sorted = dataList
        .filter(d=>d.date===date)
        .sort((a,b)=>b.score-a.score);

      rankTable[date] = {};
      sorted.forEach((d,i)=> rankTable[date][d.clan]=i+1);
    });

    datasets = checked.map(c=>({
      label:c,
      data:dates.map(d=>rankTable[d]?.[c]||null),
      spanGaps:true
    }));

  } else {

    // スコア
    datasets = checked.map(c=>({
      label:c,
      data:dates.map(d=>{
        const item = filtered.find(x=>x.date===d && x.clan===c);
        return item?.score || null;
      }),
      spanGaps:true
    }));
  }

  chart?.destroy();

  chart = new Chart(chartCanvas, {
    type:"line",
    data:{labels:dates, datasets},
    options:{
      responsive:true,
      plugins:{legend:{position:"bottom"}},
      scales:{
        y: mode==="rank"
          ? {reverse:true, ticks:{stepSize:1}}
          : {beginAtZero:true}
      }
    }
  });
};

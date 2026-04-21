import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot
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

  await addDoc(collection(db,"scores"),{
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
onSnapshot(collection(db,"scores"), (snapshot)=>{

  const dataList = [];

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
    table[d.date][d.clan] = d.score;
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

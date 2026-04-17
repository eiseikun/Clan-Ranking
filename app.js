import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, collection, addDoc, onSnapshot, getDocs,
  query, where, updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Firebase
const app = initializeApp({
  apiKey: "AIzaSyCzbAnlP-XRNZe210GEYvEVFskayxjX9UI",
  authDomain: "clan-ranking-661e3.firebaseapp.com",
  projectId: "clan-ranking-661e3",
});

const db = getFirestore(app);
const colRef = collection(db, "items");

// テーブル初期化
function initTable() {
  const tbody = document.getElementById("tbody");
  tbody.innerHTML = "";

  for (let i = 1; i <= 15; i++) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${i}</td>
      <td><input class="name"></td>
      <td><input class="score"></td>
    `;
    tbody.appendChild(tr);
  }
}
initTable();

// 保存（上書き）
window.save = async () => {
  const date = document.getElementById("date").value;
  if (!date) return alert("日付を選択");

  const names = document.querySelectorAll(".name");
  const scores = document.querySelectorAll(".score");

  const data = [];

  for (let i = 0; i < 15; i++) {
    data.push({
      rank: i + 1,
      name: names[i].value,
      score: scores[i].value
    });
  }

  const q = query(colRef, where("date", "==", date));
  const snap = await getDocs(q);

  if (!snap.empty) {
    await updateDoc(snap.docs[0].ref, { data });
    alert("上書き更新");
  } else {
    await addDoc(colRef, { date, data });
    alert("新規登録");
  }
};

// 一覧＋クリック編集
onSnapshot(colRef, snap => {
  const list = document.getElementById("list");
  list.innerHTML = "";

  let all = [];
  snap.forEach(doc => all.push(doc.data()));
  all.sort((a,b)=>a.date.localeCompare(b.date));

  all.forEach(d => {
    const div = document.createElement("div");

    div.innerHTML = `
      <b>${d.date}</b><br>
      ${d.data.map(r => `${r.rank}位 ${r.name||"-"}`).join("<br>")}
    `;

    div.onclick = () => loadData(d);

    list.appendChild(div);
  });
});

// 編集ロード
function loadData(d) {
  document.getElementById("date").value = d.date;

  const names = document.querySelectorAll(".name");
  const scores = document.querySelectorAll(".score");

  for (let i = 0; i < 15; i++) {
    names[i].value = "";
    scores[i].value = "";
  }

  d.data.forEach(r => {
    const i = r.rank - 1;
    names[i].value = r.name || "";
    scores[i].value = r.score || "";
  });
}

// CSV取込（上書き）
window.importCSV = async () => {
  const file = document.getElementById("csvFile").files[0];
  const text = await file.text();

  const parsed = Papa.parse(text, { header: true });

  const grouped = {};

  parsed.data.forEach(r => {
    if (!r.date) return;

    if (!grouped[r.date]) grouped[r.date] = [];

    grouped[r.date].push({
      rank: Number(r.rank),
      name: r.name,
      score: r.score
    });
  });

  for (const date in grouped) {
    const q = query(colRef, where("date", "==", date));
    const snap = await getDocs(q);

    if (!snap.empty) {
      await updateDoc(snap.docs[0].ref, { data: grouped[date] });
    } else {
      await addDoc(colRef, { date, data: grouped[date] });
    }
  }

  alert("CSV取込完了");
};

// CSV出力
window.exportCSV = async () => {
  const snap = await getDocs(colRef);

  let rows = ["date,rank,name,score"];

  snap.forEach(doc => {
    const d = doc.data();
    d.data.forEach(r => {
      rows.push(`${d.date},${r.rank},${r.name},${r.score}`);
    });
  });

  const blob = new Blob([rows.join("\n")]);
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "ranking.csv";
  a.click();
};

// 平均順位
window.calcAverage = async () => {
  const start = document.getElementById("avgStart").value;
  const end = document.getElementById("avgEnd").value;

  const snap = await getDocs(colRef);
  const map = {};

  snap.forEach(doc => {
    const d = doc.data();

    if (d.date >= start && d.date <= end) {
      d.data.forEach(p => {
        if (!p.name) return;

        if (!map[p.name]) map[p.name] = { total:0,count:0 };

        map[p.name].total += Number(p.rank);
        map[p.name].count++;
      });
    }
  });

  const result = Object.entries(map)
    .map(([name,v])=>`${name}：${(v.total/v.count).toFixed(2)}位`)
    .join("<br>");

  document.getElementById("avgResult").innerHTML = result;
};

// グラフ
let chart;

window.showGraph = async () => {
  const start = document.getElementById("start").value;
  const end = document.getElementById("end").value;
  const players = document.getElementById("players").value.split(",");

  const snap = await getDocs(colRef);

  const labels = [];
  const datasets = {};

  players.forEach(p=>datasets[p.trim()]=[]);

  snap.forEach(doc=>{
    const d = doc.data();

    if(d.date>=start && d.date<=end){
      labels.push(d.date);

      players.forEach(p=>{
        const name = p.trim();
        const found = d.data.find(x=>x.name===name);
        datasets[name].push(found?found.rank:null);
      });
    }
  });

  if(chart) chart.destroy();

  chart = new Chart(document.getElementById("chart"),{
    type:"line",
    data:{
      labels,
      datasets: Object.keys(datasets).map(name=>({
        label:name,
        data:datasets[name]
      }))
    },
    options:{
      scales:{ y:{ reverse:true } }
    }
  });
};

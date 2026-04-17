import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, collection, addDoc, getDocs, deleteDoc, doc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const app = initializeApp({
  apiKey: "AIzaSyCzbAnlP-XRNZe210GEYvEVFskayxjX9UI",
  authDomain: "clan-ranking-661e3.firebaseapp.com",
  projectId: "clan-ranking-661e3",
});

const db = getFirestore(app);
const colRef = collection(db, "items");

// ================= テーブル =================
function createTable(data = []) {
  const table = document.getElementById("editTable");
  table.innerHTML = "";

  for (let i = 1; i <= 15; i++) {
    const row = table.insertRow();
    row.innerHTML = `
      <td>${i}位</td>
      <td><input id="name${i}" value="${data[i-1]?.name || ""}"></td>
    `;
  }
}
createTable();

// ================= CSV一括取込 =================
window.importCSV = () => {
  const file = document.getElementById("csvFile").files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = async e => {
    const rows = e.target.result.split("\n");

    const map = {};

    rows.forEach(r => {
      if (!r.trim()) return;

      const [date, rank, name] = r.split(",");

      if (!map[date]) map[date] = [];

      map[date].push({
        rank: Number(rank),
        name: name.trim()
      });
    });

    // 日付ごと保存
    for (const date in map) {
      const snap = await getDocs(colRef);

      for (const d of snap.docs) {
        if (d.data().date === date) {
          await deleteDoc(doc(db, "items", d.id));
        }
      }

      await addDoc(colRef, {
        date,
        data: map[date].sort((a,b)=>a.rank-b.rank)
      });
    }

    alert("一括登録完了");
    loadList();
  };

  reader.readAsText(file);
};

// ================= 保存 =================
window.saveData = async () => {
  const date = document.getElementById("date").value;
  if (!date) return;

  const data = [];

  for (let i = 1; i <= 15; i++) {
    data.push({
      rank: i,
      name: document.getElementById(`name${i}`).value
    });
  }

  const snap = await getDocs(colRef);

  for (const d of snap.docs) {
    if (d.data().date === date) {
      await deleteDoc(doc(db, "items", d.id));
    }
  }

  await addDoc(colRef, { date, data });

  loadList();
};

// ================= 一覧 =================
async function loadList() {
  const list = document.getElementById("list");
  list.innerHTML = "";

  const snap = await getDocs(colRef);

  snap.forEach(d => {
    const data = d.data();

    const div = document.createElement("div");
    div.className = "card";

    div.innerHTML = `
      <h3>${data.date}</h3>
      ${data.data.map(p => `${p.rank}位 ${p.name}`).join("<br>")}
      <button class="deleteBtn">削除</button>
    `;

    div.onclick = e => {
      if (e.target.classList.contains("deleteBtn")) return;
      document.getElementById("date").value = data.date;
      createTable(data.data);
    };

    div.querySelector(".deleteBtn").onclick = async e => {
      e.stopPropagation();
      await deleteDoc(doc(db, "items", d.id));
      loadList();
    };

    list.appendChild(div);
  });
}
loadList();

// ================= 平均 =================
window.calcAverage = async () => {
  const start = document.getElementById("avgStart").value;
  const end = document.getElementById("avgEnd").value;

  const snap = await getDocs(colRef);
  const map = {};

  snap.forEach(d => {
    const data = d.data();

    if (data.date >= start && data.date <= end) {
      data.data.forEach(p => {
        if (!map[p.name]) map[p.name] = { total:0,count:0 };
        map[p.name].total += p.rank;
        map[p.name].count++;
      });
    }
  });

  const result = Object.entries(map)
    .map(([n,v])=>`${n}：${(v.total/v.count).toFixed(2)}位`)
    .join("<br>");

  document.getElementById("avgResult").innerHTML = result;
};

// ================= グラフ =================
let chart;

window.showGraph = async () => {
  const start = document.getElementById("start").value;
  const end = document.getElementById("end").value;
  const players = document.getElementById("players").value.split(",");

  const snap = await getDocs(colRef);

  const labels = [];
  const dataMap = {};

  players.forEach(p=>dataMap[p.trim()]=[]);

  snap.forEach(d=>{
    const data = d.data();

    if (data.date >= start && data.date <= end) {
      labels.push(data.date);

      players.forEach(p=>{
        const name = p.trim();
        const found = data.data.find(x=>x.name===name);
        dataMap[name].push(found ? found.rank : null);
      });
    }
  });

  if(chart) chart.destroy();

  chart = new Chart(document.getElementById("chart"),{
    type:"line",
    data:{
      labels,
      datasets:Object.keys(dataMap).map(n=>({
        label:n,
        data:dataMap[n]
      }))
    },
    options:{
      scales:{
        y:{ reverse:true }
      }
    }
  });
};

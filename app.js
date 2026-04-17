import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, collection, addDoc, getDocs, deleteDoc, doc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ================= Firebase =================
const app = initializeApp({
  apiKey: "AIzaSyCzbAnlP-XRNZe210GEYvEVFskayxjX9UI",
  authDomain: "clan-ranking-661e3.firebaseapp.com",
  projectId: "clan-ranking-661e3",
});

const db = getFirestore(app);
const colRef = collection(db, "items");

// ================= 編集テーブル =================
function createTable(data = []) {
  const table = document.getElementById("editTable");
  table.innerHTML = "";

  for (let i = 1; i <= 15; i++) {
    const row = table.insertRow();

    row.innerHTML = `
      <td>${i}位</td>
      <td><input id="name${i}" value="${data[i-1]?.name || ""}"></td>
      <td><input id="score${i}" value="${data[i-1]?.score || ""}"></td>
    `;
  }
}

createTable();

// ================= CSV取込 =================
window.loadCSV = () => {
  const file = document.getElementById("csvFile").files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = e => {
    const rows = e.target.result.split("\n");
    const data = [];

    rows.forEach(row => {
      const cols = row.split(",");
      if (cols.length >= 3) {
        data.push({
          rank: cols[0].replace("位",""),
          name: cols[1],
          score: cols[2]
        });
      }
    });

    createTable(data);
  };

  reader.readAsText(file);
};

// ================= 保存（上書き） =================
window.saveData = async () => {
  const date = document.getElementById("date").value;
  if (!date) return alert("日付必須");

  const data = [];

  for (let i = 1; i <= 15; i++) {
    data.push({
      rank: i,
      name: document.getElementById(`name${i}`).value,
      score: document.getElementById(`score${i}`).value
    });
  }

  const snap = await getDocs(colRef);

  for (const d of snap.docs) {
    if (d.data().date === date) {
      await deleteDoc(doc(db, "items", d.id));
    }
  }

  await addDoc(colRef, { date, data });

  alert("保存完了");
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

    // 編集
    div.onclick = (e) => {
      if (e.target.classList.contains("deleteBtn")) return;

      document.getElementById("date").value = data.date;
      createTable(data.data);
    };

    // 削除
    div.querySelector(".deleteBtn").onclick = async (e) => {
      e.stopPropagation();

      if (!confirm("削除しますか？")) return;

      await deleteDoc(doc(db, "items", d.id));
      loadList();
    };

    list.appendChild(div);
  });
}

// ================= 平均順位 =================
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

        if (!map[p.name]) {
          map[p.name] = { total: 0, count: 0 };
        }

        map[p.name].total += Number(p.rank);
        map[p.name].count++;
      });
    }
  });

  const result = Object.entries(map)
    .map(([name, v]) => ({
      name,
      avg: (v.total / v.count).toFixed(2)
    }))
    .sort((a,b)=>a.avg - b.avg);

  document.getElementById("avgResult").innerHTML =
    result.map(r => `${r.name}：${r.avg}位`).join("<br>");
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

  players.forEach(p => dataMap[p.trim()] = []);

  snap.forEach(doc => {
    const d = doc.data();

    if (d.date >= start && d.date <= end) {
      labels.push(d.date);

      players.forEach(p => {
        const name = p.trim();
        const found = d.data.find(x => x.name === name);
        dataMap[name].push(found ? found.rank : null);
      });
    }
  });

  drawChart(labels, dataMap);
};

function drawChart(labels, dataMap) {
  const ctx = document.getElementById("chart");

  if (chart) chart.destroy();

  const datasets = Object.keys(dataMap).map(name => ({
    label: name,
    data: dataMap[name]
  }));

  chart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets
    },
    options: {
      scales: {
        y: {
          reverse: true,
          ticks: { stepSize: 1 }
        }
      }
    }
  });
}

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, collection, addDoc, onSnapshot, getDocs,
  query, where, updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ================= Firebase =================
const app = initializeApp({
  apiKey: "AIzaSyCzbAnlP-XRNZe210GEYvEVFskayxjX9UI",
  authDomain: "clan-ranking-661e3.firebaseapp.com",
  projectId: "clan-ranking-661e3",
});

const db = getFirestore(app);
const colRef = collection(db, "items");

// ================= 初期テーブル =================
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

// ================= 保存（上書き対応） =================
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

  // 🔍 同じ日付を検索
  const q = query(colRef, where("date", "==", date));
  const snap = await getDocs(q);

  if (!snap.empty) {
    // 👉 上書き
    const docRef = snap.docs[0].ref;
    await updateDoc(docRef, { data });
    alert("上書き更新しました！");
  } else {
    // 👉 新規
    await addDoc(colRef, { date, data });
    alert("新規保存しました！");
  }
};

// ================= 一覧表示 =================
onSnapshot(colRef, snap => {
  const list = document.getElementById("list");
  list.innerHTML = "";

  let all = [];

  snap.forEach(doc => {
    all.push(doc.data());
  });

  all.sort((a,b)=>a.date.localeCompare(b.date));

  all.forEach(d => {
    const div = document.createElement("div");
    div.className = "card";

    div.innerHTML = `
      <h3>${d.date}</h3>
      ${d.data.map(r =>
        `${r.rank}位 ${r.name || "-"} ${r.score || "-"}<br>`
      ).join("")}
    `;

    list.appendChild(div);
  });
});

// ================= CSV取込（上書き対応） =================
window.importCSV = async () => {
  const file = document.getElementById("csvFile").files[0];
  if (!file) return alert("ファイル選択");

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
      // 👉 上書き
      const docRef = snap.docs[0].ref;
      await updateDoc(docRef, { data: grouped[date] });
    } else {
      // 👉 新規
      await addDoc(colRef, {
        date,
        data: grouped[date]
      });
    }
  }

  alert("CSV取込完了（上書き対応）");
};

// ================= CSV出力 =================
window.exportCSV = async () => {
  const snap = await getDocs(colRef);

  let rows = ["date,rank,name,score"];

  snap.forEach(doc => {
    const d = doc.data();

    d.data.forEach(r => {
      rows.push(`${d.date},${r.rank},${r.name},${r.score}`);
    });
  });

  const blob = new Blob([rows.join("\n")], { type: "text/csv" });
  const a = document.createElement("a");

  a.href = URL.createObjectURL(blob);
  a.download = "ranking.csv";
  a.click();
};

// ================= グラフ =================
let chart = null;

window.showGraph = async () => {
  const start = document.getElementById("start").value;
  const end = document.getElementById("end").value;
  const player = document.getElementById("player").value;

  const snap = await getDocs(colRef);

  const labels = [];
  const data = [];

  snap.forEach(doc => {
    const d = doc.data();

    if (d.date >= start && d.date <= end) {
      const found = d.data.find(p => p.name.includes(player));
      if (found) {
        labels.push(d.date);
        data.push(found.rank);
      }
    }
  });

  drawChart(labels, data);
};

function drawChart(labels, data) {
  const ctx = document.getElementById("chart");

  if (chart) chart.destroy();

  chart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: "順位",
        data
      }]
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

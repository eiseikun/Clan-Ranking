import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, collection, addDoc, getDocs,
  deleteDoc, doc, setDoc, getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const app = initializeApp({
  apiKey: "AIzaSyCzbAnlP-XRNZe210GEYvEVFskayxjX9UI",
  authDomain: "clan-ranking-661e3.firebaseapp.com",
  projectId: "clan-ranking-661e3",
});

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const colRef = collection(db, "items");

// =====================
// テーブル生成
// =====================
function createTable(data = []) {
  const div = document.getElementById("table");
  div.innerHTML = "";

  for (let i = 1; i <= 15; i++) {
    div.innerHTML += `
      ${i}位 <input id="name${i}" value="${data[i-1]?.name || ""}"><br>
    `;
  }
}

// =====================
// 保存（同日上書き）
// =====================
window.saveData = async () => {
  const date = document.getElementById("date").value;
  if (!date) return alert("日付必須");

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
  loadPlayers();
};

// =====================
// 一覧表示（最新左）
// =====================
async function loadList() {
  const list = document.getElementById("list");
  list.innerHTML = "";

  const snap = await getDocs(colRef);

  const docs = snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => b.date.localeCompare(a.date));

  docs.forEach(d => {
    const div = document.createElement("div");
    div.className = "cardItem";

    div.innerHTML = `
      <b>${d.date}</b><br>
      ${d.data.map(p => `${p.rank}位 ${p.name}`).join("<br>")}
      <button class="del">削除</button>
    `;

    div.onclick = e => {
      if (e.target.classList.contains("del")) return;
      document.getElementById("date").value = d.date;
      createTable(d.data);
    };

    div.querySelector(".del").onclick = async e => {
      e.stopPropagation();
      await deleteDoc(doc(db, "items", d.id));
      loadList();
      loadPlayers();
    };

    list.appendChild(div);
  });
}

// =====================
// プレイヤー一覧 + Firebase保存
// =====================
async function loadPlayers() {
  const snap = await getDocs(colRef);

  const set = new Set();
  snap.forEach(d => {
    d.data().data.forEach(p => set.add(p.name));
  });

  const settingSnap = await getDoc(settingRef);
  const saved = settingSnap.exists() ? settingSnap.data().players : [];

  const list = document.getElementById("playerList");
  list.innerHTML = "";

  [...set].sort().forEach(name => {
    const checked = saved.length === 0 || saved.includes(name);

    const label = document.createElement("label");
    label.innerHTML = `
      <input type="checkbox" value="${name}" ${checked ? "checked" : ""}>
      ${name}
    `;

    label.querySelector("input").onchange = saveSelection;

    list.appendChild(label);
  });
}

// =====================
// Firebaseに保存
// =====================
async function saveSelection() {
  const selected = [...document.querySelectorAll("#playerList input:checked")]
    .map(cb => cb.value);

  await setDoc(settingRef, { players: selected });

  drawChart();
}

// =====================
// グラフ
// =====================
let chart;

async function drawChart() {
  const snap = await getDocs(colRef);

  const docs = snap.docs
    .map(d => d.data())
    .sort((a, b) => a.date.localeCompare(b.date));

  const settingSnap = await getDoc(settingRef);
  const selected = settingSnap.exists() ? settingSnap.data().players : [];

  const labels = docs.map(d => d.date);

  const datasets = selected.map(name => {
    return {
      label: name,
      data: docs.map(d => {
        const p = d.data.find(x => x.name === name);
        return p ? p.rank : null;
      }),
      fill: false
    };
  });

  if (chart) chart.destroy();

  chart = new Chart(document.getElementById("chart"), {
    type: "line",
    data: { labels, datasets },
    options: {
      scales: {
        y: { reverse: true, ticks: { stepSize: 1 } }
      }
    }
  });
}

// =====================
// CSV取込
// =====================
document.getElementById("csvFile").onchange = e => {
  const file = e.target.files[0];
  const reader = new FileReader();

  reader.onload = ev => {
    const rows = ev.target.result.split("\n");

    const data = rows.map((r, i) => ({
      rank: i + 1,
      name: r.split(",")[0]
    }));

    createTable(data);
  };

  reader.readAsText(file);
};

// =====================
// モーダル
// =====================
const modal = document.getElementById("modal");

document.getElementById("memberBtn").onclick = () => {
  modal.classList.remove("hidden");
};

document.getElementById("closeModal").onclick = () => {
  modal.classList.add("hidden");
};

document.getElementById("selectAll").onchange = e => {
  document.querySelectorAll("#playerList input").forEach(cb => {
    cb.checked = e.target.checked;
  });
  saveSelection();
};

// =====================
createTable();
loadList();
loadPlayers();

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, collection, addDoc, getDocs,
  deleteDoc, doc, setDoc, getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// 🔴 自分のに変更
const app = initializeApp({
  apiKey: "AIzaSyCzbAnlP-XRNZe210GEYvEVFskayxjX9UI",
  authDomain: "clan-ranking-661e3.firebaseapp.com",
  projectId: "clan-ranking-661e3",
});

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const colRef = collection(db, "items");
const settingRef = doc(db, "settings", "global");

// =================
// テーブル
// =================
function createTable(data = []) {
  const div = document.getElementById("table");
  div.innerHTML = "";

  for (let i = 1; i <= 15; i++) {
    div.innerHTML += `
      ${i}位 <input id="name${i}" value="${data[i-1]?.name || ""}"><br>
    `;
  }
}

// =================
// 保存（上書き）
// =================
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

  init();
};

// =================
// 一覧
// =================
async function loadList() {
  const list = document.getElementById("list");
  list.innerHTML = "";

  const snap = await getDocs(colRef);

  const docs = snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => b.date.localeCompare(a.date));

  docs.forEach(d => {
    const div = document.createElement("div");
    div.className = "card";

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
      init();
    };

    list.appendChild(div);
  });
}

// =================
// プレイヤー
// =================
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
    label.innerHTML = `<input type="checkbox" value="${name}" ${checked ? "checked":""}> ${name}`;

    label.querySelector("input").onchange = saveSelection;

    list.appendChild(label);
  });
}

// =================
// Firebase保存
// =================
async function saveSelection() {
  const selected = [...document.querySelectorAll("#playerList input:checked")]
    .map(cb => cb.value);

  await setDoc(settingRef, { players: selected });

  drawChart();
}

// =================
// グラフ
// =================
let chart;

async function drawChart() {
  const snap = await getDocs(colRef);

  const docs = snap.docs
    .map(d => d.data())
    .sort((a,b)=>a.date.localeCompare(b.date));

  const settingSnap = await getDoc(settingRef);
  const selected = settingSnap.exists() ? settingSnap.data().players : [];

  const labels = docs.map(d => d.date);

  const datasets = selected.map(name => ({
    label:name,
    data: docs.map(d=>{
      const p = d.data.find(x=>x.name===name);
      return p ? p.rank : null;
    }),
    fill:false
  }));

  if(chart) chart.destroy();

  chart = new Chart(document.getElementById("chart"), {
    type:"line",
    data:{labels,datasets},
    options:{
      scales:{ y:{reverse:true,ticks:{stepSize:1}} }
    }
  });
}

// =================
// CSV（複数日対応）
// =================
document.getElementById("csvFile").onchange = async e => {
  const file = e.target.files[0];
  const text = await file.text();

  const rows = text.split("\n").slice(1); // ヘッダー除外

  const map = {};

  rows.forEach(r=>{
    const [date, rank, name] = r.split(",");
    if(!date) return;

    if(!map[date]) map[date] = [];

    map[date].push({
      rank:Number(rank),
      name:name
    });
  });

  const snap = await getDocs(colRef);

  for(const date in map){
    for (const d of snap.docs) {
      if (d.data().date === date) {
        await deleteDoc(doc(db, "items", d.id));
      }
    }
    await addDoc(colRef, { date, data: map[date] });
  }

  alert("CSV取込完了");
  init();
};

// =================
// モーダル
// =================
const modal = document.getElementById("modal");

document.getElementById("memberBtn").onclick = () => {
  modal.classList.remove("hidden");
};

document.getElementById("closeModal").onclick = () => {
  modal.classList.add("hidden");
};

document.getElementById("selectAll").onchange = e => {
  document.querySelectorAll("#playerList input").forEach(cb=>{
    cb.checked = e.target.checked;
  });
  saveSelection();
};

// =================
// 初期化（重要）
// =================
async function init(){
  createTable();
  await loadList();
  await loadPlayers();
  await drawChart();
}

init();

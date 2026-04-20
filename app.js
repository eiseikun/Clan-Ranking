import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, collection, getDocs, setDoc, deleteDoc, doc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCzbAnlP-XRNZe210GEYvEVFskayxjX9UI",
  authDomain: "clan-ranking-661e3.firebaseapp.com",
  projectId: "clan-ranking-661e3",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const colRef = collection(db, "items");

// ===== 共通 =====
const toSlash = d => d.replaceAll("-", "/");
const toHyphen = d => d.replaceAll("/", "-");

const parseDate = d => {
  const [y,m,day] = d.split("/");
  return new Date(y, m-1, day);
};

// ===== テーブル =====
function createTable(data = []) {
  const el = document.getElementById("table");
  el.innerHTML = "";

  for (let i = 1; i <= 15; i++) {
    el.innerHTML += `
      <div>${i}位 <input id="name${i}" value="${data[i-1]?.name || ""}"></div>
    `;
  }
}

// ===== 保存 =====
window.saveData = async () => {
  try {
    let date = document.getElementById("date").value;
    if (!date) return alert("日付必須");

    date = toSlash(date);

    const data = [];
    for (let i = 1; i <= 15; i++) {
      data.push({
        rank: i,
        name: document.getElementById(`name${i}`).value.trim()
      });
    }

    await setDoc(doc(db, "items", date), { date, data });

    alert("保存しました");
    init();
  } catch (e) {
    console.error(e);
    alert("保存失敗");
  }
};

// ===== 一覧 =====
async function loadList() {
  const list = document.getElementById("list");
  list.innerHTML = "";

  try {
    const snap = await getDocs(colRef);

    const docs = snap.docs
      .map(d => d.data())
      .filter(d => d?.date)
      .sort((a, b) => parseDate(b.date) - parseDate(a.date));

    docs.forEach(d => {
      const div = document.createElement("div");
      div.className = "card";

      const rows = (d.data || [])
        .filter(p => p?.name)
        .map(p => `${p.rank}位 ${p.name}`)
        .join("<br>");

      div.innerHTML = `
        <b>${d.date}</b><br>
        ${rows}
        <br><button class="del">削除</button>
      `;

      // クリックで編集
      div.onclick = e => {
        if (e.target.classList.contains("del")) return;

        document.getElementById("date").value = toHyphen(d.date);
        createTable(d.data || []);
      };

      // 削除
      div.querySelector(".del").onclick = async e => {
        e.stopPropagation();
        if (!confirm("削除しますか？")) return;

        await deleteDoc(doc(db, "items", d.date));
        init();
      };

      list.appendChild(div);
    });

  } catch (e) {
    console.error("取得失敗", e);
  }
}

// ===== 平均 =====
window.calcAvg = async () => {
  const s = document.getElementById("startAvg").value;
  const e = document.getElementById("endAvg").value;
  if (!s || !e) return alert("期間指定");

  const snap = await getDocs(colRef);

  const data = snap.docs.map(d => d.data())
    .filter(d =>
      parseDate(d.date) >= parseDate(toSlash(s)) &&
      parseDate(d.date) <= parseDate(toSlash(e))
    );

  const map = {};

  data.forEach(d => {
    (d.data || []).forEach(p => {
      if (!p.name) return;
      if (!map[p.name]) map[p.name] = { total: 0, count: 0 };

      map[p.name].total += p.rank;
      map[p.name].count++;
    });
  });

  const result = Object.entries(map)
    .map(([name, v]) => ({ name, avg: v.total / v.count }))
    .sort((a, b) => a.avg - b.avg);

  document.getElementById("avgResult").innerHTML = `
    <table class="avg-table">
      <tr><th>順位</th><th>名前</th><th>平均</th></tr>
      ${result.map((r, i) => `
        <tr><td>${i+1}</td><td>${r.name}</td><td>${r.avg.toFixed(2)}</td></tr>
      `).join("")}
    </table>
  `;
};

// ===== CSV =====
window.importCSV = async () => {
  const file = document.getElementById("csvFile").files[0];
  if (!file) return alert("選択して");

  const text = await file.text();
  const rows = text.split(/\r?\n/).slice(1);

  const map = {};

  rows.forEach(r => {
    if (!r.trim()) return;

    const [date, rank, name] = r.split(",");
    if (!date || !rank) return;

    const d = toSlash(date.trim());
    const rnk = Number(rank);
    if (isNaN(rnk)) return;

    if (!map[d]) map[d] = [];

    map[d].push({ rank: rnk, name: name?.trim() || "" });
  });

  for (const d in map) {
    map[d].sort((a,b)=>a.rank-b.rank);
    await setDoc(doc(db,"items",d), { date:d, data:map[d] });
  }

  alert("CSV取込完了");
  init();
};

// ===== グラフ =====
let chart;

window.drawChart = async () => {
  const s = document.getElementById("start").value;
  const e = document.getElementById("end").value;
  if (!s || !e) return alert("期間指定");

  const snap = await getDocs(colRef);

  const all = snap.docs.map(d => d.data());

  const filtered = all
    .filter(d =>
      parseDate(d.date) >= parseDate(toSlash(s)) &&
      parseDate(d.date) <= parseDate(toSlash(e))
    )
    .sort((a,b)=>parseDate(a.date)-parseDate(b.date));

  const names = [...document.querySelectorAll("#playerList input:checked")]
    .map(cb=>cb.value);

  const labels = filtered.map(d=>d.date);

  const datasets = names.map((name,i)=>({
    label:name,
    data:filtered.map(d=>{
      const f=(d.data||[]).find(p=>p.name===name);
      return f?f.rank:null;
    }),
    borderColor:`hsl(${i*60},70%,50%)`,
    spanGaps:true
  }));

  if(chart) chart.destroy();

  chart = new Chart(document.getElementById("chart"),{
    type:"line",
    data:{labels,datasets},
    options:{scales:{y:{reverse:true}}}
  });
};

// ===== メンバー =====
async function buildMembers(){
  const snap = await getDocs(colRef);
  const set = new Set();

  snap.docs.forEach(d=>{
    (d.data().data||[]).forEach(p=>{
      if(p.name) set.add(p.name);
    });
  });

  const list = document.getElementById("playerList");
  list.innerHTML="";

  [...set].sort().forEach(n=>{
    list.innerHTML += `<label><input type="checkbox" value="${n}" checked> ${n}</label><br>`;
  });
}

// モーダル
document.getElementById("memberBtn").onclick = async ()=>{
  await buildMembers();
  document.getElementById("modal").classList.remove("hidden");
};

document.getElementById("closeModal").onclick = ()=>{
  document.getElementById("modal").classList.add("hidden");
};

document.getElementById("selectAll").onchange = e=>{
  document.querySelectorAll("#playerList input")
    .forEach(cb=>cb.checked = e.target.checked);
};

// 初期化
async function init(){
  await loadList();
}

createTable();
init();

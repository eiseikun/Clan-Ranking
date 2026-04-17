// ================= Firebase =================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, collection, addDoc, getDocs,
  deleteDoc, doc, setDoc, getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCzbAnlP-XRNZe210GEYvEVFskayxjX9UI",
  authDomain: "clan-ranking-661e3.firebaseapp.com",
  projectId: "clan-ranking-661e3",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const colRef = collection(db,"items");
const settingRef = doc(db,"settings","global");

// ================= テーブル作成 =================
// 手入力欄（1位〜15位）
function createTable(data=null){
  const div=document.getElementById("table");
  div.innerHTML="";

  for(let i=1;i<=15;i++){
    div.innerHTML+=`${i}位 <input id="name${i}" value="${data?.[i-1]?.name||""}"><br>`;
  }
}

// ================= 保存 =================
window.saveData=async()=>{
  const date=document.getElementById("date").value;
  if(!date) return alert("日付必須");

  const data=[];
  for(let i=1;i<=15;i++){
    data.push({rank:i,name:document.getElementById(`name${i}`).value});
  }

  // 同日削除（上書き）
  const snap=await getDocs(colRef);
  for(const d of snap.docs){
    if(d.data().date===date){
      await deleteDoc(doc(db,"items",d.id));
    }
  }

  await addDoc(colRef,{date,data});
  alert("登録完了");
  init();
};

// ================= 一覧 =================
async function loadList(){
  const list=document.getElementById("list");
  list.innerHTML="";

  const snap=await getDocs(colRef);
  const docs=snap.docs.map(d=>({id:d.id,...d.data()}))
    .sort((a,b)=>b.date.localeCompare(a.date));

  docs.forEach(d=>{
    const div=document.createElement("div");
    div.className="card";

    div.innerHTML=`
      <b>${d.date}</b><br>
      ${d.data.map(p=>`${p.rank}位 ${p.name}`).join("<br>")}
      <button class="del">削除</button>
    `;

    // クリックで編集
    div.onclick=e=>{
      if(e.target.classList.contains("del")) return;
      document.getElementById("date").value=d.date;
      createTable(d.data);
    };

    // 削除
    div.querySelector(".del").onclick=async e=>{
      e.stopPropagation();
      await deleteDoc(doc(db,"items",d.id));
      init();
    };

    list.appendChild(div);
  });
}

// ================= 平均順位 =================
window.calcAvg = async ()=>{
  const start = document.getElementById("startAvg").value;
  const end = document.getElementById("endAvg").value;

  if (!start || !end) return alert("期間指定してください");

  const snap = await getDocs(colRef);
  const docs = snap.docs.map(d=>d.data())
    .filter(d=>d.date >= start && d.date <= end);

  const map = {};

  docs.forEach(d => {
    d.data.forEach(p => {
      if (!p.name) return;

      if (!map[p.name]) {
        map[p.name] = { total: 0, count: 0 };
      }

      map[p.name].total += p.rank;
      map[p.name].count++;
    });
  });

  let result = Object.entries(map).map(([name, v]) => ({
    name,
    avg: v.total / v.count
  }));

  // 昇順（強い順）
  result.sort((a, b) => a.avg - b.avg);

  renderAverage(result);
};

function renderAverage(list) {
  const el = document.getElementById("avgResult");

  let html = `
    <table class="avg-table">
      <tr>
        <th>順位</th>
        <th>名前</th>
        <th>平均順位</th>
      </tr>
  `;

  list.forEach((d, i) => {
    html += `
      <tr>
        <td>${i + 1}</td>
        <td>${d.name}</td>
        <td>${d.avg.toFixed(2)}</td>
      </tr>
    `;
  });

  html += "</table>";
  el.innerHTML = html;
}

// ================= CSV取込 =================
window.importCSV = async ()=>{
  const file = document.getElementById("csvFile").files[0];
  if(!file) return alert("ファイル選択して");

  const text = await file.text();
  const rows = text.split("\n").slice(1);

  const map = {};

  rows.forEach(r=>{
    const [date,rank,name]=r.split(",");
    if(!date) return;

    if(!map[date]) map[date]=[];
    map[date].push({rank:Number(rank),name});
  });

  const snap=await getDocs(colRef);

  for(const date in map){
    for(const d of snap.docs){
      if(d.data().date===date){
        await deleteDoc(doc(db,"items",d.id));
      }
    }
    await addDoc(colRef,{date,data:map[date]});
  }

  alert("CSV完了");
  init();
};

// ================= ファイル名表示 =================
window.addEventListener("DOMContentLoaded", () => {
  document.getElementById("csvFile").addEventListener("change", e => {
    const file = e.target.files[0];
    document.getElementById("fileName").textContent = file ? file.name : "未選択";
  });
});

// ================= モーダル =================
document.getElementById("memberBtn").onclick=()=>{
  document.getElementById("modal").classList.remove("hidden");
};

document.getElementById("closeModal").onclick=()=>{
  document.getElementById("modal").classList.add("hidden");
};

document.getElementById("selectAll").onchange=e=>{
  document.querySelectorAll("#playerList input")
    .forEach(cb=>cb.checked=e.target.checked);
};

// ================= 初期化 =================
async function init(){
  await loadList();
}

createTable();
init();

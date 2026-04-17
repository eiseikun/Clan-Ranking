// ================= Firebase =================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, collection, addDoc, getDocs,
  deleteDoc, doc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCzbAnlP-XRNZe210GEYvEVFskayxjX9UI",
  authDomain: "clan-ranking-661e3.firebaseapp.com",
  projectId: "clan-ranking-661e3",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const colRef = collection(db,"items");

// ================= テーブル作成 =================
function createTable(data=null){
  const div=document.getElementById("table");
  div.innerHTML="";

  for(let i=1;i<=15;i++){
    div.innerHTML+=`
      <div>
        ${i}位
        <input id="name${i}" value="${data?.[i-1]?.name||""}">
      </div>
    `;
  }
}

// ================= 保存 =================
window.saveData = async ()=>{
  const date=document.getElementById("date").value;
  if(!date) return alert("日付必須");

  const data=[];
  for(let i=1;i<=15;i++){
    const name=document.getElementById(`name${i}`).value.trim();
    data.push({rank:i,name});
  }

  const snap=await getDocs(colRef);

  // 同日削除
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

  const docs=snap.docs
    .map(d=>({id:d.id,...d.data()}))
    .sort((a,b)=>b.date.localeCompare(a.date));

  docs.forEach(d=>{
    const div=document.createElement("div");
    div.className="card";

    div.innerHTML=`
      <b>${d.date}</b><br>
      ${d.data
        .filter(p=>p.name)
        .map(p=>`${p.rank}位 ${p.name}`)
        .join("<br>")}
      <br>
      <button class="del">削除</button>
    `;

    // 編集
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
  const start=document.getElementById("startAvg").value;
  const end=document.getElementById("endAvg").value;

  if(!start || !end) return alert("期間指定してください");

  const snap=await getDocs(colRef);

  const docs=snap.docs
    .map(d=>d.data())
    .filter(d=>d.date>=start && d.date<=end);

  const map={};

  docs.forEach(d=>{
    d.data.forEach(p=>{
      if(!p.name) return;

      if(!map[p.name]){
        map[p.name]={total:0,count:0};
      }

      map[p.name].total+=p.rank;
      map[p.name].count++;
    });
  });

  const result=Object.entries(map)
    .map(([name,v])=>({
      name,
      avg:v.total/v.count
    }))
    .sort((a,b)=>a.avg-b.avg);

  renderAverage(result);
};

function renderAverage(list){
  const el=document.getElementById("avgResult");

  let html=`
    <table class="avg-table">
      <tr>
        <th>順位</th>
        <th>名前</th>
        <th>平均順位</th>
      </tr>
  `;

  list.forEach((d,i)=>{
    html+=`
      <tr>
        <td>${i+1}</td>
        <td>${d.name}</td>
        <td>${d.avg.toFixed(2)}</td>
      </tr>
    `;
  });

  html+="</table>";
  el.innerHTML=html;
}

// ================= CSV取込（入力欄に反映） =================
window.importCSV = async ()=>{
  const file=document.getElementById("csvFile").files[0];
  if(!file) return alert("ファイル選択して");

  const text=await file.text();
  const rows=text.split("\n").slice(1);

  const data=[];

  rows.forEach(r=>{
    const [date,rank,name]=r.split(",");
    if(!rank) return;

    data.push({
      rank:Number(rank),
      name:name?.trim()||""
    });
  });

  // 順位順
  data.sort((a,b)=>a.rank-b.rank);

  // 入力欄に反映
  createTable(data);

  // 日付セット
  const firstDate=rows[0]?.split(",")[0];
  if(firstDate){
    document.getElementById("date").value=firstDate;
  }

  alert("CSVを入力欄に反映しました");
};

// ================= ファイル名表示 =================
window.addEventListener("DOMContentLoaded",()=>{
  const fileInput=document.getElementById("csvFile");
  if(!fileInput) return;

  fileInput.addEventListener("change",e=>{
    const file=e.target.files[0];
    document.getElementById("fileName").textContent=
      file ? file.name : "未選択";
  });
});

// ================= Enterで次入力 =================
document.addEventListener("keydown",e=>{
  if(e.key==="Enter"){
    const id=e.target.id;

    if(id?.startsWith("name")){
      const num=Number(id.replace("name",""));
      const next=document.getElementById(`name${num+1}`);

      if(next){
        next.focus();
        e.preventDefault();
      }
    }
  }
});

// ================= 初期化 =================
async function init(){
  await loadList();
}

createTable();
init();
// ================= グラフ用データ取得 =================
async function getAllData(){
  const snap = await getDocs(colRef);

  return snap.docs
    .map(d => d.data())
    .sort((a,b)=>a.date.localeCompare(b.date));
}

// ================= メンバー一覧生成 =================
async function buildMemberList(){
  const data = await getAllData();
  const set = new Set();

  data.forEach(d=>{
    d.data.forEach(p=>{
      if(p.name) set.add(p.name);
    });
  });

  const list = document.getElementById("playerList");
  list.innerHTML = "";

  [...set].sort().forEach(name=>{
    list.innerHTML += `
      <label>
        <input type="checkbox" value="${name}" checked>
        ${name}
      </label><br>
    `;
  });
}

// ================= グラフ描画 =================
let chart;

window.drawChart = async ()=>{
  const start = document.getElementById("start").value;
  const end = document.getElementById("end").value;

  if(!start || !end) return alert("期間指定して");

  const allData = await getAllData();

  // 期間フィルタ
  const filtered = allData.filter(d=>d.date>=start && d.date<=end);

  // 選択メンバー
  const selected = [...document.querySelectorAll("#playerList input:checked")]
    .map(cb=>cb.value);

  if(selected.length === 0) return alert("メンバー選択して");

  // 日付ラベル
  const labels = filtered.map(d=>d.date);

  // データセット作成
  const datasets = selected.map((name,idx)=>{
    const color = `hsl(${idx*60},70%,50%)`;

    return {
      label: name,
      data: filtered.map(d=>{
        const found = d.data.find(p=>p.name===name);
        return found ? found.rank : null;
      }),
      borderColor: color,
      backgroundColor: color,
      spanGaps: true,
      tension: 0.2
    };
  });

  // 既存グラフ削除
  if(chart) chart.destroy();

  chart = new Chart(document.getElementById("chart"), {
    type: "line",
    data: {
      labels,
      datasets
    },
    options: {
      responsive: true,
      plugins:{
        legend:{
          position:"bottom"
        }
      },
      scales:{
        y:{
          reverse: true, // ★順位は上が1位
          ticks:{
            stepSize:1
          }
        }
      }
    }
  });
};

// ================= モーダル開いた時にリスト生成 =================
document.getElementById("memberBtn").onclick = async ()=>{
  await buildMemberList();
  document.getElementById("modal").classList.remove("hidden");
};

// ================= モーダル閉じる =================
document.getElementById("closeModal").onclick = ()=>{
  document.getElementById("modal").classList.add("hidden");
};

// ================= 全員チェック =================
document.getElementById("selectAll").onchange = e=>{
  document.querySelectorAll("#playerList input")
    .forEach(cb=>cb.checked = e.target.checked);
};

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

// ================= 日付統一（重要） =================
function normalizeDate(date){
  return date.replace(/\//g,"-"); // 2026/04/15 → 2026-04-15
}

// ================= テーブル =================
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
  const date=normalizeDate(document.getElementById("date").value);
  if(!date) return alert("日付必須");

  const data=[];
  for(let i=1;i<=15;i++){
    const name=document.getElementById(`name${i}`).value.trim();
    data.push({rank:i,name});
  }

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

  const docs=snap.docs
    .map(d=>({id:d.id,...d.data()}))
    .sort((a,b)=>b.date.localeCompare(a.date));

  docs.forEach(d=>{
    if(!d.data) return; // ★防御

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

    div.onclick=e=>{
      if(e.target.classList.contains("del")) return;
      document.getElementById("date").value=d.date;
      createTable(d.data);
    };

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
  const start=normalizeDate(document.getElementById("startAvg").value);
  const end=normalizeDate(document.getElementById("endAvg").value);

  if(!start || !end) return alert("期間指定してください");

  const snap=await getDocs(colRef);

  const docs=snap.docs
    .map(d=>d.data())
    .filter(d=>d?.data && d.date>=start && d.date<=end);

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

  if(list.length===0){
    el.innerHTML="データなし";
    return;
  }

  let html=`<table class="avg-table">`;

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

// ================= CSV =================
window.importCSV = async ()=>{
  const file=document.getElementById("csvFile").files[0];
  if(!file) return alert("ファイル選択して");

  const text=await file.text();
  const rows=text.split("\n").slice(1);

  const map={};

  rows.forEach(r=>{
    const [date,rank,name]=r.split(",");
    if(!date || !rank) return;

    const d=normalizeDate(date);

    if(!map[d]) map[d]=[];

    map[d].push({
      rank:Number(rank),
      name:name?.trim()||""
    });
  });

  const snap=await getDocs(colRef);

  for(const date in map){
    for(const d of snap.docs){
      if(d.data().date===date){
        await deleteDoc(doc(db,"items",d.id));
      }
    }

    map[date].sort((a,b)=>a.rank-b.rank);

    await addDoc(colRef,{date,data:map[date]});
  }

  alert("CSV一括登録完了");
  init();
};

// ================= グラフ =================
let chart;

window.drawChart = async ()=>{
  const start=normalizeDate(document.getElementById("start").value);
  const end=normalizeDate(document.getElementById("end").value);

  if(!start || !end) return alert("期間指定して");

  const snap=await getDocs(colRef);

  const allData=snap.docs
    .map(d=>d.data())
    .filter(d=>d?.data)
    .sort((a,b)=>a.date.localeCompare(b.date));

  const filtered=allData.filter(d=>d.date>=start && d.date<=end);

  const selected=[...document.querySelectorAll("#playerList input:checked")]
    .map(cb=>cb.value);

  if(selected.length===0) return alert("メンバー選択して");

  const labels=filtered.map(d=>d.date);

  const datasets=selected.map((name,idx)=>{
    const color=`hsl(${idx*60},70%,50%)`;

    return {
      label:name,
      data:filtered.map(d=>{
        const f=d.data.find(p=>p.name===name);
        return f ? f.rank : null;
      }),
      borderColor:color,
      spanGaps:true
    };
  });

  if(chart) chart.destroy();

  chart=new Chart(document.getElementById("chart"),{
    type:"line",
    data:{labels,datasets},
    options:{
      scales:{
        y:{reverse:true}
      }
    }
  });
};

// ================= モーダル =================
window.addEventListener("DOMContentLoaded",()=>{
  document.getElementById("memberBtn").onclick = async ()=>{
    const snap=await getDocs(colRef);
    const set=new Set();

    snap.docs.forEach(d=>{
      d.data().data?.forEach(p=>{
        if(p.name) set.add(p.name);
      });
    });

    const list=document.getElementById("playerList");
    list.innerHTML="";

    [...set].forEach(name=>{
      list.innerHTML+=`
        <label>
          <input type="checkbox" value="${name}" checked>
          ${name}
        </label><br>
      `;
    });

    document.getElementById("modal").classList.remove("hidden");
  };

  document.getElementById("closeModal").onclick = ()=>{
    document.getElementById("modal").classList.add("hidden");
  };

  document.getElementById("selectAll").onchange = e=>{
    document.querySelectorAll("#playerList input")
      .forEach(cb=>cb.checked=e.target.checked);
  };
});

// ================= 初期化 =================
async function init(){
  await loadList();
}

createTable();
init();

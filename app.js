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

// =================
// テーブル
// =================
function createTable(data=null){
  const div=document.getElementById("table");
  if(!data && div.innerHTML!=="") return;

  div.innerHTML="";
  for(let i=1;i<=15;i++){
    div.innerHTML+=`${i}位 <input id="name${i}" value="${data?.[i-1]?.name||""}"><br>`;
  }
}

// =================
// 保存
// =================
window.saveData=async()=>{
  const date=document.getElementById("date").value;
  if(!date) return alert("日付必須");

  const data=[];
  for(let i=1;i<=15;i++){
    data.push({rank:i,name:document.getElementById(`name${i}`).value});
  }

  const snap=await getDocs(colRef);
  for(const d of snap.docs){
    if(d.data().date===date){
      await deleteDoc(doc(db,"items",d.id));
    }
  }

  await addDoc(colRef,{date,data});
  init();
};

// =================
// 一覧
// =================
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

// =================
// 平均順位
// =================
window.calcAvg=async()=>{
  const s=document.getElementById("startAvg").value;
  const e=document.getElementById("endAvg").value;

  const snap=await getDocs(colRef);

  const map={};

  snap.forEach(d=>{
    const data=d.data();
    if(data.date<s||data.date>e) return;

    data.data.forEach(p=>{
      if(!map[p.name]) map[p.name]=[];
      map[p.name].push(p.rank);
    });
  });

  const result=Object.entries(map)
    .map(([name,arr])=>{
      const avg=(arr.reduce((a,b)=>a+b)/arr.length).toFixed(2);
      return `${name}：${avg}位`;
    });

  document.getElementById("avgResult").innerHTML=result.join("<br>");
};

// =================
// プレイヤー
// =================
async function loadPlayers(){
  const snap=await getDocs(colRef);
  const set=new Set();

  snap.forEach(d=>d.data().data.forEach(p=>set.add(p.name)));

  const saved=(await getDoc(settingRef)).data()?.players||[];

  const list=document.getElementById("playerList");
  list.innerHTML="";

  [...set].sort().forEach(name=>{
    const checked=saved.length===0||saved.includes(name);

    const label=document.createElement("label");
    label.innerHTML=`<input type="checkbox" value="${name}" ${checked?"checked":""}>${name}`;

    label.querySelector("input").onchange=saveSelection;
    list.appendChild(label);
  });
}

// =================
// 保存（共有）
// =================
async function saveSelection(){
  const selected=[...document.querySelectorAll("#playerList input:checked")]
    .map(cb=>cb.value);

  await setDoc(settingRef,{players:selected});
}

// =================
// グラフ
// =================
let chart;

window.drawChart=async()=>{
  const s=document.getElementById("start").value;
  const e=document.getElementById("end").value;

  const snap=await getDocs(colRef);
  const docs=snap.docs.map(d=>d.data())
    .filter(d=>d.date>=s&&d.date<=e)
    .sort((a,b)=>a.date.localeCompare(b.date));

  const selected=(await getDoc(settingRef)).data()?.players||[];

  const labels=docs.map(d=>d.date);

  const datasets=selected.map(name=>({
    label:name,
    data:docs.map(d=>{
      const p=d.data.find(x=>x.name===name);
      return p?p.rank:null;
    }),
    fill:false
  }));

  if(chart) chart.destroy();

  chart=new Chart(document.getElementById("chart"),{
    type:"line",
    data:{labels,datasets},
    options:{scales:{y:{reverse:true}}}
  });
};

// =================
// CSV複数日
// =================
document.getElementById("csvFile").onchange=async e=>{
  const text=await e.target.files[0].text();
  const rows=text.split("\n").slice(1);

  const map={};

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

// =================
// モーダル
// =================
document.getElementById("memberBtn").onclick=()=>{
  document.getElementById("modal").classList.remove("hidden");
};

document.getElementById("closeModal").onclick=()=>{
  document.getElementById("modal").classList.add("hidden");
};

document.getElementById("selectAll").onchange=e=>{
  document.querySelectorAll("#playerList input")
    .forEach(cb=>cb.checked=e.target.checked);
  saveSelection();
};

// =================
// 初期化
// =================
async function init(){
  await loadList();
  await loadPlayers();
}

createTable();
init();

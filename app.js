// =========================
// 🔥 Firebase 初期化
// =========================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCzbAnlP-XRNZe210GEYvEVFskayxjX9UI",
  authDomain: "clan-ranking-661e3.firebaseapp.com",
  projectId: "clan-ranking-661e3",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const colRef = collection(db, "items");


// =========================
// 🗓 日付処理
// =========================
const toDate = d => {
  if (!d) return new Date(0);
  const parts = d.replaceAll("-", "/").split("/");
  return new Date(parts[0], parts[1] - 1, parts[2]);
};

const toSlash = d => d.replaceAll("-", "/");


// =========================
// 🧱 テーブル生成
// =========================
function createTable(data = null) {
  const div = document.getElementById("table");
  div.innerHTML = "";

  for (let i = 1; i <= 15; i++) {
    div.innerHTML += `
      <div>
        ${i}位
        <input id="name${i}" value="${data?.[i - 1]?.name || ""}">
      </div>
    `;
  }
}


// =========================
// 💾 保存処理
// =========================
window.saveData = async () => {
  let date = document.getElementById("date").value;
  if (!date) return alert("日付必須");

  date = toSlash(date);

  const data = [];
  for (let i = 1; i <= 15; i++) {
    const name = document.getElementById(`name${i}`).value.trim();
    data.push({ rank: i, name });
  }

  try {
    const snap = await getDocs(colRef);

    // 同日削除（上書き）
    for (const d of snap.docs) {
      if (d.data().date === date) {
        await deleteDoc(doc(db, "items", d.id));
      }
    }

    await addDoc(colRef, { date, data });

    alert("登録完了");
    init();

  } catch (e) {
    console.error("保存エラー", e);
    alert("保存失敗：" + e.message);
  }
};


// =========================
// 📋 一覧表示
// =========================
async function loadList() {
  const list = document.getElementById("list");
  list.innerHTML = "";

  const snap = await getDocs(colRef);

  console.log("Firestore raw:", snap.docs.map(d => d.data()));

  const docs = snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => toDate(b.date) - toDate(a.date));

  docs.forEach(d => {
    const div = document.createElement("div");
    div.className = "card";

    div.innerHTML = `
      <b>${d.date}</b><br>
      ${d.data
        .filter(p => p.name)
        .map(p => `${p.rank}位 ${p.name}`)
        .join("<br>")}
      <br>
      <button class="del">削除</button>
    `;

    div.onclick = e => {
      if (e.target.classList.contains("del")) return;

      document.getElementById("date").value = d.date.replaceAll("/", "-");
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


// =========================
// 📥 CSV（読み込み専用）
// =========================
window.importCSV = async () => {
  const file = document.getElementById("csvFile").files[0];
  if (!file) return alert("ファイル選択して");

  const text = await file.text();
  const rows = text.split(/\r?\n/).slice(1);

  const map = {};

  rows.forEach(r => {
    if (!r.trim()) return;

    const [date, rank, name] = r.split(",");
    if (!date || !rank) return;

    const fixedDate = toSlash(date.trim());

    if (!map[fixedDate]) map[fixedDate] = [];

    map[fixedDate].push({
      rank: Number(rank),
      name: name?.trim() || ""
    });
  });

  const dates = Object.keys(map);

  // 🔥 1日だけならフォームに反映
  if (dates.length === 1) {
    const date = dates[0];

    document.getElementById("date").value = date.replaceAll("/", "-");

    map[date].sort((a, b) => a.rank - b.rank);
    createTable(map[date]);

    alert("CSV読み込み完了（登録ボタンで保存）");
  }

  // 🔥 複数日は確認して順番に表示（保存しない）
  else {
    alert(`${dates.length}日分読み込みました（保存はされていません）`);

    // 最初の日だけ表示
    const first = dates.sort()[0];
    document.getElementById("date").value = first.replaceAll("/", "-");

    map[first].sort((a, b) => a.rank - b.rank);
    createTable(map[first]);
  }
};


// =========================
// 📈 その他そのまま
// =========================
let chart;

async function getAllData() {
  const snap = await getDocs(colRef);
  return snap.docs.map(d => d.data());
}


// =========================
// 🚀 初期化
// =========================
async function init() {
  await loadList();
}

createTable();
init();

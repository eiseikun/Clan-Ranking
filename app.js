// ================= Firebase =================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  setDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCzbAnlP-XRNZe210GEYvEVFskayxjX9UI",
  authDomain: "clan-ranking-661e3.firebaseapp.com",
  projectId: "clan-ranking-661e3",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const colRef = collection(db, "items");

// ================= 日付 =================
const toDate = d => {
  if (!d) return new Date(0);
  const p = d.replaceAll("-", "/").split("/");
  return new Date(p[0], p[1] - 1, p[2]);
};

const toSlash = d => d.replaceAll("-", "/");

// ================= テーブル =================
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

// ================= 共通：同日削除 =================
async function deleteSameDate(date) {
  const snap = await getDocs(colRef);
  for (const d of snap.docs) {
    if (d.data().date === date) {
      await deleteDoc(doc(db, "items", d.id));
    }
  }
}

// ================= 手動保存 =================
async function saveData() {
  let date = document.getElementById("date").value;
  if (!date) return alert("日付必須");

  date = toSlash(date);

  const data = [];
  for (let i = 1; i <= 15; i++) {
    const name = document.getElementById(`name${i}`).value.trim();
    data.push({ rank: i, name });
  }

  // 🔥 上書き（これだけ）
  await setDoc(doc(db, "items", date), {
    date,
    data
  });

  alert("登録完了");
  init();
}

// ================= CSV =================
async function importCSV() {
  const file = document.getElementById("csvFile").files[0];
  if (!file) return alert("CSVファイルを選択してください");

  const text = await file.text();
  const rows = text.split(/\r?\n/).slice(1);

  const map = {};

  rows.forEach(r => {
    const [date, rank, name] = r.split(",");
    if (!date || !rank) return;

    const fixedDate = toSlash(date.trim());

    if (!map[fixedDate]) map[fixedDate] = [];

    map[fixedDate].push({
      rank: Number(rank),
      name: name?.trim() || ""
    });
  });

  for (const date in map) {
  map[date].sort((a, b) => a.rank - b.rank);

  // 🔥 上書き保存（これが最重要）
  await setDoc(doc(db, "items", date), {
    date,
    data: map[date]
  });
}

  alert("CSV取込完了");

  // ファイル選択リセット（地味に重要）
  document.getElementById("csvFile").value = "";

  init();
}

// ================= 一覧 =================
async function loadList() {
  const list = document.getElementById("list");
  list.innerHTML = "";

  const snap = await getDocs(colRef);

  const allDocs = snap.docs.map(d => ({
    id: d.id,
    ...d.data()
  }));

  // 念のため1日1件
  const map = new Map();
  allDocs.forEach(d => map.set(d.date, d));

  const docs = [...map.values()]
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

    // 編集（クリックで反映）
    div.onclick = e => {
      if (e.target.classList.contains("del")) return;

      document.getElementById("date").value = d.date.replaceAll("/", "-");
      createTable(d.data);

      // スクロール（UX改善）
      window.scrollTo({ top: 0, behavior: "smooth" });
    };

    // 削除
    div.querySelector(".del").onclick = async e => {
      e.stopPropagation();
      await deleteDoc(doc(db, "items", d.id));
      init();
    };

    list.appendChild(div);
  });
}

// ================= 初期化 =================
async function init() {
  await loadList();
}

// ================= 起動 =================
document.addEventListener("DOMContentLoaded", () => {
  createTable();
  init();

  document.getElementById("saveBtn").onclick = saveData;
  document.getElementById("csvBtn").onclick = importCSV;
});

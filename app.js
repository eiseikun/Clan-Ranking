// ================= Firebase =================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
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

// ================= 日付処理 =================
const toDate = d => {
  if (!d) return new Date(0);
  const parts = d.replaceAll("-", "/").split("/");
  return new Date(parts[0], parts[1] - 1, parts[2]);
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

// ================= 保存（唯一の保存ルート） =================
async function saveData() {
  let date = document.getElementById("date").value;
  if (!date) return alert("日付必須");

  date = toSlash(date);

  const data = [];
  for (let i = 1; i <= 15; i++) {
    const name = document.getElementById(`name${i}`).value.trim();
    data.push({ rank: i, name });
  }

  // 🔥 日付IDで上書き（重複絶対防止）
  await setDoc(doc(db, "items", date), {
    date,
    data
  });

  alert("登録完了");

  // 入力リセット
  document.getElementById("date").value = "";
  createTable();

  init();

  // 一覧へスクロール
  document.getElementById("list").scrollIntoView({ behavior: "smooth" });
}

// ================= CSV（読み込み専用） =================
async function importCSV() {
  const file = document.getElementById("csvFile").files[0];
  if (!file) return alert("CSVファイルを選択してください");

  const text = await file.text();
  const rows = text.split(/\r?\n/).slice(1);

  const map = {};

rows.forEach(r => {
  if (!r.trim()) return;

  const [date, rank, name] = r.split(",");
  if (!date || !rank) return;

  const fixedDate = toSlash(date.trim().replace(/\./g, "/"));

  const rNum = Number(rank);
  if (isNaN(rNum)) return;

  if (!map[fixedDate]) map[fixedDate] = [];

  map[fixedDate].push({
    rank: rNum,
    name: name?.trim() || ""
  });
});

  const dates = Object.keys(map);

  // ================= 1日だけ =================
  if (dates.length === 1) {
    const date = dates[0];

    document.getElementById("date").value = date.replaceAll("/", "-");

    map[date].sort((a, b) => a.rank - b.rank);
    createTable(map[date]);

    alert("CSV読み込み完了（登録ボタンで保存してください）");
  }

  // ================= 複数日 =================
  else {
    const ok = confirm(`${dates.length}日分のデータを一括登録します。よろしいですか？`);

    if (!ok) return;

    for (const date of dates) {
      map[date].sort((a, b) => a.rank - b.rank);

      // 🔥 日付IDで上書き保存
      await setDoc(doc(db, "items", date), {
        date,
        data: map[date]
      });
    }

    alert("CSV一括登録完了");
    init();
  }

  // ファイルリセット
  document.getElementById("csvFile").value = "";
}

// ================= 一覧 =================
async function loadList() {
  const list = document.getElementById("list");
  list.innerHTML = "";

  const snap = await getDocs(colRef);

  const docs = snap.docs
    .map(d => ({
      id: d.id,
      ...d.data()
    }))
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

    // 編集
    div.onclick = e => {
      if (e.target.classList.contains("del")) return;

      document.getElementById("date").value = d.date.replaceAll("/", "-");
      createTable(d.data);

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

  // 🔥 CSVボタン追加（HTMLに追加必要）
  const csvBtn = document.getElementById("csvBtn");
  if (csvBtn) csvBtn.onclick = importCSV;
});

let imageFile = null;
let chart = null;

// アップロード
document.getElementById("upload").addEventListener("change", e => {
  imageFile = e.target.files[0];
});

// OCR実行
document.getElementById("run").addEventListener("click", async () => {
  const date = document.getElementById("date").value;

  if (!imageFile || !date) {
    alert("画像と日付を選択してください");
    return;
  }

  alert("読み取り開始（少し待つ）");

  const { data: { text } } = await Tesseract.recognize(
    imageFile,
    "jpn+eng"
  );

  console.log(text);

  const data = parse(text);
  renderTable(data);
});

// OCRパース
function parse(text) {
  const lines = text.split("\n");
  const result = [];

  lines.forEach(line => {
    line = line.trim();

    const scoreMatch = line.match(/([\d.]+[BT])/);
    const rankMatch = line.match(/^(\d+)/);

    if (!scoreMatch || !rankMatch) return;

    const score = scoreMatch[1];
    const rank = Number(rankMatch[1]);

    let name = line.replace(rank, "").replace(score, "").trim();

    if (rank <= 15) {
      result.push({ rank, name, score });
    }
  });

  return result;
}

// テーブル表示（編集可能）
function renderTable(data) {
  const tbody = document.getElementById("tbody");
  tbody.innerHTML = "";

  data.forEach(d => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td><input class="rank" value="${d.rank}"></td>
      <td><input class="name" value="${d.name}"></td>
      <td><input class="score" value="${d.score}"></td>
    `;

    tbody.appendChild(tr);
  });
}

// 保存
document.getElementById("saveBtn").addEventListener("click", () => {
  const date = document.getElementById("date").value;
  if (!date) return alert("日付を選択");

  const ranks = document.querySelectorAll(".rank");
  const names = document.querySelectorAll(".name");
  const scores = document.querySelectorAll(".score");

  let data = [];

  ranks.forEach((r, i) => {
    const rank = Number(r.value);
    const name = names[i].value.trim();
    const score = scores[i].value.trim();

    if (!rank || !name || !score) return;

    data.push({ rank, name, score });
  });

  // 順位で並び替え
  data.sort((a, b) => a.rank - b.rank);

  let db = JSON.parse(localStorage.getItem("ranking") || "{}");
  db[date] = data;
  localStorage.setItem("ranking", JSON.stringify(db));

  alert("保存完了！");
});

// グラフ表示
document.getElementById("showGraph").addEventListener("click", () => {
  const start = document.getElementById("start").value;
  const end = document.getElementById("end").value;
  const player = document.getElementById("player").value.trim();

  const db = JSON.parse(localStorage.getItem("ranking") || "{}");

  const labels = [];
  const ranks = [];

  Object.keys(db).sort().forEach(date => {
    if (date >= start && date <= end) {
      const found = db[date].find(p => p.name.includes(player));
      if (found) {
        labels.push(date);
        ranks.push(found.rank);
      }
    }
  });

  drawChart(labels, ranks);
});

// グラフ描画
function drawChart(labels, data) {
  const ctx = document.getElementById("chart");

  if (chart) chart.destroy();

  chart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: "順位",
        data
      }]
    },
    options: {
      scales: {
        y: {
          reverse: true,
          ticks: { stepSize: 1 }
        }
      }
    }
  });
}
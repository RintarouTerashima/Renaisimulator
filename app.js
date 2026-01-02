// ★ここを自分のWorkers URLに変える
// 例: const WORKER_BASE = "https://love-gpt-worker.yourname.workers.dev";
const WORKER_BASE = "https://noisy-tree-08d5.love-gpt.workers.dev/  ";

const chatEl = document.getElementById("chat");
const formEl = document.getElementById("form");
const inputEl = document.getElementById("input");
const sendBtn = document.getElementById("send");

// 超簡易：履歴を保持（systemはWorkers側で付ける）
let history = [];

function addMessage(text, who) {
  const div = document.createElement("div");
  div.className = `msg ${who}`;
  div.textContent = text;
  chatEl.appendChild(div);
  chatEl.scrollTop = chatEl.scrollHeight;
}

async function sendMessage(message) {
  sendBtn.disabled = true;

  addMessage(message, "user");
  history.push({ role: "user", content: message });

  const resp = await fetch(`${WORKER_BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, history }),
  });

  if (!resp.ok) {
    const t = await resp.text().catch(() => "");
    addMessage(`エラー: ${resp.status}\n${t}`, "bot");
    sendBtn.disabled = false;
    return;
  }

  const data = await resp.json();
  const reply = (data.reply || "").trim() || "……（無言）";
  addMessage(reply, "bot");
  history.push({ role: "assistant", content: reply });

  sendBtn.disabled = false;
}

formEl.addEventListener("submit", async (e) => {
  e.preventDefault();
  const message = inputEl.value.trim();
  if (!message) return;
  inputEl.value = "";
  await sendMessage(message);
});

// 初期表示
addMessage("……何？（話しかけるならちゃんとして）", "bot");

const WORKER_URL = "https://noisy-tree-08d5.love-gpt.workers.dev";

const form = document.querySelector("form");
const input = document.querySelector("input");
const chat = document.getElementById("chat");

const characterSelect = document.getElementById("character");
const resetBtn = document.getElementById("reset");

let history = [];
let characterId = null;

function addMsg(text, who) {
  const div = document.createElement("div");
  div.className = who;
  div.textContent = text;
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
}

function resetChat() {
  history = [];
  chat.innerHTML = "";
  addMsg("……何？（選んだキャラで会話が始まるよ）", "bot");
}

async function loadCharacters() {
  const res = await fetch(`${WORKER_URL}/api/characters`);
  const data = await res.json();
  const list = data.characters || [];

  characterSelect.innerHTML = "";
  for (const c of list) {
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = `${c.name}（${c.tagline}）`;
    characterSelect.appendChild(opt);
  }

  characterId = list[0]?.id || null;
}

async function send(message) {
  addMsg(message, "user");
  history.push({ role: "user", content: message });

  const res = await fetch(`${WORKER_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      characterId,
      message,
      history,
    }),
  });

  const data = await res.json();

  const reply = data.reply || "……";
  addMsg(reply, "bot");
  history.push({ role: "assistant", content: reply });

  if (data.ended) {
    // 終了したら入力を止める（好みで）
    input.disabled = true;
    addMsg(`【終了】理由: ${data.reason || "不明"}`, "bot");
  }
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const message = input.value.trim();
  if (!message) return;
  input.value = "";
  await send(message);
});

characterSelect.addEventListener("change", () => {
  characterId = characterSelect.value;
  input.disabled = false;
  resetChat();
});

resetBtn.addEventListener("click", () => {
  input.disabled = false;
  resetChat();
});

// 初期化
(async function init() {
  await loadCharacters();
  resetChat();
})();

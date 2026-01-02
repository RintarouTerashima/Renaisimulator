// ★ あなたの Workers URL
const WORKER_URL = "https://noisy-tree-08d5.love-gpt.workers.dev";

const form = document.querySelector("form");
const input = document.querySelector("input");
const chat = document.getElementById("chat");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const message = input.value.trim();
  if (!message) return;

  // ユーザー発言を表示
  const user = document.createElement("div");
  user.textContent = message;
  user.className = "user";
  chat.appendChild(user);

  input.value = "";

  // WorkersにPOST
  const res = await fetch(WORKER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });

  const data = await res.json();

  // AIの返事を表示
  const bot = document.createElement("div");
  bot.textContent = data.reply || "……";
  bot.className = "bot";
  chat.appendChild(bot);
});

// 初期表示
addMessage("……何？（話しかけるならちゃんとして）", "bot");

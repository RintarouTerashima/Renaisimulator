const WORKER_URL = "https://noisy-tree-08d5.love-gpt.workers.dev";

const AVATAR_BY_CHARACTER_ID = {
  gentle_rules: "./assets/gentle_rules.jpg",
  sharp_pop:"./assets/sharp_pop.jpg",
  // 追加キャラが増えたらここに足す
  // example: tsundere: "./assets/tsundere.png",
};

const USER_AVATAR = "./assets/user.jpg"; // 自分側（任意）


const form = document.querySelector("form");
const input = document.querySelector("input");
const chat = document.getElementById("chat");

const characterSelect = document.getElementById("character");
const resetBtn = document.getElementById("reset");

// ▼ 好感度ゲージ（右上）
const gaugeInner = document.getElementById("affGaugeInner");

// 会話状態
let history = [];
let characterId = null;

// 好感度（0〜100の内部値） ※数字はUIに出さない
let score = 50;

let characters = [];        // キャラ一覧を保存
let characterMap = {};      // id → キャラ情報


function nowHHMM() {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

// 直前メッセージと同じ発話者なら、アバター/名前を省略してグループ化
let lastWho = null;

function addMsg(text, who, meta = {}) {
  const row = document.createElement("div");
  row.className = `row ${who}`;

  const isGrouped = lastWho === who;
  lastWho = who;

  const avatar = document.createElement("img");
  avatar.className = "avatar";

  if (who === "user") {
    avatar.src = USER_AVATAR;
    avatar.alt = "you";
  } else {
    const botId = meta.characterId || characterId; // ★その発言に紐づくIDを優先
    avatar.src = AVATAR_BY_CHARACTER_ID[botId] || "./assets/bot.png";
    avatar.alt = "bot";
  }

  // 画像ロード失敗時の保険（壊れアイコン防止）
  avatar.onerror = () => {
    avatar.onerror = null;
    avatar.src = "./assets/bot.png";
  };

  if (isGrouped) avatar.classList.add("avatar-hidden");

  const metaDiv = document.createElement("div");
  metaDiv.className = "meta";

  const name = document.createElement("div");
  name.className = "name";
  if (who === "bot") {
    const botId = meta.characterId || characterId;
    name.textContent = characterMap?.[botId]?.name || "キャラ";
  } else {
    name.textContent = "";
  }
  if (isGrouped) name.classList.add("name-hidden");

  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.textContent = text;

  const time = document.createElement("div");
  time.className = "time";
  time.textContent = nowHHMM();

  metaDiv.appendChild(name);
  metaDiv.appendChild(bubble);

  if (who === "user") {
    row.appendChild(time);
    row.appendChild(metaDiv);
    row.appendChild(avatar);
  } else {
    row.appendChild(avatar);
    row.appendChild(metaDiv);
    row.appendChild(time);
  }

  chat.appendChild(row);
  chat.scrollTop = chat.scrollHeight;
}


// 5段階に丸めて「だいたいこのくらい感」を出す（攻略しづらい）
function quantizeTo5(score) {
  if (score >= 80) return 100;
  if (score >= 60) return 75;
  if (score >= 40) return 50;
  if (score >= 20) return 25;
  return 0;
}

function renderGauge() {
  if (!gaugeInner) return;

  // 幅（段階的・攻略しづらい）
  const width = quantizeTo5(score);
  gaugeInner.style.width = `${width}%`;

  // 明るさ（=好意の温度感）
  let opacity = 0.35; // 冷え切り
  if (score >= 80) opacity = 0.95;       // かなり好意
  else if (score >= 60) opacity = 0.8;   // 好意
  else if (score >= 40) opacity = 0.6;   // 様子見
  else if (score >= 20) opacity = 0.45;  // 警戒
  else opacity = 0.3;                    // 冷め

  gaugeInner.style.opacity = opacity;
}

function resetChat() {
  history = [];
  chat.innerHTML = "";

  lastWho = null;   

  score = 50;
  renderGauge();

  addMsg("……何？（選んだキャラで会話が始まるよ）", "bot", { characterId });
}

async function loadCharacters() {
  const res = await fetch(`${WORKER_URL}/api/characters`);
  const data = await res.json();
  const list = data.characters || [];

  // フロント側で保持
  characters = list;
  characterMap = Object.fromEntries(list.map(c => [c.id, c]));

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
      // ★ Workersへ現在スコアも渡す（AI採点で delta を決めるため）
      state: { score },
    }),
  });

  const data = await res.json();

  // ★ Workersから新しいスコアが返ってきたら更新
  if (data.state && typeof data.state.score === "number") {
    score = data.state.score;
    renderGauge();
  }

const reply = data.reply || "……";
addMsg(reply, "bot", { characterId: data?.character?.id || characterId });
history.push({ role: "assistant", content: reply });

  if (data.ended) {
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


const form = document.querySelector("#chat-form");
const input = document.querySelector("#prompt");
const messagesEl = document.querySelector("#messages");
const sendButton = document.querySelector("#send-button");
const statusEl = document.querySelector("#status");

const history = [];

function setStatus(text) {
  statusEl.textContent = text;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatAnswer(text) {
  return escapeHtml(text)
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${paragraph.replace(/\n/g, "<br>")}</p>`)
    .join("");
}

function renderSources(sources = []) {
  if (!sources.length) return "";

  const links = sources
    .slice(0, 4)
    .map((source, index) => {
      const title = escapeHtml(source.title || source.url || `Source ${index + 1}`);
      const url = escapeHtml(source.url);
      return `<a class="source-link" href="${url}" target="_blank" rel="noreferrer"><span>${index + 1}. ${title}</span></a>`;
    })
    .join("");

  return `<div class="sources">${links}</div>`;
}

function createAvatar(role) {
  const avatar = document.createElement("div");
  avatar.className = "avatar";

  if (role === "assistant") {
    avatar.innerHTML = '<img src="/media/COLB_cool.webp" alt="" />';
  } else {
    avatar.textContent = "C";
  }

  return avatar;
}

function addMessage(role, content, sources) {
  const article = document.createElement("article");
  article.className = `message ${role}`;

  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.innerHTML = `${formatAnswer(content)}${renderSources(sources)}`;

  article.append(createAvatar(role), bubble);
  messagesEl.append(article);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return article;
}

function addThinkingMessage() {
  const article = document.createElement("article");
  article.className = "message assistant thinking";

  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.innerHTML = `
    <div class="thinking-row" aria-label="Searching Colb docs">
      <span>Searching Colb docs</span>
      <span class="typing-dots" aria-hidden="true">
        <i></i><i></i><i></i>
      </span>
    </div>
  `;

  article.append(createAvatar("assistant"), bubble);
  messagesEl.append(article);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return article;
}

function setLoading(isLoading) {
  sendButton.disabled = isLoading;
  input.disabled = isLoading;
  document.querySelectorAll("[data-example]").forEach((button) => {
    button.disabled = isLoading;
  });
}

function autoresize() {
  input.style.height = "auto";
  input.style.height = `${Math.min(input.scrollHeight, 150)}px`;
}

async function ask(question) {
  const cleanQuestion = question.trim();
  if (!cleanQuestion) return;

  addMessage("user", cleanQuestion);
  history.push({ role: "user", content: cleanQuestion });
  input.value = "";
  autoresize();
  setLoading(true);
  setStatus("thinking");

  const thinkingMessage = addThinkingMessage();

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ messages: history.slice(-8) })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Request failed");
    }

    thinkingMessage.remove();
    addMessage("assistant", data.answer, data.sources);
    history.push({ role: "assistant", content: data.answer });
    setStatus("ready");
  } catch (error) {
    thinkingMessage.remove();
    addMessage("assistant", error.message || "Could not get an answer.");
    setStatus("error");
  } finally {
    setLoading(false);
    input.focus();
  }
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  ask(input.value);
});

input.addEventListener("input", autoresize);

input.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    form.requestSubmit();
  }
});

document.querySelectorAll("[data-example]").forEach((button) => {
  button.addEventListener("click", () => ask(button.dataset.example));
});

autoresize();

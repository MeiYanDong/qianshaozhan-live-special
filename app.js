const episodes = [
  {
    id: "professionalism-qiangsheng-20260912",
    label: "强生",
    date: "2026.9.12",
    title: "关于今年看过的最重要的视频",
    duration: "01:28:00",
    rating: "★★★★★",
    replayUrl:
      "https://appm1dwjnky5483.h5.xet.pomoho.com/v4/course/alive/l_6aa4e979e4b0694c5c0959cb?app_id=appm1dwjnky5483&alive_mode=&pro_id=course_32Ha3c1VN3OQBVC1xxVoPdJKjJU&type=2&conduit_type=live_group&conduit_id=course_32Ha3c1VN3OQBVC1xxVoPdJKjJU&product_id=course_32Ha3c1VN3OQBVC1xxVoPdJKjJU",
    notesPath: "./content/2026-09-12-notes.md",
    transcriptPath: "./content/2026-09-12-transcript.md",
    highlightPath: "./content/2026-09-12-qiangsheng.md",
    summary: "从德州扑克职业训练量讲到专业化、半职业原则，并提出“强生”的强力生活理念。",
  },
  {
    id: "ai-xinfa-20260621",
    label: "上",
    date: "2026.6.21",
    title: "一次带案例的 AI 心法分享（上）",
    duration: "02:09:41",
    replayUrl:
      "https://appm1dwjnky5483.h5.xet.pomoho.com/v4/course/alive/l_6a379c00e4b0694c351c7548?app_id=appm1dwjnky5483&l_program=xe_know_pc",
    notesPath: "./content/2026-06-21-notes.md",
    transcriptPath: "./content/2026-06-21-transcript.md",
    summary: "从个人网站案例切入，拆解如何让 Agent 完成调研、打样、选择和局部打磨。",
  },
  {
    id: "ai-xinfa-20260628",
    label: "下",
    date: "2026.6.28",
    title: "一次带案例的 AI 心法分享（下）",
    duration: "02:01:59",
    replayUrl:
      "https://appm1dwjnky5483.h5.xet.pomoho.com/v4/course/alive/l_6a40b256e4b0694c3520d528?app_id=appm1dwjnky5483&l_program=xe_know_pc",
    notesPath: "./content/2026-06-28-notes.md",
    transcriptPath: "./content/2026-06-28-transcript.md",
    summary: "继续复盘个人网站工作流，重点讲流程、智能匹配、复利资产和人的关键判断。",
  },
];

const state = {
  episodeId: episodes[0].id,
  mode: "notes",
};

const els = {
  episodeList: document.querySelector("#episodeList"),
  episodeCount: document.querySelector("#episodeCount"),
  episodeKicker: document.querySelector("#episodeKicker"),
  episodeTitle: document.querySelector("#episodeTitle"),
  episodeRating: document.querySelector("#episodeRating"),
  episodeMeta: document.querySelector("#episodeMeta"),
  replayLink: document.querySelector("#replayLink"),
  sourceLink: document.querySelector("#sourceLink"),
  content: document.querySelector("#content"),
  tabsWrap: document.querySelector(".tabs"),
  tabs: document.querySelectorAll(".tab"),
};

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function inlineMarkdown(value) {
  return escapeHtml(value)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/(\[[0-9]{2}:[0-9]{2}(?::[0-9]{2})?\])/g, '<span class="timecode">$1</span>');
}

function flushParagraph(parts, html) {
  if (parts.length) {
    html.push(`<p>${inlineMarkdown(parts.join(" "))}</p>`);
    parts.length = 0;
  }
}

function renderMarkdown(markdown) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const html = [];
  const paragraph = [];
  let listItems = [];
  let listType = null;

  function flushList() {
    if (!listItems.length) return;
    html.push(`<${listType}>${listItems.map((item) => `<li>${inlineMarkdown(item)}</li>`).join("")}</${listType}>`);
    listItems = [];
    listType = null;
  }

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      flushParagraph(paragraph, html);
      flushList();
      continue;
    }

    const heading = line.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      flushParagraph(paragraph, html);
      flushList();
      const level = Math.min(heading[1].length, 3);
      html.push(`<h${level}>${inlineMarkdown(heading[2])}</h${level}>`);
      continue;
    }

    if (line.startsWith("> ")) {
      flushParagraph(paragraph, html);
      flushList();
      html.push(`<blockquote>${inlineMarkdown(line.slice(2))}</blockquote>`);
      continue;
    }

    const unordered = line.match(/^[-*]\s+(.+)$/);
    const ordered = line.match(/^\d+\.\s+(.+)$/);
    if (unordered || ordered) {
      flushParagraph(paragraph, html);
      const nextType = unordered ? "ul" : "ol";
      if (listType && listType !== nextType) flushList();
      listType = nextType;
      listItems.push(unordered ? unordered[1] : ordered[1]);
      continue;
    }

    flushList();
    paragraph.push(line);
  }

  flushParagraph(paragraph, html);
  flushList();
  return html.join("\n");
}

function currentEpisode() {
  return episodes.find((episode) => episode.id === state.episodeId) || episodes[0];
}

function modePath(episode, mode) {
  if (mode === "notes") return episode.notesPath;
  if (mode === "transcript") return episode.transcriptPath;
  if (mode === "highlight") return episode.highlightPath;
  return episode.notesPath;
}

function renderEpisodeList() {
  els.episodeCount.textContent = `${episodes.length} 期`;
  els.episodeList.innerHTML = episodes
    .map(
      (episode) => `
        <button class="episode-card ${episode.id === state.episodeId ? "is-active" : ""}" type="button" data-episode="${episode.id}">
          <span class="label"><span>${episode.date}</span><span>${episode.label}</span></span>
          <h3>${episode.title}</h3>
          <p>${episode.summary}</p>
          ${
            episode.rating
              ? `<p class="card-rating"><span>推荐指数</span><strong aria-label="推荐指数 ${episode.rating.length} 星">${episode.rating}</strong></p>`
              : ""
          }
          <p>时长 ${episode.duration}</p>
        </button>
      `,
    )
    .join("");
}

async function loadContent() {
  const episode = currentEpisode();
  const path = modePath(episode, state.mode);
  els.content.innerHTML = '<p class="loading">正在载入内容...</p>';
  try {
    const response = await fetch(path);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const markdown = await response.text();
    els.content.innerHTML = renderMarkdown(markdown);
  } catch (error) {
    els.content.innerHTML = `<p class="loading">内容载入失败：${escapeHtml(error.message)}</p>`;
  }
}

function renderHeader() {
  const episode = currentEpisode();
  const sourcePath = modePath(episode, state.mode);
  els.episodeKicker.textContent = `${episode.date} / 第 ${episode.label} 期`;
  els.episodeTitle.textContent = episode.title;
  els.episodeRating.hidden = !episode.rating;
  els.episodeRating.textContent = episode.rating ? `推荐指数 ${episode.rating}` : "";
  els.episodeMeta.textContent = `${episode.summary}  回放时长 ${episode.duration}`;
  els.replayLink.href = episode.replayUrl;
  els.sourceLink.href = sourcePath;
}

function renderTabs() {
  const episode = currentEpisode();
  let visibleCount = 0;
  els.tabs.forEach((tab) => {
    const available = Boolean(modePath(episode, tab.dataset.mode));
    tab.hidden = !available;
    tab.disabled = !available;
    if (available) visibleCount += 1;
    const active = available && tab.dataset.mode === state.mode;
    tab.classList.toggle("is-active", active);
    tab.setAttribute("aria-selected", active ? "true" : "false");
  });
  els.tabsWrap.style.setProperty("--tab-count", visibleCount);
}

function setEpisode(episodeId) {
  state.episodeId = episodeId;
  if (!modePath(currentEpisode(), state.mode)) {
    state.mode = "notes";
  }
  render();
}

function setMode(mode) {
  if (!modePath(currentEpisode(), mode)) return;
  state.mode = mode;
  render();
}

function render() {
  renderEpisodeList();
  renderHeader();
  renderTabs();
  loadContent();
}

els.episodeList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-episode]");
  if (!button) return;
  setEpisode(button.dataset.episode);
});

els.tabs.forEach((tab) => {
  tab.addEventListener("click", () => setMode(tab.dataset.mode));
});

render();

import { episodes } from "./episodes.js";

const main = document.querySelector("#main");
const archive = { topic: "", query: "" };
try {
  const saved = JSON.parse(sessionStorage.getItem("qsz-archive") || "null");
  if (saved && typeof saved.topic === "string" && typeof saved.query === "string") {
    archive.topic = episodes.some(e => e.topics.includes(saved.topic)) ? saved.topic : "";
    archive.query = saved.query;
  }
} catch { /* Storage can be unavailable in private browsing. */ }
const cache = new Map();
let revision = 0;
let observer;
const escape = (s) => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const icon = (name) => '<i data-lucide="' + name + '" aria-hidden="true"></i>';
const icons = () => window.lucide.createIcons();
const url = (e, mode = "notes") => "#/episode/" + encodeURIComponent(e.id) + "/" + encodeURIComponent(mode);
const date = (s) => s.replaceAll("-", ".");
const stars = (e) => e.rating ? '<span class="rating" aria-label="用户推荐 ' + e.rating + ' 星">' + "★".repeat(e.rating) + '<span>推荐</span></span>' : "";
const modes = (e) => [
  { id: "notes", title: "阅读稿", path: e.notesPath },
  { id: "transcript", title: "逐字稿", path: e.transcriptPath },
  ...e.highlights.map(h => ({ ...h })),
];
document.querySelector("#footer-count").textContent = "已收录 " + episodes.length + " 期";
document.querySelector(".skip-link").addEventListener("click", event => {
  event.preventDefault();
  main.focus();
});

function renderResults() {
  try { sessionStorage.setItem("qsz-archive", JSON.stringify(archive)); } catch { /* Keep browsing without storage. */ }
  const q = archive.query.trim().toLocaleLowerCase();
  const filtered = episodes.filter(e => (!archive.topic || e.topics.includes(archive.topic)) &&
    [e.title, e.summary, e.date, e.series?.title || "", ...e.topics, ...e.highlights.map(h => h.title)].join(" ").toLocaleLowerCase().includes(q));
  document.querySelector("#result-count").textContent = filtered.length + " 期";
  document.querySelector("#results").innerHTML = filtered.length ? filtered.map(e => `
    <article class="episode-row">
      <time datetime="${e.date}"><span>${e.date.slice(0,4)}</span><strong>${e.date.slice(5).replace("-", ".")}</strong></time>
      <div class="episode-main">
        <div class="episode-topics">${e.topics.map(t => '<span>' + escape(t) + '</span>').join("")}${e.series ? '<span class="series-label">' + escape(e.series.title) + ' / ' + e.series.label + '</span>' : ""}</div>
        <h2><a href="${url(e)}">${escape(e.title)}</a></h2>
        <p>${escape(e.summary)}</p>
        <div class="episode-bottom"><span>${icon("headphones")}${e.duration}</span>${e.highlights.map(h => '<a class="excerpt-link" href="' + url(e,h.id) + '">' + icon("bookmark") + escape(h.title) + icon("arrow-up-right") + '</a>').join("")}</div>
      </div>
      <div class="episode-end">${stars(e)}<a class="read-link" href="${url(e)}" aria-label="阅读：${escape(e.title)}">${icon("arrow-up-right")}</a></div>
    </article>`).join("") : '<div class="empty-state"><h2>没有找到相关期目</h2><button class="plain-button" id="reset-search">清除筛选</button></div>';
  document.querySelector("#reset-search")?.addEventListener("click", () => { archive.topic = ""; archive.query = ""; renderArchive(); });
  icons();
}

function renderArchive() {
  document.title = "前哨站 · 每周直播档案";
  const topics = [...new Set(episodes.flatMap(e => e.topics))];
  main.innerHTML = `
    <section class="archive">
      <div class="archive-heading"><div><p class="eyebrow">持续更新的分享</p><h1>直播档案<span id="result-count" aria-live="polite"></span></h1></div>
        <label class="search">${icon("search")}<input id="search" type="search" placeholder="搜索标题、主题" aria-label="搜索标题、主题" value="${escape(archive.query)}"></label>
      </div>
      <nav class="filters" aria-label="主题筛选">${["", ...topics].map(t => '<button type="button" data-topic="' + escape(t) + '" aria-pressed="' + (archive.topic === t) + '">' + escape(t || "全部主题") + '</button>').join("")}</nav>
      <div id="results"></div>
    </section>`;
  document.querySelector("#search").addEventListener("input", event => { archive.query = event.target.value; renderResults(); });
  document.querySelectorAll("[data-topic]").forEach(button => button.addEventListener("click", () => {
    archive.topic = button.dataset.topic;
    document.querySelectorAll("[data-topic]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.topic === archive.topic)));
    renderResults();
  }));
  renderResults();
}

function metadataLine(line) {
  return /^(?:[-*]\s*)?(?:\*\*)?(?:来源|原始回放|回放链接|原始链接|直播链接|推荐指数|回放时长|时长|源视频|视频时长)\s*[：:]/.test(line.trim());
}

async function renderReader(e, modeId, chapter, token) {
  const mode = modes(e).find(m => m.id === modeId);
  if (!mode) { renderMissing(); return; }
  document.title = e.title + " · " + mode.title + " · 前哨站";
  const series = e.series ? episodes.filter(item => item.series?.id === e.series.id).sort((a,b) => a.series.part - b.series.part) : [];
  main.innerHTML = `
    <section class="reading">
      <a class="back-link" href="#/">${icon("arrow-left")}返回目录</a>
      <header class="reading-header">
        <div class="reading-meta"><time datetime="${e.date}">${date(e.date)}</time><span>${e.duration}</span>${e.topics.map(t => '<span>' + escape(t) + '</span>').join("")}${stars(e)}</div>
        <h1>${escape(e.title)}</h1>
        <div class="reading-actions">
          <nav class="modes" aria-label="稿件类型">${modes(e).map(m => '<a href="' + url(e,m.id) + '"' + (m.id === mode.id ? ' aria-current="page"' : '') + '>' + escape(m.title) + '</a>').join("")}</nav>
          <div class="document-actions"><a href="${escape(e.replayUrl)}" target="_blank" rel="noreferrer">${icon("play")}回放</a><a href="${mode.path}" download title="下载 Markdown" aria-label="下载 Markdown">${icon("download")}</a></div>
        </div>
      </header>
      <div class="reading-grid">
        <article class="prose" id="article" aria-busy="true"><p class="loading" role="status">正在载入…</p></article>
        <aside class="reading-aside"><details class="toc" open><summary>本篇目录</summary><nav id="toc" aria-label="章节目录"></nav></details>
          ${series.length ? '<nav class="series-nav" aria-label="同系列"><h2>' + escape(e.series.title) + '</h2>' + series.map(item => '<a href="' + url(item) + '"' + (item.id === e.id ? ' aria-current="page"' : '') + '><span>' + item.series.label + '</span><time>' + date(item.date) + '</time></a>').join("") + '</nav>' : ""}
        </aside>
      </div>
    </section>`;
  icons();
  if (matchMedia("(max-width: 800px)").matches) document.querySelector(".toc").open = false;
  try {
    let markdown = cache.get(mode.path);
    if (!markdown) {
      const response = await fetch(mode.path);
      if (!response.ok) throw new Error("HTTP " + response.status);
      markdown = await response.text();
      cache.set(mode.path, markdown);
    }
    // A previous fetch must not replace a newer route or reading mode.
    if (token !== revision) return;
    const lines = markdown.replace(/\r\n/g, "\n").split("\n");
    const titleIndex = lines.findIndex(line => /^#\s/.test(line));
    if (titleIndex >= 0) lines.splice(titleIndex, 1);
    const introEnd = lines.findIndex(line => /^##\s/.test(line));
    const cleaned = lines.filter((line, i) => !(i < (introEnd < 0 ? lines.length : introEnd) && metadataLine(line))).join("\n");
    const article = document.querySelector("#article");
    article.innerHTML = window.DOMPurify.sanitize(window.marked.parse(cleaned), { USE_PROFILES: { html: true } });
    article.setAttribute("aria-busy", "false");
    article.querySelectorAll("a").forEach(a => { if (/^https?:/.test(a.href)) { a.target = "_blank"; a.rel = "noreferrer"; } });
    const headings = [...article.querySelectorAll("h2, h3")];
    headings.forEach((h, i) => { h.id = "chapter-" + (i + 1); h.tabIndex = -1; });
    document.querySelector("#toc").innerHTML = headings.map(h => '<a class="' + (h.tagName === "H3" ? "subchapter" : "") + '" href="' + url(e,mode.id) + "/" + h.id + '">' + escape(h.textContent) + '</a>').join("") || '<span>本篇暂无章节</span>';
    observer = new IntersectionObserver(entries => {
      const visible = entries.find(entry => entry.isIntersecting);
      if (visible) document.querySelectorAll("#toc a").forEach(a => a.classList.toggle("active", a.hash.endsWith("/" + visible.target.id)));
    }, { rootMargin: "-10% 0px -65% 0px" });
    headings.forEach(h => observer.observe(h));
    if (chapter) scrollChapter(chapter);
  } catch {
    if (token !== revision) return;
    document.querySelector("#article").innerHTML = '<p>稿件暂时无法加载。</p><button class="plain-button" id="retry">重新加载</button>';
    document.querySelector("#article").setAttribute("aria-busy", "false");
    document.querySelector("#retry").addEventListener("click", route);
  }
}
function scrollChapter(id) {
  const target = document.getElementById(id);
  if (target) { target.scrollIntoView(); target.focus({ preventScroll: true }); }
}
function renderMissing() {
  document.title = "未找到内容 · 前哨站";
  main.innerHTML = '<section class="empty-state"><h1>未找到这篇内容</h1><a class="back-link" href="#/">返回全部期目</a></section>';
}
let previousPath = "";
function route() {
  const parts = location.hash.slice(1).split("/").filter(Boolean);
  const path = parts.slice(0,3).join("/");
  if (path === previousPath && parts[3] && document.getElementById(parts[3])) { scrollChapter(parts[3]); return; }
  previousPath = path;
  const token = ++revision;
  observer?.disconnect();
  window.scrollTo(0,0);
  if (!parts.length) { renderArchive(); return; }
  const episode = parts[0] === "episode" ? episodes.find(e => e.id === parts[1]) : null;
  if (!episode) { renderMissing(); return; }
  renderReader(episode, parts[2] || "notes", parts[3], token);
}
window.addEventListener("hashchange", route);
route();
